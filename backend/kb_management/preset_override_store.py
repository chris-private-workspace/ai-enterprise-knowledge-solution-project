"""Global profile→preset override storage (W82 / ADR-0056 層 A 段③ 缺口 B / ADR-0063).

Stores an admin-edited `DocConfig` override keyed by **profile label** — the
"指揮中心" write surface that lets a KB admin re-tune the global profile→preset
mapping from Settings → 文件分類規則. Mirrors `doc_profile_store.py` (ADR-0050/0058):
a Postgres table when ``settings.database_url`` is set, else a process-local
in-memory dict. ``psycopg`` is imported lazily inside the Postgres impl so an unset
``DATABASE_URL`` never touches it.

This store is **global** (key = profile label only, NO ``kb_id``) — distinct from
the per-doc override (`doc_config_store`, keyed by ``(kb_id, doc_id)``). The
hardcoded `ingestion.profile_presets.PROFILE_PRESETS` stays the FACTORY default;
an entry here OVERLAYS it for that profile, and deleting the entry restores the
factory value (`resolve_preset` reads ``override ?? factory``). The override only
affects FUTURE routing (next ingest / manual override / backfill) — existing
per-doc configs are not retroactively re-routed (per ADR-0063, same as ADR-0058).

Schema (Postgres):
    profile_preset_overrides(profile TEXT PRIMARY KEY, config JSONB)
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

from api.schemas.doc_config import DocConfig

if TYPE_CHECKING:
    import psycopg
    from psycopg.rows import DictRow

    from storage.settings import Settings


class PresetOverrideStore(Protocol):
    """Global profile→preset override CRUD interface. Implementations async-safe."""

    async def get(self, profile: str) -> DocConfig | None:
        """Return the stored override `DocConfig` for ``profile`` or ``None``.

        ``None`` = no override (the resolver falls through to the factory preset).
        """
        ...

    async def upsert(self, profile: str, config: DocConfig) -> DocConfig:
        """Insert or replace the override for ``profile``; returns the stored config."""
        ...

    async def delete(self, profile: str) -> bool:
        """Delete the override (還原預設); returns ``True`` if a row existed.

        Idempotent — deleting an absent override is not an error.
        """
        ...

    async def list_all(self) -> dict[str, DocConfig]:
        """Return ``{profile: DocConfig}`` for every overridden profile."""
        ...


class InMemoryPresetOverrideStore:
    """Process-local global preset-override store — local dev / CI default.

    Satisfies the `PresetOverrideStore` Protocol. Backed by a flat dict
    ``{profile: DocConfig}``. Lost on restart (same trade-off as the in-memory
    KB / doc-config / doc-profile backends before ADR-0023 Postgres persistence).
    """

    def __init__(self) -> None:
        self._store: dict[str, DocConfig] = {}

    async def get(self, profile: str) -> DocConfig | None:
        return self._store.get(profile)

    async def upsert(self, profile: str, config: DocConfig) -> DocConfig:
        self._store[profile] = config
        return config

    async def delete(self, profile: str) -> bool:
        if profile not in self._store:
            return False
        del self._store[profile]
        return True

    async def list_all(self) -> dict[str, DocConfig]:
        # Copy so callers can't mutate the live store.
        return dict(self._store)


_TABLE = "profile_preset_overrides"

_CREATE_TABLE = f"""
CREATE TABLE IF NOT EXISTS {_TABLE} (
    profile  TEXT NOT NULL,
    config   JSONB NOT NULL,
    PRIMARY KEY (profile)
)
"""


class PostgresPresetOverrideStore:
    """Global preset-override CRUD backed by Postgres — satisfies `PresetOverrideStore`.

    Connection-per-op via psycopg 3 async (same rationale as `PostgresDocProfileStore`:
    preset-override edits are rare admin ops, off the query hot path). ``CREATE TABLE
    IF NOT EXISTS`` runs on every connect — idempotent, microseconds when present.
    """

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    async def _connect(self) -> psycopg.AsyncConnection[DictRow]:
        import psycopg
        from psycopg.rows import dict_row

        conn = await psycopg.AsyncConnection.connect(
            self._dsn,
            autocommit=True,
            row_factory=dict_row,
        )
        async with conn.cursor() as cur:
            await cur.execute(_CREATE_TABLE)
        return conn

    async def get(self, profile: str) -> DocConfig | None:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"SELECT config FROM {_TABLE} WHERE profile = %s",
                (profile,),
            )
            row = await cur.fetchone()
        if row is None:
            return None
        return DocConfig(**row["config"])

    async def upsert(self, profile: str, config: DocConfig) -> DocConfig:
        from psycopg.types.json import Jsonb

        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"""
                INSERT INTO {_TABLE} (profile, config)
                VALUES (%s, %s)
                ON CONFLICT (profile) DO UPDATE SET config = EXCLUDED.config
                """,
                (profile, Jsonb(config.model_dump())),
            )
        return config

    async def delete(self, profile: str) -> bool:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(
                f"DELETE FROM {_TABLE} WHERE profile = %s",
                (profile,),
            )
            return cur.rowcount > 0

    async def list_all(self) -> dict[str, DocConfig]:
        async with await self._connect() as conn, conn.cursor() as cur:
            await cur.execute(f"SELECT profile, config FROM {_TABLE} ORDER BY profile")
            rows = await cur.fetchall()
        return {r["profile"]: DocConfig(**r["config"]) for r in rows}


def make_preset_override_store(settings: Settings) -> PresetOverrideStore:
    """Return a Postgres-backed store when ``database_url`` is set, else in-memory.

    Mirrors `make_doc_profile_store` — lazy psycopg import inside the Postgres branch
    so an unset ``DATABASE_URL`` never touches the driver.
    """
    if settings.database_url:
        return PostgresPresetOverrideStore(settings.database_url)
    return InMemoryPresetOverrideStore()
