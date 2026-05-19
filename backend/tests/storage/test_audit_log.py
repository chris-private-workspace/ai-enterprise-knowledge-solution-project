"""Audit log storage tests (W24-wave-c1 F4.8 per ADR-0026)."""

from __future__ import annotations

import pytest

from storage.audit_log_storage import InMemoryAuditLogBackend


@pytest.mark.asyncio
async def test_append_assigns_incrementing_ids() -> None:
    backend = InMemoryAuditLogBackend()
    e1 = await backend.append(
        actor="alice@ricoh.com",
        action="connection_patch",
        resource="admin_provider_configs/azure_openai",
        payload={"endpoint_url": "https://new.openai.azure.com"},
    )
    e2 = await backend.append(
        actor=None,
        action="identity_patch",
        resource="admin_identity_config/tenant",
        payload={"tenant_id": "new-tenant"},
    )
    assert e1.id == 1
    assert e2.id == 2
    assert e1.created_at <= e2.created_at


@pytest.mark.asyncio
async def test_append_preserves_actor_and_payload() -> None:
    backend = InMemoryAuditLogBackend()
    e = await backend.append(
        actor="bob@ricoh.com",
        action="connection_rotate_secret",
        resource="admin_provider_configs/cohere",
        payload={"kv_ref": "ekp-cohere-api-key", "masked_preview": "***xY1z"},
    )
    assert e.actor == "bob@ricoh.com"
    assert e.action == "connection_rotate_secret"
    assert e.payload == {"kv_ref": "ekp-cohere-api-key", "masked_preview": "***xY1z"}


@pytest.mark.asyncio
async def test_append_allows_none_actor_for_system_actions() -> None:
    backend = InMemoryAuditLogBackend()
    e = await backend.append(
        actor=None,
        action="api_keys_alert_threshold_patch",
        resource="admin_provider_configs/azure_openai/llm_primary",
        payload={"alert_threshold_pct": 75},
    )
    assert e.actor is None


@pytest.mark.asyncio
async def test_list_recent_returns_newest_first() -> None:
    backend = InMemoryAuditLogBackend()
    for i in range(5):
        await backend.append(
            actor=None,
            action="connection_test",
            resource=f"admin_provider_configs/provider_{i}",
            payload={"status": "ok"},
        )
    rows = await backend.list_recent()
    assert len(rows) == 5
    # Newest first — last inserted (provider_4) leads.
    assert rows[0].resource == "admin_provider_configs/provider_4"
    assert rows[-1].resource == "admin_provider_configs/provider_0"


@pytest.mark.asyncio
async def test_list_recent_respects_limit() -> None:
    backend = InMemoryAuditLogBackend()
    for i in range(10):
        await backend.append(
            actor=None, action="connection_test", resource=f"r_{i}", payload=None
        )
    rows = await backend.list_recent(limit=3)
    assert len(rows) == 3


@pytest.mark.asyncio
async def test_factory_returns_in_memory_when_database_url_unset() -> None:
    from storage.audit_log_factory import make_audit_log_backend
    from storage.settings import Settings

    settings = Settings(database_url="")
    backend = make_audit_log_backend(settings)
    assert isinstance(backend, InMemoryAuditLogBackend)
