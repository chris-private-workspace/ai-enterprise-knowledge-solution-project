"""W59 F3 — image-recall / image-precision metric (pure logic, no IO).

Measures whether the images that SHOULD accompany an answer are actually returned
by the FULL `/query` pipeline (retrieve → synth → citation → neighbour-image →
overview-pin → cap). The match key is the image **content checksum**
(`checksum_sha256`) — stable across re-index, mirrors the frontend display dedup.

This module is the pure metric core (unit-tested in F5). The live driver
(`scripts/run_image_recall.py`) calls the real `/query` endpoint per GT query,
extracts the returned checksums, and feeds them here — so the metric measures the
EXACT image set a real chat answer surfaces (not a retrieve-only proxy; cf. memory
`project_v4_retrieve_only_vs_query_pipeline`).

Ground truth = `docs/eval-set-image-recall-ar.yaml` (W59 F2): each query carries
`ground_truth.expected_images` (a checksum list).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True, slots=True)
class ImageRecallMetrics:
    """One query's image-recall outcome.

    - recall    = |expected ∩ returned| / |expected|   (1.0 when nothing is expected)
    - precision = |expected ∩ returned| / |returned|   (1.0 when nothing returned AND
                  nothing expected; 0.0 when nothing returned but images were expected)

    `recall` is the primary axis for the W59 question ("are the relevant images
    returned together with the text"). `precision` is the noise/flood counter-axis.
    """

    expected_count: int
    returned_count: int
    hit_count: int
    recall: float
    precision: float
    missed: list[str] = field(default_factory=list)  # expected − returned (checksums)
    extra: list[str] = field(default_factory=list)  # returned − expected (checksums)


def compute_metrics(expected: set[str], returned: set[str]) -> ImageRecallMetrics:
    """Pure set-comparison of expected vs returned image checksums."""
    hit = expected & returned
    recall = len(hit) / len(expected) if expected else 1.0
    if returned:
        precision = len(hit) / len(returned)
    else:
        precision = 1.0 if not expected else 0.0
    return ImageRecallMetrics(
        expected_count=len(expected),
        returned_count=len(returned),
        hit_count=len(hit),
        recall=recall,
        precision=precision,
        missed=sorted(expected - returned),
        extra=sorted(returned - expected),
    )


def extract_returned_checksums(citations: list[dict[str, Any]]) -> set[str]:
    """Collect distinct image checksums across an answer's citations.

    `citations` = the `/query` response's `citations` list (each a dict with an
    `embedded_images` list of `{checksum_sha256, ...}`). Mirrors the frontend
    checksum dedup so the returned set == what the user actually sees rendered.
    Images without a checksum fall back to `blob_url` (legacy / pre-checksum rows).
    """
    out: set[str] = set()
    for c in citations:
        for img in c.get("embedded_images", []) or []:
            key = str(img.get("checksum_sha256") or "") or str(img.get("blob_url") or "")
            if key:
                out.add(key)
    return out


@dataclass(frozen=True, slots=True)
class ImageRecallQueryResult:
    query_id: str
    query_text: str
    expected_image_sections: list[str]
    metrics: ImageRecallMetrics
    error: str | None = None


@dataclass(frozen=True, slots=True)
class ImageRecallReport:
    eval_set: str
    kb_id: str
    total_queries: int
    scored_queries: int  # non-errored
    mean_recall: float
    mean_precision: float
    per_query: list[ImageRecallQueryResult] = field(default_factory=list)


def aggregate(
    eval_set: str,
    kb_id: str,
    per_query: list[ImageRecallQueryResult],
) -> ImageRecallReport:
    """Mean recall / precision over non-errored queries."""
    scored = [r for r in per_query if r.error is None]
    n = len(scored)
    mean_recall = sum(r.metrics.recall for r in scored) / n if n else 0.0
    mean_precision = sum(r.metrics.precision for r in scored) / n if n else 0.0
    return ImageRecallReport(
        eval_set=eval_set,
        kb_id=kb_id,
        total_queries=len(per_query),
        scored_queries=n,
        mean_recall=mean_recall,
        mean_precision=mean_precision,
        per_query=per_query,
    )


def report_to_dict(report: ImageRecallReport) -> dict[str, Any]:
    """Serialize the report to a plain dict (YAML/JSON-friendly)."""
    return {
        "metadata": {
            "eval_set": report.eval_set,
            "kb_id": report.kb_id,
            "total_queries": report.total_queries,
            "scored_queries": report.scored_queries,
            "mean_image_recall": round(report.mean_recall, 4),
            "mean_image_precision": round(report.mean_precision, 4),
        },
        "per_query": [
            {
                "query_id": r.query_id,
                "query_text": r.query_text,
                "expected_image_sections": r.expected_image_sections,
                "image_recall": round(r.metrics.recall, 4),
                "image_precision": round(r.metrics.precision, 4),
                "expected_count": r.metrics.expected_count,
                "returned_count": r.metrics.returned_count,
                "hit_count": r.metrics.hit_count,
                "missed_count": len(r.metrics.missed),
                "extra_count": len(r.metrics.extra),
                "error": r.error,
            }
            for r in report.per_query
        ],
    }
