"""Audit log storage — Protocol + InMemory impl (W24-wave-c1 F4.8 per ADR-0026).

Mirrors F2 + F3 3-file Protocol + lazy-import shape:

- `AuditLogBackend` Protocol lives here
- `InMemoryAuditLogBackend` lives here (install-free, restart-wipes; CI baseline)
- `PostgresAuditLogBackend` in `audit_log_postgres.py` (lazy-imported by factory)

`append` is write-only at Wave C1 — list/query endpoints land Wave C2 +
SettingsAccount surface. The Protocol exposes `list_recent` so callers can
exercise it in tests, but no FastAPI route surfaces it Tier 1.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol, runtime_checkable

from api.schemas.audit_log import AuditAction, AuditLogEntry


def _now() -> datetime:
    return datetime.now(timezone.utc)


@runtime_checkable
class AuditLogBackend(Protocol):
    """Audit log write-mostly interface. List for tests + Wave C2 promotion."""

    async def append(
        self,
        *,
        actor: str | None,
        action: AuditAction,
        resource: str,
        payload: dict[str, object] | None = None,
    ) -> AuditLogEntry: ...

    async def list_recent(self, limit: int = 50) -> list[AuditLogEntry]: ...


class InMemoryAuditLogBackend:
    """Process-local audit log. Restart-wipes — matches `InMemoryAdminProviderBackend`."""

    def __init__(self) -> None:
        self._rows: list[AuditLogEntry] = []
        self._next_id = 1

    async def append(
        self,
        *,
        actor: str | None,
        action: AuditAction,
        resource: str,
        payload: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            id=self._next_id,
            actor=actor,
            action=action,
            resource=resource,
            payload=payload,
            created_at=_now(),
        )
        self._rows.append(entry)
        self._next_id += 1
        return entry

    async def list_recent(self, limit: int = 50) -> list[AuditLogEntry]:
        # Newest-first ordering — list-recent semantic per Wave C2 UI consumer.
        return list(reversed(self._rows))[:limit]
