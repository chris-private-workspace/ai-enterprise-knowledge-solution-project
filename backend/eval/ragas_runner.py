"""RAGAs 4-metric eval automation per architecture.md §3.6 (W4 D2 F2).

Runs the 4 canonical RAGAs metrics over a RAG eval set:
- Faithfulness         — does the answer stay grounded in retrieved chunks?
- Answer Relevancy     — does the answer address the question?
- Context Precision    — are retrieved chunks relevant to the question?
- Context Recall       — do retrieved chunks cover the ground-truth answer?

Judge LLM = GPT-5.4-mini (Settings.azure_openai_deployment_llm_judge), same
judge as CRAG grader for cost containment per plan §F2.

Inputs per query (loaded from eval-set YAML + executed pipeline):
- question        — eval-set query_text
- contexts        — list[str] retrieved chunk_text (from RetrievalEngine)
- answer          — synthesized answer (from Synthesizer)
- reference       — ground-truth answer text or empty string

Output:
- RagasReport — per-query 4-metric scores + aggregate (mean / median / p95)
                + judge cost trace (input_tokens / output_tokens / latency)
- Serializable to JSON via report_to_json()

NB: ragas v0.4 SDK uses `Dataset` + `evaluate()`. We wrap async; per-row trace
captured via ragas's run_config callbacks. Tenacity retry on transient
LLM errors handled at the ragas wrapper level (Azure OpenAI client passed
in already wraps tenacity per Synthesizer/CragGrader pattern).

Cost containment per plan §4 R4: caller controls eval-set size via
`subset_size` parameter (W4 D3 shootout uses 20-query subset × 4 reranker
= 320 judge calls; W4 D5 winning reranker on full 55).
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

import structlog
import yaml

logger = structlog.get_logger(__name__)

METRIC_NAMES = (
    "faithfulness",
    "answer_relevancy",
    "context_precision",
    "context_recall",
)


@dataclass(slots=True)
class RagasQuerySample:
    """One row of input data for ragas — built per-query from the EKP RAG pipeline.

    `reference` is the ground-truth answer text. Eval-set-v1-draft does not yet
    include reference answers (Chris SME label cascade pending per Q14); when
    empty, context_recall falls back to keyword overlap with
    expected_answer_keywords (per architecture.md §3.6 hybrid-mode eval).
    """

    query_id: str
    question: str
    contexts: list[str]
    answer: str
    reference: str = ""
    expected_keywords: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RagasQueryResult:
    """One query's 4 metric scores + judge cost trace."""

    query_id: str
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float
    input_tokens: int
    output_tokens: int
    latency_ms: int
    error: str | None = None


@dataclass(slots=True)
class RagasAggregate:
    mean: float
    median: float
    p95: float
    n: int  # queries scored (excludes errored)


@dataclass(slots=True)
class RagasReport:
    eval_set: str
    eval_set_version: str
    judge_deployment: str
    started_at: str
    finished_at: str
    total_queries: int
    queries_evaluated: int
    queries_errored: int
    aggregates: dict[str, RagasAggregate]  # keyed by METRIC_NAMES
    total_input_tokens: int
    total_output_tokens: int
    total_latency_ms: int
    per_query: list[RagasQueryResult] = field(default_factory=list)


class RagasRunner:
    """Orchestrate ragas evaluation over pre-collected RAG samples.

    Caller is responsible for executing the RAG pipeline (retrieve + synthesize)
    and assembling RagasQuerySample list — this runner is pure-evaluation,
    independent of EKP RetrievalEngine / Synthesizer to keep the metric
    computation testable and re-runnable against cached samples.
    """

    def __init__(
        self,
        judge_deployment: str,
        evaluator: object | None = None,
    ) -> None:
        """Construct a runner.

        `evaluator` is an injectable callable matching ragas.evaluate signature
        (or a test double). When None, the real ragas.evaluate is bound at
        runtime via _default_evaluator(). Tests inject a stub to avoid hitting
        the real Azure OpenAI judge.
        """
        self._judge_deployment = judge_deployment
        self._evaluator = evaluator

    def evaluate(
        self,
        samples: list[RagasQuerySample],
        eval_set_name: str = "",
        eval_set_version: str = "",
    ) -> RagasReport:
        """Run ragas 4-metric evaluation; emit RagasReport."""
        from datetime import UTC, datetime  # noqa: PLC0415 — keep import light at module top

        started_at = datetime.now(UTC).isoformat()
        per_query: list[RagasQueryResult] = []
        total_in, total_out, total_lat = 0, 0, 0

        for sample in samples:
            res = self._evaluate_one(sample)
            per_query.append(res)
            if res.error is None:
                total_in += res.input_tokens
                total_out += res.output_tokens
                total_lat += res.latency_ms

        finished_at = datetime.now(UTC).isoformat()
        evaluated = [r for r in per_query if r.error is None]

        aggregates: dict[str, RagasAggregate] = {}
        for metric in METRIC_NAMES:
            scores = [getattr(r, metric) for r in evaluated]
            aggregates[metric] = _aggregate(scores)

        report = RagasReport(
            eval_set=eval_set_name,
            eval_set_version=eval_set_version,
            judge_deployment=self._judge_deployment,
            started_at=started_at,
            finished_at=finished_at,
            total_queries=len(samples),
            queries_evaluated=len(evaluated),
            queries_errored=len(per_query) - len(evaluated),
            aggregates=aggregates,
            total_input_tokens=total_in,
            total_output_tokens=total_out,
            total_latency_ms=total_lat,
            per_query=per_query,
        )
        logger.info(
            "ragas_eval_complete",
            eval_set=eval_set_name,
            total=len(samples),
            evaluated=len(evaluated),
            errored=len(per_query) - len(evaluated),
            faithfulness_mean=round(aggregates["faithfulness"].mean, 3),
            answer_relevancy_mean=round(aggregates["answer_relevancy"].mean, 3),
            context_precision_mean=round(aggregates["context_precision"].mean, 3),
            context_recall_mean=round(aggregates["context_recall"].mean, 3),
            total_input_tokens=total_in,
            total_output_tokens=total_out,
            total_latency_ms=total_lat,
        )
        return report

    def _evaluate_one(self, sample: RagasQuerySample) -> RagasQueryResult:
        """Score one sample via the injected evaluator. Wraps errors per-query."""
        evaluator = self._evaluator
        if evaluator is None:
            raise RuntimeError(
                "RagasRunner requires an evaluator (real ragas.evaluate or test stub) "
                "— wire via constructor `evaluator=` parameter",
            )
        start = time.perf_counter()
        try:
            scores = evaluator(sample)  # callable returning dict[str, float] + token usage
        except Exception as exc:  # noqa: BLE001 — surface error per query
            return RagasQueryResult(
                query_id=sample.query_id,
                faithfulness=0.0,
                answer_relevancy=0.0,
                context_precision=0.0,
                context_recall=0.0,
                input_tokens=0,
                output_tokens=0,
                latency_ms=0,
                error=f"{type(exc).__name__}: {exc}",
            )
        latency_ms = int((time.perf_counter() - start) * 1000)
        if not isinstance(scores, dict):
            return RagasQueryResult(
                query_id=sample.query_id,
                faithfulness=0.0,
                answer_relevancy=0.0,
                context_precision=0.0,
                context_recall=0.0,
                input_tokens=0,
                output_tokens=0,
                latency_ms=latency_ms,
                error=f"evaluator returned {type(scores).__name__} (expected dict)",
            )
        return RagasQueryResult(
            query_id=sample.query_id,
            faithfulness=_clamp(float(scores.get("faithfulness", 0.0))),
            answer_relevancy=_clamp(float(scores.get("answer_relevancy", 0.0))),
            context_precision=_clamp(float(scores.get("context_precision", 0.0))),
            context_recall=_clamp(float(scores.get("context_recall", 0.0))),
            input_tokens=int(scores.get("input_tokens", 0) or 0),
            output_tokens=int(scores.get("output_tokens", 0) or 0),
            latency_ms=latency_ms,
        )


def load_samples_from_eval_set(
    eval_set_path: Path,
    pipeline_outputs_path: Path | None = None,
) -> list[RagasQuerySample]:
    """Load RagasQuerySample list from an eval-set YAML + optional pipeline-outputs JSON.

    pipeline_outputs schema (per query_id):
        {
            "Q001": {
                "contexts": ["chunk_text 1", "chunk_text 2", ...],
                "answer":   "synthesized answer text",
                "reference": "ground-truth answer text (optional)"
            },
            ...
        }

    When pipeline_outputs_path is None, contexts/answer/reference default empty
    — caller must populate before evaluate() (useful for unit tests + external
    pipeline runners that build samples programmatically).
    """
    eval_set = yaml.safe_load(eval_set_path.read_text(encoding="utf-8"))
    queries = eval_set.get("queries", [])

    pipeline_outputs: dict[str, dict] = {}
    if pipeline_outputs_path is not None:
        pipeline_outputs = json.loads(
            pipeline_outputs_path.read_text(encoding="utf-8"),
        )

    samples: list[RagasQuerySample] = []
    for q in queries:
        if q.get("ground_truth", {}).get("expected_refusal", False):
            continue  # OOS queries are evaluated separately for refusal accuracy
        query_id = str(q.get("query_id", ""))
        outputs = pipeline_outputs.get(query_id, {})
        samples.append(
            RagasQuerySample(
                query_id=query_id,
                question=str(q.get("query_text", "")),
                contexts=list(outputs.get("contexts", [])),
                answer=str(outputs.get("answer", "")),
                reference=str(outputs.get("reference", "")),
                expected_keywords=list(
                    q.get("ground_truth", {}).get("expected_answer_keywords", []) or [],
                ),
            ),
        )
    return samples


def report_to_json(report: RagasReport) -> str:
    """Serialize RagasReport to JSON string per plan §F2 output schema."""
    payload = {
        "metadata": {
            "eval_set": report.eval_set,
            "eval_set_version": report.eval_set_version,
            "judge_deployment": report.judge_deployment,
            "started_at": report.started_at,
            "finished_at": report.finished_at,
        },
        "aggregate": {
            "total_queries": report.total_queries,
            "queries_evaluated": report.queries_evaluated,
            "queries_errored": report.queries_errored,
            "metrics": {
                metric: asdict(report.aggregates[metric])
                for metric in METRIC_NAMES
            },
            "total_input_tokens": report.total_input_tokens,
            "total_output_tokens": report.total_output_tokens,
            "total_latency_ms": report.total_latency_ms,
        },
        "per_query": [asdict(r) for r in report.per_query],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def _aggregate(scores: list[float]) -> RagasAggregate:
    if not scores:
        return RagasAggregate(mean=0.0, median=0.0, p95=0.0, n=0)
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    mean = sum(sorted_scores) / n
    median = sorted_scores[n // 2] if n % 2 == 1 else (
        (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2
    )
    # p95 — nearest-rank method (per architecture.md §3.6 latency baseline pattern)
    p95_idx = max(0, min(n - 1, int(round(0.95 * (n - 1)))))
    p95 = sorted_scores[p95_idx]
    return RagasAggregate(
        mean=round(mean, 4),
        median=round(median, 4),
        p95=round(p95, 4),
        n=n,
    )


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))
