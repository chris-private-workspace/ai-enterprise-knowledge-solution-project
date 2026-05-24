"""Hybrid retrieval low-value soft-relax tests per ADR-0035 W25 F5 D2 + CH-003.

Covers `_apply_low_value_post_filter` behavior + HybridSearcher integration:

- low_value_flag=True + embedded_images_json non-empty → retain with score × image_weight
- low_value_flag=True + no images (`[]` / empty string / whitespace) → drop
- low_value_flag=False → keep unchanged regardless of images
- image_weight knob override (0.5 / 0.8 / 0.9 empirical tuning)
- image_weight=0 degenerate case (drop all low_value image-bearing too)
- HybridSearcher init image_weight kwarg + default 0.7
- _DEFAULT_FILTER no longer contains `low_value_flag eq false` (server-side filter shift)

Per CLAUDE.md §5.6 H6 — retrieval critical pipeline test coverage.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from retrieval.hybrid import (
    _DEFAULT_FILTER,
    _DEFAULT_IMAGE_WEIGHT,
    HybridSearcher,
    HybridSearchHit,
    _apply_low_value_post_filter,
)


def _hit(score: float, *, low_value: bool, images_json: str = "") -> HybridSearchHit:
    """Build a HybridSearchHit fixture with given low_value + images_json shape."""
    return HybridSearchHit(
        score=score,
        fields={
            "chunk_id": f"test-chunk-{score:.2f}",
            "low_value_flag": low_value,
            "embedded_images_json": images_json,
        },
    )


def _mock_response(status_code: int, body: dict | None = None) -> MagicMock:
    response = MagicMock(spec=httpx.Response)
    response.status_code = status_code
    response.is_success = 200 <= status_code < 300
    response.json = MagicMock(return_value=body or {"value": []})
    response.raise_for_status = MagicMock()
    return response


# ---------------------------------------------------------------------------
# _apply_low_value_post_filter unit tests
# ---------------------------------------------------------------------------


def test_low_value_with_images_retained_with_weight() -> None:
    """ADR-0035 (b): low_value=True + non-empty images → retain × 0.7."""
    hits = [_hit(1.0, low_value=True, images_json='[{"checksum_sha256": "abc"}]')]
    result = _apply_low_value_post_filter(hits, image_weight=0.7)
    assert len(result) == 1
    assert result[0].score == pytest.approx(0.7)  # 1.0 × 0.7
    assert result[0].fields["chunk_id"] == "test-chunk-1.00"


def test_low_value_without_images_dropped() -> None:
    """ADR-0035 (b): low_value=True + no images (`[]`) → drop (W2 exclusion preserved)."""
    hits = [_hit(0.9, low_value=True, images_json="[]")]
    result = _apply_low_value_post_filter(hits, image_weight=0.7)
    assert result == []


def test_low_value_empty_string_images_dropped() -> None:
    """Edge case: low_value=True + empty embedded_images_json string → drop."""
    hits = [_hit(0.9, low_value=True, images_json="")]
    result = _apply_low_value_post_filter(hits, image_weight=0.7)
    assert result == []


def test_low_value_whitespace_images_dropped() -> None:
    """Edge case: low_value=True + whitespace-only embedded_images_json → drop."""
    hits = [_hit(0.9, low_value=True, images_json="   ")]
    result = _apply_low_value_post_filter(hits, image_weight=0.7)
    assert result == []


def test_non_low_value_unchanged_regardless_of_images() -> None:
    """ADR-0035 (b): low_value=False → unchanged regardless of embedded_images_json."""
    hits = [
        _hit(0.8, low_value=False, images_json="[]"),
        _hit(0.7, low_value=False, images_json='[{"checksum_sha256": "x"}]'),
    ]
    result = _apply_low_value_post_filter(hits, image_weight=0.7)
    assert len(result) == 2
    assert result[0].score == 0.8  # unchanged (no × weight)
    assert result[1].score == 0.7


def test_mixed_hits_preserve_order_and_apply_selectively() -> None:
    """Realistic mix: 3 non-low_value + 1 low_value+image + 1 low_value+empty.
    Result should be [non_lv, non_lv, low_lv*weight, non_lv] (low_lv+empty dropped)."""
    hits = [
        _hit(1.0, low_value=False),
        _hit(0.9, low_value=False),
        _hit(0.8, low_value=True, images_json='[{"checksum_sha256": "a"}]'),
        _hit(0.7, low_value=True, images_json="[]"),  # drops
        _hit(0.6, low_value=False),
    ]
    result = _apply_low_value_post_filter(hits, image_weight=0.5)
    scores = [h.score for h in result]
    assert scores == [1.0, 0.9, pytest.approx(0.4), 0.6]  # 0.8 × 0.5 = 0.4


def test_image_weight_knob_override_empirical_tuning() -> None:
    """ADR-0035 (c): image_weight knob configurable for F6 empirical tuning."""
    hits = [_hit(1.0, low_value=True, images_json='[{"checksum_sha256": "x"}]')]

    # × 0.5 — more aggressive deboost
    r05 = _apply_low_value_post_filter(hits, image_weight=0.5)
    assert r05[0].score == pytest.approx(0.5)

    # × 0.9 — more lenient deboost (image_weight closer to 1.0)
    r09 = _apply_low_value_post_filter(hits, image_weight=0.9)
    assert r09[0].score == pytest.approx(0.9)

    # × 1.0 — full retain (no deboost)
    r10 = _apply_low_value_post_filter(hits, image_weight=1.0)
    assert r10[0].score == pytest.approx(1.0)


def test_image_weight_zero_degenerate_drops_all_low_value() -> None:
    """ADR-0035 helper docstring: image_weight ≤ 0 drops all low_value (A/B branch)."""
    hits = [
        _hit(0.9, low_value=False),
        _hit(0.8, low_value=True, images_json='[{"checksum_sha256": "x"}]'),  # would normally retain
        _hit(0.7, low_value=True, images_json="[]"),
    ]
    result = _apply_low_value_post_filter(hits, image_weight=0.0)
    assert len(result) == 1
    assert result[0].score == 0.9


def test_image_weight_negative_treated_as_zero() -> None:
    """Defensive: negative image_weight still drops all low_value (no negative scores)."""
    hits = [_hit(0.8, low_value=True, images_json='[{"checksum_sha256": "x"}]')]
    result = _apply_low_value_post_filter(hits, image_weight=-0.5)
    assert result == []


def test_empty_hits_returns_empty() -> None:
    """Defensive: empty input → empty output."""
    assert _apply_low_value_post_filter([], image_weight=0.7) == []


def test_missing_low_value_field_treated_as_false() -> None:
    """Defensive: pre-W2-schema chunks lacking low_value_flag default to non-low_value."""
    hit = HybridSearchHit(score=0.5, fields={"chunk_id": "legacy-no-flag"})
    result = _apply_low_value_post_filter([hit], image_weight=0.7)
    assert len(result) == 1
    assert result[0].score == 0.5


def test_missing_embedded_images_json_treated_as_empty() -> None:
    """Defensive: low_value=True + missing embedded_images_json field → drop."""
    hit = HybridSearchHit(
        score=0.6,
        fields={"chunk_id": "legacy", "low_value_flag": True},  # no embedded_images_json
    )
    result = _apply_low_value_post_filter([hit], image_weight=0.7)
    assert result == []


# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------


def test_default_filter_no_longer_contains_low_value_clause() -> None:
    """ADR-0035 W25 F5 D2 closes server-side hard-exclude pattern.

    _DEFAULT_FILTER server-side OData no longer has `low_value_flag eq false`
    clause; client-side post-filter (`_apply_low_value_post_filter`) handles
    low_value chunks per ADR-0035 + architecture.md §3.5 "deboost" spec intent.
    """
    assert _DEFAULT_FILTER == "enabled eq true"
    assert "low_value_flag" not in _DEFAULT_FILTER


def test_default_image_weight_matches_plan_locked_default() -> None:
    """W25 plan §8 Q5 locked default = × 0.7 (per Chris pick 2026-05-23)."""
    assert _DEFAULT_IMAGE_WEIGHT == 0.7


# ---------------------------------------------------------------------------
# HybridSearcher integration tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_hybrid_searcher_default_image_weight() -> None:
    """HybridSearcher.__init__ image_weight kwarg defaults to _DEFAULT_IMAGE_WEIGHT (0.7)."""
    s = HybridSearcher("https://x", "k", "idx")
    assert s.image_weight == _DEFAULT_IMAGE_WEIGHT
    assert s.image_weight == 0.7


@pytest.mark.asyncio
async def test_hybrid_searcher_explicit_image_weight_override() -> None:
    """Production wiring path: server.py lifespan passes Settings knob."""
    s = HybridSearcher("https://x", "k", "idx", image_weight=0.5)
    assert s.image_weight == 0.5


@pytest.mark.asyncio
async def test_hybrid_search_payload_filter_drops_low_value_clause() -> None:
    """ADR-0035 W25 F5 D2: server-side filter only `enabled eq true` post-amendment.

    kb_id eq clause still prepended per ADR-0018 multi-KB invariant.
    """
    with patch("retrieval.hybrid.httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value
        instance.post = AsyncMock(return_value=_mock_response(200, {"value": []}))
        instance.aclose = AsyncMock()

        async with HybridSearcher("https://x", "k", "idx") as s:
            await s.search("q", [0.0] * 1024, kb_id="drive_user_manuals", top_k=10)

    payload = json.loads(instance.post.await_args.kwargs["content"])
    assert payload["filter"] == "kb_id eq 'drive_user_manuals' and enabled eq true"
    assert "low_value_flag" not in payload["filter"]


@pytest.mark.asyncio
async def test_hybrid_search_applies_post_filter_to_response_low_value() -> None:
    """End-to-end: server returns low_value chunks (no longer filtered by OData);
    client-side post-filter applies score × 0.7 to image-bearing, drops non-image."""
    body = {
        "value": [
            {
                "@search.score": 1.0,
                "chunk_id": "non-low-value",
                "low_value_flag": False,
            },
            {
                "@search.score": 0.9,
                "chunk_id": "low-value-with-image",
                "low_value_flag": True,
                "embedded_images_json": '[{"checksum_sha256": "abc"}]',
            },
            {
                "@search.score": 0.8,
                "chunk_id": "low-value-no-image",
                "low_value_flag": True,
                "embedded_images_json": "[]",
            },
        ],
    }

    with patch("retrieval.hybrid.httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value
        instance.post = AsyncMock(return_value=_mock_response(200, body))
        instance.aclose = AsyncMock()

        async with HybridSearcher("https://x", "k", "idx", image_weight=0.7) as s:
            hits = await s.search("q", [0.0] * 1024, kb_id="drive_user_manuals", top_k=10)

    # 3 returned by Azure Search server → post-filter drops 1 (low-value no-image)
    # → 2 retained (non-low-value full score + low-value-with-image × 0.7)
    assert len(hits) == 2
    chunk_ids = [h.fields["chunk_id"] for h in hits]
    assert chunk_ids == ["non-low-value", "low-value-with-image"]
    assert hits[0].score == pytest.approx(1.0)
    assert hits[1].score == pytest.approx(0.9 * 0.7)  # 0.63


@pytest.mark.asyncio
async def test_hybrid_search_image_weight_override_at_search_time() -> None:
    """Construction-time image_weight propagates to post-filter at search time."""
    body = {
        "value": [
            {
                "@search.score": 1.0,
                "chunk_id": "low-value-with-image",
                "low_value_flag": True,
                "embedded_images_json": '[{"checksum_sha256": "abc"}]',
            },
        ],
    }

    with patch("retrieval.hybrid.httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value
        instance.post = AsyncMock(return_value=_mock_response(200, body))
        instance.aclose = AsyncMock()

        async with HybridSearcher("https://x", "k", "idx", image_weight=0.5) as s:
            hits = await s.search("q", [0.0] * 1024, kb_id="drive_user_manuals", top_k=10)

    assert len(hits) == 1
    assert hits[0].score == pytest.approx(0.5)  # 1.0 × 0.5
