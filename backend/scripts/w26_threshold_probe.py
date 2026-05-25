"""W26 F1 augmentation — per-chunk Cohere reranker score probe.

Per Chris pick 2026-05-25 (A) — derive F2 threshold initial value from F1 baseline
score distribution (Q2 locked decision: NOT magic 0.3).

Hits retrieval engine directly via Python (bypasses /eval/run endpoint which
returns aggregated EvalReport schema without per-chunk scores). Picks 5 priority
queries spanning the failure modes surfaced in baseline-metrics-W26-D1.md:

- Q-W25-I01 (control — passed all RAGAs metrics, including image association)
- Q-W25-I07 (failed user query post-BUG-025 fix — passed RAGAs but user observed
  enumeration completeness gap)
- Q-W25-I02 (context_recall=0.00 + precision=0.70 — enumeration symptom)
- Q-W25-I03 (context_recall=0.00 — retrieval recall miss)
- Q-W25-T04 (precision=0.00 + recall=0.00 — total retrieval miss)

Output: per-query top-5 reranker scores + aggregated distribution to
docs/01-planning/W26-eval-driven-retrieval-tuning/threshold-probe-W26-D1.json
"""

from __future__ import annotations

# Use OS trust store (Windows Cert Store) for TLS — Ricoh corp proxy SSL
# inspection per ADR-0017 R8 P2 mitigation. Must run before any ssl/urllib3/httpx import.
import truststore  # noqa: E402

truststore.inject_into_ssl()

import asyncio  # noqa: E402
import json  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402
from typing import Any  # noqa: E402

# Ensure backend/ is on sys.path so absolute imports resolve when run from any cwd
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ingestion.embedding.azure_openai_embedder import AzureOpenAIEmbedder  # noqa: E402
from retrieval.hybrid import HybridSearcher  # noqa: E402
from retrieval.reranker.factory import make_reranker  # noqa: E402
from retrieval.retrieval_engine import RetrievalEngine  # noqa: E402
from storage.settings import get_settings  # noqa: E402

PROBE_QUERIES = [
    ("Q-W25-I01", "How does the high-level architecture look like? Show me the system zones."),
    ("Q-W25-I07", "Show me all the Integration scenarios."),
    ("Q-W25-I02", "What are the integration components in the platform?"),
    ("Q-W25-I03", "What does the deployment topology look like for the integration platform?"),
    ("Q-W25-T04", "How is CI-CD pipeline set up in the implementation plan?"),
]

KB_ID = "sample-document-with-image-1"
TOP_K = 5


async def probe() -> dict[str, Any]:
    settings = get_settings()
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
        image_weight=settings.retrieval_image_low_value_weight,
    )
    reranker = make_reranker(settings)
    await embedder.__aenter__()
    await searcher.__aenter__()
    if reranker is not None:
        await reranker.__aenter__()
    engine = RetrievalEngine(
        embedder=embedder,
        searcher=searcher,
        reranker=reranker,
        hybrid_overfetch_for_rerank=settings.hybrid_top_k_retrieval,
    )

    results: dict[str, Any] = {
        "reranker_model": settings.cohere_rerank_model,
        "top_k": TOP_K,
        "kb_id": KB_ID,
        "queries": [],
    }
    all_scores: list[float] = []
    for query_id, query_text in PROBE_QUERIES:
        result = await engine.retrieve(
            query=query_text, kb_id=KB_ID, top_k=TOP_K, rerank=True
        )
        per_chunk = []
        for chunk in result.chunks:
            score = float(getattr(chunk, "score", 0.0))
            fields = getattr(chunk, "fields", {}) or {}
            chunk_id = (
                getattr(chunk, "chunk_id", None)
                or fields.get("chunk_id")
                or "?"
            )
            section_path = (
                getattr(chunk, "section_path", None) or fields.get("section_path") or []
            )
            low_value = bool(
                getattr(chunk, "low_value_flag", False)
                or fields.get("low_value_flag", False)
            )
            images_json = (
                getattr(chunk, "embedded_images_json", None)
                or fields.get("embedded_images_json", "")
                or ""
            )
            per_chunk.append({
                "chunk_id": chunk_id,
                "score": score,
                "section_path": section_path,
                "low_value_flag": low_value,
                "has_images": bool(images_json and images_json.strip() not in ("", "[]")),
            })
            if score is not None:
                all_scores.append(score)
        results["queries"].append({
            "query_id": query_id,
            "query_text": query_text,
            "chunks_count": len(result.chunks),
            "rerank_latency_ms": result.rerank_latency_ms,
            "chunks": per_chunk,
        })

    if all_scores:
        sorted_scores = sorted(all_scores)
        n = len(sorted_scores)
        results["distribution"] = {
            "count": n,
            "min": min(sorted_scores),
            "p25": sorted_scores[n // 4] if n >= 4 else sorted_scores[0],
            "p50_median": sorted_scores[n // 2],
            "p75": sorted_scores[3 * n // 4] if n >= 4 else sorted_scores[-1],
            "max": max(sorted_scores),
            "mean": sum(sorted_scores) / n,
        }
    else:
        results["distribution"] = {"count": 0, "note": "no scores captured"}

    await embedder.__aexit__(None, None, None)
    await searcher.__aexit__(None, None, None)
    if reranker is not None:
        await reranker.__aexit__(None, None, None)
    return results


if __name__ == "__main__":
    results = asyncio.run(probe())
    out_path = (
        Path(__file__).resolve().parents[2]
        / "docs/01-planning/W26-eval-driven-retrieval-tuning/threshold-probe-W26-D1.json"
    )
    out_path.write_text(json.dumps(results, indent=2, default=str), encoding="utf-8")
    print(f"Wrote {out_path}")
    print(json.dumps(results["distribution"], indent=2))
