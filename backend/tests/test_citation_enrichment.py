"""Citation enrichment + embedded image parsing tests (W3 D2 F3)."""

from __future__ import annotations

import json

from generation.citation_enrichment import build_citations, parse_embedded_images
from retrieval.retrieval_engine import RetrievedChunk


def _chunk(cid: str, **fields_overrides) -> RetrievedChunk:
    fields: dict = {
        "chunk_id": cid,
        "doc_id": "doc-1",
        "doc_title": "Doc One",
        "doc_format": "docx",  # BUG-021 — required per Citation schema field
        "chunk_title": "Section",
        "chunk_index": 0,
        "section_path": ["A", "B"],
        "embedded_images_json": "[]",
    }
    fields.update(fields_overrides)
    return RetrievedChunk(score=0.42, fields=fields)


# ----- parse_embedded_images -----


def test_parse_empty_string_returns_empty() -> None:
    assert parse_embedded_images("") == []


def test_parse_empty_array_returns_empty() -> None:
    assert parse_embedded_images("[]") == []


def test_parse_valid_array_returns_imagerefs() -> None:
    payload = json.dumps([
        {
            "blob_url": "https://x/blob/a.png",
            "alt_text": "Diagram",
            "checksum_sha256": "deadbeef",
            "width": 800,
            "height": 600,
        }
    ])
    images = parse_embedded_images(payload)
    assert len(images) == 1
    assert images[0].blob_url == "https://x/blob/a.png"
    assert images[0].width == 800


def test_parse_malformed_json_returns_empty_no_raise() -> None:
    assert parse_embedded_images("not-json") == []


def test_parse_non_array_top_level_returns_empty() -> None:
    assert parse_embedded_images('{"a": 1}') == []


# ----- BUG-026 C-ii — source_section propagation -----


def test_parse_imageref_carries_source_section() -> None:
    """BUG-026 C-ii — image's own section propagated through embedded_images_json."""
    payload = json.dumps([
        {
            "blob_url": "https://x/blob/a.png",
            "alt_text": "",
            "checksum_sha256": "deadbeef",
            "width": 800,
            "height": 600,
            "source_section": ["8. Integration scenarios", "8.4 Scenario D"],
        }
    ])
    images = parse_embedded_images(payload)
    assert images[0].source_section == ["8. Integration scenarios", "8.4 Scenario D"]


def test_parse_imageref_source_section_defaults_empty_when_absent() -> None:
    """Backward compat — chunks indexed before C-ii lack the field → []."""
    payload = json.dumps([
        {
            "blob_url": "https://x/blob/a.png",
            "alt_text": "d",
            "checksum_sha256": "abc",
            "width": 1,
            "height": 1,
        }
    ])
    images = parse_embedded_images(payload)
    assert images[0].source_section == []


def test_parse_imageref_source_section_non_list_coerced_empty() -> None:
    """Defensive — a malformed non-list source_section degrades to []."""
    payload = json.dumps([
        {
            "blob_url": "https://x/blob/a.png",
            "alt_text": "d",
            "checksum_sha256": "abc",
            "width": 1,
            "height": 1,
            "source_section": "not-a-list",
        }
    ])
    images = parse_embedded_images(payload)
    assert images[0].source_section == []


def test_source_section_round_trips_storage_to_query() -> None:
    """BUG-026 C-ii — source_section survives the storage→index→query JSON contract.

    StorageImageRef.model_dump() (as ChunkRecord.to_search_doc serializes it into
    `embedded_images_json`) must carry source_section so the query-side
    parse_embedded_images reconstructs it onto the API ImageRef.
    """
    from indexing.schemas import ImageRef as StorageImageRef

    stored = StorageImageRef(
        blob_url="https://b/img.png",
        checksum_sha256="abc",
        source_section=["8. Integration scenarios", "8.4 Scenario D"],
    )
    embedded_images_json = json.dumps([stored.model_dump(mode="json")])
    images = parse_embedded_images(embedded_images_json)
    assert images[0].source_section == ["8. Integration scenarios", "8.4 Scenario D"]


# ----- build_citations -----


def test_build_citations_preserves_order_from_citation_ids() -> None:
    chunks = [_chunk("c1"), _chunk("c2"), _chunk("c3")]
    out = build_citations(["c2", "c3", "c1"], chunks)
    assert [c.chunk_id for c in out] == ["c2", "c3", "c1"]


def test_build_citations_skips_unknown_chunk_ids() -> None:
    chunks = [_chunk("c1")]
    out = build_citations(["c1", "ghost-id"], chunks)
    assert [c.chunk_id for c in out] == ["c1"]


def test_build_citations_populates_fields_from_retrieved() -> None:
    chunks = [_chunk("c1", doc_id="d-9", doc_title="Manual 9", section_path=["X"], doc_format="pdf")]
    out = build_citations(["c1"], chunks)
    assert out[0].doc_id == "d-9"
    assert out[0].doc_title == "Manual 9"
    assert out[0].doc_format == "pdf"
    assert out[0].section_path == ["X"]
    assert out[0].relevance_score == 0.42


def test_build_citations_doc_format_fallback_to_docx_when_missing() -> None:
    """BUG-021 — legacy chunks pre-W25 may have empty doc_format; default to 'docx'."""
    chunks = [_chunk("c1", doc_format="")]
    out = build_citations(["c1"], chunks)
    assert out[0].doc_format == "docx"


def test_build_citations_doc_format_normalises_unknown_to_docx() -> None:
    """BUG-021 — unexpected doc_format string (eg 'unknown') falls back to docx to satisfy Literal."""
    chunks = [_chunk("c1", doc_format="unknown")]
    out = build_citations(["c1"], chunks)
    assert out[0].doc_format == "docx"


def test_build_citations_empty_list_returns_empty() -> None:
    assert build_citations([], [_chunk("c1")]) == []


def test_build_citations_with_real_image_json() -> None:
    img_json = json.dumps([
        {
            "blob_url": "https://b/img.png",
            "alt_text": "fig 1",
            "checksum_sha256": "abc",
            "width": 100,
            "height": 50,
        }
    ])
    chunks = [_chunk("c1", embedded_images_json=img_json)]
    out = build_citations(["c1"], chunks)
    assert len(out[0].embedded_images) == 1
    assert out[0].embedded_images[0].blob_url == "https://b/img.png"
