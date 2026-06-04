"""KB-level reindex endpoint tests (W16 F5.3.1 → W46 / ADR-0043 real reindex).

W46 / ADR-0043 — the stub (mock task_id) became a real reindex: iterate every doc,
re-ingest from its stored original source under the KB's current config. Coverage:
- Without Azure ingestion deps wired → 503 (same fail-closed as doc-level reindex)
- KB not found: 404
- Per-doc reindex returns 503 without Azure cred (CH-001 replace-in-place)
- DELETE behavior unchanged (in-memory baseline)
- run_kb_reindex logic (unit): iterate + re-ingest / skip-no-source / failed-doc report
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.routes import documents as documents_routes
from api.routes import kb as kb_routes
from api.routes.documents import run_kb_reindex
from api.schemas.kb import KbConfig, KbCreate
from kb_management import KBService, get_kb_service
from kb_management.storage import InMemoryKBBackend


def _build_app(kb_service: KBService) -> FastAPI:
    app = FastAPI()
    app.include_router(kb_routes.router)
    app.include_router(documents_routes.router)
    app.dependency_overrides[get_kb_service] = lambda: kb_service
    return app


@pytest.fixture
async def kb_service_with_drive() -> KBService:
    service = KBService(InMemoryKBBackend())
    await service.create(
        KbCreate(
            kb_id="drive_user_manuals",
            name="Drive",
            description="",
            config=KbConfig(),
        )
    )
    return service


@pytest.fixture
async def kb_service_empty() -> KBService:
    return KBService(InMemoryKBBackend())


@pytest.mark.asyncio
async def test_reindex_kb_503_without_azure_deps(kb_service_with_drive: KBService) -> None:
    """W46 / ADR-0043 — the real KB-level reindex needs the lifespan-wired Azure
    ingestion deps (embedder + populator + chunker + retrieval_engine). This test
    app wires none, so the route fails closed at `_ingestion_deps_or_503` → 503
    (was a 202 mock task_id before W46)."""
    app = _build_app(kb_service_with_drive)
    client = TestClient(app)

    resp = client.post("/kb/drive_user_manuals/reindex")
    assert resp.status_code == 503, resp.text


@pytest.mark.asyncio
async def test_reindex_kb_not_found_returns_404(kb_service_empty: KBService) -> None:
    """Unknown kb_id → 404 (KB existence guard before mock task_id)."""
    app = _build_app(kb_service_empty)
    client = TestClient(app)

    resp = client.post("/kb/nonexistent_kb/reindex")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_per_doc_reindex_503_without_azure_per_ch001(
    kb_service_with_drive: KBService,
) -> None:
    """CH-001 (2026-05-12) — per-doc reindex (was 501 in W16 F5.3) is now real,
    implementing Decision A = (ii) replace-in-place semantics.

    Without lifespan-wired Azure ingestion deps in this test setup, the route
    fails closed at `_ingestion_deps_or_503` → 503 azure.config_missing (the
    OLD assertion was `== 501`;the new behaviour for the dev/no-cred path is
    `== 503`).
    """
    app = _build_app(kb_service_with_drive)
    client = TestClient(app)

    resp = client.post(
        "/kb/drive_user_manuals/documents/doc-A/reindex",
        files={
            "file": (
                "doc-A.docx",
                b"\x00",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ),
        },
    )
    assert resp.status_code == 503


@pytest.mark.asyncio
async def test_delete_kb_in_memory_baseline_preserved_per_b1(
    kb_service_with_drive: KBService,
) -> None:
    """Per Decision B.1: DELETE /kb/{kb_id} in-memory cleanup preserved;
    Azure AI Search index + Blob container drop deferred Track A W17+.
    Test verifies the in-memory delete works (no Azure-touch errors)."""
    app = _build_app(kb_service_with_drive)
    client = TestClient(app)

    # Delete works on in-memory baseline
    resp = client.delete("/kb/drive_user_manuals")
    assert resp.status_code == 204

    # Subsequent GET returns 404 (KB record purged)
    resp2 = client.get("/kb/drive_user_manuals")
    assert resp2.status_code == 404


# ── run_kb_reindex logic (W46 / ADR-0043) ─────────────────────────────────────


class _FakeState:
    """app.state stand-in with the four ingestion services _ingestion_deps_or_503
    + _engine_or_503 read (object() sentinels are enough — the pipeline is mocked)."""

    def __init__(self, engine: object, populator: object) -> None:
        self.embedder = object()
        self.index_populator = populator
        self.ingestion_chunker = object()
        self.make_ingestion_chunker = None
        self.retrieval_engine = engine


class _FakeRequest:
    def __init__(self, state: _FakeState) -> None:
        self.app = MagicMock()
        self.app.state = state


def _fake_request(engine: object, populator: object) -> _FakeRequest:
    return _FakeRequest(_FakeState(engine, populator))


@pytest.mark.asyncio
async def test_run_kb_reindex_skips_docs_with_no_source(
    monkeypatch: pytest.MonkeyPatch,
    kb_service_with_drive: KBService,
) -> None:
    """Docs with no stored source (pre-W46 ingest) → skipped_no_source, none reindexed."""
    engine = MagicMock()
    engine.list_documents = AsyncMock(return_value=[{"doc_id": "doc-a"}, {"doc_id": "doc-b"}])
    populator = MagicMock()
    populator.delete_doc = AsyncMock(return_value=0)
    monkeypatch.setattr(documents_routes, "download_source_document", AsyncMock(return_value=None))

    result = await run_kb_reindex(
        kb_id="drive_user_manuals",
        request=_fake_request(engine, populator),  # type: ignore[arg-type]
        service=kb_service_with_drive,
    )

    assert result["documents_total"] == 2
    assert sorted(result["skipped_no_source"]) == ["doc-a", "doc-b"]
    assert result["reindexed"] == []
    assert result["chunks_total"] == 0
    populator.delete_doc.assert_not_awaited()  # no source → never touched the index


@pytest.mark.asyncio
async def test_run_kb_reindex_reingest_from_stored_source(
    monkeypatch: pytest.MonkeyPatch,
    kb_service_with_drive: KBService,
) -> None:
    """A doc with a stored source → delete + re-ingest; chunks_total sums the pipeline."""
    engine = MagicMock()
    engine.list_documents = AsyncMock(return_value=[{"doc_id": "doc-a"}])
    populator = MagicMock()
    populator.delete_doc = AsyncMock(return_value=3)
    monkeypatch.setattr(
        documents_routes,
        "download_source_document",
        AsyncMock(return_value=(b"filebytes", "doc-a.docx")),
    )
    monkeypatch.setattr(
        documents_routes,
        "_run_ingest_pipeline",
        AsyncMock(return_value={"doc_id": "doc-a", "chunks_emitted": 5}),
    )

    result = await run_kb_reindex(
        kb_id="drive_user_manuals",
        request=_fake_request(engine, populator),  # type: ignore[arg-type]
        service=kb_service_with_drive,
    )

    assert result["reindexed"] == ["doc-a"]
    assert result["documents_reindexed"] == 1
    assert result["chunks_total"] == 5
    assert result["skipped_no_source"] == []
    assert result["failed"] == []
    populator.delete_doc.assert_awaited_once_with("drive_user_manuals", "doc-a")


@pytest.mark.asyncio
async def test_run_kb_reindex_reports_failed_doc(
    monkeypatch: pytest.MonkeyPatch,
    kb_service_with_drive: KBService,
) -> None:
    """A doc whose re-ingest raises → reported under `failed`, batch continues."""
    engine = MagicMock()
    engine.list_documents = AsyncMock(return_value=[{"doc_id": "doc-a"}])
    populator = MagicMock()
    populator.delete_doc = AsyncMock(return_value=2)
    monkeypatch.setattr(
        documents_routes,
        "download_source_document",
        AsyncMock(return_value=(b"x", "doc-a.docx")),
    )
    monkeypatch.setattr(
        documents_routes,
        "_run_ingest_pipeline",
        AsyncMock(side_effect=HTTPException(status_code=502, detail={"message": "parse boom"})),
    )

    result = await run_kb_reindex(
        kb_id="drive_user_manuals",
        request=_fake_request(engine, populator),  # type: ignore[arg-type]
        service=kb_service_with_drive,
    )

    assert result["reindexed"] == []
    assert len(result["failed"]) == 1
    assert result["failed"][0]["doc_id"] == "doc-a"
    assert "parse boom" in result["failed"][0]["error"]
