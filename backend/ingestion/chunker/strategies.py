"""Chunk strategy selector (per architecture.md §4.5 KbConfig.chunk_strategy + components/C01-ingestion.md §1).

W2 baseline implements only `layout_aware` (.docx). Other strategies stub
NotImplementedError until their target sprint:
- slide_based — W3 D1 (.pptx via python-pptx)
- heading_aware — W3+ if needed (currently subsumed by layout_aware for .docx)

`auto` routing per doc_format (per architecture.md §3.3 Multi-Format Strategy):
- docx → layout_aware
- pdf  → layout_aware (W2 D5)
- pptx → slide_based (W3 D1)
"""

from __future__ import annotations

from typing import Literal

from ingestion.chunker.base import Chunker
from ingestion.chunker.layout_aware import LayoutAwareChunker
from ingestion.parsers.base import DocFormat

ChunkStrategy = Literal["heading_aware", "layout_aware", "slide_based", "auto"]


def select_chunker(doc_format: DocFormat, strategy: ChunkStrategy = "auto") -> Chunker:
    """Return a Chunker for the given doc_format + KbConfig strategy.

    Raises NotImplementedError for W3+ strategies (slide_based) — orchestrator
    catches and records FailureRecord per architecture.md §3.5.
    """
    resolved = _resolve_auto(doc_format, strategy)

    if resolved == "layout_aware":
        return LayoutAwareChunker()
    if resolved == "slide_based":
        raise NotImplementedError("slide_based chunker is W3 D1 scope (.pptx)")
    if resolved == "heading_aware":
        raise NotImplementedError(
            "heading_aware as a standalone strategy is W3+ scope; "
            "layout_aware already provides heading-bounded sections for W2 baseline",
        )
    raise ValueError(f"unknown chunk strategy: {strategy!r} (resolved={resolved!r})")


def _resolve_auto(doc_format: DocFormat, strategy: ChunkStrategy) -> ChunkStrategy:
    if strategy != "auto":
        return strategy
    if doc_format in ("docx", "pdf"):
        return "layout_aware"
    if doc_format == "pptx":
        return "slide_based"
    raise ValueError(f"cannot auto-resolve strategy for doc_format={doc_format!r}")
