"""resolve_doc_principals replace-semantics tests (W92 P3a / ADR-0067 G6, §5.6 H6).

The ingest-time principal resolution: a doc with doc_acl rows is authoritative (5.2
override REPLACES KB inheritance); a doc with no rows inherits the KB (5.1, P2 BC);
an unwired doc_acl_store falls back to KB inheritance (byte-identical to P2).
"""

from __future__ import annotations

import pytest

from api.middleware.acl import resolve_doc_principals
from kb_management.doc_acl_store import InMemoryDocAclStore
from storage.rbac_storage import InMemoryRbacBackend


async def _rbac_with_kb_grant(kb_id: str, *principal_ids: str) -> InMemoryRbacBackend:
    backend = InMemoryRbacBackend()
    for pid in principal_ids:
        await backend.add_kb_acl(
            kb_id=kb_id,
            principal_type="user",
            principal_id=pid,
            access_role="query",
            granted_by="admin",
        )
    return backend


@pytest.mark.asyncio
async def test_doc_with_acl_rows_overrides_kb_inheritance() -> None:
    # KB grants [kb-user]; the doc has its own doc_acl [doc-user] → replace: doc wins.
    rbac = await _rbac_with_kb_grant("kb1", "kb-user")
    store = InMemoryDocAclStore()
    await store.add(
        kb_id="kb1", doc_id="docA", principal_type="user",
        principal_id="doc-user", access_role="query", granted_by="admin",
    )
    principals = await resolve_doc_principals(store, rbac, "kb1", "docA")
    assert principals == ["doc-user"]  # NOT the KB's [kb-user] — replace semantics


@pytest.mark.asyncio
async def test_doc_without_acl_rows_inherits_kb() -> None:
    # No doc_acl rows for docB → inherit the KB grant (P2 5.1 behaviour, BC).
    rbac = await _rbac_with_kb_grant("kb1", "kb-user-1", "kb-user-2")
    store = InMemoryDocAclStore()  # empty
    principals = await resolve_doc_principals(store, rbac, "kb1", "docB")
    assert sorted(principals) == ["kb-user-1", "kb-user-2"]


@pytest.mark.asyncio
async def test_unwired_store_falls_back_to_kb() -> None:
    # doc_acl_store=None (unwired / some tests) → KB inheritance, byte-identical to P2.
    rbac = await _rbac_with_kb_grant("kb1", "kb-user")
    principals = await resolve_doc_principals(None, rbac, "kb1", "docA")
    assert principals == ["kb-user"]


@pytest.mark.asyncio
async def test_no_rbac_and_no_doc_acl_is_empty_fail_open() -> None:
    # rbac None + no doc rows → [] (the P2.2 filter treats empty as public, fail-open).
    store = InMemoryDocAclStore()
    assert await resolve_doc_principals(store, None, "kb1", "docA") == []
    assert await resolve_doc_principals(None, None, "kb1", "docA") == []
