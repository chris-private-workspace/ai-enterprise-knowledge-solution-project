"""W7 D3 F3.4 — audit log middleware unit tests.

Covers F3.1 tag presence + F3.3 redaction sanitization + request_id round-trip.
"""

from __future__ import annotations

import logging
import re

import pytest
import structlog
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.middleware.audit_log import REQUEST_ID_HEADER, AuditLogMiddleware
from storage.settings import Settings


@pytest.fixture(autouse=True)
def _structlog_capture(caplog: pytest.LogCaptureFixture) -> pytest.LogCaptureFixture:
    """Configure structlog to forward records to stdlib logging so caplog sees them."""
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
    )
    caplog.set_level(logging.INFO, logger="ekp.audit")
    return caplog


def _build_app(settings: Settings) -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        AuditLogMiddleware,
        settings=settings,
        protected_prefixes=("/protected",),
    )

    @app.get("/protected")
    def protected_route() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health")
    def health_route() -> dict[str, str]:
        return {"status": "ok"}

    return app


def _audit_event(caplog: pytest.LogCaptureFixture) -> str | None:
    for record in caplog.records:
        if record.name == "ekp.audit" and "audit_log" in record.getMessage():
            return record.getMessage()
    return None


def test_audit_event_emitted_for_protected_path(
    _structlog_capture: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {settings.auth_mock_bearer_token}"},
    )
    assert response.status_code == 200

    event = _audit_event(_structlog_capture)
    assert event is not None
    assert "audit_log" in event
    assert "GET /protected" in event
    assert settings.auth_mock_oid in event
    assert settings.auth_mock_tid in event


def test_audit_event_skipped_for_unscoped_path(
    _structlog_capture: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))

    response = client.get("/health")
    assert response.status_code == 200
    assert _audit_event(_structlog_capture) is None


def test_audit_event_emitted_for_unauth_with_null_user(
    _structlog_capture: pytest.LogCaptureFixture,
) -> None:
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))

    response = client.get("/protected")
    assert response.status_code == 200  # this fixture has no auth Depends

    event = _audit_event(_structlog_capture)
    assert event is not None
    # null user_id + tenant_id should appear when caller didn't bear a token.
    assert "user_id=None" in event or '"user_id": null' in event or "user_id=null" in event
    assert "tenant_id=None" in event or '"tenant_id": null' in event or "tenant_id=null" in event


def test_audit_redacts_authorization_header(
    _structlog_capture: pytest.LogCaptureFixture,
) -> None:
    """F3.3: Authorization header value must never appear in audit event payload."""
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))
    secret_token = settings.auth_mock_bearer_token

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {secret_token}"},
    )
    assert response.status_code == 200

    event = _audit_event(_structlog_capture)
    assert event is not None
    assert "Bearer" not in event
    assert secret_token not in event


def test_request_id_round_trip_echoes_input_header() -> None:
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))

    custom_id = "test-trace-7c1f9e2a"
    response = client.get(
        "/protected",
        headers={
            "Authorization": f"Bearer {settings.auth_mock_bearer_token}",
            REQUEST_ID_HEADER: custom_id,
        },
    )
    assert response.headers.get(REQUEST_ID_HEADER) == custom_id


def test_request_id_generated_when_missing() -> None:
    settings = Settings(feature_auth_mock=True)
    client = TestClient(_build_app(settings))

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {settings.auth_mock_bearer_token}"},
    )
    rid = response.headers.get(REQUEST_ID_HEADER)
    assert rid is not None
    assert re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", rid)
