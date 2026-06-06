"""Chunk-strategy recall comparison orchestration tests (W53; H6 — eval).

Verifies run_strategy_recall_comparison's per-strategy loop + report assembly + best
pick, with stubbed reindex/recall (the live wiring is smoke-deferred).
"""

from __future__ import annotations

import pytest

from eval.runner import EvalReport
from eval.strategy_comparison import StrategyRecallComparison, run_strategy_recall_comparison


def _report(recall: float, evaluated: int = 10, errored: int = 0) -> EvalReport:
    return EvalReport(
        eval_set="synthetic",
        eval_set_version="v",
        started_at="",
        finished_at="",
        total_queries=evaluated + errored,
        main_queries=evaluated + errored,
        oos_queries=0,
        queries_evaluated=evaluated,
        queries_errored=errored,
        aggregate_recall_at_5=recall,
        mode_breakdown={"strict": evaluated, "keyword": 0},
        avg_embed_latency_ms=0.0,
        avg_search_latency_ms=0.0,
        per_query=[],
    )


@pytest.mark.asyncio
async def test_comparison_collects_per_strategy_and_picks_best() -> None:
    chunk_counts = {"layout_aware": 90, "heading_aware": 40}
    recalls = {"layout_aware": 0.80, "heading_aware": 0.92}
    current = {"strategy": ""}

    async def reindex(strategy: str) -> int:
        current["strategy"] = strategy
        return chunk_counts[strategy]

    async def recall() -> EvalReport:
        # recall_fn reads the just-reindexed strategy's state (per-config QA)
        return _report(recalls[current["strategy"]])

    comp = await run_strategy_recall_comparison(
        "kb-x",
        ["layout_aware", "heading_aware"],
        reindex_with_strategy_fn=reindex,
        recall_fn=recall,
        top_k=5,
    )

    assert isinstance(comp, StrategyRecallComparison)
    assert comp.kb_id == "kb-x"
    assert comp.top_k == 5
    assert [r.strategy for r in comp.results] == ["layout_aware", "heading_aware"]
    assert comp.results[0].recall_at_k == 0.80
    assert comp.results[0].chunk_count == 90
    assert comp.results[0].sample_size == 10
    assert comp.results[1].recall_at_k == 0.92
    assert comp.results[1].chunk_count == 40
    # best = highest self-retrievability recall
    assert comp.best_strategy == "heading_aware"


@pytest.mark.asyncio
async def test_comparison_empty_strategies_yields_no_best() -> None:
    async def reindex(strategy: str) -> int:
        return 0

    async def recall() -> EvalReport:
        return _report(0.0)

    comp = await run_strategy_recall_comparison(
        "kb-x", [], reindex_with_strategy_fn=reindex, recall_fn=recall
    )
    assert comp.results == []
    assert comp.best_strategy is None
