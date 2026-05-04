"""F5 Cohere lift smoke unit tests (W4 D4; per CLAUDE.md §5.6 H6).

Tests the deterministic aggregation logic of the lift driver — pair-up,
verdict classification, aggregate compute. The live driver flow (engine
build + Azure OpenAI + AI Search + Cohere REST) is the explicit purpose
of F5 LIVE smoke and intentionally not mocked here (would only test
fakes against fakes).

Coverage:
- _verdict thresholds (helped / unchanged / hurt + tiny-epsilon noise)
- _build_lift pairs by query_id, skips OOS, caps at subset, marks
  matching cohere result, preserves error trace
- _aggregate sum/avg/count edge cases (empty, all-helped, mixed)
"""

from __future__ import annotations

import sys
from pathlib import Path

# Match other backend tests' sys.path bootstrap so scripts/ resolves.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from scripts.run_cohere_lift_smoke import (  # noqa: E402
    PerQueryLift,
    _aggregate,
    _build_lift,
    _verdict,
)

from eval.runner import QueryEvalResult  # noqa: E402


def _r(query_id: str, recall: float, *, is_oos: bool = False, error: str | None = None,
       latency_ms: int = 0) -> QueryEvalResult:
    return QueryEvalResult(
        query_id=query_id,
        query_text=f"text-{query_id}",
        mode="keyword",
        recall_at_5=recall,
        is_oos=is_oos,
        retrieved_chunk_ids=[],
        expected_chunk_ids=[],
        expected_keywords=[],
        matched_keywords=[],
        embed_latency_ms=0,
        search_latency_ms=latency_ms,
        error=error,
    )


# ---------- _verdict ---------------------------------------------------------


def test_verdict_positive_delta_is_helped() -> None:
    assert _verdict(0.20) == "helped"


def test_verdict_negative_delta_is_hurt() -> None:
    assert _verdict(-0.10) == "hurt"


def test_verdict_zero_delta_is_unchanged() -> None:
    assert _verdict(0.0) == "unchanged"


def test_verdict_micro_noise_treated_unchanged_within_eps() -> None:
    assert _verdict(1e-9) == "unchanged"
    assert _verdict(-1e-9) == "unchanged"


# ---------- _build_lift ------------------------------------------------------


def test_build_lift_pairs_by_query_id_skips_oos() -> None:
    hybrid = [
        _r("Q001", 0.6),
        _r("Q002", 1.0, is_oos=True),  # OOS skipped
        _r("Q003", 0.4),
    ]
    cohere = [
        _r("Q001", 0.8),
        _r("Q002", 1.0, is_oos=True),
        _r("Q003", 0.4),
    ]
    out = _build_lift(hybrid, cohere, subset=10)
    assert [p.query_id for p in out] == ["Q001", "Q003"]
    assert out[0].delta == 0.2
    assert out[0].verdict == "helped"
    assert out[1].delta == 0.0
    assert out[1].verdict == "unchanged"


def test_build_lift_caps_at_subset() -> None:
    hybrid = [_r(f"Q{i:03d}", 0.5) for i in range(20)]
    cohere = [_r(f"Q{i:03d}", 0.7) for i in range(20)]
    out = _build_lift(hybrid, cohere, subset=5)
    assert len(out) == 5
    assert [p.query_id for p in out] == ["Q000", "Q001", "Q002", "Q003", "Q004"]


def test_build_lift_subset_zero_takes_all_main_queries() -> None:
    hybrid = [_r("Q001", 0.5), _r("Q002", 0.5)]
    cohere = [_r("Q001", 0.7), _r("Q002", 0.7)]
    out = _build_lift(hybrid, cohere, subset=0)
    assert len(out) == 2


def test_build_lift_drops_query_when_cohere_missing() -> None:
    hybrid = [_r("Q001", 0.5), _r("Q002", 0.5)]
    cohere = [_r("Q001", 0.8)]  # Q002 missing
    out = _build_lift(hybrid, cohere, subset=10)
    assert [p.query_id for p in out] == ["Q001"]


def test_build_lift_preserves_error_trace_per_side() -> None:
    hybrid = [_r("Q001", 0.0, error="hybrid boom")]
    cohere = [_r("Q001", 0.0, error="cohere boom")]
    out = _build_lift(hybrid, cohere, subset=10)
    assert out[0].error_hybrid == "hybrid boom"
    assert out[0].error_cohere == "cohere boom"


def test_build_lift_marks_hurt_when_cohere_lower() -> None:
    hybrid = [_r("Q001", 0.8)]
    cohere = [_r("Q001", 0.4)]
    out = _build_lift(hybrid, cohere, subset=10)
    assert out[0].verdict == "hurt"
    assert out[0].delta == -0.4


# ---------- _aggregate ------------------------------------------------------


def _p(query_id: str, h: float, c: float, *, h_ms: int = 100, c_ms: int = 150) -> PerQueryLift:
    return PerQueryLift(
        query_id=query_id,
        query_text=f"t-{query_id}",
        hybrid_recall_at_5=h,
        cohere_recall_at_5=c,
        delta=round(c - h, 4),
        verdict=_verdict(c - h),
        hybrid_search_latency_ms=h_ms,
        cohere_search_latency_ms=c_ms,
        error_hybrid=None,
        error_cohere=None,
    )


def test_aggregate_empty_returns_zeros() -> None:
    assert _aggregate([]) == (0.0, 0.0, 0.0, 0, 0, 0, 0.0, 0.0)


def test_aggregate_all_helped_positive_lift() -> None:
    per_query = [_p("Q001", 0.5, 0.8), _p("Q002", 0.4, 0.6)]
    h_avg, c_avg, lift, helped, unchanged, hurt, h_ms, c_ms = _aggregate(per_query)
    assert h_avg == 0.45
    assert c_avg == 0.7
    assert lift == 0.25
    assert helped == 2
    assert unchanged == 0
    assert hurt == 0
    assert h_ms == 100.0
    assert c_ms == 150.0


def test_aggregate_mixed_verdicts_counts_correctly() -> None:
    per_query = [
        _p("Q001", 0.5, 0.8),  # helped
        _p("Q002", 0.6, 0.6),  # unchanged
        _p("Q003", 0.8, 0.4),  # hurt
    ]
    _, _, _, helped, unchanged, hurt, _, _ = _aggregate(per_query)
    assert (helped, unchanged, hurt) == (1, 1, 1)


def test_aggregate_negative_lift_when_regression() -> None:
    per_query = [_p("Q001", 0.9, 0.3), _p("Q002", 0.8, 0.4)]
    h_avg, c_avg, lift, _, _, hurt, _, _ = _aggregate(per_query)
    assert h_avg == 0.85
    assert c_avg == 0.35
    assert lift == -0.5
    assert hurt == 2
