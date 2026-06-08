"""CH-009 / ADR-0046 — PNG dimension probe + ingest dims flow (H6 ingestion critical).

T1 — `probe_png_dimensions`: valid PNG → (w,h); non-PNG / truncated / malformed → None.
A2 — `ScreenshotExtractor.extract` populates width/height; orchestrator emits ImageRef dims.
"""

from __future__ import annotations

import struct
from pathlib import Path

import pytest

from ingestion.parsers.base import EmbeddedImage, ParserResult
from ingestion.screenshots.extractor import ScreenshotExtractor, probe_png_dimensions


def _png_bytes(width: int, height: int) -> bytes:
    """Minimal PNG header (signature + IHDR) with the given dims — enough for the probe."""
    return (
        b"\x89PNG\r\n\x1a\n"
        + struct.pack(">I", 13)  # IHDR length
        + b"IHDR"
        + struct.pack(">II", width, height)
        + b"\x08\x06\x00\x00\x00"  # bit depth / colour type / etc. (probe ignores)
    )


# --------------------------------------------------------------------------- T1
def test_probe_png_dimensions_valid() -> None:
    assert probe_png_dimensions(_png_bytes(800, 600)) == (800, 600)
    assert probe_png_dimensions(_png_bytes(48, 1024)) == (48, 1024)


def test_probe_png_dimensions_non_png_returns_none() -> None:
    assert probe_png_dimensions(b"\xff\xd8\xff\xe0JFIF and not a png at all") is None
    assert probe_png_dimensions(b"") is None


def test_probe_png_dimensions_truncated_returns_none() -> None:
    # Correct signature but cut off before IHDR width/height.
    assert probe_png_dimensions(b"\x89PNG\r\n\x1a\n" + b"\x00\x00") is None


def test_probe_png_dimensions_zero_dims_returns_none() -> None:
    assert probe_png_dimensions(_png_bytes(0, 0)) is None


def test_probe_png_dimensions_missing_ihdr_marker_returns_none() -> None:
    bad = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"JUNK" + struct.pack(">II", 10, 10)
    assert probe_png_dimensions(bad) is None


# --------------------------------------------------------------------------- A2
def test_extractor_populates_dims_from_png() -> None:
    img = EmbeddedImage(
        image_bytes=_png_bytes(120, 90),
        alt_text="figure",
        doc_order=0,
        ext="png",
        sha256="a" * 64,
    )
    records = ScreenshotExtractor.extract([img], kb_id="kb", doc_id="d")
    assert records[0].width == 120
    assert records[0].height == 90


def test_extractor_dims_none_for_non_png() -> None:
    img = EmbeddedImage(
        image_bytes=b"not a png",
        alt_text="",
        doc_order=0,
        ext="png",
        sha256="b" * 64,
    )
    records = ScreenshotExtractor.extract([img], kb_id="kb", doc_id="d")
    assert records[0].width is None
    assert records[0].height is None


@pytest.mark.asyncio
async def test_orchestrator_emits_imageref_with_probed_dims() -> None:
    """A2 — ingest end-to-end: ImageRef carries the PNG-probed width/height."""
    from unittest.mock import AsyncMock

    from ingestion.chunker.base import ChunkSpec
    from ingestion.embedding.base import EmbeddingResult
    from ingestion.orchestrator import IngestionOrchestrator
    from ingestion.screenshots.uploader import UploadResult

    class _FakeParser:
        def __init__(self, result: ParserResult) -> None:
            self._result = result

        def parse(self, source: Path) -> ParserResult:  # noqa: ARG002
            return self._result

    class _FakeChunker:
        def __init__(self, chunks: list[ChunkSpec]) -> None:
            self._chunks = chunks

        def chunk(self, parser_result: ParserResult) -> list[ChunkSpec]:  # noqa: ARG002
            return self._chunks

    class _FakeEmbedder:
        embedding_dimension = 1024

        async def embed(self, text: str) -> EmbeddingResult:  # noqa: ARG002
            return EmbeddingResult(vector=[0.0] * 1024, input_tokens=1)

        async def embed_batch(self, texts: list[str]) -> list[EmbeddingResult]:
            return [EmbeddingResult(vector=[0.0] * 1024, input_tokens=1) for _ in texts]

    img = EmbeddedImage(
        image_bytes=_png_bytes(640, 480),
        alt_text="fig",
        doc_order=3,
        ext="png",
        sha256="c" * 64,
    )
    pr = ParserResult(
        source_path=Path("m.docx"),
        doc_format="docx",
        doc_title="M",
        paragraphs=[],
        embedded_images=[img],
        tables=[],
    )
    spec = ChunkSpec(
        section_path=["S1"],
        chunk_title="S1",
        chunk_text="body",
        chunk_token_count=4,
        chunk_kind="text",
        chunk_index=0,
        low_value_flag=False,
        embedded_image_positions=["img@3"],
        heading_anchor="t0",
    )

    uploader = AsyncMock()
    uploader.upload_many = AsyncMock(
        return_value=[
            UploadResult(sha256="c" * 64, blob_url="http://blob/c.png", deduped=False, bytes_uploaded=4),
        ],
    )

    orch = IngestionOrchestrator(
        parser=_FakeParser(pr),
        chunker=_FakeChunker([spec]),
        embedder=_FakeEmbedder(),
        uploader=uploader,
    )
    result = await orch.ingest(Path("m.docx"), kb_id="kb", doc_id="d")

    assert result.failure is None
    img_ref = result.chunks[0].embedded_images[0]
    assert img_ref.width == 640
    assert img_ref.height == 480
