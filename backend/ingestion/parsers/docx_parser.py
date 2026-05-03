"""Docling-based .docx parser (per architecture.md §3.3 + components/C01-ingestion.md §1).

W1 D4 F6 inspector finding showed Word `Heading1-5` style coverage ~3% across the 6
Drive manuals — too sparse for direct heading-aware chunking. W2 D1 probe of Docling
output revealed Docling's layout engine internally combines font-size + bold + visual
cues to detect section_headers, achieving ~7% coverage averaged across the 6 samples
(level 2/3/4 hierarchy preserved). Per F1 acceptance "OR visual layout heuristic", we
treat Docling's SECTION_HEADER label as the visual layout heuristic — no separate
font-size detection added at parser level (would duplicate Docling's internal work).

Anomaly filter: Docling tags 1 spurious level=10 entry per doc (always "Table of
Contents") — level >= 6 filtered out as non-standard hierarchy.

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

from .base import EmbeddedImage, Heading, ParserResult, Table

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
                raw_text="",
                parse_failed=True,
                parse_error=f"{type(exc).__name__}: {exc}",
            )

    def _parse_inner(self, source: Path) -> ParserResult:
        result = self._converter.convert(source)
        doc = result.document

        heading_tree: list[Heading] = []
        text_buf: list[str] = []
        for idx, item in enumerate(doc.texts):
            text = (item.text or "").strip()
            if not text:
                continue
            if item.label == DocItemLabel.SECTION_HEADER:
                level = getattr(item, "level", None) or 1
                if level > _HEADING_LEVEL_MAX:
                    text_buf.append(text)
                    continue
                heading_tree.append(
                    Heading(
                        level=level,
                        text=text,
                        anchor=f"t{idx}",
                        detected_via="style",
                    ),
                )
                text_buf.append(text)
            else:
                text_buf.append(text)

        embedded_images: list[EmbeddedImage] = []
        for idx, pic in enumerate(doc.pictures):
            try:
                pil_img = pic.get_image(doc)
                if pil_img is None:
                    continue
                buf = BytesIO()
                pil_img.save(buf, format="PNG")
                img_bytes = buf.getvalue()
                embedded_images.append(
                    EmbeddedImage(
                        image_bytes=img_bytes,
                        alt_text=(pic.caption_text(doc) or ""),
                        position=f"img{idx}",
                        ext="png",
                        sha256=hashlib.sha256(img_bytes).hexdigest(),
                    ),
                )
            except Exception:  # noqa: BLE001 — single image fail must not abort doc
                logger.warning("image extract failed", extra={"path": str(source), "idx": idx})

        tables: list[Table] = []
        for idx, tbl in enumerate(doc.tables):
            try:
                df = tbl.export_to_dataframe(doc)
                rows = df.values.tolist()
                headers = list(df.columns) if df.columns is not None else None
                tables.append(
                    Table(
                        rows=[[str(c) for c in row] for row in rows],
                        headers=[str(h) for h in headers] if headers else None,
                        position=f"tbl{idx}",
                    ),
                )
            except Exception:  # noqa: BLE001 — single table fail must not abort doc
                logger.warning("table extract failed", extra={"path": str(source), "idx": idx})

        return ParserResult(
            source_path=source,
            doc_format="docx",
            doc_title=source.stem,
            raw_text="\n\n".join(text_buf),
            heading_tree=heading_tree,
            embedded_images=embedded_images,
            tables=tables,
            paragraphs_total=len(doc.texts),
        )
