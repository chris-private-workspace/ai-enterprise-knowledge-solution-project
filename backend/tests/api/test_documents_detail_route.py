"""W21 F1 — `GET /kb/{kb_id}/docs/{doc_id}` enriched route tests (per ADR-0029 Option C).

Covers `backend/api/routes/documents.py:get_document_detail` (the new doc-detail
endpoint that powers the 3-pane Doc Detail view at `/kb/[id]/docs/[docId]`).

Real Azure REST calls stay in `scripts/run_populate_sanity.py` smoke-script
territory; this file reuses the W20 F5.2 `_engine_mock` shape (AsyncMock-backed
`list_documents` + `list_chunks_per_doc`) and an in-memory `KBService`.

Acceptance ref: W21 plan.md §2 F1 + checklist.md F1.4 — coverage ≥ 80% per
CLAUDE.md §3.1 H6;6+ test cases (happy path / missing kb 404 / missing doc 404
/ empty outline / empty image_refs / malformed embedded_images_json).
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import documents as documents_routes
from api.schemas.kb import KbConfig, KbCreate
from kb_management import KBService, get_kb_service
from kb_management.storage import InMemoryKBBackend

# --------------------------------------------------------------------------- #
# Fixtures / builders
# --------------------------------------------------------------------------- #


def _engine_mock(
    *,
    list_docs: list[dict[str, Any]] | None = None,
    list_docs_raises: Exception | None = None,
    list_chunks_per_doc: dict[str, list[dict[str, Any]]] | None = None,
    list_chunks_raises: Exception | None = None,
) -> MagicMock:
    """MagicMock RetrievalEngine — same shape as W20 F5.2 _engine_mock.

    Mirrors `test_documents_route.py:_engine_mock` minus the extra knobs we
    don't need for the doc-detail surface."""
    engine = MagicMock(name="RetrievalEngine")
    if list_docs_raises is not None:
        engine.list_documents = AsyncMock(side_effect=list_docs_raises)
    else:
        engine.list_documents = AsyncMock(return_value=list_docs or [])

    if list_chunks_raises is not None:
        engine.list_chunks = AsyncMock(side_effect=list_chunks_raises)
    elif list_chunks_per_doc is not None:
        async def _list_chunks(_kb_id: str, doc_id: str) -> list[dict[str, Any]]:
            return list_chunks_per_doc.get(doc_id, [])
        engine.list_chunks = AsyncMock(side_effect=_list_chunks)
    else:
        engine.list_chunks = AsyncMock(return_value=[])
    return engine


def _build_app(*, kb_service: KBService, engine: MagicMock | None = None) -> FastAPI:
    """FastAPI app with the documents router + injected KBService + app.state.retrieval_engine."""
    app = FastAPI()
    app.include_router(documents_routes.router)
    app.dependency_overrides[get_kb_service] = lambda: kb_service
    app.state.embedder = None
    app.state.ingestion_chunker = None
    app.state.index_populator = None
    app.state.retrieval_engine = engine
    return app


@pytest.fixture
async def kb_service_with_drive() -> KBService:
    service = KBService(InMemoryKBBackend())
    await service.create(KbCreate(
        kb_id="drive_user_manuals",
        name="Drive",
        description="",
        config=KbConfig(chunk_strategy="layout_aware"),
    ))
    return service


@pytest.fixture
async def kb_service_empty() -> KBService:
    return KBService(InMemoryKBBackend())


# --------------------------------------------------------------------------- #
# Test cases — per F1.4 checklist (6+ cases for ≥ 80% coverage)
# --------------------------------------------------------------------------- #


@pytest.mark.asyncio
async def test_get_document_detail_happy_path(
    kb_service_with_drive: KBService,
) -> None:
    """Happy path — rich outline + image refs + chunk_strategy from KbConfig.

    Two chunks at the same section path produce one OutlineNode with chunk_count=2;
    a third chunk at a different path produces a second OutlineNode. Two unique
    image SHAs across the chunks (one duplicated) → 2 unique image_refs.
    """
    docs = [{
        "doc_id": "manual-A",
        "doc_title": "Vendor Manual A",
        "doc_format": "docx",
        "total_chunks": 3,
        "last_indexed_at": "2026-05-17T00:00:00Z",
        "source_url": "https://example.invalid/manuals/A.docx",
        "tags": ["beta"],
    }]
    chunks_per_doc = {
        "manual-A": [
            {
                "chunk_id": "c1", "chunk_index": 0, "chunk_total": 3,
                "chunk_title": "Intro", "section_path": ["Chapter 1", "1.1 Intro"],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": (
                    '[{"checksum_sha256":"aaa","blob_url":"http://b/aaa.png",'
                    '"alt_text":"figure 1","width":640,"height":480}]'
                ),
            },
            {
                "chunk_id": "c2", "chunk_index": 1, "chunk_total": 3,
                "chunk_title": "Body", "section_path": ["Chapter 1", "1.1 Intro"],
                "enabled": True, "low_value_flag": True,  # one low-value chunk
                "embedded_images_json": (
                    '[{"checksum_sha256":"aaa","blob_url":"http://b/aaa.png",'
                    '"alt_text":"figure 1","width":640,"height":480},'
                    '{"checksum_sha256":"bbb","blob_url":"http://b/bbb.png",'
                    '"alt_text":"figure 2","width":800,"height":600}]'
                ),
            },
            {
                "chunk_id": "c3", "chunk_index": 2, "chunk_total": 3,
                "chunk_title": "Conclusion", "section_path": ["Chapter 2"],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": "[]",
            },
        ],
    }
    engine = _engine_mock(list_docs=docs, list_chunks_per_doc=chunks_per_doc)
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-A")
    assert resp.status_code == 200, resp.text
    body = resp.json()

    # Doc-level metadata
    assert body["doc_id"] == "manual-A"
    assert body["title"] == "Vendor Manual A"
    assert body["file_type"] == "docx"
    assert body["source_url"] == "https://example.invalid/manuals/A.docx"
    assert body["indexed_at"] == "2026-05-17T00:00:00Z"
    assert body["chunk_strategy"] == "layout_aware"
    assert body["total_chunks"] == 3
    assert body["low_value_chunks"] == 1  # only c2 flagged

    # Forward-compat seams are null (F1.3 + plan §2 F1.1)
    assert body["source"] is None
    assert body["size_kb"] is None
    assert body["pages"] is None
    assert body["language"] is None
    assert body["total_tokens"] is None
    assert body["parse_duration_ms"] is None
    assert body["embed_duration_ms"] is None

    # Outline — 2 unique paths (sorted): ("Chapter 1", "1.1 Intro") → count 2,
    # ("Chapter 2",) → count 1.
    assert len(body["outline"]) == 2
    n0 = body["outline"][0]
    assert n0["level"] == 2 and n0["title"] == "1.1 Intro" and n0["chunk_count"] == 2
    assert n0["page"] is None  # Tier 1 forward-compat seam
    n1 = body["outline"][1]
    assert n1["level"] == 1 and n1["title"] == "Chapter 2" and n1["chunk_count"] == 1

    # Image refs — 2 unique SHAs (aaa dedupes across c1+c2)
    assert body["total_images"] == 2
    assert len(body["image_refs"]) == 2
    shas = sorted(ref["checksum_sha256"] for ref in body["image_refs"])
    assert shas == ["aaa", "bbb"]


@pytest.mark.asyncio
async def test_get_document_detail_missing_kb_returns_404(
    kb_service_empty: KBService,
) -> None:
    """Missing KB → 404 via `_verify_kb_or_404` (before any engine call)."""
    engine = _engine_mock(list_docs=[])
    app = _build_app(kb_service=kb_service_empty, engine=engine)

    resp = TestClient(app).get("/kb/nonexistent/docs/manual-A")
    assert resp.status_code == 404, resp.text
    # The list_documents AsyncMock must NOT have been called (404 raises early).
    engine.list_documents.assert_not_called()


@pytest.mark.asyncio
async def test_get_document_detail_missing_doc_returns_404(
    kb_service_with_drive: KBService,
) -> None:
    """KB exists but doc has no chunks in the index → 404 (no doc_id match)."""
    docs = [{
        "doc_id": "manual-A", "doc_title": "A", "doc_format": "docx",
        "total_chunks": 1, "last_indexed_at": "2026-05-17T00:00:00Z",
    }]
    engine = _engine_mock(list_docs=docs)
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-Z")
    assert resp.status_code == 404, resp.text
    body = resp.json()
    assert "manual-Z" in body["detail"]
    assert "drive_user_manuals" in body["detail"]


@pytest.mark.asyncio
async def test_get_document_detail_empty_outline(
    kb_service_with_drive: KBService,
) -> None:
    """Chunks have no section_path → outline=[] (empty,not error)."""
    docs = [{
        "doc_id": "flat-doc", "doc_title": "Flat", "doc_format": "pdf",
        "total_chunks": 2, "last_indexed_at": "2026-05-17T00:00:00Z",
    }]
    chunks_per_doc = {
        "flat-doc": [
            {
                "chunk_id": "c1", "chunk_index": 0, "chunk_total": 2,
                "chunk_title": "X", "section_path": [],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": "[]",
            },
            {
                "chunk_id": "c2", "chunk_index": 1, "chunk_total": 2,
                "chunk_title": "Y", "section_path": [],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": "[]",
            },
        ],
    }
    engine = _engine_mock(list_docs=docs, list_chunks_per_doc=chunks_per_doc)
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/flat-doc")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["outline"] == []
    assert body["total_images"] == 0
    assert body["image_refs"] == []
    assert body["total_chunks"] == 2
    assert body["low_value_chunks"] == 0


@pytest.mark.asyncio
async def test_get_document_detail_empty_image_refs(
    kb_service_with_drive: KBService,
) -> None:
    """Outline rich but no images surfaced (Tier 1 reality per R12 uploader=None)."""
    docs = [{
        "doc_id": "text-doc", "doc_title": "Text Only", "doc_format": "docx",
        "total_chunks": 1, "last_indexed_at": "2026-05-17T00:00:00Z",
    }]
    chunks_per_doc = {
        "text-doc": [{
            "chunk_id": "c1", "chunk_index": 0, "chunk_total": 1,
            "chunk_title": "S", "section_path": ["Section A"],
            "enabled": True, "low_value_flag": False,
            "embedded_images_json": "[]",
        }],
    }
    engine = _engine_mock(list_docs=docs, list_chunks_per_doc=chunks_per_doc)
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/text-doc")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total_images"] == 0
    assert body["image_refs"] == []
    assert len(body["outline"]) == 1
    assert body["outline"][0]["title"] == "Section A"


@pytest.mark.asyncio
async def test_get_document_detail_malformed_embedded_images_json_skipped(
    kb_service_with_drive: KBService,
) -> None:
    """Malformed `embedded_images_json` → silently skipped, not 500.

    Same fail-soft behaviour as W17 F4.1 + W20 F5.2 (the chunk's images are
    dropped; the rest of the detail composes normally).
    """
    docs = [{
        "doc_id": "manual-A", "doc_title": "A", "doc_format": "docx",
        "total_chunks": 2, "last_indexed_at": "2026-05-17T00:00:00Z",
    }]
    chunks_per_doc = {
        "manual-A": [
            {
                "chunk_id": "c1", "chunk_index": 0, "chunk_total": 2,
                "chunk_title": "S1", "section_path": ["S1"],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": "{not-json",  # malformed
            },
            {
                "chunk_id": "c2", "chunk_index": 1, "chunk_total": 2,
                "chunk_title": "S2", "section_path": ["S2"],
                "enabled": True, "low_value_flag": False,
                "embedded_images_json": (
                    '[{"checksum_sha256":"ddd","blob_url":"http://b/ddd.png",'
                    '"alt_text":"figure","width":100,"height":100}]'
                ),
            },
        ],
    }
    engine = _engine_mock(list_docs=docs, list_chunks_per_doc=chunks_per_doc)
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-A")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # Only the well-formed chunk's image survives.
    assert body["total_images"] == 1
    assert body["image_refs"][0]["checksum_sha256"] == "ddd"
    # Outline still composes from both chunks.
    assert len(body["outline"]) == 2


@pytest.mark.asyncio
async def test_get_document_detail_list_documents_error_returns_502(
    kb_service_with_drive: KBService,
) -> None:
    """Upstream Azure failure on `list_documents` → 502 with surfaced detail."""
    engine = _engine_mock(list_docs_raises=RuntimeError("azure boom"))
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-A")
    assert resp.status_code == 502, resp.text
    body = resp.json()
    assert "RuntimeError" in body["detail"]
    assert "azure boom" in body["detail"]


@pytest.mark.asyncio
async def test_get_document_detail_list_chunks_error_returns_502(
    kb_service_with_drive: KBService,
) -> None:
    """Upstream Azure failure on `list_chunks` (post-doc-lookup) → 502."""
    docs = [{
        "doc_id": "manual-A", "doc_title": "A", "doc_format": "docx",
        "total_chunks": 1, "last_indexed_at": "2026-05-17T00:00:00Z",
    }]
    engine = _engine_mock(list_docs=docs, list_chunks_raises=RuntimeError("chunk boom"))
    app = _build_app(kb_service=kb_service_with_drive, engine=engine)

    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-A")
    assert resp.status_code == 502, resp.text
    body = resp.json()
    assert "manual-A" in body["detail"]
    assert "chunk boom" in body["detail"]


@pytest.mark.asyncio
async def test_get_document_detail_no_engine_returns_503(
    kb_service_with_drive: KBService,
) -> None:
    """RetrievalEngine not initialized → 503 (Azure config missing in dev)."""
    app = _build_app(kb_service=kb_service_with_drive, engine=None)
    resp = TestClient(app).get("/kb/drive_user_manuals/docs/manual-A")
    assert resp.status_code == 503, resp.text
