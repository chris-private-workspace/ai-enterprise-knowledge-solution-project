"""`GET /admin/audit-log` route tests (W24-wave-c1 F5 hook;
W24b-wave-c2 F6 filter + cursor pagination).

F6 wraps the former bare-list response in `AuditLogPage` ({entries,
next_cursor}) and adds `action_type` / `since` / `cursor` query params.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes.admin import audit_log as admin_audit_log
from api.schemas.audit_log import AuditAction
from storage.audit_log_storage import InMemoryAuditLogBackend


def _build_app(*, backend: Any | None = None) -> FastAPI:
    app = FastAPI()
    app.include_router(admin_audit_log.router)
    app.state.audit_log_backend = backend
    return app


def _seed(
    backend: InMemoryAuditLogBackend,
    count: int,
    *,
    action: AuditAction = "connection_patch",
) -> None:
    for i in range(count):
        asyncio.run(
            backend.append(
                actor=None,
                action=action,
                resource=f"admin_provider_configs/p_{i}",
                payload={"i": i},
            )
        )


@pytest.fixture(autouse=True)
def _clean_settings_cache() -> Iterator[None]:
    from storage.settings import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_audit_log_503_when_backend_unwired() -> None:
    app = _build_app(backend=None)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log")
        assert r.status_code == 503


def test_audit_log_returns_empty_page_when_no_writes() -> None:
    app = _build_app(backend=InMemoryAuditLogBackend())
    with TestClient(app) as client:
        r = client.get("/admin/audit-log")
        assert r.status_code == 200
        assert r.json() == {"entries": [], "next_cursor": None}


def test_audit_log_returns_newest_first() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 3)
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log")
        rows = r.json()["entries"]
        assert len(rows) == 3
        assert rows[0]["resource"] == "admin_provider_configs/p_2"
        assert rows[-1]["resource"] == "admin_provider_configs/p_0"


def test_audit_log_respects_limit_query_param() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 10, action="identity_patch")
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?limit=3")
        assert r.status_code == 200
        assert len(r.json()["entries"]) == 3


def test_audit_log_limit_validation_rejects_zero() -> None:
    app = _build_app(backend=InMemoryAuditLogBackend())
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?limit=0")
        assert r.status_code == 422  # Query Field(ge=1)


def test_audit_log_limit_validation_rejects_above_200() -> None:
    app = _build_app(backend=InMemoryAuditLogBackend())
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?limit=201")
        assert r.status_code == 422


# ---- W24b F6 — filter ------------------------------------------------------


def test_audit_log_filter_by_action_type() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 4, action="connection_patch")
    _seed(backend, 2, action="identity_patch")
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?action_type=identity_patch")
        rows = r.json()["entries"]
        assert len(rows) == 2
        assert all(row["action"] == "identity_patch" for row in rows)


def test_audit_log_filter_action_type_rejects_unknown() -> None:
    app = _build_app(backend=InMemoryAuditLogBackend())
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?action_type=bogus_action")
        assert r.status_code == 422  # not a member of the AuditAction Literal


def test_audit_log_filter_by_since() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 3)
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        # Date-only param parses tz-naive — the endpoint UTC-normalizes it.
        far_past = client.get("/admin/audit-log?since=2020-01-01")
        assert far_past.status_code == 200
        assert len(far_past.json()["entries"]) == 3
        far_future = client.get("/admin/audit-log?since=2099-12-31")
        assert far_future.status_code == 200
        assert far_future.json()["entries"] == []


# ---- W24b F6 — cursor pagination -------------------------------------------


def test_audit_log_pagination_next_cursor_present_when_more() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 25)  # ids 1..25
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?limit=10")
        body = r.json()
        assert len(body["entries"]) == 10
        # Newest-first — ids 25..16; the oldest on the page is 16.
        assert body["entries"][0]["id"] == 25
        assert body["next_cursor"] == 16


def test_audit_log_pagination_next_cursor_none_on_last_page() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 5)
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?limit=10")
        body = r.json()
        assert len(body["entries"]) == 5
        assert body["next_cursor"] is None


def test_audit_log_pagination_cursor_walks_older() -> None:
    backend = InMemoryAuditLogBackend()
    _seed(backend, 25)
    app = _build_app(backend=backend)
    with TestClient(app) as client:
        page1 = client.get("/admin/audit-log?limit=10").json()
        cursor = page1["next_cursor"]
        assert cursor == 16
        page2 = client.get(f"/admin/audit-log?limit=10&cursor={cursor}").json()
        ids2 = [row["id"] for row in page2["entries"]]
        assert ids2 == list(range(15, 5, -1))  # 15..6
        assert page2["next_cursor"] == 6
        # No overlap with page 1.
        ids1 = [row["id"] for row in page1["entries"]]
        assert set(ids1).isdisjoint(ids2)


def test_audit_log_cursor_validation_rejects_zero() -> None:
    app = _build_app(backend=InMemoryAuditLogBackend())
    with TestClient(app) as client:
        r = client.get("/admin/audit-log?cursor=0")
        assert r.status_code == 422  # Query Field(ge=1) — SERIAL ids start at 1
