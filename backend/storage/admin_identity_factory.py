"""Admin identity config backend factory (W24-wave-c1 F3 per ADR-0026).

Picks `PostgresAdminIdentityBackend` when `settings.database_url` is set, else
`InMemoryAdminIdentityBackend`. Mirrors `make_admin_provider_backend` F2 shape
+ ADR-0023 lazy-import — unset `DATABASE_URL` never touches `psycopg`.
"""

from __future__ import annotations

from storage.admin_identity_storage import (
    AdminIdentityConfigBackend,
    InMemoryAdminIdentityBackend,
)
from storage.settings import Settings


def make_admin_identity_backend(settings: Settings) -> AdminIdentityConfigBackend:
    """Return a Postgres-backed admin identity store when `database_url` is set, else in-memory."""
    if settings.database_url:
        from storage.admin_identity_postgres import PostgresAdminIdentityBackend

        return PostgresAdminIdentityBackend(settings.database_url)
    return InMemoryAdminIdentityBackend()
