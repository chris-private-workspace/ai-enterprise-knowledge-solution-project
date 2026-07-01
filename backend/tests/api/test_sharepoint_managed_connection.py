"""W102 / ADR-0072 — SharePoint managed connection (UI config + Key Vault).

Covers the new surface added on top of ADR-0026 admin connections:
  - `POST /admin/connections/{id}/set-secret` (user-supplied secret → Key Vault),
    incl. H5: the raw value is NEVER echoed back;
  - `ProviderPatch.settings` roundtrip (tenant_id / client_id);
  - the sharepoint config-state probe;
  - the integration route resolving credentials from the managed connection first,
    with `.env` fallback (zero regression) and 503 when neither is configured.

Live Graph is never touched (D4) — the connector is faked; only credential
*resolution* + secret hygiene are asserted here.
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routes import integration as integration_routes
from api.routes.admin import connections as admin_connections
from api.schemas.admin import ProviderPatch
from integration.models import SourceContainer
from integration.sharepoint.graph_client import SharePointCredentials
from storage.admin_provider_storage import InMemoryAdminProviderBackend
from storage.key_vault import EnvVarProvider
from storage.settings import Settings, get_settings

_HEADERS = {"Authorization": "Bearer dev-token"}
_SP = "sharepoint"
_KV_REF = "ekp-sharepoint-client-secret"


@pytest.fixture(autouse=True)
def _clean_settings_cache() -> Iterator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# --------------------------------------------------------------------------- #
# Admin — set-secret + settings roundtrip + probe
# --------------------------------------------------------------------------- #


def _admin_app(backend: Any, key_vault: Any) -> FastAPI:
    app = FastAPI()
    app.include_router(admin_connections.router)
    app.state.admin_provider_backend = backend
    app.state.key_vault_provider = key_vault
    return app


def test_set_secret_stores_masked_and_never_echoes_value() -> None:
    kv = EnvVarProvider()
    app = _admin_app(InMemoryAdminProviderBackend(), kv)
    client = TestClient(app)

    secret = "sp-super-secret-abcd1234"
    r = client.post(f"/admin/connections/{_SP}/set-secret", json={"value": secret})
    assert r.status_code == 200, r.text
    body = r.json()

    # H5 — the raw value must never appear anywhere in the response; only a mask.
    assert secret not in r.text
    assert body["secret_masked_preview"] == "***1234"
    assert body["provider_id"] == _SP
    # The value did reach Key Vault (stored under the provider's kv ref).
    assert asyncio.run(kv.get_secret(_KV_REF)) == secret


def test_set_secret_404_unknown_provider() -> None:
    app = _admin_app(InMemoryAdminProviderBackend(), EnvVarProvider())
    client = TestClient(app)
    r = client.post("/admin/connections/nope/set-secret", json={"value": "x"})
    assert r.status_code == 404


def test_set_secret_400_when_no_secret_slot() -> None:
    # key_vault provider is seeded with secret_kv_ref=None (managed identity).
    app = _admin_app(InMemoryAdminProviderBackend(), EnvVarProvider())
    client = TestClient(app)
    r = client.post("/admin/connections/key_vault/set-secret", json={"value": "x"})
    assert r.status_code == 400


def test_set_secret_422_empty_value() -> None:
    app = _admin_app(InMemoryAdminProviderBackend(), EnvVarProvider())
    client = TestClient(app)
    r = client.post(f"/admin/connections/{_SP}/set-secret", json={"value": ""})
    assert r.status_code == 422


def test_settings_patch_roundtrip() -> None:
    backend = InMemoryAdminProviderBackend()
    app = _admin_app(backend, EnvVarProvider())
    client = TestClient(app)
    r = client.patch(
        f"/admin/connections/{_SP}",
        json={"settings": {"tenant_id": "T1", "client_id": "C1", "credential_type": "client_secret"}},
    )
    assert r.status_code == 200, r.text
    assert r.json()["settings"] == {
        "tenant_id": "T1",
        "client_id": "C1",
        "credential_type": "client_secret",
    }


def test_sharepoint_probe_states() -> None:
    backend = InMemoryAdminProviderBackend()
    kv = EnvVarProvider()
    app = _admin_app(backend, kv)
    client = TestClient(app)

    # Fresh seed: empty tenant/client → not_tested.
    assert client.post(f"/admin/connections/{_SP}/test").json()["status"] == "not_tested"

    # tenant/client set, secret not stored → degraded.
    asyncio.run(backend.update(_SP, ProviderPatch(settings={"tenant_id": "T", "client_id": "C"})))
    assert client.post(f"/admin/connections/{_SP}/test").json()["status"] == "degraded"

    # secret stored (masked preview recorded) → ok.
    client.post(f"/admin/connections/{_SP}/set-secret", json={"value": "secret-wxyz"})
    assert client.post(f"/admin/connections/{_SP}/test").json()["status"] == "ok"


# --------------------------------------------------------------------------- #
# Integration route — managed credential resolution + .env fallback + 503
# --------------------------------------------------------------------------- #


class _FakeHandle:
    async def aclose(self) -> None: ...


class _CredCaptureConnector:
    """Fake SharePointConnector that records the credentials it was built with."""

    last_creds: SharePointCredentials | None = None

    def __init__(self, creds: SharePointCredentials, *, anyone_policy: str = "drop") -> None:
        _CredCaptureConnector.last_creds = creds

    async def connect(self) -> _FakeHandle:
        return _FakeHandle()

    async def aclose(self) -> None: ...

    async def resolve_site(self, handle: Any, hostname: str, site_path: str) -> SourceContainer:
        return SourceContainer(id="site::S1", name="Manuals", type="site")


def _int_app(backend: Any, key_vault: Any, settings: Settings) -> FastAPI:
    app = FastAPI()
    app.include_router(integration_routes.router)
    app.state.admin_provider_backend = backend
    app.state.key_vault_provider = key_vault
    app.dependency_overrides[get_settings] = lambda: settings
    return app


def _mock_settings(**kw: Any) -> Settings:
    return Settings(feature_auth_mock=True, auth_mock_role="admin", **kw)


def _resolve(client: TestClient) -> Any:
    return client.post(
        "/integration/sharepoint/resolve-site",
        json={"site_url": "https://contoso.sharepoint.com/sites/manuals"},
        headers=_HEADERS,
    )


def test_managed_connection_credentials_used(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(integration_routes, "SharePointConnector", _CredCaptureConnector)
    _CredCaptureConnector.last_creds = None

    backend = InMemoryAdminProviderBackend()
    kv = EnvVarProvider()
    asyncio.run(
        backend.update(_SP, ProviderPatch(settings={"tenant_id": "T-managed", "client_id": "C-managed"}))
    )
    asyncio.run(kv.set_secret(_KV_REF, "managed-secret"))

    # No .env sharepoint config → the managed connection must supply the creds.
    with TestClient(_int_app(backend, kv, _mock_settings())) as client:
        assert _resolve(client).status_code == 200

    creds = _CredCaptureConnector.last_creds
    assert creds is not None
    assert creds.tenant_id == "T-managed"
    assert creds.client_id == "C-managed"
    assert creds.client_secret == "managed-secret"


def test_env_fallback_when_managed_unconfigured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(integration_routes, "SharePointConnector", _CredCaptureConnector)
    _CredCaptureConnector.last_creds = None

    # Managed provider present but unconfigured (empty settings) → fall back to .env.
    backend = InMemoryAdminProviderBackend()
    kv = EnvVarProvider()
    settings = _mock_settings(
        sharepoint_tenant_id="T-env",
        sharepoint_client_id="C-env",
        sharepoint_client_secret="env-secret",
    )
    with TestClient(_int_app(backend, kv, settings)) as client:
        assert _resolve(client).status_code == 200

    creds = _CredCaptureConnector.last_creds
    assert creds is not None and creds.tenant_id == "T-env" and creds.client_secret == "env-secret"


def test_503_when_neither_managed_nor_env() -> None:
    backend = InMemoryAdminProviderBackend()
    kv = EnvVarProvider()
    with TestClient(_int_app(backend, kv, _mock_settings())) as client:
        r = _resolve(client)
    assert r.status_code == 503
    assert "not configured" in r.json()["detail"]
