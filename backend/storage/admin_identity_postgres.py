"""Postgres-backed admin identity config storage (W24-wave-c1 F3 per ADR-0026).

Satisfies the `AdminIdentityConfigBackend` Protocol. Connection-per-op via
psycopg 3 async (parallel to `admin_provider_postgres.py` F2 shape). Idempotent
`CREATE TABLE IF NOT EXISTS` + 5-row sub_resource seed on every connect.

Wired only when `settings.database_url` is set — see
`storage.admin_identity_factory.make_admin_identity_backend`, which lazily
imports this module so an unset `DATABASE_URL` never touches `psycopg`.

Schema (in the `ekp` database per ADR-0023):

    admin_identity_config(
        sub_resource TEXT PRIMARY KEY,  -- tenant / app_registration / msal / roles / policy
        config       JSONB NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL,
        updated_by   TEXT NULL          -- audit_log preview; F4 / Wave C2 promotes
    )
"""

from __future__ import annotations

from typing import cast

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from api.schemas.admin_identity import (
    AppRegistrationConfig,
    EntraTenantConfig,
    IdentityConfig,
    MsalConfig,
    RoleMappingConfig,
    SignInPolicyConfig,
)
from storage.admin_identity_storage import (
    SUB_RESOURCES,
    _derive_authority_url,
    default_app_registration,
    default_identity_config,
    default_msal,
    default_policy,
    default_roles,
    default_tenant,
)

_TABLE = "admin_identity_config"

_CREATE_TABLE = f"""
CREATE TABLE IF NOT EXISTS {_TABLE} (
    sub_resource  TEXT PRIMARY KEY,
    config        JSONB NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    updated_by    TEXT
)
"""


class PostgresAdminIdentityBackend:
    """Postgres-backed identity config store. Seeds the 5 sub-resources on first connect."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _ensure_schema_and_seed(self, conn: psycopg.AsyncConnection) -> None:
        async with conn.cursor() as cur:
            await cur.execute(_CREATE_TABLE)
            await cur.execute(f"SELECT sub_resource FROM {_TABLE}")
            existing = {r[0] for r in await cur.fetchall()}
            seed = default_identity_config()
            seed_map = {
                "tenant": seed.tenant.model_dump(mode="json", exclude={"authority_url"}),
                "app_registration": seed.app_registration.model_dump(mode="json"),
                "msal": seed.msal.model_dump(mode="json"),
                "roles": seed.roles.model_dump(mode="json"),
                "policy": seed.policy.model_dump(mode="json"),
            }
            for sub_resource in SUB_RESOURCES:
                if sub_resource in existing:
                    continue
                await cur.execute(
                    f"INSERT INTO {_TABLE} (sub_resource, config, updated_at) "
                    f"VALUES (%s, %s, NOW())",
                    (sub_resource, Jsonb(seed_map[sub_resource])),
                )

    async def _read_one(
        self, conn: psycopg.AsyncConnection, sub_resource: str
    ) -> dict:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                f"SELECT config FROM {_TABLE} WHERE sub_resource = %s",
                (sub_resource,),
            )
            row = await cur.fetchone()
            assert row is not None, f"seed missing for {sub_resource!r}"
            return cast(dict, row["config"])

    async def _write_one(
        self, conn: psycopg.AsyncConnection, sub_resource: str, value_json: dict
    ) -> None:
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE {_TABLE} SET config = %s, updated_at = NOW() "
                f"WHERE sub_resource = %s",
                (Jsonb(value_json), sub_resource),
            )

    async def get_all(self) -> IdentityConfig:
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            tenant_json = await self._read_one(conn, "tenant")
            app_json = await self._read_one(conn, "app_registration")
            msal_json = await self._read_one(conn, "msal")
            roles_json = await self._read_one(conn, "roles")
            policy_json = await self._read_one(conn, "policy")
            async with conn.cursor(row_factory=dict_row) as cur:
                await cur.execute(
                    f"SELECT MAX(updated_at) AS max_at FROM {_TABLE}"
                )
                row = await cur.fetchone()
                assert row is not None
                updated_at = row["max_at"]
        tenant = EntraTenantConfig(**tenant_json)
        tenant_with_url = tenant.model_copy(
            update={"authority_url": _derive_authority_url(tenant)}
        )
        return IdentityConfig(
            tenant=tenant_with_url,
            app_registration=AppRegistrationConfig(**app_json),
            msal=MsalConfig(**msal_json),
            roles=RoleMappingConfig(**roles_json),
            policy=SignInPolicyConfig(**policy_json),
            updated_at=updated_at,
        )

    async def update_tenant(self, value: EntraTenantConfig) -> EntraTenantConfig:
        clean = value.model_copy(update={"authority_url": None})
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            await self._write_one(
                conn,
                "tenant",
                clean.model_dump(mode="json", exclude={"authority_url"}),
            )
        return clean.model_copy(update={"authority_url": _derive_authority_url(clean)})

    async def update_app_registration(
        self, value: AppRegistrationConfig
    ) -> AppRegistrationConfig:
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            await self._write_one(conn, "app_registration", value.model_dump(mode="json"))
        return value

    async def update_msal(self, value: MsalConfig) -> MsalConfig:
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            await self._write_one(conn, "msal", value.model_dump(mode="json"))
        return value

    async def update_roles(self, value: RoleMappingConfig) -> RoleMappingConfig:
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            await self._write_one(conn, "roles", value.model_dump(mode="json"))
        return value

    async def update_policy(self, value: SignInPolicyConfig) -> SignInPolicyConfig:
        async with await psycopg.AsyncConnection.connect(self._dsn) as conn:
            await self._ensure_schema_and_seed(conn)
            await self._write_one(conn, "policy", value.model_dump(mode="json"))
        return value


# Suppress unused-import warning — these are re-exported for symmetric access from
# routes that need defaults (in-memory hot path) without round-tripping Postgres.
_ = (default_tenant, default_app_registration, default_msal, default_roles, default_policy)
