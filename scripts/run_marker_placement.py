"""W70 F8 — marker-placement driver: judge knob-ON answers' [IMG#sha8] markers.

For each query in the image-recall GT set (`docs/eval-set-image-recall-ar.yaml`),
POST the FULL `/query` pipeline and judge the answer's inline image markers on
four axes (validity / coverage / placement accuracy / dup rate — pure logic in
`backend/eval/marker_placement.py`), then emit a YAML report including the
manual review table (人工覆核表) for the AC4 verdict.

Source-of-truth contexts come from the live Azure index: one full walk of the
KB's chunks collecting `chunk_text_marked` (the synthesizer's input when the
knob is ON), so placement scoring compares answer context against the exact
text the LLM saw.

Prerequisites:
- backend up on W70 code (backend/.venv/Scripts/python.exe -m api.server) with
  HYBRID_USE_SEMANTIC_RANKER=false in .env (Free-tier semantic 402 dodge).
- drive-images-1 re-indexed with `chunk_text_marked` (W70 F7) AND the per-KB
  knob `enable_inline_image_markers` ON — zero markers across all answers makes
  this exit 2 (the per-KB resolve trap would otherwise read as a perfect run).
- mock auth: Bearer dev-token.

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.run_marker_placement
    backend/.venv/Scripts/python.exe -m scripts.run_marker_placement \
        --eval-set docs/eval-set-image-recall-ar.yaml \
        --base-url http://localhost:8000 --out reports/marker_placement_ar.yaml
"""

from __future__ import annotations

# OS trust store for corp-proxy TLS — must run before httpx import.
import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import json  # noqa: E402
import re  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import httpx  # noqa: E402
import yaml  # noqa: E402

from eval.image_recall import extract_returned_checksums  # noqa: E402
from eval.marker_placement import (  # noqa: E402
    QueryPlacementResult,
    aggregate,
    build_source_occurrences,
    evaluate_answer,
    own_markers_by_chunk,
    report_to_dict,
)
from storage.settings import get_settings  # noqa: E402

_DEFAULT_EVAL_SET = Path("docs/eval-set-image-recall-ar.yaml")
_DEFAULT_BASE_URL = "http://localhost:8000"
_DEFAULT_TOKEN = "dev-token"  # mock auth (per memory)
_DEFAULT_OUT = Path("reports/marker_placement_ar.yaml")
_SEARCH_API = "2024-07-01"

# The pipeline's inline citation placeholders (`[chunk-<id>]`) are NOT prose —
# the chat UI converts them to citation chips. Left in, their id token soup
# (kb / doc / 0601 / fna / ...) dilutes every context window and randomises the
# placement tie-break (first F8 run: 65/68 flags were <0.05 near-ties from this).
_CITATION_TOKEN_RE = re.compile(r"\[chunk-[^\]]+\]")


async def _walk_marked_chunks(kb_id: str) -> dict[str, str]:
    """One full index walk: chunk_id -> chunk_text_marked (may be "")."""
    s = get_settings()
    endpoint = s.azure_search_endpoint.rstrip("/")
    index = f"ekp-kb-{kb_id}-v1"
    out: dict[str, str] = {}
    async with httpx.AsyncClient(
        timeout=httpx.Timeout(60.0, connect=10.0),
        headers={"Content-Type": "application/json", "api-key": s.azure_search_admin_key},
    ) as client:
        skip = 0
        while True:
            r = await client.post(
                f"{endpoint}/indexes/{index}/docs/search?api-version={_SEARCH_API}",
                content=json.dumps(
                    {
                        "search": "*",
                        "select": "chunk_id,chunk_text_marked",
                        "top": 100,
                        "skip": skip,
                        # chunk_index is the only sortable field (W70 F7 lesson)
                        "orderby": "chunk_index asc",
                    }
                ),
            )
            if r.status_code != 200:
                raise RuntimeError(f"index walk failed {r.status_code}: {r.text[:300]}")
            rows = r.json().get("value", [])
            if not rows:
                break
            for row in rows:
                out[str(row["chunk_id"])] = str(row.get("chunk_text_marked") or "")
            skip += len(rows)
    return out


async def _run_one(
    client: httpx.AsyncClient,
    query_id: str,
    query_text: str,
    kb_id: str,
    source_occ: dict,
    chunk_own: dict[str, set[str]],
) -> tuple[QueryPlacementResult, str]:
    """Returns (result, raw answer) — answer persisted for offline re-review."""
    try:
        resp = await client.post("/query", json={"query": query_text, "kb_id": kb_id})
        resp.raise_for_status()
        body = resp.json()
    except httpx.HTTPStatusError as exc:
        err = f"HTTP {exc.response.status_code}: {exc.response.text[:160]}"
        return _error_result(query_id, query_text, err), ""
    except Exception as exc:  # noqa: BLE001 — surface per query
        return _error_result(query_id, query_text, f"{type(exc).__name__}: {exc}"), ""

    citations = body.get("citations", []) or []
    answer = str(body.get("answer") or "")
    result = evaluate_answer(
        query_id=query_id,
        query_text=query_text,
        answer=_CITATION_TOKEN_RE.sub("", answer),
        returned_checksums=extract_returned_checksums(citations),
        cited_chunk_ids=[str(c.get("chunk_id") or "") for c in citations],
        source_occ=source_occ,
        chunk_own=chunk_own,
    )
    return result, answer


def _error_result(query_id: str, query_text: str, error: str) -> QueryPlacementResult:
    return QueryPlacementResult(
        query_id=query_id,
        query_text=query_text,
        total_markers=0,
        unique_markers=0,
        valid_markers=0,
        invalid_unknown=0,
        invalid_not_returned=0,
        validity=0.0,
        cited_own_count=0,
        cited_own_in_answer=0,
        coverage=0.0,
        scorable_markers=0,
        misplaced_count=0,
        misplaced_rate=0.0,
        dup_rate=0.0,
        error=error,
    )


async def _amain(eval_set_path: Path, base_url: str, token: str, out_path: Path) -> int:
    if not eval_set_path.is_file():
        print(f"eval-set not found: {eval_set_path}", file=sys.stderr)
        return 1
    eval_set = yaml.safe_load(eval_set_path.read_text(encoding="utf-8"))
    meta = eval_set.get("metadata", {})
    kb_id = str(meta.get("kb_id", ""))
    queries = eval_set.get("queries", [])
    if not kb_id or not queries:
        print("eval-set missing metadata.kb_id or queries", file=sys.stderr)
        return 1

    print(f"walking index for {kb_id} (chunk_text_marked source map) ...")
    marked_by_chunk = await _walk_marked_chunks(kb_id)
    source_occ = build_source_occurrences(marked_by_chunk)
    chunk_own = own_markers_by_chunk(marked_by_chunk)
    print(
        f"  {len(marked_by_chunk)} chunks walked, "
        f"{sum(len(v) for v in source_occ.values())} source marker occurrences, "
        f"{len(source_occ)} distinct sha8"
    )

    per_query: list[QueryPlacementResult] = []
    answers: dict[str, str] = {}
    async with httpx.AsyncClient(
        base_url=base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=300.0,  # full pipeline — loaded machine can be slow
    ) as client:
        for q in queries:
            qid = str(q.get("query_id", ""))
            qtext = str(q.get("query_text", ""))
            q_kb_id = str(q.get("kb_id") or kb_id)
            result, answer = await _run_one(client, qid, qtext, q_kb_id, source_occ, chunk_own)
            answers[qid] = answer
            if result.error is not None:
                print(f"  {qid}: ERROR {result.error}")
            else:
                print(
                    f"  {qid}: markers={result.total_markers} "
                    f"validity={result.validity:.2f} coverage={result.coverage:.2f} "
                    f"misplaced={result.misplaced_count}/{result.scorable_markers} "
                    f"dup={result.dup_rate:.2f}"
                )
            per_query.append(result)

    report = aggregate(eval_set_path.name, kb_id, per_query)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        yaml.safe_dump(report_to_dict(report), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    answers_path = out_path.with_name(out_path.stem + "_answers.yaml")
    answers_path.write_text(
        yaml.safe_dump(answers, sort_keys=True, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"\nMarker-placement report written: {out_path}")
    print(f"Raw answers written: {answers_path}")
    print(
        f"mean validity = {report.mean_validity:.3f} | "
        f"mean coverage = {report.mean_coverage:.3f} | "
        f"micro misplaced rate = {report.micro_misplaced_rate:.4f} | "
        f"mean dup rate = {report.mean_dup_rate:.3f}"
    )
    if report.total_markers == 0 and report.scored_queries > 0:
        print(
            "WARNING: zero markers across ALL answers — the per-KB knob is "
            "probably OFF (per-KB resolve trap). Report written but NOT meaningful.",
            file=sys.stderr,
        )
        return 2
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path, default=_DEFAULT_EVAL_SET)
    parser.add_argument("--base-url", default=_DEFAULT_BASE_URL)
    parser.add_argument("--token", default=_DEFAULT_TOKEN)
    parser.add_argument("--out", type=Path, default=_DEFAULT_OUT)
    args = parser.parse_args()
    return asyncio.run(_amain(args.eval_set, args.base_url, args.token, args.out))


if __name__ == "__main__":
    raise SystemExit(main())
