"""W70 F8 — order-consistency check over saved marker-placement answers.

Re-scores the answers persisted by `scripts/run_marker_placement.py`
(`*_answers.yaml`) WITHOUT re-querying: walks the live index for source marker
positions and counts adjacent-pair order inversions per answer, classified as
artifact / cross_chunk / local_swap (see `eval.marker_placement.OrderCheck`).
`local_swap` is the REAL misplacement signal — orthogonal to the context-
similarity proxy, immune to its boilerplate false positives.

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.check_marker_order
    backend/.venv/Scripts/python.exe -m scripts.check_marker_order \
        --answers reports/marker_placement_ar_answers.yaml --kb-id drive-images-1
"""

from __future__ import annotations

# OS trust store for corp-proxy TLS — must run before httpx import.
import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import json  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import httpx  # noqa: E402
import yaml  # noqa: E402

from eval.marker_placement import build_source_occurrences, order_consistency  # noqa: E402
from storage.settings import get_settings  # noqa: E402

_DEFAULT_ANSWERS = Path("reports/marker_placement_ar_answers.yaml")
_DEFAULT_KB_ID = "drive-images-1"
_SEARCH_API = "2024-07-01"


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


async def _amain(answers_path: Path, kb_id: str) -> int:
    if not answers_path.is_file():
        print(f"answers file not found: {answers_path}", file=sys.stderr)
        return 1
    answers: dict[str, str] = yaml.safe_load(answers_path.read_text(encoding="utf-8"))

    print(f"walking index for {kb_id} (source marker positions) ...")
    source_occ = build_source_occurrences(await _walk_marked_chunks(kb_id))

    total_pairs = 0
    totals = {"artifact": 0, "cross_chunk": 0, "local_swap": 0}
    for qid in sorted(answers):
        check = order_consistency(answers[qid] or "", source_occ)
        total_pairs += check.pairs
        for inv in check.inversions:
            totals[inv.kind] += 1
            print(f"  {qid}: {inv.sha8_earlier} -> {inv.sha8_later} [{inv.kind}]")
        print(
            f"  {qid}: pairs={check.pairs} inversions={len(check.inversions)} "
            f"real_local_swaps={check.real_local_swaps}"
        )

    swaps = totals["local_swap"]
    rate = swaps / total_pairs if total_pairs else 0.0
    print(
        f"\nTOTAL pairs={total_pairs} | artifact={totals['artifact']} "
        f"cross_chunk={totals['cross_chunk']} | REAL local swaps={swaps} "
        f"({rate:.4f})"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--answers", type=Path, default=_DEFAULT_ANSWERS)
    parser.add_argument("--kb-id", default=_DEFAULT_KB_ID)
    args = parser.parse_args()
    return asyncio.run(_amain(args.answers, args.kb_id))


if __name__ == "__main__":
    raise SystemExit(main())
