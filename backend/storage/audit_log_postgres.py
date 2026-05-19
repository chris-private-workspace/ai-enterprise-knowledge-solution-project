"""Postgres-backed audit log (W24-wave-c1 F4.8 per ADR-0026).

Satisfies `AuditLogBackend` Protocol. Connection-per-op via psycopg 3 async
(parallel to F2 + F3 storage shape). Idempotent `CREATE TABLE IF NOT EXISTS`
on every connect.

Schema (in the `ekp` database per ADR-0023):

    audit_log(
        id          SERIAL PRIMARY KEY,
        actor       TEXT,                  -- nullable: system / unauthenticated
        action      TEXT NOT NULL,
        resource    TEXT NOT NULL,
        payload     JSONB,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )

`list_recent` ORDER BY id DESC — newer rows have higher ids per SERIAL
monotonicity. Index on (created_at) added in Wave C2 when query volume
demands it; Wave C1 is write-mostly so seq scan acceptable.
"""

from __future__ import annotations

from typing import Any, cast

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from api.schemas.audit_log import AuditAction, AuditLogEntry

_TABLE = "audit_log"

_CREATE_TABLE = f"""
CREATE TABLE IF NOT EXISTS {_TABLE} (
    id          SERIAL PRIMARY KEY,
    actor       TEXT,
    action      TEXT NOT NULL,
    resource    TEXT NOT NULL,
    payload     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""


def _row_to_entry(row: dict[str, Any]) -> AuditLogEntry:
    return AuditLogEntry(
        id=row["id"],
        actor=row["actor"],
        action=cast(AuditAction, row["action"]),
        resource=row["resource"],
        payload=row["payload"],
        created_at=row["created_at"],
    )


class PostgresAuditLogBackend:
    """Postgres-backed audit log store."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _ensure_schema(self, conn: psycopg.AsyncConnection) -> None:
        async with conn.cursor() as cur:
            await cur.execute(_CREATE_TABLE)

    async def append(
        self,
        *,
        actor: str | None,
        action: AuditAction,
        resource: str,
        payload: dict[str, object] | None = None,
    ) -> AuditLogEntry:
        async with await psycopg.AsyncConnection.connect(self._dsn, row_factory=dict_row) as conn:
            await self._ensure_schema(conn)
            async with conn.cursor() as cur:
                await cur.execute(
                    f"INSERT INTO {_TABLE} (actor, action, resource, payload) "
                    f"VALUES (%s, %s, %s, %s) "
                    f"RETURNING id, actor, action, resource, payload, created_at",
                    (actor, action, resource, Jsonb(payload) if payload is not None else None),
                )
                row = await cur.fetchone()
                assert row is not None
                return _row_to_entry(row)

    async def list_recent(self, limit: int = 50) -> list[AuditLogEntry]:
        async with await psycopg.AsyncConnection.connect(self._dsn, row_factory=dict_row) as conn:
            await self._ensure_schema(conn)
            async with conn.cursor() as cur:
                await cur.execute(
                    f"SELECT id, actor, action, resource, payload, created_at "
                    f"FROM {_TABLE} ORDER BY id DESC LIMIT %s",
                    (limit,),
                )
                rows = await cur.fetchall()
                return [_row_to_entry(r) for r in rows]
