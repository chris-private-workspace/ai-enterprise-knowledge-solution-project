"""Docling-based .docx parser (per architecture.md §3.3 + components/C01-ingestion.md §1).

W1 D4 F6 inspector finding showed Word `Heading1-5` style coverage ~3% across the 6
Drive manuals — too sparse for direct heading-aware chunking. W2 D1 probe of Docling
output revealed Docling's layout engine internally combines font-size + bold + visual
cues to detect section_headers, achieving ~7% coverage averaged across the 6 samples
(level 2/3/4 hierarchy preserved). Per F1 acceptance "OR visual layout heuristic", we
treat Docling's SECTION_HEADER label as the visual layout heuristic — no separate
font-size detection added at parser level (would duplicate Docling's internal work).

Parser walks `doc.iterate_items()` in document order to assign a single monotonic
doc_order index across paragraphs / tables / pictures — F2 chunker uses this index
to interleave table and image chunks with their parent text section.

Anomaly filter: Docling tags 1 spurious level=10 entry per doc (always "Table of
Contents") — level >= 6 demoted to plain text paragraphs (non-heading).

Edge cases per components/C01-ingestion.md §4:
- DrawingML (SmartArt / charts) — Docling logs warning, picture not extracted; counted
  in parse stats but not blocking. R7 edge case acceptable for W2 baseline.
- Malformed .docx — caught and returned as ParserResult(parse_failed=True).
"""

from __future__ import annotations

import hashlib
import logging
from io import BytesIO
from pathlib import Path

from docling.document_converter import DocumentConverter
from docling_core.types.doc import DocItemLabel

from .base import EmbeddedImage, ParagraphItem, ParserResult, Table

logger = logging.getLogger(__name__)

_HEADING_LEVEL_MAX = 5  # filter level=10 TOC anomaly (Word standard H1-H5)


class DoclingDocxParser:
    """Docling-based .docx parser. Implements `Parser` Protocol (base.py)."""

    doc_format = "docx"

    def __init__(self) -> None:
        self._converter = DocumentConverter()

    def parse(self, source: Path) -> ParserResult:
        try:
            return self._parse_inner(source)
        except Exception as exc:  # noqa: BLE001 — Parser Protocol contract MUST NOT raise
            logger.exception("docling parse failed", extra={"path": str(source)})
            return ParserResult(
                source_path=source,
                doc_format="docx",
                doc_title=source.stem,
                parse_failed=True,
                parse_error=f"{type(exc).__name__}: {exc}",
            )

    def _parse_inner(self, source: Path) -> ParserResult:
        result = self._converter.convert(source)
        doc = result.document

        paragraphs: list[ParagraphItem] = []
        embedded_images: list[EmbeddedImage] = []
        tables: list[Table] = []

        for doc_order, (item, _depth) in enumerate(doc.iterate_items()):
            label = getattr(item, "label", None)

            if label == DocItemLabel.SECTION_HEADER:
                text = (getattr(item, "text", None) or "").strip()
                if not text:
                    continue
                heading_level = getattr(item, "level", None) or 1
                if heading_level > _HEADING_LEVEL_MAX:
                    paragraphs.append(
                        ParagraphItem(text=text, kind="text", doc_order=doc_order),
                    )
                    continue
                paragraphs.append(
                    ParagraphItem(
                        text=text,
                        kind="heading",
                        doc_order=doc_order,
                        heading_level=heading_level,
                    ),
                )

            elif label == DocItemLabel.LIST_ITEM:
                text = (getattr(item, "text", None) or "").strip()
                if text:
                    paragraphs.append(
                        ParagraphItem(text=text, kind="list_item", doc_order=doc_order),
                    )

            elif label == DocItemLabel.TEXT:
                text = (getattr(item, "text", None) or "").strip()
                if text:
                    paragraphs.append(
                        ParagraphItem(text=text, kind="text", doc_order=doc_order),
                    )

            elif label == DocItemLabel.PICTURE:
                try:
                    pil_img = item.get_image(doc)
                    if pil_img is None:
                        continue
                    buf = BytesIO()
                    pil_img.save(buf, format="PNG")
                    img_bytes = buf.getvalue()
                    embedded_images.append(
                        EmbeddedImage(
                            image_bytes=img_bytes,
                            alt_text=(item.caption_text(doc) or ""),
                            doc_order=doc_order,
                            ext="png",
                            sha256=hashlib.sha256(img_bytes).hexdigest(),
                        ),
                    )
                except Exception:  # noqa: BLE001 — single image fail must not abort doc
                    logger.warning(
                        "image extract failed",
                        extra={"path": str(source), "doc_order": doc_order},
                    )

            elif label == DocItemLabel.TABLE:
                try:
                    df = item.export_to_dataframe(doc)
                    rows = df.values.tolist()
                    headers = list(df.columns) if df.columns is not None else None
                    tables.append(
                        Table(
                            rows=[[str(c) for c in row] for row in rows],
                            headers=[str(h) for h in headers] if headers else None,
                            doc_order=doc_order,
                        ),
                    )
                except Exception:  # noqa: BLE001 — single table fail must not abort doc
                    logger.warning(
                        "table extract failed",
                        extra={"path": str(source), "doc_order": doc_order},
                    )

        return ParserResult(
            source_path=source,
            doc_format="docx",
            doc_title=source.stem,
            paragraphs=paragraphs,
            embedded_images=embedded_images,
            tables=tables,
        )
