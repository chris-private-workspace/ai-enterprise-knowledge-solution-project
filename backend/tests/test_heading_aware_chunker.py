"""HeadingAwareChunker + chunk_strategy dispatch tests (W53 / ADR-0044; H6).

heading_aware = section-bounded coarse chunking (no sub-hard-cap target split, no
adjacent-short merge; hard_cap split + image-cap inherited). Verifies it produces a
genuinely different chunking from layout_aware + the route _select_chunker honors
chunk_strategy.
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

from api.routes.documents import _IngestionDeps, _select_chunker
from api.schemas.kb import KbConfig
from ingestion.chunker.heading_aware import HeadingAwareChunker
from ingestion.chunker.layout_aware import LayoutAwareChunker
from ingestion.parsers.base import EmbeddedImage, ParagraphItem, ParserResult, Table


def _heading(level: int, text: str, doc_order: int) -> ParagraphItem:
    return ParagraphItem(text=text, kind="heading", doc_order=doc_order, heading_level=level)


def _para(text: str, doc_order: int) -> ParagraphItem:
    return ParagraphItem(text=text, kind="text", doc_order=doc_order)


def _build_result(
    paragraphs: list[ParagraphItem],
    images: list[EmbeddedImage] | None = None,
    tables: list[Table] | None = None,
) -> ParserResult:
    return ParserResult(
        source_path=Path("synthetic.docx"),
        doc_format="docx",
        doc_title="Synthetic Doc",
        paragraphs=paragraphs,
        tables=tables or [],
        embedded_images=images or [],
    )


def _text(chunks: list) -> list:
    return [c for c in chunks if c.chunk_kind == "text"]


# --------------------------------------------------------------------------- #
# Chunker behaviour — section-bounded vs target-balanced + merge
# --------------------------------------------------------------------------- #


def test_no_sub_target_split_yields_fewer_chunks_than_layout() -> None:
    """A large section (each para > target 500 but section total < hard_cap 1500):
    layout_aware splits per-target into ≥2 chunks; heading_aware keeps ONE."""
    paragraphs = [
        _heading(2, "Big Section", 0),
        _para("word " * 600, 1),
        _para("word " * 600, 2),
    ]
    result = _build_result(paragraphs)
    layout = _text(LayoutAwareChunker().chunk(result))
    heading = _text(HeadingAwareChunker().chunk(result))

    assert len(heading) == 1  # section-bounded: one chunk (≈1200 tokens < 1500 hard cap)
    assert len(layout) >= 2  # target-balanced: splits at ~500
    assert len(heading) < len(layout)


def test_no_adjacent_merge_keeps_tiny_siblings_separate() -> None:
    """Two tiny sibling sections under the same parent: layout_aware merges them
    (ADR-0033 b); heading_aware (min_chunk_merge_floor=0) never merges."""
    paragraphs = [
        _heading(2, "Chapter", 0),
        _heading(3, "A", 1),
        _para("short text here", 2),
        _heading(3, "B", 3),
        _para("another short", 4),
    ]
    result = _build_result(paragraphs)
    layout = _text(LayoutAwareChunker().chunk(result))
    heading = _text(HeadingAwareChunker().chunk(result))

    assert len(layout) == 1  # A + B merged (siblings, both < merge floor)
    assert len(heading) == 2  # no merge


def test_hard_cap_still_splits_for_embedding_safety() -> None:
    """A section exceeding hard_cap is still split (embedding safety) even though
    heading_aware does no sub-hard-cap balancing."""
    paragraphs = [
        _heading(2, "Huge", 0),
        _para("word " * 1000, 1),
        _para("word " * 1000, 2),
    ]
    heading = _text(HeadingAwareChunker().chunk(_build_result(paragraphs)))
    assert len(heading) >= 2  # ~2000 tokens > 1500 hard cap → split


def test_image_cap_force_split_inherited() -> None:
    """heading_aware inherits the ADR-0041 image cap (default 8): a 10-image section
    force-splits, and no chunk carries more than the cap."""
    paragraphs = [_heading(2, "Image Section", 0), _para("body " * 30, 1)]
    images = [
        EmbeddedImage(
            image_bytes=b"\x89PNG", alt_text=f"a{i}", doc_order=2 + i, ext="png", sha256=str(i) * 64
        )
        for i in range(10)
    ]
    chunker = HeadingAwareChunker()
    assert chunker.max_images_per_chunk == 8  # inherited default cap
    heading = _text(chunker.chunk(_build_result(paragraphs, images=images)))
    assert len(heading) >= 2  # force-split because 10 images > cap 8
    assert all(len(c.embedded_image_positions) <= 8 for c in heading)


# --------------------------------------------------------------------------- #
# Route dispatch — _select_chunker honors chunk_strategy (W53 wiring)
# --------------------------------------------------------------------------- #


def _deps(make_chunker=None) -> _IngestionDeps:
    return _IngestionDeps(
        embedder=MagicMock(),
        populator=MagicMock(),
        chunker=LayoutAwareChunker(),  # global-cap singleton (inherit path)
        make_chunker=make_chunker,
    )


def test_select_chunker_heading_aware_returns_heading_chunker() -> None:
    chunker = _select_chunker(_deps(), KbConfig(chunk_strategy="heading_aware"))
    assert isinstance(chunker, HeadingAwareChunker)
    assert chunker.max_images_per_chunk == 8  # inherit default cap when None


def test_select_chunker_heading_aware_with_cap_override() -> None:
    chunker = _select_chunker(
        _deps(), KbConfig(chunk_strategy="heading_aware", chunker_max_images_per_chunk=3)
    )
    assert isinstance(chunker, HeadingAwareChunker)
    assert chunker.max_images_per_chunk == 3


def test_select_chunker_layout_aware_uses_singleton() -> None:
    deps = _deps()
    chunker = _select_chunker(deps, KbConfig(chunk_strategy="layout_aware"))
    # bit-identical fall-through: the layout_aware path returns the singleton, NOT
    # a HeadingAwareChunker (which is also a LayoutAwareChunker subclass).
    assert chunker is deps.chunker
    assert not isinstance(chunker, HeadingAwareChunker)


def test_select_chunker_auto_with_cap_uses_factory() -> None:
    sentinel = LayoutAwareChunker(max_images_per_chunk=5)
    chunker = _select_chunker(
        _deps(make_chunker=lambda cap: sentinel),
        KbConfig(chunk_strategy="auto", chunker_max_images_per_chunk=5),
    )
    assert chunker is sentinel


def test_select_chunker_none_config_uses_singleton() -> None:
    deps = _deps()
    chunker = _select_chunker(deps, None)
    assert chunker is deps.chunker
