"""Eval-set GT discovery helper — surface retrieved chunk previews per query.

Iterates an eval-set YAML, runs retrieval against the populated per-KB index, and
emits the top-k retrieved chunks per query (preview + section_path + title + score)
for SME review (Chris).

W44 F4.5 repurpose (content-based GT, per user decision 2026-06-03):
The output is for the SME to write **content-based** ground truth —
`expected_answer_keywords` (+ optional `reference_answer`) — NOT to pick
`acceptable_chunk_ids`. Rationale: chunk_ids are chunker-specific; the W44
no-regression comparison re-chunks the corpus twice (cap=None before / cap=8
after) so a single acceptable_chunk_ids set cannot validly score both indexes.
Keyword / reference GT is chunker-agnostic → the same GT scores both re-chunks
(keyword-mode recall + RAGAs context_recall), and permanently resolves the
eval-set-v1-draft empty-GT gap (Q14 SME-validation pending since W2).

Originally a W2 D5 F8 helper (eval-set-v0 → v1 placeholder resolution). Fixed
W44 F4.5 for the ADR-0018 multi-KB invariant: `engine.retrieve` now requires
`kb_id` (the pre-fix W2 call omitted it and would `TypeError` on the current
signature). Eval-set / KB / output are now CLI args.

Live run prerequisites:
- `.env` carries AZURE_OPENAI_API_KEY + AZURE_SEARCH_ADMIN_KEY
- the target KB index is populated (W44: drive_user_manuals re-indexed with images)

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.discover_chunk_ids \
        --eval-set docs/eval-set-v1-draft.yaml --kb-id drive_user_manuals
"""

from __future__ import annotations

# Use OS trust store (Windows Cert Store) for TLS verification so Ricoh corp
# proxy SSL inspection is honoured. Must run before any ssl/urllib3/httpx import.
import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

# sys.path bootstrap (per W2 D2 convention)
_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import yaml  # noqa: E402  — after sys.path bootstrap

from ingestion.embedding.azure_openai_embedder import AzureOpenAIEmbedder  # noqa: E402
from retrieval.hybrid import HybridSearcher  # noqa: E402
from retrieval.retrieval_engine import RetrievalEngine  # noqa: E402
from storage.kb_naming import kb_id_to_index_name  # noqa: E402
from storage.settings import get_settings  # noqa: E402

_DEFAULT_EVAL_SET = Path("docs/eval-set-v1-draft.yaml")
_DEFAULT_KB_ID = "drive_user_manuals"
_DEFAULT_TOP_K = 8  # surface a few extras so the SME has context to write keywords


def _default_out(eval_set_path: Path) -> Path:
    return Path("reports") / f"{eval_set_path.stem}_gt_candidates.yaml"


async def _amain(
    eval_set_path: Path,
    kb_id: str,
    out_path: Path,
    top_k: int,
) -> int:
    if not eval_set_path.is_file():
        print(f"eval set not found: {eval_set_path}", file=sys.stderr)
        return 1

    settings = get_settings()
    if not settings.azure_openai_api_key or not settings.azure_search_admin_key:
        print(
            "AZURE_OPENAI_API_KEY or AZURE_SEARCH_ADMIN_KEY missing in .env — "
            "cannot run GT discovery",
            file=sys.stderr,
        )
        return 1

    eval_set = yaml.safe_load(eval_set_path.read_text(encoding="utf-8"))
    queries = eval_set.get("queries", [])
    candidates: list[dict] = []

    async with AzureOpenAIEmbedder(
        endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
        deployment=settings.azure_openai_deployment_embedding,
        dimensions=settings.embedding_dimension,
    ) as embedder, HybridSearcher(
        endpoint=settings.azure_search_endpoint,
        admin_key=settings.azure_search_admin_key,
        index_name=kb_id_to_index_name(kb_id),
    ) as searcher:
        engine = RetrievalEngine(embedder=embedder, searcher=searcher)
        for q in queries:
            query_id = q.get("query_id", "")
            query_text = q.get("query_text", "")
            is_oos = bool(q.get("ground_truth", {}).get("expected_refusal", False))
            if is_oos:
                continue  # OOS queries are scored separately for refusal accuracy
            # ADR-0018 multi-KB invariant: per-query kb_id override OR CLI default.
            q_kb_id = str(q.get("kb_id") or kb_id)
            try:
                result = await engine.retrieve(
                    query=query_text, kb_id=q_kb_id, top_k=top_k,
                )
                candidates.append(
                    {
                        "query_id": query_id,
                        "query_text": query_text,
                        "kb_id": q_kb_id,
                        "current_expected_keywords": q.get("ground_truth", {})
                        .get("expected_answer_keywords", []),
                        "discovered_top_k": [
                            {
                                "chunk_id": c.fields.get("chunk_id"),
                                "doc_id": c.fields.get("doc_id"),
                                "section_path": c.fields.get("section_path"),
                                "chunk_title": c.fields.get("chunk_title"),
                                "score": round(c.score, 3),
                                "chunk_text_preview": str(
                                    c.fields.get("chunk_text", ""),
                                )[:300],
                            }
                            for c in result.chunks
                        ],
                    },
                )
            except Exception as exc:  # noqa: BLE001
                candidates.append({
                    "query_id": query_id,
                    "query_text": query_text,
                    "kb_id": q_kb_id,
                    "error": f"{type(exc).__name__}: {exc}",
                })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        yaml.safe_dump(
            {
                "metadata": {
                    "source_eval_set": str(eval_set_path),
                    "kb_id": kb_id,
                    "index_name": kb_id_to_index_name(kb_id),
                    "top_k_per_query": top_k,
                    "purpose": (
                        "SME review (Chris): from each query's discovered_top_k, "
                        "write CONTENT-BASED ground truth — expected_answer_keywords "
                        "(+ optional reference_answer) — into the eval-set, then set "
                        "annotation.validated: true. Content-based GT is "
                        "chunker-agnostic so it scores both the cap=None and cap=8 "
                        "re-chunks identically (W44 F4 rigor track). Do NOT pick "
                        "acceptable_chunk_ids — chunk_ids shift on re-chunk."
                    ),
                },
                "candidates": candidates,
            },
            sort_keys=False,
            allow_unicode=True,
        ),
        encoding="utf-8",
    )

    print(f"GT candidate report written: {out_path}")
    print(f"Reviewed {len(candidates)} non-OOS queries, top-{top_k} per query.")
    print(
        "Next step (F4.6): Chris writes expected_answer_keywords (+ optional "
        "reference_answer) per query into the eval-set, sets annotation.validated: "
        "true. Content-based GT — do NOT pick acceptable_chunk_ids (chunker-specific).",
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path, default=_DEFAULT_EVAL_SET)
    parser.add_argument("--kb-id", default=_DEFAULT_KB_ID)
    parser.add_argument("--out", type=Path, default=None, help="default: reports/<eval-set-stem>_gt_candidates.yaml")
    parser.add_argument("--top-k", type=int, default=_DEFAULT_TOP_K)
    args = parser.parse_args()
    out_path = args.out if args.out is not None else _default_out(args.eval_set)
    return asyncio.run(_amain(args.eval_set, args.kb_id, out_path, args.top_k))


if __name__ == "__main__":
    raise SystemExit(main())
