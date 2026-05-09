"""Docling-based .pdf parser (per architecture.md §3.3 + components/C01-ingestion.md §1 + ADR-0019).

W2 D5 plan listed standalone pdf_parser.py but W15 D5 audit found it never delivered —
.pdf was routing to DoclingDocxParser (per __init__.py temporary alias) so doc_format
attribute was incorrectly "docx" for PDF input. ADR-0019 (W15 D5 closeout P0.2 batch)
reaffirms ADR-0003 multi-format ingestion + delivers this dedicated parser via the
same Docling DocumentConverter that powers DoclingDocxParser.

Tier 1 PDF support scope per ADR-0019:
- ✅ Text-extractable PDF (Word → PDF export, LibreOffice export, Adobe with text layer)
- 🚧 Tier 2 deferred: scanned PDF (OCR required) + encrypted PDF (decryption required)

Implementation mirrors DoclingDocxParser per Karpathy §1.3 surgical (rule-of-3 not yet
triggered for shared base extraction; pptx_parser uses different vendor so Docling-based
count is 2 — refactor trigger reaches when 3rd Docling-based format added in Tier 2).

Anomaly filter: same level >= 6 heading demote rule as docx (consistency).

Edge cases per components/C01-ingestion.md §4:
- Scanned PDF (no text layer) — Docling extracts minimal text, returns ParserResult with
  near-empty paragraphs; orchestrator records FailureRecord with actionable message.
- Encrypted PDF — Docling raises during convert(), caught and returned as
  ParserResult(parse_failed=True, parse_error="...") for orchestrator FailureRecord.
- Malformed PDF — same Parser Protocol contract: never raise.
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

_HEADING_LEVEL_MAX = 5  # filter level >= 6 anomaly (PDF heading hierarchy parallels Word H1-H5)


class DoclingPdfParser:
    """Docling-based .pdf parser. Implements `Parser` Protocol (base.py).

    Tier 1 scope: text-extractable PDF only. Scanned (OCR) + encrypted (decrypt)
    defer Tier 2 per ADR-0019 + architecture.md §11 advanced ingestion roadmap.
    """

    doc_format = "pdf"

    def __init__(self) -> None:
        self._converter = DocumentConverter()

    def parse(self, source: Path) -> ParserResult:
        try:
            return self._parse_inner(source)
        except Exception as exc:  # noqa: BLE001 — Parser Protocol contract MUST NOT raise
            logger.exception("docling pdf parse failed", extra={"path": str(source)})
            return ParserResult(
                source_path=source,
                doc_format="pdf",
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
            doc_format="pdf",
            doc_title=source.stem,
            paragraphs=paragraphs,
            embedded_images=embedded_images,
            tables=tables,
        )
