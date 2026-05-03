"""Gate decision logic (per architecture.md §6.3 hard gates).

Gate 1 (W2 末): Recall@5 ≥ 80% on hybrid retrieval baseline → pass to W3 generation pipeline.
              Fail → block W3 promotion;W2 末 retro analyzes chunk strategy / index field config /
              query type mismatch root cause per W02 plan §4 R1.

Gate 2 (W4 末): 4 RAGAs metrics within ±5pp of target → pass to W5 (W4 reranker shootout
              feeds Gate 2 inputs). W3+ scope.
"""

from __future__ import annotations

from dataclasses import dataclass

from eval.runner import EvalReport

_GATE_1_THRESHOLD = 0.80


@dataclass(slots=True, frozen=True)
class GateDecision:
    """Pass/fail outcome for a phase gate."""

    gate: str
    passed: bool
    threshold: float
    actual: float
    note: str = ""


def gate1_recall_at_5(report: EvalReport) -> GateDecision:
    """Gate 1: aggregate recall@5 over main (non-OOS, non-errored) queries.

    Threshold per architecture.md §6.3: ≥ 80% for W3 promotion.
    """
    actual = report.aggregate_recall_at_5
    passed = actual >= _GATE_1_THRESHOLD
    note_parts: list[str] = []
    if report.queries_errored:
        note_parts.append(f"{report.queries_errored} queries errored — verify R8 cleared")
    if report.mode_breakdown.get("keyword", 0) > 0:
        note_parts.append(
            f"{report.mode_breakdown['keyword']} queries used keyword-fallback mode "
            "(eval set v0 placeholder chunk_ids); strict mode after F8 SME validation will "
            "give more precise number",
        )
    if not passed:
        note_parts.append(
            "Gate 1 FAIL → W3 paused; W2 末 retro analyze: chunk strategy "
            "(per W2 D2 low_value 67.2% rate finding) / index field config / query type mismatch",
        )

    return GateDecision(
        gate="G1",
        passed=passed,
        threshold=_GATE_1_THRESHOLD,
        actual=actual,
        note="; ".join(note_parts),
    )
