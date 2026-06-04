"""W46 / ADR-0043 — original source-document blob storage tests.

Mirrors test_screenshots.py: BlobServiceClient is AsyncMock'd (no live Azurite per
R12). Covers upload best-effort semantics + download present/absent + the source
container naming helper.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from azure.core.exceptions import ResourceNotFoundError

from ingestion.source_store import download_source_document, upload_source_document
from storage.kb_naming import kb_id_to_source_container


def _mock_blob_service(blob_client: MagicMock) -> MagicMock:
    """A BlobServiceClient mock usable as `async with client:` + sync get_blob_client."""
    svc = MagicMock()
    svc.create_container = AsyncMock()
    svc.get_blob_client = MagicMock(return_value=blob_client)
    svc.__aenter__ = AsyncMock(return_value=svc)
    svc.__aexit__ = AsyncMock(return_value=None)
    return svc


# ── naming ──────────────────────────────────────────────────────────────────


def test_source_container_legacy_alias() -> None:
    assert kb_id_to_source_container("drive_user_manuals") == "ekp-kb-drive-sources"


def test_source_container_convention() -> None:
    assert kb_id_to_source_container("kb-abc") == "ekp-kb-kb-abc-sources"


# ── upload (best-effort) ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_upload_source_success_returns_true() -> None:
    blob_client = MagicMock()
    blob_client.upload_blob = AsyncMock()
    svc = _mock_blob_service(blob_client)
    with patch(
        "ingestion.source_store.BlobServiceClient.from_connection_string",
        return_value=svc,
    ):
        ok = await upload_source_document(
            "conn",
            "kb-x",
            "doc-a",
            data=b"hello",
            filename="doc-a.docx",
        )
    assert ok is True
    blob_client.upload_blob.assert_awaited_once()
    # overwrite=True so a reindex / re-upload refreshes the stored source
    assert blob_client.upload_blob.await_args.kwargs["overwrite"] is True
    assert (
        blob_client.upload_blob.await_args.kwargs["metadata"]["original_filename"] == "doc-a.docx"
    )


@pytest.mark.asyncio
async def test_upload_source_failure_returns_false_not_raise() -> None:
    """Best-effort: a storage error returns False (never fails the ingest)."""
    blob_client = MagicMock()
    blob_client.upload_blob = AsyncMock(side_effect=ConnectionError("blob down"))
    svc = _mock_blob_service(blob_client)
    with patch(
        "ingestion.source_store.BlobServiceClient.from_connection_string",
        return_value=svc,
    ):
        ok = await upload_source_document(
            "conn",
            "kb-x",
            "doc-a",
            data=b"hello",
            filename="doc-a.docx",
        )
    assert ok is False  # swallowed + logged, not raised


# ── download ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_download_source_present_returns_data_and_filename() -> None:
    stream = MagicMock()
    stream.readall = AsyncMock(return_value=b"filebytes")
    props = MagicMock()
    props.metadata = {"original_filename": "report.pdf"}
    stream.properties = props
    blob_client = MagicMock()
    blob_client.download_blob = AsyncMock(return_value=stream)
    svc = _mock_blob_service(blob_client)
    with patch(
        "ingestion.source_store.BlobServiceClient.from_connection_string",
        return_value=svc,
    ):
        result = await download_source_document("conn", "kb-x", "doc-a")
    assert result == (b"filebytes", "report.pdf")


@pytest.mark.asyncio
async def test_download_source_absent_returns_none() -> None:
    """No stored source (pre-W46 doc) → None so the KB-reindex skips + reports it."""
    blob_client = MagicMock()
    blob_client.download_blob = AsyncMock(side_effect=ResourceNotFoundError("nope"))
    svc = _mock_blob_service(blob_client)
    with patch(
        "ingestion.source_store.BlobServiceClient.from_connection_string",
        return_value=svc,
    ):
        result = await download_source_document("conn", "kb-x", "doc-a")
    assert result is None


@pytest.mark.asyncio
async def test_download_source_missing_filename_falls_back_to_doc_id() -> None:
    stream = MagicMock()
    stream.readall = AsyncMock(return_value=b"x")
    props = MagicMock()
    props.metadata = {}  # legacy/edge: no original_filename metadata
    stream.properties = props
    blob_client = MagicMock()
    blob_client.download_blob = AsyncMock(return_value=stream)
    svc = _mock_blob_service(blob_client)
    with patch(
        "ingestion.source_store.BlobServiceClient.from_connection_string",
        return_value=svc,
    ):
        result = await download_source_document("conn", "kb-x", "doc-a")
    assert result == (b"x", "doc-a")  # falls back to doc_id
