"""W59 F5 — image-recall metric unit tests (per CLAUDE.md §5.6 H6 — eval critical).

Tests the pure metric core (`backend/eval/image_recall.py`):
- recall / precision computation (full hit, partial, miss, flood)
- empty-expected and empty-returned boundaries
- checksum extraction from /query citations (dedup, blob_url fallback, missing)
- aggregate over mixed scored / errored queries
"""

from __future__ import annotations

from eval.image_recall import (
    ImageRecallQueryResult,
    aggregate,
    compute_metrics,
    extract_returned_checksums,
    report_to_dict,
)


def test_full_hit() -> None:
    m = compute_metrics({"a", "b", "c"}, {"a", "b", "c"})
    assert m.recall == 1.0
    assert m.precision == 1.0
    assert m.hit_count == 3
    assert m.missed == []
    assert m.extra == []


def test_partial_recall() -> None:
    # expected 4, returned 2 of them + 1 unrelated → recall 0.5, precision 2/3
    m = compute_metrics({"a", "b", "c", "d"}, {"a", "b", "x"})
    assert m.recall == 0.5
    assert round(m.precision, 4) == round(2 / 3, 4)
    assert m.hit_count == 2
    assert m.missed == ["c", "d"]
    assert m.extra == ["x"]


def test_image_flood_low_precision() -> None:
    # the image-flood failure mode: all expected returned, but many extras
    m = compute_metrics({"a", "b"}, {"a", "b"} | {f"x{i}" for i in range(18)})
    assert m.recall == 1.0  # completeness fine
    assert m.precision == 0.1  # 2 / 20 — flood drags precision down
    assert len(m.extra) == 18


def test_nothing_returned_but_expected() -> None:
    m = compute_metrics({"a", "b"}, set())
    assert m.recall == 0.0
    assert m.precision == 0.0
    assert m.missed == ["a", "b"]


def test_nothing_expected_nothing_returned() -> None:
    m = compute_metrics(set(), set())
    assert m.recall == 1.0
    assert m.precision == 1.0


def test_nothing_expected_but_returned() -> None:
    # query shouldn't surface images but the pipeline returned some → precision 0
    m = compute_metrics(set(), {"a", "b"})
    assert m.recall == 1.0  # nothing to recall
    assert m.precision == 0.0
    assert m.extra == ["a", "b"]


def test_extract_checksums_dedup() -> None:
    citations = [
        {"embedded_images": [{"checksum_sha256": "a"}, {"checksum_sha256": "b"}]},
        {"embedded_images": [{"checksum_sha256": "a"}]},  # dup across citations
    ]
    assert extract_returned_checksums(citations) == {"a", "b"}


def test_extract_checksums_blob_url_fallback() -> None:
    citations = [
        {"embedded_images": [{"checksum_sha256": "", "blob_url": "u1"}]},
        {"embedded_images": [{"blob_url": "u2"}]},
    ]
    assert extract_returned_checksums(citations) == {"u1", "u2"}


def test_extract_checksums_empty_and_missing() -> None:
    assert extract_returned_checksums([]) == set()
    assert extract_returned_checksums([{"embedded_images": []}]) == set()
    assert extract_returned_checksums([{}]) == set()


def _result(
    qid: str, expected: set[str], returned: set[str], error: str | None = None
) -> ImageRecallQueryResult:
    return ImageRecallQueryResult(
        query_id=qid,
        query_text=qid,
        expected_image_sections=[],
        metrics=compute_metrics(expected, returned),
        error=error,
    )


def test_aggregate_excludes_errored() -> None:
    results = [
        _result("Q1", {"a", "b"}, {"a", "b"}),  # recall 1.0 prec 1.0
        _result("Q2", {"a", "b"}, {"a"}),  # recall 0.5 prec 1.0
        _result("Q3", {"a"}, set(), error="HTTP 502"),  # errored → excluded
    ]
    report = aggregate("test.yaml", "kb1", results)
    assert report.total_queries == 3
    assert report.scored_queries == 2
    assert report.mean_recall == 0.75  # (1.0 + 0.5) / 2
    assert report.mean_precision == 1.0


def test_report_to_dict_shape() -> None:
    report = aggregate("test.yaml", "kb1", [_result("Q1", {"a", "b"}, {"a"})])
    d = report_to_dict(report)
    assert d["metadata"]["mean_image_recall"] == 0.5
    assert d["metadata"]["kb_id"] == "kb1"
    row = d["per_query"][0]
    assert row["query_id"] == "Q1"
    assert row["hit_count"] == 1
    assert row["missed_count"] == 1
