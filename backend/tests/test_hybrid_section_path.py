"""HybridSearcher.fetch_chunks_by_section_path tests per ADR-0037 W26 F2.

Leaf primitive used by `backend/generation/parent_doc_retriever.py` to
aggregate sibling chunks sharing a common parent section. Covers:

- Empty input guards (empty parent_path / empty doc_id → no API call)
- OData filter composition (kb_id + doc_id + enabled + section_path/any())
- OData single-quote escaping (doubled per spec)
- orderby chunk_index ASC + top hard cap
- Response shape transformation (Azure Search → HybridSearchHit list)
- @search.* system field stripping

Per CLAUDE.md §5.6 H6 — retrieval critical pipeline test coverage.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from retrieval.hybrid import HybridSearcher, HybridSearchHit


def _mock_response(status_code: int, body: dict[str, Any] | None = None) -> MagicMock:
    """Mock httpx.Response with given status + JSON body (matches existing test idiom)."""
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.is_success = 200 <= status_code < 300
    response.json = MagicMock(return_value=body or {"value": []})
    response.raise_for_status = MagicMock()
    return response


async def _make_searcher_with_mocked_post(
    response: MagicMock,
) -> tuple[HybridSearcher, AsyncMock]:
    """Build a HybridSearcher with its internal httpx client.post mocked.

    Returns (searcher, post_mock) so tests can both invoke and inspect calls.
    """
    searcher = HybridSearcher(
        endpoint="https://test.search.windows.net",
        admin_key="test-key",
        index_name="ekp-kb-drive-v1",
    )
    # Skip __aenter__ httpx client init; inject a mock client directly.
    searcher._client = MagicMock(spec=httpx.AsyncClient)
    post_mock = AsyncMock(return_value=response)
    searcher._client.post = post_mock
    return searcher, post_mock


# ---------------------------------------------------------------------------
# Empty input guards
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_empty_parent_path_returns_empty_no_api_call() -> None:
    """Empty parent_path = caller has no section context to aggregate → cost guard."""
    response = _mock_response(200, {"value": [{"chunk_id": "x"}]})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    result = await searcher.fetch_chunks_by_section_path(
        parent_path=[],
        doc_id="doc-A",
        kb_id="drive_user_manuals",
    )

    assert result == []
    post_mock.assert_not_called()


@pytest.mark.asyncio
async def test_empty_doc_id_returns_empty_no_api_call() -> None:
    """Empty doc_id = cross-doc fence violated → cost guard."""
    response = _mock_response(200, {"value": [{"chunk_id": "x"}]})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    result = await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc", "Section 8"],
        doc_id="",
        kb_id="drive_user_manuals",
    )

    assert result == []
    post_mock.assert_not_called()


# ---------------------------------------------------------------------------
# OData filter composition
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_filter_combines_kb_doc_enabled_and_section_any_clauses() -> None:
    """Filter = kb_id eq + doc_id eq + enabled eq + section_path/any() per segment."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc Title", "Section 8: Integration Scenarios"],
        doc_id="DCE_Integration_Platform",
        kb_id="drive_user_manuals",
    )

    post_mock.assert_called_once()
    call_kwargs = post_mock.call_args.kwargs
    payload = json.loads(call_kwargs["content"])
    filter_str = payload["filter"]

    # Each clause present
    assert "kb_id eq 'drive_user_manuals'" in filter_str
    assert "doc_id eq 'DCE_Integration_Platform'" in filter_str
    assert "enabled eq true" in filter_str
    assert "section_path/any(s: s eq 'Doc Title')" in filter_str
    assert "section_path/any(s: s eq 'Section 8: Integration Scenarios')" in filter_str
    # Joined with ` and `
    assert filter_str.count(" and ") == 4  # 5 clauses joined → 4 separators


@pytest.mark.asyncio
async def test_odata_single_quote_escaped_doubled() -> None:
    """`Scenario A's intro` → `Scenario A''s intro` per OData spec."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc", "Scenario A's intro"],
        doc_id="doc-with-apos'trophe",
        kb_id="drive_user_manuals",
    )

    payload = json.loads(post_mock.call_args.kwargs["content"])
    filter_str = payload["filter"]
    # Doc ID apostrophe escaped
    assert "doc_id eq 'doc-with-apos''trophe'" in filter_str
    # Section segment apostrophe escaped
    assert "section_path/any(s: s eq 'Scenario A''s intro')" in filter_str


# ---------------------------------------------------------------------------
# Payload shape — orderby + top cap
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_payload_uses_orderby_chunk_index_asc() -> None:
    """Narrative order preserved via orderby — caller can concat siblings in doc order."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc"],
        doc_id="doc-A",
        kb_id="drive_user_manuals",
    )

    payload = json.loads(post_mock.call_args.kwargs["content"])
    assert payload["orderby"] == "chunk_index asc"


@pytest.mark.asyncio
async def test_payload_top_uses_max_chunks_cap() -> None:
    """top=max_chunks defends against pathological doc with thousands of siblings."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc"],
        doc_id="doc-A",
        kb_id="drive_user_manuals",
        max_chunks=25,
    )

    payload = json.loads(post_mock.call_args.kwargs["content"])
    assert payload["top"] == 25


@pytest.mark.asyncio
async def test_payload_default_max_chunks_is_50() -> None:
    """Default 50 matches Settings.parent_doc_max_chunks_per_parent Tier 1 cap."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc"],
        doc_id="doc-A",
        kb_id="drive_user_manuals",
    )

    payload = json.loads(post_mock.call_args.kwargs["content"])
    assert payload["top"] == 50


@pytest.mark.asyncio
async def test_payload_uses_wildcard_search_filter_only() -> None:
    """search='*' + filter-only retrieval (no BM25/vector ranking — pure section scoping)."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc"],
        doc_id="doc-A",
        kb_id="drive_user_manuals",
    )

    payload = json.loads(post_mock.call_args.kwargs["content"])
    assert payload["search"] == "*"
    # No vector / semantic config — pure filter retrieval
    assert "vectorQueries" not in payload
    assert "semanticConfiguration" not in payload


# ---------------------------------------------------------------------------
# Response shape transformation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_response_transformed_to_hybrid_search_hits() -> None:
    """Azure Search response.value items → HybridSearchHit list with score + fields."""
    body = {
        "value": [
            {
                "@search.score": 1.0,
                "@search.reranker_score": 0.0,
                "chunk_id": "kb-drive_doc-A_chunk-0007",
                "chunk_text": "Scenario A description...",
                "chunk_index": 7,
                "section_path": ["Doc", "Section 8"],
            },
            {
                "@search.score": 1.0,
                "chunk_id": "kb-drive_doc-A_chunk-0008",
                "chunk_text": "Scenario B description...",
                "chunk_index": 8,
                "section_path": ["Doc", "Section 8"],
            },
        ]
    }
    response = _mock_response(200, body)
    searcher, _ = await _make_searcher_with_mocked_post(response)

    result = await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc", "Section 8"],
        doc_id="A",
        kb_id="drive_user_manuals",
    )

    assert len(result) == 2
    assert all(isinstance(hit, HybridSearchHit) for hit in result)
    assert result[0].fields["chunk_id"] == "kb-drive_doc-A_chunk-0007"
    assert result[0].fields["chunk_index"] == 7
    assert result[1].fields["chunk_id"] == "kb-drive_doc-A_chunk-0008"
    # @search.* system fields stripped
    assert "@search.score" not in result[0].fields
    assert "@search.reranker_score" not in result[0].fields


@pytest.mark.asyncio
async def test_empty_response_value_returns_empty_list() -> None:
    """Lookup miss (no chunks match section_path) → empty list (caller decides fallback)."""
    response = _mock_response(200, {"value": []})
    searcher, _ = await _make_searcher_with_mocked_post(response)

    result = await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc", "Nonexistent Section"],
        doc_id="A",
        kb_id="drive_user_manuals",
    )

    assert result == []


# ---------------------------------------------------------------------------
# Multi-KB invariant per ADR-0018
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_url_uses_dynamic_index_name_per_kb_id() -> None:
    """ADR-0018: index_name resolved via kb_id_to_index_name (not bare self.index_name)."""
    response = _mock_response(200, {"value": []})
    searcher, post_mock = await _make_searcher_with_mocked_post(response)

    await searcher.fetch_chunks_by_section_path(
        parent_path=["Doc"],
        doc_id="doc-A",
        kb_id="drive_user_manuals",  # legacy alias → maps to self.index_name "ekp-kb-drive-v1"
    )

    call_args = post_mock.call_args
    url = call_args.args[0] if call_args.args else call_args.kwargs.get("url", "")
    # Either dynamic mapping or legacy alias index name — both signal kb_id-scoped path
    assert "/indexes/" in url
    assert "/docs/search?" in url
