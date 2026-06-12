"""Layout-aware chunker (per architecture.md §3.3 + components/C01-ingestion.md §1).

Algorithm:
1. Walk ParserResult.paragraphs in doc_order; maintain a heading-level stack to
   compute section_path (e.g., ["1 Scope", "1.2 Process List"]).
2. Within each section, accumulate paragraph text; when accumulated text exceeds
   target_tokens (500), flush as a chunk; respect hard cap (1500) — split at
   paragraph boundaries; never split mid-paragraph for W2 baseline (per spec).
3. Tables: emit each table as 1 chunk (architecture.md §3.3 "table 獨立 chunk"),
   inheriting section_path from the most recent heading at the table's doc_order.
4. Embedded image positions: associate by doc_order. W44 ADR-0041 (切法 D):
   images distribute per text-flush + an image cap (max_images_per_chunk, default
   8) force-splits image-dense sections into sub-chunks under the same section_path
   (was: pile on the whole section → image-flood mega-chunk, 實測 57 圖). cap=None
   preserves the pre-W44 whole-section pile-on (bit-identical).
5. low_value_flag heuristic (per architecture.md §3.3 + checklist F2):
   - chunk_token_count < 60 (soft floor lowered W25 D3 per ADR-0033;
     was 100, see ADR §Decision (a) for the 60% low_value ratio empirical
     signal that triggered the change) OR
   - chunk title or text matches TOC pattern OR version statement.
6. Adjacent-short-merge post-process (W25 D3 per ADR-0033 §Decision (b)):
   - After main event loop emits raw chunks, walk pairs (prev, curr) and
     consolidate consecutive text chunks where both fall below
     _MIN_CHUNK_MERGE_FLOOR (160). Tables stay independent.
   - Merge respects hard_cap_tokens (skip merge if combined would exceed).
   - Re-indexes chunks 0..N-1 contiguous after merge pass.
7. Marked-text variant (W70 per ADR-0055): the accumulator keeps a parallel
   doc_order-interleaved event flow (paragraph / image) and every emitted text
   chunk carries chunk_text_marked — chunk_text with `[IMG@<doc_order>]`
   placeholders at the image's document position (orchestrator rewrites them
   to `[IMG#sha8]`). chunk_text / chunk_token_count / embedding input stay
   bit-identical: the marked stream is assembled from a separate buffer and
   never feeds the clean-text path. "" when a chunk has no markers.

Carry-over from W2 D1: 6 sample chunk count expected to land below plan §2 F2
estimate "2000-3000 chunks total" — that estimate assumed per-row table chunks,
but architecture spec mandates 1-chunk-per-table. Revised expectation per W2 D2
sanity report; non plan deviation since architecture spec is authoritative.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, replace

import tiktoken

from ingestion.chunker.base import ChunkSpec
from ingestion.parsers.base import ParagraphItem, ParserResult, Table

_TOKEN_TARGET = 500
_TOKEN_HARD_CAP = 1500
_TOKEN_LOW_VALUE_FLOOR = 60  # lowered 100→60 W25 D3 per ADR-0033 (amends §3.3)
_MIN_CHUNK_MERGE_FLOOR = 160  # adjacent-short-merge threshold per ADR-0033 (b)
_MAX_IMAGES_PER_CHUNK = 8  # W44 ADR-0041 (切法 D) per-chunk image cap; None → no cap (pre-W44)

_TOC_PATTERNS = (
    re.compile(r"^\s*table of contents\s*$", re.IGNORECASE),
    re.compile(r"^\s*目錄\s*$"),
    re.compile(r"^\s*目次\s*$"),
)
_VERSION_PATTERNS = (
    re.compile(r"^\s*ver(?:sion)?[\s.:]*\d", re.IGNORECASE),
    re.compile(r"^\s*revision history\s*$", re.IGNORECASE),
    re.compile(r"^\s*版本[\s.:]"),
)


@dataclass(slots=True)
class _SectionAccumulator:
    """Internal accumulator for an open text section."""

    section_path: list[str]
    chunk_title: str
    heading_anchor: str | None
    paragraphs: list[str]
    token_count: int
    image_positions: list[str]
    start_doc_order: int  # doc_order where this section opened (after the heading)
    # ADR-0055 — doc_order-interleaved event stream mirroring paragraphs +
    # image_positions: ("para", <text>) / ("img", "[IMG@<doc_order>]"). Feeds
    # ONLY the chunk_text_marked variant; never the clean chunk_text path.
    flow: list[tuple[str, str]]


class LayoutAwareChunker:
    """Heading-aware section chunker for .docx (and W2 D5+ .pdf via Docling parser)."""

    def __init__(
        self,
        target_tokens: int = _TOKEN_TARGET,
        hard_cap_tokens: int = _TOKEN_HARD_CAP,
        low_value_floor: int = _TOKEN_LOW_VALUE_FLOOR,
        min_chunk_merge_floor: int = _MIN_CHUNK_MERGE_FLOOR,
        max_images_per_chunk: int | None = _MAX_IMAGES_PER_CHUNK,
    ) -> None:
        self.target_tokens = target_tokens
        self.hard_cap_tokens = hard_cap_tokens
        self.low_value_floor = low_value_floor
        self.min_chunk_merge_floor = min_chunk_merge_floor
        # W44 ADR-0041 (切法 D) — per-chunk image cap. None → no cap (pre-W44
        # whole-section pile-on, bit-identical). All cap-gated behaviour below
        # (per-flush image reset / force-split / merge image-guard / residual
        # image flush) is OFF when None.
        self.max_images_per_chunk = max_images_per_chunk
        self._enc = tiktoken.get_encoding("cl100k_base")

    def chunk(self, parser_result: ParserResult) -> list[ChunkSpec]:
        if parser_result.parse_failed:
            return []

        chunks: list[ChunkSpec] = []
        chunk_index_counter = 0

        # Build merged document-order event list:
        # paragraphs (text/heading/list_item), images (image_pos), tables.
        events = self._merge_events(parser_result)

        # Active section stack: list[(level, heading_text, anchor)]
        section_stack: list[tuple[int, str, str]] = []
        accumulator: _SectionAccumulator | None = None

        for ev_kind, ev in events:
            if ev_kind == "paragraph":
                p: ParagraphItem = ev
                if p.kind == "heading":
                    # Flush current accumulator before opening new section
                    if accumulator is not None:
                        chunks.extend(self._flush_text_section(accumulator, chunk_index_counter))
                        chunk_index_counter = len(chunks)
                        accumulator = None

                    # Update heading stack: pop deeper-or-equal levels, push this
                    while section_stack and section_stack[-1][0] >= (p.heading_level or 1):
                        section_stack.pop()
                    section_stack.append(((p.heading_level or 1), p.text, f"t{p.doc_order}"))

                    accumulator = _SectionAccumulator(
                        section_path=[h[1] for h in section_stack],
                        chunk_title=p.text,
                        heading_anchor=f"t{p.doc_order}",
                        paragraphs=[],
                        token_count=0,
                        image_positions=[],
                        start_doc_order=p.doc_order,
                        flow=[],
                    )
                else:
                    # Body text under current section (or pre-heading orphan)
                    if accumulator is None:
                        # Pre-first-heading orphan: aggregate under synthetic root
                        accumulator = _SectionAccumulator(
                            section_path=[parser_result.doc_title],
                            chunk_title=parser_result.doc_title,
                            heading_anchor=None,
                            paragraphs=[],
                            token_count=0,
                            image_positions=[],
                            start_doc_order=p.doc_order,
                            flow=[],
                        )
                    self._add_paragraph(accumulator, p.text, chunks, chunk_index_counter)
                    # Refresh chunk_index_counter in case _add_paragraph flushed
                    chunk_index_counter = len(chunks)

            elif ev_kind == "image":
                img_pos = ev  # doc_order int
                if accumulator is not None:
                    accumulator.image_positions.append(f"img@{img_pos}")
                    accumulator.flow.append(("img", f"[IMG@{img_pos}]"))
                    # 切法 D / ADR-0041 — image cap force-split: when the open
                    # section's accumulated images hit the cap, flush the current
                    # chunk (text-so-far + this image batch) and continue the SAME
                    # section in a fresh sub-chunk so per-chunk images stay ≤ cap.
                    if (
                        self.max_images_per_chunk is not None
                        and len(accumulator.image_positions) >= self.max_images_per_chunk
                    ):
                        chunks.extend(self._force_flush_images(accumulator, len(chunks)))
                        chunk_index_counter = len(chunks)
                # else: image before any text/heading — orphan, dropped for W2 baseline

            elif ev_kind == "table":
                tbl: Table = ev
                # Tables become their own chunks; attach current section_path
                section_path = (
                    [h[1] for h in section_stack] if section_stack else [parser_result.doc_title]
                )
                table_chunk = self._build_table_chunk(
                    tbl,
                    section_path=section_path,
                    chunk_index=len(chunks),
                )
                chunks.append(table_chunk)

        # Flush any trailing section
        if accumulator is not None:
            chunks.extend(self._flush_text_section(accumulator, len(chunks)))

        # ADR-0033 (b): consolidate adjacent short text chunks before returning.
        return self._merge_adjacent_shorts(chunks)

    def _merge_events(
        self,
        parser_result: ParserResult,
    ) -> list[tuple[str, object]]:
        """Merge paragraphs / images / tables into a single doc_order-sorted event stream."""
        events: list[tuple[int, str, object]] = []
        for p in parser_result.paragraphs:
            events.append((p.doc_order, "paragraph", p))
        for img in parser_result.embedded_images:
            events.append((img.doc_order, "image", img.doc_order))
        for tbl in parser_result.tables:
            events.append((tbl.doc_order, "table", tbl))
        events.sort(key=lambda e: e[0])
        return [(kind, payload) for _, kind, payload in events]

    def _add_paragraph(
        self,
        acc: _SectionAccumulator,
        text: str,
        chunks: list[ChunkSpec],
        base_index: int,
    ) -> None:
        """Add a paragraph to accumulator; flush as chunk if hard cap reached."""
        para_tokens = len(self._enc.encode(text))

        # If single paragraph exceeds hard cap, emit it standalone (rare, but safe)
        if para_tokens >= self.hard_cap_tokens and not acc.paragraphs:
            # ADR-0055 — mirror the snapshot semantics of image_positions (the
            # standalone chunk carries acc's images without resetting them), so
            # the marked flow is a snapshot too: acc.flow stays untouched.
            chunks.append(
                self._build_text_chunk(
                    acc,
                    [text],
                    para_tokens,
                    len(chunks),
                    flow=[*acc.flow, ("para", text)],
                ),
            )
            return

        prospective = acc.token_count + para_tokens
        if prospective > self.hard_cap_tokens and acc.paragraphs:
            # Flush before adding (hard cap)
            chunks.append(
                self._build_text_chunk(
                    acc,
                    acc.paragraphs,
                    acc.token_count,
                    len(chunks),
                    flow=acc.flow,
                ),
            )
            acc.paragraphs = []
            acc.token_count = 0
            self._reset_images_on_flush(acc)
            self._reset_flow_on_flush(acc)

        acc.paragraphs.append(text)
        acc.token_count += para_tokens
        acc.flow.append(("para", text))

        # Soft target: flush early if past target on a clean paragraph boundary
        if acc.token_count >= self.target_tokens:
            chunks.append(
                self._build_text_chunk(
                    acc,
                    acc.paragraphs,
                    acc.token_count,
                    len(chunks),
                    flow=acc.flow,
                ),
            )
            acc.paragraphs = []
            acc.token_count = 0
            self._reset_images_on_flush(acc)
            self._reset_flow_on_flush(acc)

    def _flush_text_section(
        self,
        acc: _SectionAccumulator,
        base_index: int,
    ) -> list[ChunkSpec]:
        """Emit any remaining buffered paragraphs as a final chunk for the section.

        切法 D / ADR-0041 — also flush a residual image batch (a section tail that
        force-split left with images but no new text) so capped images are never
        dropped. cap=None keeps the pre-W44 paragraphs-only condition (bit-identical).
        """
        has_residual_images = self.max_images_per_chunk is not None and bool(acc.image_positions)
        if not acc.paragraphs and not has_residual_images:
            return []
        return [
            self._build_text_chunk(
                acc,
                acc.paragraphs,
                acc.token_count,
                base_index,
                flow=acc.flow,
            ),
        ]

    def _reset_images_on_flush(self, acc: _SectionAccumulator) -> None:
        """切法 D / ADR-0041 — distribute images per text-flush instead of piling
        them on the whole section (the image-flood root). Only when a cap is set;
        cap=None preserves the pre-W44 whole-section pile-on (bit-identical)."""
        if self.max_images_per_chunk is not None:
            acc.image_positions = []

    def _reset_flow_on_flush(self, acc: _SectionAccumulator) -> None:
        """ADR-0055 — keep the marked flow in lockstep with the flush semantics
        of the buffers it mirrors: flushed paragraphs always drop; image events
        follow _reset_images_on_flush (cap set → reset per flush; cap=None →
        pre-W44 pile-on keeps images, so their markers re-emit in later
        sub-chunks exactly like embedded_image_positions does)."""
        if self.max_images_per_chunk is not None:
            acc.flow = []
        else:
            acc.flow = [ev for ev in acc.flow if ev[0] == "img"]

    def _force_flush_images(
        self,
        acc: _SectionAccumulator,
        base_index: int,
    ) -> list[ChunkSpec]:
        """切法 D / ADR-0041 — flush the open section as a sub-chunk when its image
        count hits the cap, then reset paragraphs/tokens/images so the SAME section
        continues in a fresh sub-chunk (section_path / title / heading_anchor kept).
        The flushed chunk carries the text-so-far plus the capped image batch; an
        image-only batch (no interleaved text) yields a title-only carrier chunk —
        acceptable, citation neighbours (prev/next + section-aware attach) still
        reach surrounding context. Only called when max_images_per_chunk is set.
        """
        chunk = self._build_text_chunk(
            acc,
            acc.paragraphs,
            acc.token_count,
            base_index,
            flow=acc.flow,
        )
        acc.paragraphs = []
        acc.token_count = 0
        acc.image_positions = []
        acc.flow = []
        return [chunk]

    def _build_text_chunk(
        self,
        acc: _SectionAccumulator,
        paragraphs: list[str],
        token_count: int,
        chunk_index: int,
        *,
        flow: list[tuple[str, str]],
    ) -> ChunkSpec:
        chunk_content = "\n\n".join(paragraphs)
        chunk_text = f"{acc.chunk_title}\n\n{chunk_content}" if acc.chunk_title else chunk_content
        full_token_count = len(self._enc.encode(chunk_text))
        return ChunkSpec(
            section_path=list(acc.section_path),
            chunk_title=acc.chunk_title,
            chunk_text=chunk_text,
            chunk_token_count=full_token_count,
            chunk_kind="text",
            chunk_index=chunk_index,
            low_value_flag=self._is_low_value(acc.chunk_title, chunk_content, full_token_count),
            embedded_image_positions=list(acc.image_positions),
            heading_anchor=acc.heading_anchor,
            chunk_text_marked=self._build_marked_text(acc.chunk_title, flow),
        )

    def _build_marked_text(self, chunk_title: str, flow: list[tuple[str, str]]) -> str:
        """ADR-0055 — assemble the marked-text variant: paragraphs and
        `[IMG@<doc_order>]` placeholders joined in document order, with the
        same title-prefix rule as chunk_text. Returns "" when the flow carries
        no image events — downstream consumers fall back to chunk_text, so
        marker-less text is never duplicated into storage."""
        if not any(kind == "img" for kind, _ in flow):
            return ""
        marked_content = "\n\n".join(payload for _, payload in flow)
        return f"{chunk_title}\n\n{marked_content}" if chunk_title else marked_content

    def _build_table_chunk(
        self,
        table: Table,
        section_path: list[str],
        chunk_index: int,
    ) -> ChunkSpec:
        # Render table as pipe-delimited rows for text retrieval (BM25 + embedding compatible)
        lines: list[str] = []
        if table.headers:
            lines.append(" | ".join(str(h) for h in table.headers))
            lines.append("-" * 4)
        for row in table.rows:
            lines.append(" | ".join(str(c) for c in row))
        table_body = "\n".join(lines)

        chunk_title = section_path[-1] if section_path else "Table"
        chunk_text = f"{chunk_title}\n\n{table_body}"
        token_count = len(self._enc.encode(chunk_text))

        return ChunkSpec(
            section_path=list(section_path),
            chunk_title=chunk_title,
            chunk_text=chunk_text,
            chunk_token_count=token_count,
            chunk_kind="table",
            chunk_index=chunk_index,
            low_value_flag=self._is_low_value(chunk_title, table_body, token_count),
            embedded_image_positions=[],
            heading_anchor=None,
        )

    def _is_low_value(self, title: str, body: str, token_count: int) -> bool:
        if token_count < self.low_value_floor:
            return True
        for pat in _TOC_PATTERNS:
            if pat.match(title) or pat.match(body):
                return True
        for pat in _VERSION_PATTERNS:
            if pat.match(title):
                return True
        return False

    def _merge_adjacent_shorts(self, chunks: list[ChunkSpec]) -> list[ChunkSpec]:
        """Per ADR-0033 (b) — consolidate consecutive text chunks where both
        fall below min_chunk_merge_floor. Tables stay independent. Merges
        backward into prev (inherits prev's section_path / chunk_title /
        heading_anchor). Respects hard_cap_tokens. Re-indexes 0..N-1.
        """
        if not chunks:
            return chunks

        merged: list[ChunkSpec] = []
        for chunk in chunks:
            if not merged:
                merged.append(chunk)
                continue

            prev = merged[-1]
            if not self._should_merge(prev, chunk):
                merged.append(chunk)
                continue

            combined_text = f"{prev.chunk_text}\n\n{chunk.chunk_text}"
            combined_token_count = len(self._enc.encode(combined_text))

            # Safety: never break hard cap (re-checked post-encode because
            # token counts are not strictly additive).
            if combined_token_count > self.hard_cap_tokens:
                merged.append(chunk)
                continue

            combined_images = list(prev.embedded_image_positions) + list(
                chunk.embedded_image_positions,
            )
            # ADR-0055 — marked variant merges in parallel; a marker-less side
            # contributes its clean text so the marked stream stays complete.
            combined_marked = ""
            if prev.chunk_text_marked or chunk.chunk_text_marked:
                combined_marked = (
                    f"{prev.chunk_text_marked or prev.chunk_text}\n\n"
                    f"{chunk.chunk_text_marked or chunk.chunk_text}"
                )
            merged[-1] = ChunkSpec(
                section_path=list(prev.section_path),
                chunk_title=prev.chunk_title,
                chunk_text=combined_text,
                chunk_token_count=combined_token_count,
                chunk_kind="text",
                chunk_index=prev.chunk_index,  # re-indexed below
                low_value_flag=self._is_low_value(
                    prev.chunk_title,
                    combined_text,
                    combined_token_count,
                ),
                embedded_image_positions=combined_images,
                heading_anchor=prev.heading_anchor,
                chunk_text_marked=combined_marked,
            )

        # Re-index 0..N-1 contiguous after any merges.
        return [replace(c, chunk_index=i) for i, c in enumerate(merged)]

    def _should_merge(self, prev: ChunkSpec, curr: ChunkSpec) -> bool:
        """Both text-kind + both below merge floor + sibling sub-sections of
        the same non-trivial parent.

        Hard-cap check happens post-encode in _merge_adjacent_shorts (token
        counts are not strictly additive after rejoining).

        BUG-017 (W25 D2) — sibling-only guard:never merge across section
        boundaries. ADR-0033 (b) didn't anticipate that merging a section's
        small intro chunk backward into the previous section's last chunk
        would inherit prev's `section_path` while carrying curr's
        `embedded_image_positions`, mis-attributing the image. Two short
        chunks may consolidate only if they're siblings under the same
        non-trivial parent — i.e. `section_path[:-1]` are equal AND non-empty.
        This preserves both image-section attribution AND text-section
        semantic identity; W25 F1 within-section consolidation benefit is
        unaffected because most reduction came from sub-subsection siblings
        (1.1 + 1.2 + 1.3 under "Chapter 1" etc.), which still merge.
        Top-level chapters never merge (always distinct chapters).
        """
        if prev.chunk_kind != "text" or curr.chunk_kind != "text":
            return False
        # 切法 D / ADR-0041 — never merge if combined images would exceed the cap
        # (defends the per-chunk cap against ADR-0033 adjacent-short-merge re-piling
        # images from two image-dense short sub-sections). cap=None → no guard.
        if self.max_images_per_chunk is not None and (
            len(prev.embedded_image_positions) + len(curr.embedded_image_positions)
            > self.max_images_per_chunk
        ):
            return False
        if prev.chunk_token_count >= self.min_chunk_merge_floor:
            return False
        if curr.chunk_token_count >= self.min_chunk_merge_floor:
            return False
        # BUG-017 — must be siblings under the same non-trivial parent.
        prev_parent = prev.section_path[:-1]
        curr_parent = curr.section_path[:-1]
        if not prev_parent or not curr_parent:
            return False
        if prev_parent != curr_parent:
            return False
        return True
