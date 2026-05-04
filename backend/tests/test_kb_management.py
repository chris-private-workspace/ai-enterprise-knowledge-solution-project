"""KB management unit tests (W1 F10.4 carry-over closeout 2026-05-04).

Covers `backend/kb_management/{storage,service}.py` per CLAUDE.md §5.6 H6
(critical pipeline modules) and architecture.md §3.4 KB Manager spec.

InMemoryKBBackend is the W1 baseline; W2 D1+ Azure-backed impl will satisfy
the same KBStorageBackend Protocol — these tests pin the contract.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from api.schemas.kb import KbConfig, KbCreate, KbStatus
from kb_management.service import KBService
from kb_management.storage import (
    InMemoryKBBackend,
    KBAlreadyExistsError,
    KBNotFoundError,
)


def _kb(kb_id: str = "test_kb", name: str = "Test KB") -> KbStatus:
    return KbStatus(
        kb_id=kb_id,
        name=name,
        description="Test description",
        config=KbConfig(),
        total_documents=0,
        total_chunks=0,
        total_screenshots=0,
        failed_documents=[],
        last_indexed_at=datetime.now(UTC),
        storage_size_mb=0.0,
    )


# ----- InMemoryKBBackend tests -----


@pytest.mark.asyncio
async def test_in_memory_create_returns_kb() -> None:
    backend = InMemoryKBBackend()
    kb = _kb()
    result = await backend.create(kb)
    assert result.kb_id == "test_kb"


@pytest.mark.asyncio
async def test_in_memory_create_duplicate_raises() -> None:
    backend = InMemoryKBBackend()
    await backend.create(_kb())
    with pytest.raises(KBAlreadyExistsError):
        await backend.create(_kb())


@pytest.mark.asyncio
async def test_in_memory_list_all_returns_inserted_kbs() -> None:
    backend = InMemoryKBBackend()
    await backend.create(_kb("kb_a", "KB A"))
    await backend.create(_kb("kb_b", "KB B"))
    result = await backend.list_all()
    assert {k.kb_id for k in result} == {"kb_a", "kb_b"}


@pytest.mark.asyncio
async def test_in_memory_list_all_empty_returns_empty_list() -> None:
    backend = InMemoryKBBackend()
    assert await backend.list_all() == []


@pytest.mark.asyncio
async def test_in_memory_get_existing_returns_kb() -> None:
    backend = InMemoryKBBackend()
    await backend.create(_kb())
    result = await backend.get("test_kb")
    assert result.name == "Test KB"


@pytest.mark.asyncio
async def test_in_memory_get_missing_raises() -> None:
    backend = InMemoryKBBackend()
    with pytest.raises(KBNotFoundError):
        await backend.get("ghost")


@pytest.mark.asyncio
async def test_in_memory_delete_existing() -> None:
    backend = InMemoryKBBackend()
    await backend.create(_kb())
    await backend.delete("test_kb")
    with pytest.raises(KBNotFoundError):
        await backend.get("test_kb")


@pytest.mark.asyncio
async def test_in_memory_delete_missing_raises() -> None:
    backend = InMemoryKBBackend()
    with pytest.raises(KBNotFoundError):
        await backend.delete("ghost")


@pytest.mark.asyncio
async def test_in_memory_update_config_replaces_config() -> None:
    backend = InMemoryKBBackend()
    await backend.create(_kb())
    new_config = KbConfig(default_top_k=100, default_rerank_k=10)
    updated = await backend.update_config("test_kb", new_config)
    assert updated.config.default_top_k == 100
    assert updated.config.default_rerank_k == 10
    # other fields preserved
    assert updated.name == "Test KB"


@pytest.mark.asyncio
async def test_in_memory_update_config_missing_raises() -> None:
    backend = InMemoryKBBackend()
    with pytest.raises(KBNotFoundError):
        await backend.update_config("ghost", KbConfig())


# ----- KBService tests (orchestration layer) -----


@pytest.mark.asyncio
async def test_service_create_initializes_zero_counters() -> None:
    service = KBService(InMemoryKBBackend())
    payload = KbCreate(kb_id="svc_kb", name="Svc KB", description="d")
    result = await service.create(payload)
    assert result.total_documents == 0
    assert result.total_chunks == 0
    assert result.total_screenshots == 0
    assert result.failed_documents == []
    assert result.storage_size_mb == 0.0


@pytest.mark.asyncio
async def test_service_create_then_get_roundtrip() -> None:
    service = KBService(InMemoryKBBackend())
    await service.create(KbCreate(kb_id="rt", name="RT"))
    result = await service.get("rt")
    assert result.kb_id == "rt"
    assert result.name == "RT"


@pytest.mark.asyncio
async def test_service_update_config_propagates() -> None:
    service = KBService(InMemoryKBBackend())
    await service.create(KbCreate(kb_id="cfg", name="CFG"))
    new_cfg = KbConfig(embedding_dimension=3072)
    updated = await service.update_config("cfg", new_cfg)
    assert updated.config.embedding_dimension == 3072


@pytest.mark.asyncio
async def test_service_delete_removes_from_list() -> None:
    service = KBService(InMemoryKBBackend())
    await service.create(KbCreate(kb_id="del_me", name="x"))
    await service.delete("del_me")
    assert await service.list_all() == []
