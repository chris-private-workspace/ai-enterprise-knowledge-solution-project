"""Contextual Retrieval tests (CH-008 / ADR-0045 — H6 retrieval + ingestion critical).

T1 — `build_contextual_document` helper (path prefix + fallback + multi-level join).
T2 — `cohere.py` rerank document is the contextual string (section context baked in).
T3 — ingestion embedding input is contextual while STORED chunk_text stays original.
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from ingestion.chunker.base import ChunkSpec
from ingestion.embedding.base import EmbeddingResult
from ingestion.orchestrator import IngestionOrchestrator
from ingestion.parsers.base import ParserResult
from retrieval.contextual import build_contextual_document
from retrieval.hybrid import HybridSearchHit
from retrieval.reranker.cohere import CohereReranker


# --------------------------------------------------------------------------- T1
def test_build_contextual_document_prefixes_single_level_path() -> None:
    out = build_contextual_document(["GL03 Create General Journal"], "step table body")
    assert out == "GL03 Create General Journal\nstep table body"


def test_build_contextual_document_joins_multi_level_path() -> None:
    out = build_contextual_document(
        ["General Ledger", "GL03 Create General Journal", "System Instruction for each step"],
        "step table body",
    )
    assert out == (
        "General Ledger > GL03 Create General Journal > "
        "System Instruction for each step\nstep table body"
    )


def test_build_contextual_document_empty_path_falls_back_to_text() -> None:
    # Fallback = bit-identical to pre-CH-008 (zero regression for legacy chunks).
    assert build_contextual_document([], "body") == "body"
    assert build_contextual_document(None, "body") == "body"


def test_build_contextual_document_whitespace_only_entries_dropped() -> None:
    # Defensive: index field is Collection(Edm.String); empty/blank entries skipped.
    assert build_contextual_document(["", "  ", "GL03"], "body") == "GL03\nbody"
    assert build_contextual_document(["   ", ""], "body") == "body"


# --------------------------------------------------------------------------- T2
def _mock_response(status_code: int, body: dict) -> MagicMock:
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.json = MagicMock(return_value=body)
    response.raise_for_status = MagicMock()
    return response


@pytest.mark.asyncio
async def test_cohere_rerank_document_includes_section_context() -> None:
    body = {"results": [{"index": 0, "relevance_score": 0.9}, {"index": 1, "relevance_score": 0.4}]}
    captured: dict = {}

    async def _capture(url, content):  # noqa: ANN001
        captured["content"] = content
        return _mock_response(200, body)

    hits = [
        HybridSearchHit(
            score=0.5,
            fields={
                "chunk_id": "c0",
                "chunk_text": "step table body",
                "section_path": ["General Ledger", "GL03 Create General Journal"],
            },
        ),
        # No section_path → contextual helper falls back to raw chunk_text.
        HybridSearchHit(score=0.4, fields={"chunk_id": "c1", "chunk_text": "legacy body"}),
    ]

    with patch("retrieval.reranker.cohere.httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value
        instance.post = AsyncMock(side_effect=_capture)
        instance.aclose = AsyncMock()

        async with CohereReranker(endpoint="https://x", api_key="k") as r:
            await r.rerank("post a journal entry", hits, top_k=5)

    documents = json.loads(captured["content"])["documents"]
    assert documents[0] == "General Ledger > GL03 Create General Journal\nstep table body"
    assert documents[1] == "legacy body"  # fallback


# --------------------------------------------------------------------------- T3
class _CapturingEmbedder:
    embedding_dimension = 1024

    def __init__(self) -> None:
        self.seen_inputs: list[str] = []

    async def embed(self, text: str) -> EmbeddingResult:  # noqa: ARG002
        return EmbeddingResult(vector=[0.0] * 1024, input_tokens=1)

    async def embed_batch(self, texts: list[str]) -> list[EmbeddingResult]:
        self.seen_inputs = list(texts)
        return [EmbeddingResult(vector=[0.0] * 1024, input_tokens=1) for _ in texts]


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


def _spec(idx: int, section_path: list[str], text: str) -> ChunkSpec:
    return ChunkSpec(
        section_path=section_path,
        chunk_title=section_path[-1] if section_path else "",
        chunk_text=text,
        chunk_token_count=len(text),
        chunk_kind="text",
        chunk_index=idx,
        low_value_flag=False,
        embedded_image_positions=[],
        heading_anchor=f"t{idx}",
    )


@pytest.mark.asyncio
async def test_ingest_embeds_contextual_input_but_stores_original_chunk_text() -> None:
    pr = ParserResult(
        source_path=Path("manual.docx"),
        doc_format="docx",
        doc_title="GL Manual",
        paragraphs=[],
        embedded_images=[],
        tables=[],
    )
    chunks = [
        _spec(0, ["General Ledger", "GL03 Create General Journal"], "step table A"),
        _spec(1, [], "legacy body"),  # no section_path → fallback
    ]
    embedder = _CapturingEmbedder()
    orch = IngestionOrchestrator(
        parser=_FakeParser(pr),
        chunker=_FakeChunker(chunks),
        embedder=embedder,
        uploader=None,
    )

    result = await orch.ingest(Path("manual.docx"), kb_id="kb", doc_id="d")

    # Embedding input = contextual (section context prefixed).
    assert embedder.seen_inputs[0] == "General Ledger > GL03 Create General Journal\nstep table A"
    assert embedder.seen_inputs[1] == "legacy body"  # fallback
    # STORED chunk_text stays original (citation / listing / Finding D unaffected).
    assert result.chunks[0].chunk_text == "step table A"
    assert result.chunks[1].chunk_text == "legacy body"
