"""W98 F4 — live A/B verify: confirm the RUNNING backend honours section_anchor_nearest.

Unit tests (F1) + effective_config resolution (F2) pass, but pytest-green ≠ the
running server has the code (memory project_stale_backend_no_reload). This hits the
LIVE /query on drive-images-1 with the current config (baseline) vs nearest+cap8,
and checks two things per high-image-density query:

  1. clump (max consecutive [IMG#] run) DROPS under nearest → the running backend
     actually applies the leaf-level spread (end-to-end wiring proof);
  2. the citation image checksum SET is IDENTICAL across arms → image-recall is
     UNAFFECTED (inject only repositions markers in the answer text; it never mutates
     citations, so the surfaced image set — what run_image_recall scores — can't move).

Leaves drive-images-1 at nearest+cap8 (the F3 decision = the intended production
config for this KB). Run: backend/.venv/Scripts/python.exe -m scripts.diag_leaf_anchor_live
"""

from __future__ import annotations

import truststore

truststore.inject_into_ssl()

import json  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]

import httpx  # noqa: E402

from scripts.diag_leaf_anchor import max_consecutive_run, marker_count  # noqa: E402

_BASE_URL = "http://localhost:8000"
_TOKEN = "dev-token"
_KB_ID = "drive-images-1"
_OUT = Path("reports/leaf_anchor_live.json")
_QUERIES = [
    ("Q001", "How do I record a payment collection from a customer?"),
    ("Q036", "Hey, can you walk me through how to log a customer payment? My screen looks different from the manual."),
    ("Q003", "What is the procedure to write off a receivable?"),
]


def _img_set(citations: list[dict]) -> set[str]:
    out: set[str] = set()
    for c in citations:
        for im in c.get("embedded_images") or []:
            sha = str(im.get("checksum_sha256") or "")
            if sha:
                out.add(sha[:8])
    return out


def _capture(client: httpx.Client, qtext: str) -> tuple[str, set[str]]:
    r = client.post("/query", json={"query": qtext, "kb_id": _KB_ID})
    r.raise_for_status()
    body = r.json()
    return str(body.get("answer") or ""), _img_set(body.get("citations") or [])


def _get_config(client: httpx.Client) -> dict:
    for kb in client.get("/kb").json():
        if kb.get("kb_id") == _KB_ID:
            return dict(kb["config"])
    raise RuntimeError(f"KB {_KB_ID} not found")


def main() -> int:
    headers = {"Authorization": f"Bearer {_TOKEN}"}
    rows = []
    with httpx.Client(base_url=_BASE_URL, headers=headers, timeout=300.0) as client:
        original = _get_config(client)
        print(
            f"baseline config: nearest={original.get('section_anchor_nearest')} "
            f"cap={original.get('section_anchor_max_per_anchor')}"
        )
        # Arm A — baseline (current config)
        base = {}
        for qid, qtext in _QUERIES:
            ans, imgs = _capture(client, qtext)
            base[qid] = (ans, imgs)
            print(f"  A {qid}: clump={max_consecutive_run(ans)} markers={marker_count(ans)} imgs={len(imgs)}")

        # Set nearest + cap8 (F3 decision = intended production config for this KB)
        new_cfg = dict(original)
        new_cfg["section_anchor_nearest"] = True
        new_cfg["section_anchor_max_per_anchor"] = 8
        res = client.patch(f"/kb/{_KB_ID}/settings", json=new_cfg)
        res.raise_for_status()
        rc = res.json()
        print(
            f"set config: nearest={rc.get('section_anchor_nearest')} "
            f"cap={rc.get('section_anchor_max_per_anchor')}"
        )

        # Arm B — nearest + cap8
        for qid, qtext in _QUERIES:
            ans, imgs = _capture(client, qtext)
            ba, bi = base[qid]
            clump_a, clump_b = max_consecutive_run(ba), max_consecutive_run(ans)
            set_identical = imgs == bi
            rows.append({
                "query_id": qid,
                "clump_baseline": clump_a,
                "clump_nearest": clump_b,
                "markers_baseline": marker_count(ba),
                "markers_nearest": marker_count(ans),
                "img_set_baseline": len(bi),
                "img_set_nearest": len(imgs),
                "img_set_identical": set_identical,
            })
            print(
                f"  B {qid}: clump {clump_a}->{clump_b}  "
                f"img_set_identical={set_identical} ({len(bi)} vs {len(imgs)})"
            )

    all_recall_ok = all(r["img_set_identical"] for r in rows)
    clump_improved = sum(1 for r in rows if r["clump_nearest"] < r["clump_baseline"])
    print("\n=== F4 live verdict ===")
    print(f"  image set identical (recall unaffected) all queries: {all_recall_ok}")
    print(f"  clump improved (nearest applied on running backend): {clump_improved}/{len(rows)}")
    _OUT.parent.mkdir(parents=True, exist_ok=True)
    _OUT.write_text(
        json.dumps(
            {"recall_set_identical_all": all_recall_ok,
             "clump_improved": clump_improved, "rows": rows},
            ensure_ascii=False, indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nreport -> {_OUT}  (drive-images-1 left at nearest+cap8)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
