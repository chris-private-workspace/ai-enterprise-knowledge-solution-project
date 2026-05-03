"""Parser Protocol + ParserResult dataclasses (per components/C01-ingestion.md §1, §2).

Parsers consume a file (.docx / .pdf / .pptx) and emit a ParserResult containing
heading-aware sections, embedded image inventory and table structure. Downstream
F2 chunker consumes ParserResult.heading_tree + raw_text to build layout-aware chunks.

Design notes:
- Sync parse() — parsers are CPU/IO-bound (zipfile + XML); orchestrator wraps in
  asyncio.to_thread for async pipeline composition.
- @dataclass (not Pydantic) — internal pipeline types, no API boundary validation needed.
- Heading.level uses 1-indexed (H1=1, H2=2, ...) matching Word/Markdown convention.
- EmbeddedImage.position carries paragraph index for downstream chunk-image association.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Protocol, runtime_checkable

DocFormat = Literal["docx", "pdf", "pptx"]


@dataclass(slots=True)
class Heading:
    """Heading-aware section anchor used by F2 layout-aware chunker."""

    level: int  # 1-indexed (H1=1, H2=2, ...)
    text: str
    anchor: str  # paragraph index (str for stability across format variants)
    detected_via: Literal["style", "font_size_heuristic"] = "style"


@dataclass(slots=True)
class EmbeddedImage:
    """Embedded image (raw bytes + position metadata for chunk-image association)."""

    image_bytes: bytes
    alt_text: str
    position: str  # paragraph index where image anchored
    ext: str       # "png" / "jpg" / "wmf" / "emf" / "svg" — pre-conversion
    sha256: str    # for SHA256 dedup at F3 screenshot uploader


@dataclass(slots=True)
class Table:
    """Table structure (rows + optional headers, position for downstream chunk ref)."""

    rows: list[list[str]]
    headers: list[str] | None
    position: str  # paragraph index


@dataclass(slots=True)
class ParserResult:
    """Output of any format-specific parser (per C01-ingestion §1 §2 contract).

    Contract for downstream F2 chunker:
    - raw_text: full document text (may concatenate with paragraph delimiters)
    - heading_tree: ordered list of Heading anchors (in document order)
    - embedded_images: ordered list (in document order)
    - tables: ordered list (in document order)
    - parse_failed=True signals C02 KB Manager to record a FailureRecord
    """

    source_path: Path
    doc_format: DocFormat
    doc_title: str
    raw_text: str
    heading_tree: list[Heading] = field(default_factory=list)
    embedded_images: list[EmbeddedImage] = field(default_factory=list)
    tables: list[Table] = field(default_factory=list)
    paragraphs_total: int = 0
    parse_failed: bool = False
    parse_error: str | None = None


@runtime_checkable
class Parser(Protocol):
    """Format-specific parser contract (.docx / .pdf / .pptx implementations).

    Implementations MUST be deterministic for a given input file (no external
    network calls during parse — parsing is offline structural extraction).
    """

    doc_format: DocFormat

    def parse(self, source: Path) -> ParserResult:
        """Parse a single file. MUST NOT raise on malformed input — return
        ParserResult(parse_failed=True, parse_error=...) instead, so the
        orchestrator can record a FailureRecord without aborting the batch.
        """
        ...
