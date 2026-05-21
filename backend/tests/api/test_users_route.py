"""/users Members tab route tests (W24c F4 per ADR-0027 Option A).

Covers F4.1 (GET list + pending derivation) + F4.2 (invite / suspend /
role-change + Tier 2 power reject) + F4.3 (audit writes) + the
require_role('admin') gate. Mock-auth drives the caller's role; the
module-level users_repo store is reset per test.
"""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.auth import users_repo
from api.auth.users_store import UserRecord
from api.routes import users
from storage.audit_log_storage import InMemoryAuditLogBackend
from storage.settings import Settings, get_settings

_HEADERS = {"Authorization": "Bearer dev-token"}


@pytest.fixture(autouse=True)
def _clean_repo() -> None:
    users_repo.reset_repo()


def _app(
    mock_role: str = "admin", *, audit: InMemoryAuditLogBackend | None = None
) -> FastAPI:
    app = FastAPI()
    app.include_router(users.router)
    app.dependency_overrides[get_settings] = lambda: Settings(
        feature_auth_mock=True, auth_mock_role=mock_role
    )
    if audit is not None:
        app.state.audit_log_backend = audit
    return app


def _seed(
    email: str, *, role: str = "user", verified: bool = True, status: str = "active"
) -> UserRecord:
    rec = users_repo.register(
        email=email, password="pw-123456", display_name=email.split("@", 1)[0]
    )
    rec = rec.model_copy(
        update={"role": role, "verified": verified, "status": status}
    )
    users_repo._store.replace_user(rec)
    return rec


# ---- F4.1 — GET /users -----------------------------------------------------


def test_list_users_returns_seeded_members() -> None:
    _seed("alice@ricoh.com", role="editor")
    _seed("bob@ricoh.com", role="user")
    with TestClient(_app()) as client:
        r = client.get("/users", headers=_HEADERS)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert {u["email"] for u in body["users"]} == {"alice@ricoh.com", "bob@ricoh.com"}


def test_list_users_requires_admin() -> None:
    with TestClient(_app("editor")) as client:
        r = client.get("/users", headers=_HEADERS)
    assert r.status_code == 403


def test_list_users_401_without_credentials() -> None:
    with TestClient(_app()) as client:
        r = client.get("/users")
    assert r.status_code == 401


def test_list_users_derives_pending_for_unverified() -> None:
    _seed("carol@ricoh.com", verified=False)
    with TestClient(_app()) as client:
        r = client.get("/users", headers=_HEADERS)
    assert r.json()["users"][0]["status"] == "pending"


# ---- F4.2 — invite / suspend / role-change ---------------------------------


def test_invite_member_creates_invited_record() -> None:
    with TestClient(_app()) as client:
        r = client.post(
            "/users/invite",
            json={"email": "dan@ricoh.com", "role": "editor"},
            headers=_HEADERS,
        )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "invited"
    assert body["role"] == "editor"
    assert body["email"] == "dan@ricoh.com"


def test_invite_member_rejects_power_role() -> None:
    with TestClient(_app()) as client:
        r = client.post(
            "/users/invite",
            json={"email": "eve@ricoh.com", "role": "power"},
            headers=_HEADERS,
        )
    assert r.status_code == 422


def test_invite_member_duplicate_email_409() -> None:
    _seed("frank@ricoh.com")
    with TestClient(_app()) as client:
        r = client.post(
            "/users/invite", json={"email": "frank@ricoh.com"}, headers=_HEADERS
        )
    assert r.status_code == 409


def test_suspend_member() -> None:
    user = _seed("grace@ricoh.com")
    with TestClient(_app()) as client:
        r = client.post(f"/users/{user.oid}/suspend", headers=_HEADERS)
    assert r.status_code == 200
    assert r.json()["status"] == "suspended"


def test_suspend_unknown_user_404() -> None:
    with TestClient(_app()) as client:
        r = client.post("/users/bogus-oid/suspend", headers=_HEADERS)
    assert r.status_code == 404


def test_change_role() -> None:
    user = _seed("heidi@ricoh.com", role="user")
    with TestClient(_app()) as client:
        r = client.patch(
            f"/users/{user.oid}/role", json={"role": "editor"}, headers=_HEADERS
        )
    assert r.status_code == 200
    assert r.json()["role"] == "editor"


def test_change_role_rejects_power() -> None:
    user = _seed("ivan@ricoh.com")
    with TestClient(_app()) as client:
        r = client.patch(
            f"/users/{user.oid}/role", json={"role": "power"}, headers=_HEADERS
        )
    assert r.status_code == 422


def test_change_role_unknown_user_404() -> None:
    with TestClient(_app()) as client:
        r = client.patch(
            "/users/bogus-oid/role", json={"role": "editor"}, headers=_HEADERS
        )
    assert r.status_code == 404


def test_mutations_require_admin() -> None:
    user = _seed("judy@ricoh.com")
    with TestClient(_app("editor")) as client:
        r = client.post(f"/users/{user.oid}/suspend", headers=_HEADERS)
    assert r.status_code == 403


# ---- F4.3 — audit log writes -----------------------------------------------


def test_invite_writes_audit_log() -> None:
    audit = InMemoryAuditLogBackend()
    with TestClient(_app(audit=audit)) as client:
        client.post(
            "/users/invite", json={"email": "ken@ricoh.com"}, headers=_HEADERS
        )
    assert len(audit._rows) == 1
    assert audit._rows[0].action == "user.invited"


def test_suspend_writes_audit_log() -> None:
    audit = InMemoryAuditLogBackend()
    user = _seed("laura@ricoh.com")
    with TestClient(_app(audit=audit)) as client:
        client.post(f"/users/{user.oid}/suspend", headers=_HEADERS)
    assert len(audit._rows) == 1
    assert audit._rows[0].action == "user.suspended"
