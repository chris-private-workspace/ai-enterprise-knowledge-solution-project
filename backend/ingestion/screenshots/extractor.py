"""Screenshot extractor (per architecture.md §4.6 + components/C01-ingestion.md §1).

F1 parser already extracts embedded images from .docx via Docling, normalizes them
to PNG bytes, and computes SHA256. The extractor's job here is to augment each
EmbeddedImage with KB/document context and a deterministic blob_path for the
F3 uploader to push into Azure Blob.

Path convention: `{sha256}.{ext}` — flat per-container layout to enable
cross-document SHA256 dedup within a KB (architecture.md §3 design decision: "Same
logo / diagram across docs: upload once, reference many"). The architecture.md §4.6
template `{kb_id}/{doc_id}/{img_id}.{ext}` is directional; we collapse {kb_id}
into the container name (per ADR-0005 multi-KB convention + ADR-0018 dynamic
injection) and collapse {doc_id} out of the blob path to honor the dedup semantic.
Chunk record stores the resolved blob_url; the {doc_id} association is preserved
at the chunk record level, not the blob layer.

W16+ ADR-0018 multi-KB invariant: kb_id propagates from extractor (via
ScreenshotRecord.kb_id) to uploader (where dynamic container resolution happens
via storage.kb_naming.kb_id_to_screenshot_container). Extractor stays kb_id-aware
since W2 D3 baseline; only uploader gained dynamic container injection in
ADR-0018 Phase 3 Session 2.
"""

from __future__ import annotations

import struct
from collections.abc import Iterable
from dataclasses import dataclass

from ingestion.parsers.base import EmbeddedImage

# PNG 8-byte signature; the F1 parser normalizes all embedded images to PNG bytes
# (see module docstring), so a PNG-only dimension probe covers the corpus.
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def probe_png_dimensions(image_bytes: bytes) -> tuple[int, int] | None:
    """Read (width, height) from a PNG's IHDR header — stdlib only, no Pillow (CH-009 / ADR-0046).

    PNG layout: 8-byte signature, then the IHDR chunk
    `[4-byte length][b"IHDR"][4-byte width BE][4-byte height BE]…`, so width/height
    live at bytes 16:24. Best-effort: returns None for non-PNG / truncated /
    malformed input (never raises) so a probe miss leaves dims unset rather than
    failing ingest. Lets CH-009 flag decorative icons (min dim < threshold) without
    adding an image-decode dependency (H2-safe).
    """
    if len(image_bytes) < 24 or image_bytes[:8] != _PNG_SIGNATURE:
        return None
    if image_bytes[12:16] != b"IHDR":
        return None
    try:
        width, height = struct.unpack(">II", image_bytes[16:24])
    except struct.error:
        return None
    if width <= 0 or height <= 0:
        return None
    return int(width), int(height)


@dataclass(slots=True, frozen=True)
class ScreenshotRecord:
    """An embedded image augmented with KB/doc context + deterministic blob_path.

    Fields:
    - image_bytes: PNG-encoded by F1 parser
    - sha256: content hash; identifies the blob uniquely within container
    - blob_path: `{sha256}.{ext}` — flat layout, cross-doc dedup
    - content_type: MIME type for Blob upload metadata
    - alt_text: from Docling caption if any (else "")
    - doc_order: parser doc_order, used by F2 chunker to associate with sections
    - kb_id / doc_id: context for downstream chunk record citations
    """

    image_bytes: bytes
    sha256: str
    blob_path: str
    content_type: str
    alt_text: str
    doc_order: int
    kb_id: str
    doc_id: str
    width: int | None = None  # populated post-upload if probed
    height: int | None = None


class ScreenshotExtractor:
    """Stateless mapper: EmbeddedImage[] + (kb_id, doc_id) -> ScreenshotRecord[]."""

    @staticmethod
    def extract(
        embedded_images: Iterable[EmbeddedImage],
        kb_id: str,
        doc_id: str,
    ) -> list[ScreenshotRecord]:
        records: list[ScreenshotRecord] = []
        for img in embedded_images:
            content_type = _content_type_for_ext(img.ext)
            # CH-009 / ADR-0046 — probe PNG dimensions so downstream can flag
            # decorative icons (min dim < threshold). None on non-PNG / malformed
            # (best-effort) → dims stay unset, image treated as non-decorative.
            dims = probe_png_dimensions(img.image_bytes)
            records.append(
                ScreenshotRecord(
                    image_bytes=img.image_bytes,
                    sha256=img.sha256,
                    blob_path=f"{img.sha256}.{img.ext}",
                    content_type=content_type,
                    alt_text=img.alt_text,
                    doc_order=img.doc_order,
                    kb_id=kb_id,
                    doc_id=doc_id,
                    width=dims[0] if dims else None,
                    height=dims[1] if dims else None,
                ),
            )
        return records


def _content_type_for_ext(ext: str) -> str:
    """Map ext -> MIME. F1 parser normalizes to PNG; future formats handled here."""
    return {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
    }.get(ext.lower(), "application/octet-stream")
