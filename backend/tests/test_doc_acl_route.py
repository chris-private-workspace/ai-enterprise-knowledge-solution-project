"""Per-document ACL route tests (W92 P3a / ADR-0067 G6, per CLAUDE.md §5.6 H6).

Covers `/kb/{kb_id}/docs/{doc_id}/acl` GET/POST/PATCH/DELETE:
- router-level require_kb_acl("manage") guard (403 for a non-manage non-admin)
- POST grant → 201 + persists + re-stamps the doc's chunks (replace semantics)
- list / change-role / revoke (revoke re-stamps back toward KB inheritance)
- 404 for an unknown entry id; 503 when the doc_acl store is unwired
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth.dependency import get_current_user
from api.auth.models import AuthenticatedUser
from api.routes import doc_acl as doc_acl_routes
from kb_management.doc_acl_store import InMemoryDocAclStore
from storage.rbac_storage import InMemoryRbacBackend


class _MockPopulator:
    """Records update_doc_principals calls (for the restamp assertion)."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, list[str]]] = []

    async def update_doc_principals(self, kb_id: str, doc_id: str, principals: list[str]) -> int:
        self.calls.append((kb_id, doc_id, list(principals)))
        return len(principals)


def _build_app(
    *,
    store: InMemoryDocAclStore | None,
    populator: _MockPopulator | None = None,
    rbac: InMemoryRbacBackend | None = None,
    role: str = "admin",
) -> FastAPI:
    app = FastAPI()
    app.include_router(doc_acl_routes.router)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        oid="u-1", tid="t-1", preferred_username="u@test.local", role=role
    )
    app.state.rbac_backend = rbac if rbac is not None else InMemoryRbacBackend()
    app.state.doc_acl_store = store
    app.state.index_populator = populator
    app.state.audit_log_backend = None
    return app


@pytest.mark.asyncio
async def test_non_manage_user_forbidden() -> None:
    # role=user + no kb_acl grant → require_kb_acl("manage") → 403.
    app = _build_app(store=InMemoryDocAclStore(), populator=_MockPopulator(), role="user")
    resp = TestClient(app).get("/kb/kb1/docs/docA/acl")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_grant_persists_and_restamps() -> None:
    store = InMemoryDocAclStore()
    populator = _MockPopulator()
    app = _build_app(store=store, populator=populator)

    resp = TestClient(app).post(
        "/kb/kb1/docs/docA/acl",
        json={"principal_type": "user", "principal_id": "alice-oid", "access_role": "query"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["principal_id"] == "alice-oid"
    assert body["granted_by"] == "u@test.local"
    # persisted
    entries = await store.list_for_doc("kb1", "docA")
    assert [e.principal_id for e in entries] == ["alice-oid"]
    # re-stamped with the doc's (replace) principal set = [alice-oid]
    assert populator.calls == [("kb1", "docA", ["alice-oid"])]


@pytest.mark.asyncio
async def test_list_change_role_and_revoke() -> None:
    store = InMemoryDocAclStore()
    populator = _MockPopulator()
    app = _build_app(store=store, populator=populator)
    client = TestClient(app)

    e = await store.add(
        kb_id="kb1", doc_id="docA", principal_type="user",
        principal_id="alice-oid", access_role="query", granted_by="admin",
    )
    # list
    listed = client.get("/kb/kb1/docs/docA/acl")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    # change role
    patched = client.patch(f"/kb/kb1/docs/docA/acl/{e.id}", json={"access_role": "manage"})
    assert patched.status_code == 200
    assert patched.json()["access_role"] == "manage"
    # revoke → 204 + re-stamp (doc now empty → resolve falls back to KB inheritance = [])
    deleted = client.delete(f"/kb/kb1/docs/docA/acl/{e.id}")
    assert deleted.status_code == 204
    assert await store.list_for_doc("kb1", "docA") == []
    assert populator.calls[-1] == ("kb1", "docA", [])  # reverted to KB inheritance (empty)


@pytest.mark.asyncio
async def test_patch_unknown_entry_404() -> None:
    app = _build_app(store=InMemoryDocAclStore(), populator=_MockPopulator())
    resp = TestClient(app).patch("/kb/kb1/docs/docA/acl/999", json={"access_role": "edit"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_unknown_entry_404() -> None:
    app = _build_app(store=InMemoryDocAclStore(), populator=_MockPopulator())
    resp = TestClient(app).delete("/kb/kb1/docs/docA/acl/999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_503_when_store_unwired() -> None:
    app = _build_app(store=None, populator=_MockPopulator())
    resp = TestClient(app).get("/kb/kb1/docs/docA/acl")
    assert resp.status_code == 503
