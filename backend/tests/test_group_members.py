"""group_members store tests (W93 P3b / ADR-0067 G7, per CLAUDE.md §5.6 H6).

Covers `InMemoryRbacBackend` group-member CRUD (add idempotent / remove idempotent /
list_group_members carries added_at / list_groups_for_user = the retrieval-ACL
expansion seam) + list_groups member_count now reflecting real membership.
"""

from __future__ import annotations

import pytest

from storage.rbac_storage import InMemoryRbacBackend


@pytest.mark.asyncio
async def test_add_then_list_members() -> None:
    backend = InMemoryRbacBackend()
    await backend.add_group_member("grp-eng", "oid-a")
    await backend.add_group_member("grp-eng", "oid-b")
    members = await backend.list_group_members("grp-eng")
    assert {m.user_oid for m in members} == {"oid-a", "oid-b"}
    assert all(m.group_key == "grp-eng" and m.added_at is not None for m in members)


@pytest.mark.asyncio
async def test_add_is_idempotent_keeps_original_added_at() -> None:
    backend = InMemoryRbacBackend()
    await backend.add_group_member("grp-eng", "oid-a")
    first = (await backend.list_group_members("grp-eng"))[0].added_at
    await backend.add_group_member("grp-eng", "oid-a")  # re-add
    members = await backend.list_group_members("grp-eng")
    assert len(members) == 1  # not duplicated
    assert members[0].added_at == first  # original timestamp kept


@pytest.mark.asyncio
async def test_remove_idempotent() -> None:
    backend = InMemoryRbacBackend()
    await backend.add_group_member("grp-eng", "oid-a")
    assert await backend.remove_group_member("grp-eng", "oid-a") is True
    assert await backend.remove_group_member("grp-eng", "oid-a") is False  # already gone
    assert await backend.list_group_members("grp-eng") == []


@pytest.mark.asyncio
async def test_list_groups_for_user_is_expansion_seam() -> None:
    backend = InMemoryRbacBackend()
    await backend.add_group_member("grp-eng", "oid-a")
    await backend.add_group_member("grp-all", "oid-a")
    await backend.add_group_member("grp-mgr", "oid-b")
    assert set(await backend.list_groups_for_user("oid-a")) == {"grp-eng", "grp-all"}
    assert await backend.list_groups_for_user("oid-b") == ["grp-mgr"]
    assert await backend.list_groups_for_user("oid-nobody") == []


@pytest.mark.asyncio
async def test_list_groups_member_count_reflects_membership() -> None:
    backend = InMemoryRbacBackend()
    await backend.upsert_entra_group(object_id="grp-eng", name="Engineering", description=None)
    await backend.add_group_member("grp-eng", "oid-a")
    await backend.add_group_member("grp-eng", "oid-b")
    groups = {g.group_key: g for g in await backend.list_groups()}
    assert groups["grp-eng"].member_count == 2  # no longer hardcoded 0


@pytest.mark.asyncio
async def test_reset_clears_members() -> None:
    backend = InMemoryRbacBackend()
    await backend.add_group_member("grp-eng", "oid-a")
    await backend.reset()
    assert await backend.list_groups_for_user("oid-a") == []
