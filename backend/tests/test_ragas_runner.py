"""RagasRunner unit tests (W4 D2 F2; per CLAUDE.md §5.6 H6).

These tests exercise the RagasRunner orchestration layer using a stub
evaluator — the real ragas judge LLM is NOT invoked (cost containment +
deterministic CI). The stub mirrors the real evaluator contract:
takes RagasQuerySample, returns dict[str, float | int].

Coverage:
- evaluate() returns RagasReport with correct aggregates (mean / median / p95)
- per-query errors surface in RagasQueryResult.error + excluded from aggregates
- load_samples_from_eval_set skips OOS queries + populates expected_keywords
- load_samples_from_eval_set wires pipeline_outputs JSON when path given
- report_to_json round-trips with stable schema
- Evaluator None at evaluate-time raises RuntimeError (caller must wire)
- Evaluator returning non-dict surfaces error per-row
- _aggregate handles 0-score, 1-score, even/odd-length, p95 nearest-rank
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from eval.ragas_runner import (
    METRIC_NAMES,
    RagasQuerySample,
    RagasRunner,
    _aggregate,
    load_samples_from_eval_set,
    report_to_json,
)


def _stub_evaluator_constant(scores: dict):
    """Return a callable evaluator that always emits the same score dict."""

    def _eval(_sample: RagasQuerySample) -> dict:
        return dict(scores)

    return _eval


def _stub_evaluator_per_query(scoremap: dict[str, dict]):
    """Return a callable that picks scores by query_id."""

    def _eval(sample: RagasQuerySample) -> dict:
        return dict(scoremap[sample.query_id])

    return _eval


def _stub_evaluator_raises(exc: Exception):
    def _eval(_sample: RagasQuerySample) -> dict:
        raise exc

    return _eval


# ---------- _aggregate -------------------------------------------------------


def test_aggregate_empty_returns_zeros() -> None:
    agg = _aggregate([])
    assert agg.mean == 0.0
    assert agg.median == 0.0
    assert agg.p95 == 0.0
    assert agg.n == 0


def test_aggregate_single_score() -> None:
    agg = _aggregate([0.85])
    assert agg.mean == pytest.approx(0.85)
    assert agg.median == pytest.approx(0.85)
    assert agg.p95 == pytest.approx(0.85)
    assert agg.n == 1


def test_aggregate_odd_length_uses_middle() -> None:
    agg = _aggregate([0.1, 0.5, 0.9])
    assert agg.mean == pytest.approx(0.5)
    assert agg.median == pytest.approx(0.5)


def test_aggregate_even_length_averages_middle_pair() -> None:
    agg = _aggregate([0.1, 0.4, 0.6, 0.9])
    assert agg.mean == pytest.approx(0.5)
    assert agg.median == pytest.approx(0.5)


def test_aggregate_p95_nearest_rank() -> None:
    # 20 values; p95 nearest-rank index = round(0.95 * 19) = 18
    scores = [i / 100 for i in range(1, 21)]  # 0.01..0.20
    agg = _aggregate(scores)
    assert agg.p95 == pytest.approx(0.19)


# ---------- RagasRunner.evaluate ---------------------------------------------


def test_evaluate_returns_report_with_aggregates() -> None:
    samples = [
        RagasQuerySample(query_id="Q001", question="q1", contexts=["c1"], answer="a1"),
        RagasQuerySample(query_id="Q002", question="q2", contexts=["c2"], answer="a2"),
        RagasQuerySample(query_id="Q003", question="q3", contexts=["c3"], answer="a3"),
    ]
    evaluator = _stub_evaluator_per_query({
        "Q001": {"faithfulness": 0.9, "answer_relevancy": 0.8,
                 "context_precision": 0.7, "context_recall": 0.6,
                 "input_tokens": 100, "output_tokens": 10},
        "Q002": {"faithfulness": 0.5, "answer_relevancy": 0.6,
                 "context_precision": 0.8, "context_recall": 0.9,
                 "input_tokens": 120, "output_tokens": 12},
        "Q003": {"faithfulness": 0.7, "answer_relevancy": 0.7,
                 "context_precision": 0.7, "context_recall": 0.7,
                 "input_tokens": 110, "output_tokens": 11},
    })
    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=evaluator)
    report = runner.evaluate(samples, eval_set_name="test.yaml", eval_set_version="t1")

    assert report.eval_set == "test.yaml"
    assert report.eval_set_version == "t1"
    assert report.judge_deployment == "gpt-5-4-mini"
    assert report.total_queries == 3
    assert report.queries_evaluated == 3
    assert report.queries_errored == 0
    assert set(report.aggregates) == set(METRIC_NAMES)
    assert report.aggregates["faithfulness"].mean == pytest.approx(0.7)
    assert report.aggregates["answer_relevancy"].mean == pytest.approx(0.7)
    assert report.total_input_tokens == 330
    assert report.total_output_tokens == 33


def test_evaluate_clamps_out_of_range_scores() -> None:
    samples = [RagasQuerySample(query_id="Q1", question="q", contexts=["c"], answer="a")]
    evaluator = _stub_evaluator_constant({
        "faithfulness": 1.5, "answer_relevancy": -0.3,
        "context_precision": 0.5, "context_recall": 0.5,
    })
    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=evaluator)
    report = runner.evaluate(samples)
    assert report.per_query[0].faithfulness == 1.0
    assert report.per_query[0].answer_relevancy == 0.0


def test_evaluate_records_per_query_error_and_excludes_from_aggregate() -> None:
    samples = [
        RagasQuerySample(query_id="Q001", question="q1", contexts=["c1"], answer="a1"),
        RagasQuerySample(query_id="Q002", question="q2", contexts=["c2"], answer="a2"),
    ]
    seen: list[str] = []

    def _eval(sample: RagasQuerySample) -> dict:
        seen.append(sample.query_id)
        if sample.query_id == "Q002":
            raise RuntimeError("judge llm 503")
        return {
            "faithfulness": 0.8, "answer_relevancy": 0.8,
            "context_precision": 0.8, "context_recall": 0.8,
            "input_tokens": 100, "output_tokens": 10,
        }

    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=_eval)
    report = runner.evaluate(samples)
    assert seen == ["Q001", "Q002"]
    assert report.queries_evaluated == 1
    assert report.queries_errored == 1
    assert report.per_query[0].error is None
    assert report.per_query[1].error is not None and "judge llm 503" in report.per_query[1].error
    # Aggregate computed only over evaluated rows
    assert report.aggregates["faithfulness"].n == 1
    assert report.aggregates["faithfulness"].mean == pytest.approx(0.8)


def test_evaluate_without_evaluator_raises() -> None:
    samples = [RagasQuerySample(query_id="Q1", question="q", contexts=["c"], answer="a")]
    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=None)
    with pytest.raises(RuntimeError, match=r"requires an evaluator"):
        runner.evaluate(samples)


def test_evaluate_evaluator_returns_non_dict_surfaces_error() -> None:
    samples = [RagasQuerySample(query_id="Q1", question="q", contexts=["c"], answer="a")]

    def _bad(sample: RagasQuerySample) -> object:
        return "not a dict"  # type: ignore[return-value]

    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=_bad)
    report = runner.evaluate(samples)
    assert report.per_query[0].error is not None
    assert "expected dict" in report.per_query[0].error


# ---------- load_samples_from_eval_set ---------------------------------------


def test_load_samples_skips_oos_and_populates_keywords(tmp_path: Path) -> None:
    eval_set = tmp_path / "eval.yaml"
    eval_set.write_text(
        """
metadata:
  version: t1
queries:
  - query_id: Q001
    query_text: How do I record a payment?
    ground_truth:
      expected_answer_keywords: [payment, record]
      expected_refusal: false
  - query_id: Q002
    query_text: Tell me a joke about accountants.
    ground_truth:
      expected_answer_keywords: [joke]
      expected_refusal: true   # OOS — must be skipped
""",
        encoding="utf-8",
    )
    samples = load_samples_from_eval_set(eval_set)
    assert [s.query_id for s in samples] == ["Q001"]
    assert samples[0].expected_keywords == ["payment", "record"]
    assert samples[0].contexts == []
    assert samples[0].answer == ""


def test_load_samples_with_pipeline_cache(tmp_path: Path) -> None:
    eval_set = tmp_path / "eval.yaml"
    eval_set.write_text(
        """
metadata:
  version: t1
queries:
  - query_id: Q001
    query_text: q1
    ground_truth:
      expected_answer_keywords: [k]
      expected_refusal: false
""",
        encoding="utf-8",
    )
    cache = tmp_path / "pipeline.json"
    cache.write_text(
        json.dumps({
            "Q001": {
                "contexts": ["chunk text 1", "chunk text 2"],
                "answer": "synthesized answer",
                "reference": "ground truth",
            },
        }),
        encoding="utf-8",
    )
    samples = load_samples_from_eval_set(eval_set, pipeline_outputs_path=cache)
    assert samples[0].contexts == ["chunk text 1", "chunk text 2"]
    assert samples[0].answer == "synthesized answer"
    assert samples[0].reference == "ground truth"


# ---------- report_to_json ---------------------------------------------------


def test_report_to_json_round_trips() -> None:
    samples = [RagasQuerySample(query_id="Q1", question="q", contexts=["c"], answer="a")]
    evaluator = _stub_evaluator_constant({
        "faithfulness": 0.9, "answer_relevancy": 0.8,
        "context_precision": 0.7, "context_recall": 0.6,
        "input_tokens": 100, "output_tokens": 10,
    })
    runner = RagasRunner(judge_deployment="gpt-5-4-mini", evaluator=evaluator)
    report = runner.evaluate(samples, eval_set_name="x.yaml", eval_set_version="v1")
    parsed = json.loads(report_to_json(report))
    assert parsed["metadata"]["eval_set"] == "x.yaml"
    assert parsed["metadata"]["judge_deployment"] == "gpt-5-4-mini"
    assert parsed["aggregate"]["queries_evaluated"] == 1
    for metric in METRIC_NAMES:
        assert metric in parsed["aggregate"]["metrics"]
    assert parsed["per_query"][0]["query_id"] == "Q1"
    assert parsed["per_query"][0]["faithfulness"] == pytest.approx(0.9)
