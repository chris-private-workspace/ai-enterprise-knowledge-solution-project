"""W52 live driver: synthetic-QA self-supervised Recall@K for a KB.

Generates one LLM question per sampled chunk (source chunk = ground truth), then
runs the existing EvalRunner strict-mode → self-supervised Recall@K. Writes the
synthetic eval-set YAML (reusable artifact) + a recall report. This is the offline
engineering harness behind 決策 7 Option d「更深半邊」(true recall, vs W51's coverage
proxy) and the W52 foundation for W53 (reindex strategy 比較).

Usage (from project root, judge credential + indexed KB required):
    backend/.venv/Scripts/python.exe -m scripts.run_synthetic_recall --kb-id drive_user_manuals
    backend/.venv/Scripts/python.exe -m scripts.run_synthetic_recall \\
        --kb-id test-kb-20260530-1 --sample 30 --seed 0 --top-k 5

NOTE: synthetic / self-supervised recall — closer to true recall than W51's coverage
proxy, but NOT human-validated ground truth (LLM-generated questions + single-chunk
grounding carry their own bias).

Exit codes:
    0 — ran end-to-end; recall report written + verdict printed
    1 — env missing / no judge credential / engine init failed / runtime exception
"""

from __future__ import annotations

# OS trust store for TLS (Ricoh corp proxy SSL inspection) — before any ssl import.
import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from eval.runner import report_to_yaml  # noqa: E402
from eval.synthetic_qa import make_qa_generator, run_synthetic_recall  # noqa: E402
from ingestion.embedding.azure_openai_embedder import AzureOpenAIEmbedder  # noqa: E402
from retrieval.hybrid import HybridSearcher  # noqa: E402
from retrieval.retrieval_engine import RetrievalEngine  # noqa: E402
from storage.settings import get_settings  # noqa: E402

DEFAULT_INDEX_NAME = "ekp-kb-drive-v1"  # legacy fallback; kb_id drives per-KB index


async def _amain(args: argparse.Namespace) -> int:
    settings = get_settings()
    if not (settings.azure_openai_api_key and settings.azure_search_admin_key):
        print(
            "ERROR: AZURE_OPENAI_API_KEY / AZURE_SEARCH_ADMIN_KEY missing",
            file=sys.stderr,
        )
        return 1

    generate_fn = make_qa_generator(settings)
    if generate_fn is None:
        print(
            "ERROR: no Azure OpenAI judge credential — synthetic-QA generator unavailable",
            file=sys.stderr,
        )
        return 1

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
        index_name=args.index,
    )

    async with embedder, searcher:
        engine = RetrievalEngine(embedder=embedder, searcher=searcher)
        report = await run_synthetic_recall(
            engine,
            args.kb_id,
            generate_fn=generate_fn,
            output_path=args.output,
            sample_size=args.sample,
            seed=args.seed,
            top_k=args.top_k,
        )

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(report_to_yaml(report), encoding="utf-8")

    print(f"\n{'=' * 60}")
    print("W52 synthetic-QA self-supervised recall")
    print(f"  KB:                              {args.kb_id}")
    print(f"  Sample size / seed:              {args.sample} / {args.seed}")
    print(f"  Synthetic queries evaluated:     {report.queries_evaluated}")
    print(
        f"  Self-supervised Recall@{args.top_k}:        {report.aggregate_recall_at_5:.4f}"
    )
    print(f"  Mode breakdown:                  {report.mode_breakdown}")
    print(f"  Errored:                         {report.queries_errored}")
    print(f"  Synthetic eval-set:              {args.output}")
    print(f"  Recall report:                   {args.report}")
    print("  NOTE: synthetic/self-supervised — NOT human ground-truth recall.")
    print(f"{'=' * 60}\n")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kb-id", required=True, help="KB id (drives per-KB index)")
    parser.add_argument(
        "--sample", type=int, default=30, help="chunks to sample (default 30)"
    )
    parser.add_argument(
        "--seed", type=int, default=0, help="sampling seed (reproducible; default 0)"
    )
    parser.add_argument(
        "--top-k", type=int, default=5, help="retrieval top-K for recall (default 5)"
    )
    parser.add_argument(
        "--index", default=DEFAULT_INDEX_NAME, help="legacy fallback index name"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("reports/synthetic-qa-eval-set.yaml"),
        help="synthetic eval-set YAML output path",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=Path("reports/synthetic_recall.yaml"),
        help="recall report YAML output path",
    )
    return asyncio.run(_amain(parser.parse_args()))


if __name__ == "__main__":
    raise SystemExit(main())
