"""group member management route tests (W93 P3b / ADR-0067 G7, per CLAUDE.md §5.6 H6).

Covers `/groups/{group_key}/members` GET/POST/DELETE:
- router-level require_role("admin") (403 for a non-admin)
- POST adds a member (idempotent 204) → GET lists it → DELETE removes (204) → 404 on
  a missing membership
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth.dependency import get_current_user
from api.auth.models import AuthenticatedUser
from api.routes import groups as groups_routes
from storage.rbac_storage import InMemoryRbacBackend


def _build_app(*, role: str = "admin", backend: InMemoryRbacBackend | None = None) -> FastAPI:
    app = FastAPI()
    app.include_router(groups_routes.router)
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        oid="actor", tid="t", preferred_username="actor@test.local", role=role
    )
    app.state.rbac_backend = backend if backend is not None else InMemoryRbacBackend()
    return app


@pytest.mark.asyncio
async def test_non_admin_forbidden() -> None:
    app = _build_app(role="user")
    resp = TestClient(app).post("/groups/grp-eng/members", json={"user_oid": "oid-a"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_add_list_and_remove_member() -> None:
    backend = InMemoryRbacBackend()
    app = _build_app(backend=backend)
    client = TestClient(app)

    # add (204, idempotent)
    assert client.post("/groups/grp-eng/members", json={"user_oid": "oid-a"}).status_code == 204
    assert client.post("/groups/grp-eng/members", json={"user_oid": "oid-a"}).status_code == 204
    # list
    listed = client.get("/groups/grp-eng/members")
    assert listed.status_code == 200
    body = listed.json()
    assert body["total"] == 1
    assert body["members"][0]["user_oid"] == "oid-a"
    # expansion seam wired
    assert await backend.list_groups_for_user("oid-a") == ["grp-eng"]
    # remove (204)
    assert client.delete("/groups/grp-eng/members/oid-a").status_code == 204
    assert await backend.list_groups_for_user("oid-a") == []


@pytest.mark.asyncio
async def test_remove_unknown_member_404() -> None:
    app = _build_app()
    resp = TestClient(app).delete("/groups/grp-eng/members/ghost")
    assert resp.status_code == 404
