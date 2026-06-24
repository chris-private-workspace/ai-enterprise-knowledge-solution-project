"""Per-document ACL store tests (W92 P3a / ADR-0067, per CLAUDE.md §5.6 H6).

Covers `InMemoryDocAclStore` multi-row CRUD (add/upsert/list_for_doc/set_role/remove,
incl. kb+doc isolation + entry-id scoping) + `make_doc_acl_store` factory selection
(in-memory when no DATABASE_URL; Postgres type when set — without connecting).
"""

from __future__ import annotations

import asyncio

from kb_management.doc_acl_store import (
    InMemoryDocAclStore,
    PostgresDocAclStore,
    make_doc_acl_store,
)
from storage.settings import Settings


def _add(store: InMemoryDocAclStore, **over: object):
    base: dict = dict(
        kb_id="kb1",
        doc_id="docA",
        principal_type="user",
        principal_id="oid-1",
        access_role="query",
        granted_by="admin@test",
    )
    base.update(over)
    return asyncio.run(store.add(**base))  # type: ignore[arg-type]


def test_add_then_list_round_trips() -> None:
    store = InMemoryDocAclStore()
    _add(store, principal_id="oid-1")
    _add(store, principal_id="grp-eng", principal_type="group", access_role="edit")
    entries = asyncio.run(store.list_for_doc("kb1", "docA"))
    assert len(entries) == 2
    assert {e.principal_id for e in entries} == {"oid-1", "grp-eng"}


def test_list_empty_for_unknown_doc() -> None:
    store = InMemoryDocAclStore()
    assert asyncio.run(store.list_for_doc("kb1", "ghost")) == []


def test_add_upserts_same_principal_role() -> None:
    store = InMemoryDocAclStore()
    _add(store, principal_id="oid-1", access_role="query")
    _add(store, principal_id="oid-1", access_role="manage")  # upsert
    entries = asyncio.run(store.list_for_doc("kb1", "docA"))
    assert len(entries) == 1  # not duplicated
    assert entries[0].access_role == "manage"


def test_set_role_scoped_to_doc() -> None:
    store = InMemoryDocAclStore()
    e = _add(store, principal_id="oid-1", access_role="query")
    updated = asyncio.run(store.set_role("kb1", "docA", e.id, "edit"))
    assert updated is not None and updated.access_role == "edit"
    # wrong doc → None (entry-id scoped to (kb_id, doc_id))
    assert asyncio.run(store.set_role("kb1", "docB", e.id, "manage")) is None


def test_remove_idempotent_and_scoped() -> None:
    store = InMemoryDocAclStore()
    e = _add(store, principal_id="oid-1")
    assert asyncio.run(store.remove("kb1", "docB", e.id)) is False  # wrong doc
    assert asyncio.run(store.remove("kb1", "docA", e.id)) is True
    assert asyncio.run(store.remove("kb1", "docA", e.id)) is False  # already gone
    assert asyncio.run(store.list_for_doc("kb1", "docA")) == []


def test_isolation_across_docs_and_kbs() -> None:
    store = InMemoryDocAclStore()
    _add(store, kb_id="kb1", doc_id="docA", principal_id="oid-1")
    _add(store, kb_id="kb1", doc_id="docB", principal_id="oid-2")
    _add(store, kb_id="kb2", doc_id="docA", principal_id="oid-3")
    assert [e.principal_id for e in asyncio.run(store.list_for_doc("kb1", "docA"))] == ["oid-1"]
    assert [e.principal_id for e in asyncio.run(store.list_for_doc("kb1", "docB"))] == ["oid-2"]
    assert [e.principal_id for e in asyncio.run(store.list_for_doc("kb2", "docA"))] == ["oid-3"]


def test_factory_inmemory_when_no_database_url() -> None:
    store = make_doc_acl_store(Settings(_env_file=None, database_url=""))
    assert isinstance(store, InMemoryDocAclStore)


def test_factory_postgres_type_when_database_url_set() -> None:
    store = make_doc_acl_store(
        Settings(_env_file=None, database_url="postgresql://u:p@localhost:5432/x")
    )
    assert isinstance(store, PostgresDocAclStore)
