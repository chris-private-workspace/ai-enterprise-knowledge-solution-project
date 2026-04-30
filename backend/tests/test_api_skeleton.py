"""API skeleton smoke tests (per CLAUDE.md §5.6 H6 — query.py is critical module).

W1 scope: verify route registration + 501 stub response + schema validation.
W3+ replaces individual tests with real implementation tests.
"""

from fastapi.testclient import TestClient

from api.server import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_query_route_registered_returns_501() -> None:
    response = client.post(
        "/query",
        json={"query": "test", "kb_id": "drive_user_manuals"},
    )
    assert response.status_code == 501
    assert "architecture.md" in response.json()["detail"]


def test_query_stream_route_registered_returns_501() -> None:
    response = client.post(
        "/query/stream",
        json={"query": "test", "kb_id": "drive_user_manuals"},
    )
    assert response.status_code == 501


def test_kb_list_route_registered_returns_501() -> None:
    response = client.get("/kb")
    assert response.status_code == 501


def test_eval_run_route_registered_returns_501() -> None:
    response = client.post(
        "/eval/run",
        json={"eval_set_id": "v0"},
    )
    assert response.status_code == 501


def test_screenshots_redirect_route_registered_returns_501() -> None:
    response = client.get("/screenshots/drive/M042/img_007.png")
    assert response.status_code == 501


def test_query_request_schema_rejects_too_long_query() -> None:
    """Per architecture.md §4.5: query max_length=2000."""
    too_long = "a" * 2001
    response = client.post(
        "/query",
        json={"query": too_long, "kb_id": "drive"},
    )
    assert response.status_code == 422


def test_query_request_schema_rejects_empty_query() -> None:
    """Per architecture.md §4.5: query min_length=1."""
    response = client.post(
        "/query",
        json={"query": "", "kb_id": "drive"},
    )
    assert response.status_code == 422
