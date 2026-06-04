"""Original source-document blob storage (per architecture.md §4.6 + ADR-0043).

W46 / ADR-0043 — a UI-triggered KB-level reindex must re-parse the original
document (a re-chunk under a new `chunk_strategy` / per-KB image cap cannot be
derived from the stored chunks, which are the chunking *output*). The ingest path
only persisted chunks + screenshots before W46; this module adds best-effort
persistence of the original upload so reindex can fetch it later.

Container: `ekp-kb-{kb_id}-sources` (per `kb_naming.kb_id_to_source_container`,
parallel to the screenshot container). Blob name = `doc_id` (no extension — the
original filename is carried in blob metadata so reindex can reconstruct the
tempfile name + pick the right parser). Overwrite=True so a reindex / re-upload
refreshes the stored source.

Best-effort: `upload_source_document` returns False (not raise) on failure so a
storage hiccup never fails the ingest itself — the doc just won't be KB-reindexable
until re-uploaded (the reindex summary reports it under `skipped_no_source`).
"""

from __future__ import annotations

import logging

import structlog
from azure.core.exceptions import ResourceNotFoundError
from azure.storage.blob.aio import BlobServiceClient

from storage.kb_naming import kb_id_to_source_container

logger = structlog.get_logger(__name__)
_stdlib_logger = logging.getLogger(__name__)

# Blob metadata key carrying the original filename (so reindex recovers the
# extension for parser selection + the doc_title stem). Azure metadata keys must
# be valid C# identifiers — keep it simple ascii.
_META_ORIGINAL_FILENAME = "original_filename"


async def upload_source_document(
    connection_string: str,
    kb_id: str,
    doc_id: str,
    *,
    data: bytes,
    filename: str,
) -> bool:
    """Best-effort persist the original upload for later KB-level reindex.

    Returns True on success, False on any failure (caller logs + continues — the
    ingest must not fail because source persistence hiccuped). Blob name = doc_id;
    the original filename rides in metadata so reindex can rebuild the tempfile.
    """
    container = kb_id_to_source_container(kb_id)
    try:
        client = BlobServiceClient.from_connection_string(connection_string)
        async with client:
            try:
                await client.create_container(container)
            except Exception:  # noqa: BLE001 — already-exists (or race) is fine
                pass
            blob = client.get_blob_client(container=container, blob=doc_id)
            await blob.upload_blob(
                data,
                overwrite=True,  # reindex / re-upload refreshes the stored source
                metadata={_META_ORIGINAL_FILENAME: filename, "kb_id": kb_id, "doc_id": doc_id},
            )
        logger.info(
            "source_document_persisted",
            kb_id=kb_id,
            doc_id=doc_id,
            filename=filename,
            bytes_count=len(data),
        )
        return True
    except Exception as exc:  # noqa: BLE001 — best-effort; never fail the ingest
        logger.warning(
            "source_document_persist_failed",
            kb_id=kb_id,
            doc_id=doc_id,
            error=f"{type(exc).__name__}: {exc}",
        )
        return False


async def download_source_document(
    connection_string: str,
    kb_id: str,
    doc_id: str,
) -> tuple[bytes, str] | None:
    """Fetch the stored original + its filename for a KB-level reindex.

    Returns `(data, original_filename)`, or `None` when no source is stored for
    this doc (a pre-W46 ingest, or a doc whose best-effort persist failed) — the
    reindex caller then skips it and reports it under `skipped_no_source`.
    """
    container = kb_id_to_source_container(kb_id)
    try:
        client = BlobServiceClient.from_connection_string(connection_string)
        async with client:
            blob = client.get_blob_client(container=container, blob=doc_id)
            try:
                stream = await blob.download_blob()
            except ResourceNotFoundError:
                return None
            data = await stream.readall()
            props = stream.properties
            metadata = props.metadata if props and props.metadata else {}
            filename = metadata.get(_META_ORIGINAL_FILENAME) or doc_id
        return data, filename
    except ResourceNotFoundError:
        return None  # container itself absent → treat as "no source"
