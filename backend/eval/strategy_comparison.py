"""C06 Eval Framework — chunk-strategy recall comparison (W53, 兩者合一下半截).

Compares `chunk_strategy` variants (W53 / ADR-0044 ships `heading_aware` as a real
section-bounded counterpart to `layout_aware`) by, for each strategy: applying it +
reindexing the KB in place → regenerating synthetic QA from THAT strategy's own
chunks → measuring W52 self-supervised Recall@K. Reuses `eval.synthetic_qa`
(`run_synthetic_recall`) entirely — zero new recall math.

**Methodology honesty (R1/R2)**: per-config QA is regenerated from each strategy's
own chunks, so the question set DIFFERS per strategy → the recall delta is
**confounded** by question difficulty. This measures *self-retrievability* — "given
this chunking, how findable are its own answer-bearing chunks" — NOT a controlled
A/B over a shared question set. It also rests on W52 synthetic recall (LLM-generated
questions; NOT human-validated ground truth). Present results as a relative
self-retrievability signal, never an absolute quality verdict. (A controlled
shared-question A/B would need a strategy-independent text-anchored harness — deferred.)

The orchestration takes injected `reindex_with_strategy_fn` + `recall_fn` so the
per-strategy loop is unit-testable with stubs; the live wiring (set config → reindex
→ synthetic recall) lives in `scripts/run_strategy_recall_comparison.py`.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import structlog

from eval.runner import EvalReport

logger = structlog.get_logger(__name__)

# Apply a chunk_strategy + reindex the KB in place → total chunk count after reindex.
ReindexWithStrategyFn = Callable[[str], Awaitable[int]]
# Run W52 synthetic recall on the CURRENT (just-reindexed) index → EvalReport.
RecallFn = Callable[[], Awaitable[EvalReport]]


@dataclass(slots=True, frozen=True)
class StrategyRecallResult:
    """One chunk_strategy's self-retrievability outcome."""

    strategy: str
    recall_at_k: float  # W52 self-supervised Recall@K (NOT human ground truth)
    sample_size: int  # synthetic QA pairs evaluated (non-errored)
    chunk_count: int  # total chunks in the KB after reindexing under this strategy
    errored: int


@dataclass(slots=True, frozen=True)
class StrategyRecallComparison:
    """Cross-strategy self-retrievability comparison (NOT a controlled A/B)."""

    kb_id: str
    top_k: int
    results: list[StrategyRecallResult]
    best_strategy: str | None  # highest self-retrievability recall (ties → first); None when empty


async def run_strategy_recall_comparison(
    kb_id: str,
    strategies: list[str],
    *,
    reindex_with_strategy_fn: ReindexWithStrategyFn,
    recall_fn: RecallFn,
    top_k: int = 5,
) -> StrategyRecallComparison:
    """For each strategy: reindex under it → synthetic recall → collect.

    Sequential + in-place: each strategy reindexes the SAME KB index, so the KB is
    left in the last strategy's state (an offline dev/eval operation). `best_strategy`
    = the strategy with the highest self-retrievability recall — read it as a relative
    signal (confounded per-config question sets; see module docstring), not a verdict.
    """
    results: list[StrategyRecallResult] = []
    for strategy in strategies:
        chunk_count = await reindex_with_strategy_fn(strategy)
        report = await recall_fn()
        results.append(
            StrategyRecallResult(
                strategy=strategy,
                recall_at_k=report.aggregate_recall_at_5,
                sample_size=report.queries_evaluated,
                chunk_count=chunk_count,
                errored=report.queries_errored,
            )
        )
        logger.info(
            "strategy_recall_measured",
            kb_id=kb_id,
            strategy=strategy,
            recall_at_k=report.aggregate_recall_at_5,
            chunk_count=chunk_count,
            sample_size=report.queries_evaluated,
        )

    best = max(results, key=lambda r: r.recall_at_k).strategy if results else None
    return StrategyRecallComparison(kb_id=kb_id, top_k=top_k, results=results, best_strategy=best)
