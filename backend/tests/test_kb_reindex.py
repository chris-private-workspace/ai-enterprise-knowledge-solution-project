"""KB-level reindex endpoint tests (W16 F5.3.1 CO_F3c closure).

Per W16 plan F5.3 acceptance criteria + Decision B.1 (Azure cleanup defer
Track A;in-memory baseline preserved). Coverage:
- Happy path: kb_id valid → 202 ACCEPTED + task_id mock
- KB not found: 404
- Per-doc reindex returns 503 without Azure cred (CH-001 2026-05-12 closes
  the W16 F5.3 501 stub via Decision A = (ii) replace-in-place — was 501)
- DELETE behavior unchanged (Decision B.1 docstring annotation only; CH-001
  Phase 1.5 fail-soft preserves the in-memory baseline when no Azure cred)
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import documents as documents_routes
from api.routes import kb as kb_routes
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
    await service.create(KbCreate(
        kb_id="drive_user_manuals",
        name="Drive",
        description="",
        config=KbConfig(),
    ))
    return service


@pytest.fixture
async def kb_service_empty() -> KBService:
    return KBService(InMemoryKBBackend())


@pytest.mark.asyncio
async def test_reindex_kb_happy_path(kb_service_with_drive: KBService) -> None:
    """POST /kb/{kb_id}/reindex returns 202 ACCEPTED + mock task_id."""
    app = _build_app(kb_service_with_drive)
    client = TestClient(app)

    resp = client.post("/kb/drive_user_manuals/reindex")
    assert resp.status_code == 202, resp.text
    body = resp.json()
    assert body["kb_id"] == "drive_user_manuals"
    assert body["status"] == "queued"
    assert body["task_id"].startswith("reindex-")
    assert "Track A" in body["note"]  # Decision B.1 transparency


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
