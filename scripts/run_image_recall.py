"""W59 F3/F4 — image-recall driver: run GT queries through the live /query pipeline.

For each query in an image-recall eval-set (W59 F2 GT, e.g.
`docs/eval-set-image-recall-ar.yaml`), POST the FULL `/query` pipeline, collect the
returned image checksums (citations[].embedded_images[].checksum_sha256), compare
against `ground_truth.expected_images`, and report image-recall / image-precision
per query + aggregate.

Why hit /query (not retrieve-only): the answer's image set is produced by the full
pipeline's selection chain (citation → neighbour-image → overview-pin → cap). A
retrieve-only path would NOT measure what the user actually sees (memory
`project_v4_retrieve_only_vs_query_pipeline`).

Prerequisites (F4 live run):
- backend up (backend/.venv/Scripts/python.exe -m api.server) — START WITH
  `HYBRID_USE_SEMANTIC_RANKER=false` to dodge the Free-tier semantic 402 (memory).
- azurite + the target index (drive-images-1) populated.
- mock auth: Bearer dev-token.

Usage (from project root):
    backend/.venv/Scripts/python.exe -m scripts.run_image_recall
    backend/.venv/Scripts/python.exe -m scripts.run_image_recall \
        --eval-set docs/eval-set-image-recall-ar.yaml \
        --base-url http://localhost:8000 --out reports/image_recall_ar.yaml
"""

from __future__ import annotations

# OS trust store for corp-proxy TLS — must run before httpx import.
import truststore

truststore.inject_into_ssl()

import argparse  # noqa: E402
import asyncio  # noqa: E402
import sys  # noqa: E402
from pathlib import Path  # noqa: E402

_BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

import httpx  # noqa: E402
import yaml  # noqa: E402

from eval.image_recall import (  # noqa: E402
    ImageRecallMetrics,
    ImageRecallQueryResult,
    aggregate,
    compute_metrics,
    extract_returned_checksums,
    report_to_dict,
)

_DEFAULT_EVAL_SET = Path("docs/eval-set-image-recall-ar.yaml")
_DEFAULT_BASE_URL = "http://localhost:8000"
_DEFAULT_TOKEN = "dev-token"  # mock auth (per memory)


def _default_out(eval_set_path: Path) -> Path:
    return Path("reports") / f"{eval_set_path.stem}_results.yaml"


async def _run_one(
    client: httpx.AsyncClient,
    query_text: str,
    kb_id: str,
    expected: set[str],
) -> tuple[ImageRecallMetrics | None, str | None]:
    """POST /query, extract returned checksums, compute metrics. Returns (metrics, error)."""
    try:
        resp = await client.post(
            "/query",
            json={"query": query_text, "kb_id": kb_id},
        )
        resp.raise_for_status()
        body = resp.json()
    except httpx.HTTPStatusError as exc:
        return None, f"HTTP {exc.response.status_code}: {exc.response.text[:160]}"
    except Exception as exc:  # noqa: BLE001 — surface per query
        return None, f"{type(exc).__name__}: {exc}"

    returned = extract_returned_checksums(body.get("citations", []) or [])
    return compute_metrics(expected, returned), None


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

    per_query: list[ImageRecallQueryResult] = []
    async with httpx.AsyncClient(
        base_url=base_url,
        headers={"Authorization": f"Bearer {token}"},
        timeout=300.0,  # full pipeline (synth + image chain) — loaded machine can be slow
    ) as client:
        for q in queries:
            qid = str(q.get("query_id", ""))
            qtext = str(q.get("query_text", ""))
            gt = q.get("ground_truth", {})
            expected = {str(c) for c in (gt.get("expected_images") or [])}
            q_kb_id = str(q.get("kb_id") or kb_id)

            metrics, error = await _run_one(client, qtext, q_kb_id, expected)
            if error is not None:
                # Keep a zero-metric placeholder so the row still renders.
                metrics = compute_metrics(expected, set())
                print(f"  {qid}: ERROR {error}")
            else:
                assert metrics is not None
                print(
                    f"  {qid}: recall={metrics.recall:.2f} precision={metrics.precision:.2f} "
                    f"(hit {metrics.hit_count}/{metrics.expected_count}, returned {metrics.returned_count})"
                )
            per_query.append(
                ImageRecallQueryResult(
                    query_id=qid,
                    query_text=qtext,
                    expected_image_sections=list(
                        gt.get("expected_image_sections") or []
                    ),
                    metrics=metrics,
                    error=error,
                )
            )

    report = aggregate(eval_set_path.name, kb_id, per_query)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        yaml.safe_dump(report_to_dict(report), sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
    print(f"\nImage-recall report written: {out_path}")
    print(
        f"mean image-recall = {report.mean_recall:.3f} | "
        f"mean image-precision = {report.mean_precision:.3f} | "
        f"scored {report.scored_queries}/{report.total_queries}",
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path, default=_DEFAULT_EVAL_SET)
    parser.add_argument("--base-url", default=_DEFAULT_BASE_URL)
    parser.add_argument("--token", default=_DEFAULT_TOKEN)
    parser.add_argument("--out", type=Path, default=None)
    args = parser.parse_args()
    out_path = args.out if args.out is not None else _default_out(args.eval_set)
    return asyncio.run(_amain(args.eval_set, args.base_url, args.token, out_path))


if __name__ == "__main__":
    raise SystemExit(main())
