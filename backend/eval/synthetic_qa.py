"""C06 Eval Framework — synthetic-QA recall harness (W52, 決策 7 Option d 更深半邊).

Self-supervised retrieval **recall** measurement WITHOUT a human-labelled set:
for each sampled chunk, an LLM writes one question whose answer lives ONLY in that
chunk → the source chunk_id IS the ground truth → run retrieval → did the source
chunk come back in top-K? This closes the W51 honesty gap (W51's「涵蓋章節數」was an
explicit coverage *proxy*, NOT recall).

**Honest framing (R1)**: this is *self-supervised / synthetic* recall — closer to
true recall than W51's coverage proxy (it measures the actual retrieval hit-rate of
source chunks), but still NOT human-validated ground truth (LLM-generated questions
+ single-chunk grounding carry their own bias). Never present it as human ground
truth.

**Reuse-first (Karpathy zero-new-math)** — this module adds NO new recall math and
NO new LLM-client architecture:
  - `EvalRunner` (eval/runner.py) strict-mode already computes
    `|retrieved ∩ acceptable| / |acceptable|` → synthetic pairs are formatted as
    EvalRunner-compatible eval-set entries (`acceptable_chunk_ids=[source]` +
    `validated=True`) and fed straight through it.
  - the judge LLM client pattern (`AsyncAzureOpenAI` at the judge deployment +
    `patch_for_gpt5`) mirrors `eval/ragas_evaluator.make_faithfulness_evaluator`;
    judge = `gpt-5.4-mini` per the cost policy. No credential → `None` (harness skips,
    same graceful-degradation contract as the RAGAs path).
  - chunk enumeration reuses `RetrievalEngine.list_documents` / `list_chunks` /
    `fetch_by_chunk_ids` (the last supplies chunk_text, which list_chunks omits).

This is an OFFLINE engineering harness (ROADMAP「synthetic-QA auto-gen → 留工程閘」),
not a self-service UI surface. It is also the W52 foundation for W53 (reindex
strategy 比較 — run the same recall measurement across chunk strategies).

Live driver / CLI: `scripts/run_synthetic_recall.py` (mirrors run_gate1_eval.py's
truststore + engine bootstrap). This module stays bootstrap-free so the core is
unit-testable with stubs.
"""

from __future__ import annotations

import asyncio
import random
from collections.abc import Awaitable, Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import structlog
import yaml

from eval.ragas_evaluator import patch_for_gpt5
from eval.runner import EvalReport, EvalRunner
from retrieval.retrieval_engine import RetrievalEngine
from storage.settings import Settings

logger = structlog.get_logger(__name__)

# An async per-chunk question generator: chunk_text -> question (or None on error/empty).
GenerateFn = Callable[[str], Awaitable[str | None]]

# Prompt asks for a single, self-contained, chunk-grounded question so the source
# chunk is genuinely the answer-bearing one (R2 — guards against over-broad questions
# that any chunk could answer, which would deflate recall as measurement noise).
_QA_SYSTEM_PROMPT = (
    "You are building a retrieval recall test for a document knowledge base. "
    "Given ONE passage from a document, write a single, specific, self-contained "
    "question that a real user would ask AND whose answer is found ONLY in this "
    "passage. The question must stand on its own (do not write 'the passage' / "
    "'this text' / 'according to the document'). Output ONLY the question — no "
    "preamble, no answer, no quotes."
)

# patch_for_gpt5 floors max_completion_tokens to 4096 when max_tokens is supplied —
# guarantees a GPT-5 reasoning judge has completion budget left after reasoning tokens
# (otherwise it can return an empty string). The question itself is short.
_QA_MAX_TOKENS = 512


class SyntheticRecallError(RuntimeError):
    """Raised when no synthetic QA pairs could be produced (empty KB / no judge)."""


@dataclass(slots=True, frozen=True)
class SyntheticQAPair:
    """One LLM-generated question + the source chunk that is its ground truth."""

    question: str
    source_chunk_id: str
    source_section_path: list[str]
    source_chunk_text: str


def make_qa_generator(settings: Settings) -> GenerateFn | None:
    """Build the judge-bound async question generator, or `None` when no Azure OpenAI
    credential is configured (local dev / CI) → callers skip the harness.

    Judge = `azure_openai_deployment_llm_judge` (gpt-5.4-mini per the cost policy),
    same deployment as `make_faithfulness_evaluator`. Each call self-degrades to
    `None` on a judge error so one bad chunk never aborts the run.
    """
    if not settings.azure_openai_api_key:
        logger.info(
            "synthetic_qa_generator_skipped",
            reason="no AZURE_OPENAI_API_KEY — synthetic-QA recall harness unavailable",
        )
        return None

    from openai import AsyncAzureOpenAI  # noqa: PLC0415 — defer so the no-cred path needs no openai

    client = AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
    )
    patch_for_gpt5(client)
    deployment = settings.azure_openai_deployment_llm_judge

    async def _generate(chunk_text: str) -> str | None:
        if not chunk_text.strip():
            return None
        try:
            resp = await client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": _QA_SYSTEM_PROMPT},
                    {"role": "user", "content": chunk_text},
                ],
                max_tokens=_QA_MAX_TOKENS,
            )
            content = resp.choices[0].message.content
            return content.strip() if content and content.strip() else None
        except Exception as exc:  # noqa: BLE001 — openai exception chain unpredictable; degrade
            logger.warning(
                "synthetic_qa_generate_exception",
                exception_type=type(exc).__name__,
                error=str(exc)[:200],
            )
            return None

    return _generate


async def generate_qa(
    chunks: Sequence[Mapping[str, Any]],
    generate_fn: GenerateFn,
    *,
    sample_size: int = 30,
    seed: int = 0,
    max_concurrency: int = 4,
) -> list[SyntheticQAPair]:
    """Deterministically sample chunks and generate one grounded question each.

    Chunks with empty `chunk_text` are dropped before sampling. Sampling is seeded
    for reproducibility (W53 re-runs the same sample across reindex strategies) and
    the sample is sorted by chunk_id so output order is stable regardless of the
    RNG's internal draw order. A chunk whose `generate_fn` returns `None` (judge
    error / empty) is skipped, so the result may be shorter than `sample_size`.
    """
    usable = [c for c in chunks if str(c.get("chunk_text") or "").strip()]
    if not usable:
        return []
    rng = random.Random(seed)
    sampled = usable if len(usable) <= sample_size else rng.sample(usable, sample_size)
    sampled = sorted(sampled, key=lambda c: str(c.get("chunk_id", "")))

    sem = asyncio.Semaphore(max_concurrency)

    async def _one(chunk: Mapping[str, Any]) -> SyntheticQAPair | None:
        text = str(chunk.get("chunk_text") or "")
        async with sem:
            question = await generate_fn(text)
        if not question:
            return None
        return SyntheticQAPair(
            question=question,
            source_chunk_id=str(chunk.get("chunk_id", "")),
            source_section_path=list(chunk.get("section_path") or []),
            source_chunk_text=text,
        )

    results = await asyncio.gather(*(_one(c) for c in sampled))
    return [r for r in results if r is not None]


def to_eval_set_payload(
    pairs: list[SyntheticQAPair],
    *,
    kb_id: str,
    seed: int,
) -> dict[str, Any]:
    """Build an `EvalRunner`-compatible eval-set dict from synthetic QA pairs.

    Each pair becomes a STRICT-mode entry: `acceptable_chunk_ids=[source_chunk_id]`
    (the chunk the question was generated from = ground truth) + `validated=True`,
    so EvalRunner's strict Recall@K path applies. Real index chunk_ids don't collide
    with the eval-set-v0 placeholder prefix ("kb-drive_doc-M0"), so strict mode
    triggers (NOT the keyword fallback). `kb_id` is set per-query for EvalRunner's
    ADR-0018 multi-KB override.
    """
    queries: list[dict[str, Any]] = []
    for i, p in enumerate(pairs, start=1):
        queries.append(
            {
                "query_id": f"SQ{i:03d}",
                "query_text": p.question,
                "query_phrasing_source": "synthetic_llm_W52",
                "kb_id": kb_id,
                "difficulty": "",
                "query_type": "single_step_lookup",
                "ground_truth": {
                    "primary_chunk_ids": [p.source_chunk_id],
                    "acceptable_chunk_ids": [p.source_chunk_id],
                    "expected_screenshot_chunks": [],
                    "expected_answer_keywords": [],
                    "expected_refusal": False,
                },
                "annotation": {
                    "annotator": "synthetic_llm_W52",
                    "annotated_at": "",
                    "validated": True,
                    "notes": (
                        "synthetic self-supervised recall (NOT human ground truth) "
                        f"| source_section={'/'.join(p.source_section_path)}"
                    ),
                },
            }
        )
    return {
        "metadata": {
            "version": f"synthetic-W52-{kb_id}-seed{seed}",
            "kind": "synthetic_qa_recall",
            "note": (
                "Self-supervised synthetic recall: LLM-generated questions, source "
                "chunk = ground truth. NOT human-validated ground-truth recall."
            ),
        },
        "queries": queries,
    }


async def _collect_chunks(engine: RetrievalEngine, kb_id: str) -> list[dict[str, Any]]:
    """Enumerate a KB's chunks WITH text.

    list_documents → list_chunks gives ids + section_path (but no chunk_text, omitted
    by design); a single fetch_by_chunk_ids (no select clause → full fields) supplies
    the text. `search.in` handles large id lists, so one fetch covers a Tier-1 KB.
    """
    docs = await engine.list_documents(kb_id)
    chunk_ids: list[str] = []
    section_by_id: dict[str, list[str]] = {}
    for d in docs:
        rows = await engine.list_chunks(kb_id, str(d.get("doc_id", "")))
        for r in rows:
            cid = str(r.get("chunk_id", ""))
            if cid:
                chunk_ids.append(cid)
                section_by_id[cid] = list(r.get("section_path") or [])
    if not chunk_ids:
        return []

    fetched = await engine.fetch_by_chunk_ids(chunk_ids, kb_id)
    collected: list[dict[str, Any]] = []
    for cid in chunk_ids:
        fields = fetched.get(cid)
        if not fields:
            continue
        text = str(fields.get("chunk_text") or "")
        if not text.strip():
            continue
        collected.append(
            {
                "chunk_id": cid,
                "chunk_text": text,
                "section_path": section_by_id.get(cid) or list(fields.get("section_path") or []),
            }
        )
    return collected


async def run_synthetic_recall(
    engine: RetrievalEngine,
    kb_id: str,
    *,
    generate_fn: GenerateFn,
    output_path: Path,
    sample_size: int = 30,
    seed: int = 0,
    top_k: int = 5,
) -> EvalReport:
    """Measure self-supervised Recall@`top_k` for a KB via synthetic QA.

    Enumerate chunks → generate questions → write an EvalRunner-compatible eval-set
    YAML to `output_path` (a reusable, auditable artifact W53 builds on) → run the
    existing `EvalRunner` strict-mode (zero new recall math). Raises
    `SyntheticRecallError` when no pairs could be produced (empty KB or every judge
    call failed).
    """
    chunks = await _collect_chunks(engine, kb_id)
    pairs = await generate_qa(chunks, generate_fn, sample_size=sample_size, seed=seed)
    if not pairs:
        raise SyntheticRecallError(
            f"no synthetic QA pairs generated for kb_id={kb_id!r} "
            "(empty KB, or every judge call failed)"
        )
    payload = to_eval_set_payload(pairs, kb_id=kb_id, seed=seed)
    output_path.write_text(
        yaml.safe_dump(payload, sort_keys=False, allow_unicode=True), encoding="utf-8"
    )
    logger.info(
        "synthetic_recall_eval_set_written",
        kb_id=kb_id,
        pairs=len(pairs),
        output=str(output_path),
    )
    runner = EvalRunner(engine, top_k=top_k, kb_id=kb_id)
    return await runner.run(output_path)
