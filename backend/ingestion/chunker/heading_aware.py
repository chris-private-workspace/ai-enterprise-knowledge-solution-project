"""Heading-aware (section-bounded) chunker — W53 / ADR-0044.

A distinct `chunk_strategy` that chunks at heading-section granularity: each
heading-bounded section is kept as ONE chunk, split only when it would exceed
`hard_cap_tokens` (the retrieval / embedding safety line), with **no** sub-hard-cap
target-balancing and **no** adjacent-short merge. Contrast `LayoutAwareChunker`,
which targets ~`target_tokens` (500) and merges tiny sibling sections —
`heading_aware` therefore produces COARSER, FEWER chunks.

Implementation (Karpathy §1.2 / §1.3 — zero parsing rewrite): a thin subclass of
`LayoutAwareChunker` that flips only the two policy knobs which make layout_aware
"target-balanced + merge" into "section-bounded coarse":
  * `target_tokens = hard_cap_tokens` → the soft-target flush in `_add_paragraph`
    fires only at the hard cap (no sub-hard-cap split).
  * `min_chunk_merge_floor = 0` → `_should_merge` returns False for every chunk
    (`token_count >= 0` is always true), so the adjacent-short-merge pass is a no-op.
All section-walk / token-count / image-cap force-split (ADR-0041) / table-as-chunk /
low_value_flag / section_path logic is inherited unchanged.

This is the comparison counterpart to `layout_aware` in the W53 chunk-strategy recall
comparison (兩者合一下半截): same `hard_cap` + same image-cap, isolating the
target-balancing + merge policy as the single variable.
"""

from __future__ import annotations

from ingestion.chunker.layout_aware import _MAX_IMAGES_PER_CHUNK, LayoutAwareChunker


class HeadingAwareChunker(LayoutAwareChunker):
    """Section-bounded coarse chunker — see module docstring + ADR-0044."""

    def __init__(self, max_images_per_chunk: int | None = _MAX_IMAGES_PER_CHUNK) -> None:
        super().__init__(max_images_per_chunk=max_images_per_chunk)
        # ADR-0044 — section-bounded policy: flip the two knobs that make
        # layout_aware "target-balanced + merge" into "section-bounded coarse".
        # All other behaviour (hard_cap split / image-cap / table / low_value /
        # section-walk) is inherited from LayoutAwareChunker unchanged.
        self.target_tokens = self.hard_cap_tokens  # no sub-hard-cap target split
        self.min_chunk_merge_floor = 0  # no adjacent-short merge
