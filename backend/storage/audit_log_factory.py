"""Audit log backend factory (W24-wave-c1 F4.8 per ADR-0026).

Picks `PostgresAuditLogBackend` when `settings.database_url` is set, else
`InMemoryAuditLogBackend`. Mirrors `make_admin_provider_backend` + F3 factory
+ ADR-0023 lazy-import — unset `DATABASE_URL` never touches `psycopg`.
"""

from __future__ import annotations

from storage.audit_log_storage import AuditLogBackend, InMemoryAuditLogBackend
from storage.settings import Settings


def make_audit_log_backend(settings: Settings) -> AuditLogBackend:
    """Return a Postgres-backed audit log when `database_url` is set, else in-memory."""
    if settings.database_url:
        from storage.audit_log_postgres import PostgresAuditLogBackend

        return PostgresAuditLogBackend(settings.database_url)
    return InMemoryAuditLogBackend()
