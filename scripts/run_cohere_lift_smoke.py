"""W4 D4 F5 — Cohere rerank lift smoke driver (W3 carry-over C1 close).

Runs the same N representative eval-set queries through TWO retrieval engines:
1. Hybrid-only (no reranker) — W2 baseline
2. Hybrid + Cohere Rerank v4.0-pro — W6 production lock per ADR-0012 (Path A
   Marketplace per Q5;v3.5 W3 D1 baseline → v4.0-pro same-vendor upgrade W5 D1)

Emits per-query lift table:

    query_id  hybrid_R@5  cohere_R@5  delta   verdict
    --------  ----------  ----------  ------  -------
    Q001      0.60        0.80        +0.20   helped
    Q005      1.00        1.00        +0.00   unchanged
    Q012      0.80        0.60        -0.20   hurt
    ...
    aggregate 0.74        0.81        +0.07   PASS (lift > 0)

Procurement awareness (per W4 plan §4 R1):
- When `cohere_endpoint` or `cohere_api_key` unset → script exits 1 with
  "DEFERRED: Cohere procurement pending" message. This is the explicit
  W5/W6 fallback path documented in W4 plan §F5.
- W3 D1 already validated CohereReranker structurally via 8 unit tests +
  W4 D3 reranker_shootout scaffolds. This driver is the LIVE verification
  step that closes W3 carry-over C1.

Usage (from project root, post Chris .env populate Marketplace endpoint+key):
    backend/.venv/Scripts/python.exe -m scripts.run_cohere_lift_smoke
    backend/.venv/Scripts/python.exe -m scripts.run_cohere_lift_smoke \
        --eval-set docs/eval-set-v1-draft.yaml \
        --subset 10 \
        --output reports/cohere-lift-smoke.json

Exit codes:
    0 — both runs completed; lift JSON written
    1 — Cohere procurement pending (DEFERRED) OR runtime exception
"""

from __future__ import annotations

# Use OS trust store (Windows Cert Store) for TLS verification so Ricoh corp
# proxy SSL inspection is honoured. Must run before any ssl/urllib3/httpx import.
import truststore

truststore.inject_into_ssl()

import argparse
import asyncio
import json
import sys
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from eval.runner import EvalRunner, QueryEvalResult  # noqa: E402
from ingestion.embedding.azure_openai_embedder import AzureOpenAIEmbedder  # noqa: E402
from retrieval.hybrid import HybridSearcher  # noqa: E402
from retrieval.reranker.cohere import CohereReranker  # noqa: E402
from retrieval.retrieval_engine import RetrievalEngine  # noqa: E402
from storage.settings import Settings, get_settings  # noqa: E402

DEFAULT_EVAL_SET = Path("docs/eval-set-v1-draft.yaml")
DEFAULT_OUTPUT = Path("reports/cohere-lift-smoke.json")
DEFAULT_SUBSET = 10


@dataclass(slots=True)
class PerQueryLift:
    query_id: str
    query_text: str
    hybrid_recall_at_5: float
    cohere_recall_at_5: float
    delta: float
    verdict: str  # "helped" / "unchanged" / "hurt"
    hybrid_search_latency_ms: int
    cohere_search_latency_ms: int
    error_hybrid: str | None
    error_cohere: str | None


@dataclass(slots=True)
class LiftSummary:
    eval_set: str
    subset: int
    started_at: str
    finished_at: str
    queries_evaluated: int
    hybrid_aggregate_recall_at_5: float
    cohere_aggregate_recall_at_5: float
    lift_aggregate: float
    queries_helped: int
    queries_unchanged: int
    queries_hurt: int
    avg_hybrid_search_latency_ms: float
    avg_cohere_search_latency_ms: float
    rerank_overhead_ms: float  # cohere - hybrid avg search latency delta
    per_query: list[PerQueryLift] = field(default_factory=list)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="W4 D4 F5 Cohere rerank lift smoke")
    parser.add_argument(
        "--eval-set", type=Path, default=DEFAULT_EVAL_SET,
        help=f"YAML eval-set path (default: {DEFAULT_EVAL_SET})",
    )
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT,
        help=f"Output JSON path (default: {DEFAULT_OUTPUT})",
    )
    parser.add_argument(
        "--subset", type=int, default=DEFAULT_SUBSET,
        help=f"First N main (non-OOS) queries (default: {DEFAULT_SUBSET}; cost containment per W4 plan §4 R4)",
    )
    return parser.parse_args()


def _verdict(delta: float, eps: float = 1e-6) -> str:
    if delta > eps:
        return "helped"
    if delta < -eps:
        return "hurt"
    return "unchanged"


def _build_lift(
    hybrid: list[QueryEvalResult],
    cohere: list[QueryEvalResult],
    subset: int,
) -> list[PerQueryLift]:
    """Pair-wise diff hybrid vs cohere per-query results, capped to first N main queries."""
    by_id_cohere = {r.query_id: r for r in cohere}
    out: list[PerQueryLift] = []
    main_count = 0
    for h in hybrid:
        if h.is_oos:
            continue
        if main_count >= subset > 0:
            break
        c = by_id_cohere.get(h.query_id)
        if c is None:
            continue
        delta = c.recall_at_5 - h.recall_at_5
        out.append(
            PerQueryLift(
                query_id=h.query_id,
                query_text=h.query_text,
                hybrid_recall_at_5=round(h.recall_at_5, 4),
                cohere_recall_at_5=round(c.recall_at_5, 4),
                delta=round(delta, 4),
                verdict=_verdict(delta),
                hybrid_search_latency_ms=h.search_latency_ms,
                cohere_search_latency_ms=c.search_latency_ms,
                error_hybrid=h.error,
                error_cohere=c.error,
            ),
        )
        main_count += 1
    return out


def _aggregate(per_query: list[PerQueryLift]) -> tuple[float, float, float, int, int, int, float, float]:
    """Return (hybrid_avg, cohere_avg, lift, helped, unchanged, hurt, avg_hybrid_ms, avg_cohere_ms)."""
    if not per_query:
        return (0.0, 0.0, 0.0, 0, 0, 0, 0.0, 0.0)
    n = len(per_query)
    hybrid_avg = sum(p.hybrid_recall_at_5 for p in per_query) / n
    cohere_avg = sum(p.cohere_recall_at_5 for p in per_query) / n
    helped = sum(1 for p in per_query if p.verdict == "helped")
    unchanged = sum(1 for p in per_query if p.verdict == "unchanged")
    hurt = sum(1 for p in per_query if p.verdict == "hurt")
    avg_hybrid_ms = sum(p.hybrid_search_latency_ms for p in per_query) / n
    avg_cohere_ms = sum(p.cohere_search_latency_ms for p in per_query) / n
    return (
        round(hybrid_avg, 4),
        round(cohere_avg, 4),
        round(cohere_avg - hybrid_avg, 4),
        helped,
        unchanged,
        hurt,
        round(avg_hybrid_ms, 1),
        round(avg_cohere_ms, 1),
    )


async def _run_engine(
    settings: Settings, eval_set: Path, with_cohere: bool, max_main_queries: int | None,
) -> list[QueryEvalResult]:
    """Run the eval-set through one engine (hybrid-only or hybrid+Cohere) and return per-query results.

    `max_main_queries` caps actual API calls(W5 D1 cost containment fix per Bug B —
    prior version capped only final aggregation but ran full eval).
    """
    embedder = AzureOpenAIEmbedder(
        endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        deployment=settings.azure_openai_deployment_embedding,
        dimensions=settings.embedding_dimension,
    )
    searcher = HybridSearcher(
        endpoint=settings.azure_search_endpoint,
        admin_key=settings.azure_search_admin_key,
        index_name=settings.azure_search_default_index,
    )
    reranker: CohereReranker | None = None
    if with_cohere:
        reranker = CohereReranker(
            endpoint=settings.cohere_endpoint,
            api_key=settings.cohere_api_key,
            model=settings.cohere_rerank_model,
            timeout_s=settings.cohere_request_timeout_s,
            path=settings.cohere_procurement_path,
        )

    async with embedder, searcher:
        if reranker is not None:
            await reranker.__aenter__()  # type: ignore[attr-defined]
        try:
            engine = RetrievalEngine(
                embedder=embedder, searcher=searcher, reranker=reranker,
                hybrid_overfetch_for_rerank=settings.hybrid_top_k_retrieval,
            )
            runner = EvalRunner(engine=engine, top_k=settings.rerank_top_k)
            report = await runner.run(eval_set, max_main_queries=max_main_queries)
        finally:
            if reranker is not None:
                await reranker.__aexit__(None, None, None)  # type: ignore[attr-defined]

    return report.per_query


async def _amain() -> int:
    args = _parse_args()
    eval_set: Path = args.eval_set
    output: Path = args.output
    subset: int = args.subset

    settings = get_settings()
    if not (settings.azure_openai_api_key and settings.azure_search_admin_key):
        print(
            "FAIL: AZURE_OPENAI_API_KEY or AZURE_SEARCH_ADMIN_KEY unset — populate .env per Q3 + Q4",
            file=sys.stderr,
        )
        return 1
    if not (settings.cohere_endpoint and settings.cohere_api_key):
        print(
            "DEFERRED: Cohere procurement pending — cohere_endpoint or cohere_api_key unset",
            file=sys.stderr,
        )
        print(
            "  Re-run after Chris populates .env per Q5 Path A Marketplace deploy.",
            file=sys.stderr,
        )
        return 1

    started_at = datetime.now(UTC).isoformat()
    cap = subset if subset > 0 else None

    print("=== Pass 1: Hybrid-only baseline ===")
    hybrid_results = await _run_engine(settings, eval_set, with_cohere=False, max_main_queries=cap)
    print(f"  evaluated {len(hybrid_results)} queries (cap={cap})")

    print("\n=== Pass 2: Hybrid + Cohere Rerank ===")
    cohere_results = await _run_engine(settings, eval_set, with_cohere=True, max_main_queries=cap)
    print(f"  evaluated {len(cohere_results)} queries (cap={cap})")

    finished_at = datetime.now(UTC).isoformat()

    per_query = _build_lift(hybrid_results, cohere_results, subset)
    (hybrid_avg, cohere_avg, lift, helped, unchanged, hurt,
     avg_h_ms, avg_c_ms) = _aggregate(per_query)

    summary = LiftSummary(
        eval_set=eval_set.name,
        subset=subset,
        started_at=started_at,
        finished_at=finished_at,
        queries_evaluated=len(per_query),
        hybrid_aggregate_recall_at_5=hybrid_avg,
        cohere_aggregate_recall_at_5=cohere_avg,
        lift_aggregate=lift,
        queries_helped=helped,
        queries_unchanged=unchanged,
        queries_hurt=hurt,
        avg_hybrid_search_latency_ms=avg_h_ms,
        avg_cohere_search_latency_ms=avg_c_ms,
        rerank_overhead_ms=round(avg_c_ms - avg_h_ms, 1),
        per_query=per_query,
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(asdict(summary), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # ASCII labels(W5 D1 Bug A fix:Windows charmap codec cannot encode 📊 / 📁 / ✅ / ⚠️ / ❌ — drop emoji for cross-shell stdout compatibility)
    print("\n[results] Cohere lift smoke:")
    print(f"  {'query_id':<10}{'hybrid':>8}{'cohere':>8}{'delta':>8}  verdict")
    print("  " + "-" * 50)
    for p in per_query:
        sign = "+" if p.delta > 0 else ""
        print(
            f"  {p.query_id:<10}{p.hybrid_recall_at_5:>8.4f}"
            f"{p.cohere_recall_at_5:>8.4f}{sign}{p.delta:>7.4f}  {p.verdict}",
        )
    print("  " + "-" * 50)
    sign = "+" if lift > 0 else ""
    print(
        f"  {'aggregate':<10}{hybrid_avg:>8.4f}{cohere_avg:>8.4f}"
        f"{sign}{lift:>7.4f}  helped={helped} unchanged={unchanged} hurt={hurt}",
    )
    print(
        f"\n  rerank overhead: +{summary.rerank_overhead_ms:.1f}ms avg search latency",
    )
    print(f"\n[output] Full JSON -> {output}")

    if lift > 0:
        print("\n[PASS] Cohere aggregate lift > 0")
    elif lift == 0:
        print("\n[NEUTRAL] Cohere aggregate lift == 0 (revisit thresholds + sample)")
    else:
        print("\n[FAIL] Cohere REGRESSION: aggregate lift < 0 (escalate to Q21 reranker re-pick)")
    return 0


def main() -> int:
    try:
        return asyncio.run(_amain())
    except SystemExit as exc:
        if isinstance(exc.code, int):
            return exc.code
        print(str(exc), file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001 — top-level driver swallows for exit code
        print(f"FAIL: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
