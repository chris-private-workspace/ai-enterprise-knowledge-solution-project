"""RBAC backend factory (W24c F2 per ADR-0027 Option A).

Picks `PostgresRbacBackend` when `settings.database_url` is set, else
`InMemoryRbacBackend`. Mirrors `make_audit_log_backend` + ADR-0023 lazy-import
— an unset `DATABASE_URL` never touches `psycopg`, so the in-memory path keeps
working even when `pip install psycopg[binary]` is R8-blocked.
"""

from __future__ import annotations

from storage.rbac_storage import InMemoryRbacBackend, RbacBackend
from storage.settings import Settings


def make_rbac_backend(settings: Settings) -> RbacBackend:
    """Return a Postgres-backed RBAC store when `database_url` is set, else in-memory."""
    if settings.database_url:
        from storage.rbac_postgres import PostgresRbacBackend

        return PostgresRbacBackend(settings.database_url)
    return InMemoryRbacBackend()
