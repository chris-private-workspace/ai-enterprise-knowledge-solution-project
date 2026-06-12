"""ChunkSpec dataclass + Chunker Protocol (per architecture.md §3.3 + §3.5 + components/C01-ingestion.md).

ChunkSpec is the chunker's intermediate output — F4 embedder adds embedding[],
F5 orchestrator adds chunk_id / kb_id / doc_id / prev_chunk_id / next_chunk_id /
source_url / ingested_at to emit the final ChunkRecord (per architecture.md §3.5).

Why @dataclass not Pydantic:
- Internal pipeline type, not API boundary.
- Token-counted text data — Pydantic validation overhead unwarranted.
- Consistent with parsers/base.py convention.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol, runtime_checkable

from ingestion.parsers.base import ParserResult

ChunkKind = Literal["text", "table"]


@dataclass(slots=True)
class ChunkSpec:
    """Intermediate chunk produced by a Chunker; downstream embedder + orchestrator
    augment with embedding[], chunk_id, prev/next_chunk_id, source_url, etc.

    Field semantics:
    - section_path: hierarchical heading text (e.g. ["1 Scope", "1.2 Process List"])
    - chunk_title:  the immediate parent heading text (last element of section_path)
    - chunk_text:   `chunk_title + "\\n\\n" + chunk_content` per architecture.md §3.3
    - chunk_token_count: tiktoken cl100k_base count (matches text-embedding-3-large)
    - chunk_kind:   "text" for body section chunks, "table" for table chunks
    - embedded_image_positions: parser EmbeddedImage.position values to be resolved
                                to image URLs by F3 screenshot uploader
    - chunk_index:  0-indexed within document (orchestrator may renumber globally)
    - low_value_flag: per architecture.md §3.3 soft-floor heuristic
    - heading_anchor: ParserResult.heading_tree.anchor for traceability (None for
                      tables not anchored to a heading)
    - chunk_text_marked: ADR-0055 marked-text variant — chunk_text with
                         `[IMG@<doc_order>]` placeholders interleaved at image
                         positions (orchestrator rewrites to `[IMG#sha8]`).
                         "" when the chunk carries no markers; downstream falls
                         back to chunk_text. Never feeds retrieval, embedding,
                         or chunk_token_count.
    """

    section_path: list[str]
    chunk_title: str
    chunk_text: str
    chunk_token_count: int
    chunk_kind: ChunkKind
    chunk_index: int
    low_value_flag: bool
    embedded_image_positions: list[str] = field(default_factory=list)
    heading_anchor: str | None = None
    chunk_text_marked: str = ""


@runtime_checkable
class Chunker(Protocol):
    """Layout-aware chunker contract. Implementations consume a ParserResult and
    emit ordered ChunkSpec list (document order preserved for prev/next linking)."""

    def chunk(self, parser_result: ParserResult) -> list[ChunkSpec]:
        """Chunk a parsed document. MUST be deterministic per input.
        Empty list returned if parser_result.parse_failed (orchestrator skips embed)."""
        ...
