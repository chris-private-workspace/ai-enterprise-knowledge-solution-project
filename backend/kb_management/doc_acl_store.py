"""Per-document ACL override storage (W92 P3a / ADR-0067 §Decision 1, G6).

Stores explicit per-document access grants keyed by ``(kb_id, doc_id, principal)``.
Mirrors the per-doc store factory shape (`doc_classification_store.py`): a Postgres
table when ``settings.database_url`` is set, else a process-local in-memory list.
``psycopg`` is imported lazily inside the Postgres impl so an unset ``DATABASE_URL``
never touches it.

Unlike the single-value per-doc stores (config / profile / classification), doc_acl is
**multi-row per doc** — so the CRUD mirrors `kb_acl` (`storage/rbac_storage.py`) but
doc-scoped: `add` upserts on ``(kb_id, doc_id, principal_type, principal_id)``,
`set_role` / `remove` are entry-id scoped within ``(kb_id, doc_id)``.

ADR-0067 replace semantics: a doc with ANY row is authoritative for its
`allowed_principals`; a doc with no rows inherits the KB ACL (P2 behaviour). The
ingest-time resolution (`acl.resolve_doc_principals`) reads `list_for_doc`; the admin
ACL endpoints write + trigger an index re-stamp (`update_doc_principals`).

Schema (Postgres):
    document_acls(
        id SERIAL PRIMARY KEY, kb_id TEXT, doc_id TEXT,
        principal_type TEXT, principal_id TEXT, access_role TEXT,
        granted_by TEXT, created_at TIMESTAMPTZ,
        UNIQUE(kb_id, doc_id, principal_type, principal_id))
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Protocol

from api.schemas.doc_acl import DocAclEntry
from api.schemas.rbac import KbAclRole, KbPrincipalType

if TYPE_CHECKING:
    import psycopg
    from psycopg.rows import DictRow

    from storage.settings import Settings


class DocAclStore(Protocol):
    """Per-document ACL CRUD interface. Implementations must be async-safe."""

    async def list_for_doc(self, kb_id: str, doc_id: str) -> list[DocAclEntry]:
        """Return every explicit ACL grant on ``(kb_id, doc_id)`` (empty = inherit KB)."""
        ...

    async def add(
        self,
        *,
        kb_id: str,
        doc_id: str,
        principal_type: KbPrincipalType,
        principal_id: str,
        access_role: KbAclRole,
        granted_by: str | None,
    ) -> DocAclEntry:
        """Grant a principal access to the doc; upserts an existing grant's role."""
        ...

    async def set_role(
        self, kb_id: str, doc_id: str, entry_id: int, access_role: KbAclRole
    ) -> DocAclEntry | None:
        """Change a grant's role; ``None`` if no such entry under ``(kb_id, doc_id)``."""
        ...

    async def remove(self, kb_id: str, doc_id: str, entry_id: int) -> bool:
        """Revoke a grant; ``True`` if a row existed (scoped to ``(kb_id, doc_id)``)."""
        ...


class InMemoryDocAclStore:
    """Process-local per-doc ACL store — local dev / CI default. Restart-wipes.

    Backed by a flat list (mirrors `InMemoryRbacBackend._kb_acl`). Insertion order is
    preserved, so `list_for_doc` needs no explicit sort.
    """

    def __init__(self) -> None:
        self._entries: list[DocAclEntry] = []
        self._next_id: int = 1

    async def list_for_doc(self, kb_id: str, doc_id: str) -> list[DocAclEntry]:
        return [e for e in self._entries if e.kb_id == kb_id and e.doc_id == doc_id]

    async def add(
        self,
        *,
        kb_id: str,
        doc_id: str,
        principal_type: KbPrincipalType,
        principal_id: str,
        access_role: KbAclRole,
        granted_by: str | None,
    ) -> DocAclEntry:
        for i, existing in enumerate(self._entries):
            if (
                existing.kb_id == kb_id
                and existing.doc_id == doc_id
                and existing.principal_type == principal_type
                and existing.principal_id == principal_id
            ):
                updated = existing.model_copy(
                    update={"access_role": access_role, "granted_by": granted_by}
                )
                self._entries[i] = updated
                return updated
        entry = DocAclEntry(
            id=self._next_id,
            kb_id=kb_id,
            doc_id=doc_id,
            principal_type=principal_type,
            principal_id=principal_id,
            access_role=access_role,
            granted_by=granted_by,
            created_at=datetime.now(UTC),
        )
        self._entries.append(entry)
        self._next_id += 1
        return entry

    async def set_role(
        self, kb_id: str, doc_id: str, entry_id: int, access_role: KbAclRole
    ) -> DocAclEntry | None:
        for i, existing in enumerate(self._entries):
            if existing.id == entry_id and existing.kb_id == kb_id and existing.doc_id == doc_id:
                updated = existing.model_copy(update={"access_role": access_role})
                self._entries[i] = updated
                return updated
        return None

    async def remove(self, kb_id: str, doc_id: str, entry_id: int) -> bool:
        for i, existing in enumerate(self._entries):
            if existing.id == entry_id and existing.kb_id == kb_id and existing.doc_id == doc_id:
                del self._entries[i]
                return True
        return False


_TABLE = "document_acls"

_CREATE_TABLE = f"""
CREATE TABLE IF NOT EXISTS {_TABLE} (
    id              SERIAL PRIMARY KEY,
    kb_id           TEXT NOT NULL,
    doc_id          TEXT NOT NULL,
    principal_type  TEXT NOT NULL,
    principal_id    TEXT NOT NULL,
    access_role     TEXT NOT NULL,
    granted_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (kb_id, doc_id, principal_type, principal_id)
)
"""


def _row_to_entry(row: DictRow) -> DocAclEntry:
    return DocAclEntry(
        id=row["id"],
        kb_id=row["kb_id"],
        doc_id=row["doc_id"],
        principal_type=row["principal_type"],
        principal_id=row["principal_id"],
        access_role=row["access_role"],
        granted_by=row["granted_by"],
        created_at=row["created_at"],
    )


class PostgresDocAclStore:
    """Per-doc ACL CRUD backed by a Postgres table — satisfies `DocAclStore`.

    Connection-per-op via psycopg 3 async (same rationale as the sibling per-doc
    stores: ACL ops are infrequent + off the query hot path; ingest reads one doc's
    rows). ``CREATE TABLE IF NOT EXISTS`` runs on every connect — idempotent.
    """

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _connect(self) -> psycopg.AsyncConnection[DictRow]:
        import psycopg
        from psycopg.rows import dict_row

        conn = await psycopg.AsyncConnection.connect(
            self._dsn, autocommit=True, row_factory=dict_row
        )
        async with conn.cursor() as cur:
            await cur.execute(_CREATE_TABLE)
        return conn

    async def list_for_doc(self, kb_id: str, doc_id: str) -> list[DocAclEntry]:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"SELECT * FROM {_TABLE} WHERE kb_id = %s AND doc_id = %s ORDER BY id",
                (kb_id, doc_id),
            )
            rows = await cur.fetchall()
        return [_row_to_entry(r) for r in rows]

    async def add(
        self,
        *,
        kb_id: str,
        doc_id: str,
        principal_type: KbPrincipalType,
        principal_id: str,
        access_role: KbAclRole,
        granted_by: str | None,
    ) -> DocAclEntry:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"""
                INSERT INTO {_TABLE}
                    (kb_id, doc_id, principal_type, principal_id, access_role, granted_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (kb_id, doc_id, principal_type, principal_id)
                DO UPDATE SET access_role = EXCLUDED.access_role, granted_by = EXCLUDED.granted_by
                RETURNING *
                """,
                (kb_id, doc_id, principal_type, principal_id, access_role, granted_by),
            )
            row = await cur.fetchone()
        assert row is not None  # RETURNING always yields a row
        return _row_to_entry(row)

    async def set_role(
        self, kb_id: str, doc_id: str, entry_id: int, access_role: KbAclRole
    ) -> DocAclEntry | None:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"""
                UPDATE {_TABLE} SET access_role = %s
                WHERE id = %s AND kb_id = %s AND doc_id = %s
                RETURNING *
                """,
                (access_role, entry_id, kb_id, doc_id),
            )
            row = await cur.fetchone()
        return _row_to_entry(row) if row is not None else None

    async def remove(self, kb_id: str, doc_id: str, entry_id: int) -> bool:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"DELETE FROM {_TABLE} WHERE id = %s AND kb_id = %s AND doc_id = %s",
                (entry_id, kb_id, doc_id),
            )
            return cur.rowcount > 0


def make_doc_acl_store(settings: Settings) -> DocAclStore:
    """Return a Postgres-backed store when ``database_url`` is set, else in-memory.

    Mirrors `make_doc_classification_store` — lazy psycopg import inside the Postgres
    branch so an unset ``DATABASE_URL`` never touches the driver.
    """
    if settings.database_url:
        return PostgresDocAclStore(settings.database_url)
    return InMemoryDocAclStore()
