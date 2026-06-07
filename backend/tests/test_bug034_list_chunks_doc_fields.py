"""BUG-034 Finding B — HybridSearcher.list_chunks must project document identity.

Citation post-hoc expansion (generation/citation_expansion.py) materializes
neighbour Citation objects from `engine.list_chunks` raw dicts. Before this fix
the `$select` omitted doc_id/doc_title/doc_format, so build_citations produced
aux citations with empty doc_id → broken citation pills (only the primary
reranked-search citation carried doc identity). These tests pin both the request
projection and the response-dict shape.

Per CLAUDE.md §5.6 H6 — retrieval critical pipeline test coverage.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from retrieval.hybrid import HybridSearcher


def _mock_response(status_code: int, body: dict[str, Any] | None = None) -> MagicMock:
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.is_success = 200 <= status_code < 300
    response.json = MagicMock(return_value=body or {"value": []})
    response.raise_for_status = MagicMock()
    return response


async def _make_searcher_with_mocked_post(
    response: MagicMock,
) -> tuple[HybridSearcher, AsyncMock]:
    searcher = HybridSearcher(
        endpoint="https://test.search.windows.net",
        admin_key="test-key",
        index_name="ekp-kb-drive-v1",
    )
    searcher._client = MagicMock(spec=httpx.AsyncClient)
    post_mock = AsyncMock(return_value=response)
    searcher._client.post = post_mock
    return searcher, post_mock


@pytest.mark.asyncio
async def test_list_chunks_select_includes_doc_identity_fields() -> None:
    """$select must request doc_id/doc_title/doc_format (else expansion citations lose them)."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.list_chunks("drive_user_manuals", "doc-A")

    payload = json.loads(post_mock.call_args.kwargs["content"])
    select = payload["select"]
    assert "doc_id" in select
    assert "doc_title" in select
    assert "doc_format" in select
    # original projection still present (no regression)
    assert "chunk_id" in select
    assert "section_path" in select
    assert "embedded_images_json" in select


@pytest.mark.asyncio
async def test_list_chunks_returns_doc_identity_in_dict() -> None:
    """Returned dict carries doc_id/doc_title/doc_format from the Azure response."""
    body = {
        "value": [
            {
                "chunk_id": "kb-drive-images-1_doc-gl-manual_chunk-0033",
                "doc_id": "gl-manual",
                "doc_title": "GL Manual v0.02",
                "doc_format": "docx",
                "chunk_index": 33,
                "chunk_total": 74,
                "chunk_title": "3.1.5 System Instruction",
                "section_path": ["3 GL03. Processing Journal Vouchers", "3.1.5 System Instruction"],
                "enabled": True,
                "low_value_flag": False,
                "embedded_images_json": "[]",
            },
        ]
    }
    response = _mock_response(200, body)
    searcher, _ = await _make_searcher_with_mocked_post(response)

    chunks = await searcher.list_chunks("drive_user_manuals", "gl-manual")

    assert len(chunks) == 1
    c = chunks[0]
    assert c["doc_id"] == "gl-manual"
    assert c["doc_title"] == "GL Manual v0.02"
    assert c["doc_format"] == "docx"
    # existing fields preserved
    assert c["chunk_id"] == "kb-drive-images-1_doc-gl-manual_chunk-0033"
    assert c["chunk_index"] == 33


@pytest.mark.asyncio
async def test_list_chunks_doc_fields_default_empty_when_absent() -> None:
    """Legacy index docs missing the fields → empty strings (no KeyError / no crash)."""
    body = {"value": [{"chunk_id": "x", "chunk_index": 0}]}
    response = _mock_response(200, body)
    searcher, _ = await _make_searcher_with_mocked_post(response)

    chunks = await searcher.list_chunks("drive_user_manuals", "doc-A")

    assert chunks[0]["doc_id"] == ""
    assert chunks[0]["doc_title"] == ""
    assert chunks[0]["doc_format"] == ""
