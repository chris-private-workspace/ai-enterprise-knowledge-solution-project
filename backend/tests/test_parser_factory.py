"""Parser factory + slide_based chunker unit tests (W4 D1 F9; per CLAUDE.md §5.6 H6).

Coverage:
- select_parser dispatches by file extension (.docx → DoclingDocxParser,
  .pptx → PptxParser, .pdf → DoclingPdfParser per ADR-0019)
- select_parser raises ValueError for unsupported extension
- select_chunker(doc_format='pptx', strategy='auto') returns LayoutAwareChunker
  (slide_based delegates per W4 D1 F9 simplification)
- select_chunker(strategy='heading_aware') returns HeadingAwareChunker (W53 / ADR-0044)
"""

from __future__ import annotations

from pathlib import Path

import pytest

from ingestion.chunker.heading_aware import HeadingAwareChunker
from ingestion.chunker.layout_aware import LayoutAwareChunker
from ingestion.chunker.strategies import select_chunker
from ingestion.parsers import select_parser
from ingestion.parsers.docx_parser import DoclingDocxParser
from ingestion.parsers.pdf_parser import DoclingPdfParser
from ingestion.parsers.pptx_parser import PptxParser


def test_select_parser_returns_pptx_parser_for_pptx() -> None:
    parser = select_parser(Path("/some/path/deck.pptx"))
    assert isinstance(parser, PptxParser)
    assert parser.doc_format == "pptx"


def test_select_parser_returns_docling_for_docx() -> None:
    parser = select_parser(Path("/some/path/manual.docx"))
    assert isinstance(parser, DoclingDocxParser)
    assert parser.doc_format == "docx"


def test_select_parser_returns_pdf_parser_for_pdf() -> None:
    parser = select_parser(Path("/some/path/report.pdf"))
    assert isinstance(parser, DoclingPdfParser)
    assert parser.doc_format == "pdf"


def test_select_parser_uppercase_extension_normalised() -> None:
    parser = select_parser(Path("/some/path/DECK.PPTX"))
    assert isinstance(parser, PptxParser)


def test_select_parser_unsupported_extension_raises() -> None:
    with pytest.raises(ValueError, match=r"unsupported file extension"):
        select_parser(Path("/some/path/sheet.xlsx"))


def test_select_chunker_pptx_auto_returns_layout_aware() -> None:
    chunker = select_chunker(doc_format="pptx", strategy="auto")
    assert isinstance(chunker, LayoutAwareChunker)


def test_select_chunker_pptx_explicit_slide_based_returns_layout_aware() -> None:
    chunker = select_chunker(doc_format="pptx", strategy="slide_based")
    assert isinstance(chunker, LayoutAwareChunker)


def test_select_chunker_heading_aware_returns_heading_aware_chunker() -> None:
    # W53 / ADR-0044 — heading_aware is now a real section-bounded strategy.
    chunker = select_chunker(doc_format="docx", strategy="heading_aware")
    assert isinstance(chunker, HeadingAwareChunker)
    # section-bounded policy: no sub-hard-cap target split + no adjacent merge.
    assert chunker.target_tokens == chunker.hard_cap_tokens
    assert chunker.min_chunk_merge_floor == 0


# --- ADR-0057 — per-KB PDF picture extraction thread (select_parser extract_images) ---


def test_select_parser_pdf_extract_images_threads_flag() -> None:
    parser = select_parser(Path("/some/path/report.pdf"), extract_images=True)
    assert isinstance(parser, DoclingPdfParser)
    assert parser.generate_picture_images is True


def test_select_parser_pdf_default_no_picture_extraction() -> None:
    # production-preserve — default keeps generate_picture_images False (no PDF figures)
    parser = select_parser(Path("/some/path/report.pdf"))
    assert isinstance(parser, DoclingPdfParser)
    assert parser.generate_picture_images is False


def test_select_parser_docx_unaffected_by_extract_images() -> None:
    # extract_images only flips the .pdf path; docx / pptx stay bit-identical
    parser = select_parser(Path("/some/path/manual.docx"), extract_images=True)
    assert isinstance(parser, DoclingDocxParser)
