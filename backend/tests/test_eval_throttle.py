"""W44 F4.4 — eval throttle + rate-limit backoff unit tests (CLAUDE.md §5.6 H6
— `backend/eval/` is a critical pipeline module).

Covers:
- `_is_rate_limit` classification (401/429/TransportError retryable; 400/403/
  generic errors NOT retryable)
- success passthrough
- retry-then-succeed on a 401 rate-limit
- no-retry + immediate reraise on a genuine 4xx / generic error
- reraise after attempts exhausted
- throttle delay applied from the explicit override
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from tenacity import wait_fixed

import eval.throttle as throttle_mod
from eval.throttle import _is_rate_limit, retrieve_with_throttle
from retrieval.retrieval_engine import RetrievalResult


def _http_error(status: int) -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://example/v2/rerank")
    response = httpx.Response(status_code=status, request=request)
    return httpx.HTTPStatusError(f"{status}", request=request, response=response)


def _result() -> RetrievalResult:
    return RetrievalResult(
        chunks=[],
        embed_latency_ms=1,
        search_latency_ms=2,
        rerank_latency_ms=0,
        total_latency_ms=3,
        reranked=False,
    )


@pytest.fixture(autouse=True)
def _instant_backoff(monkeypatch: pytest.MonkeyPatch) -> None:
    """Make tenacity's wait instant so retry tests don't sleep 2s+ per attempt."""
    monkeypatch.setattr(throttle_mod, "wait_exponential", lambda **_kw: wait_fixed(0))


# ── _is_rate_limit classification ─────────────────────────────────────────────

@pytest.mark.parametrize(
    ("exc", "expected"),
    [
        (_http_error(401), True),   # Azure Cohere misleading rate-limit signal
        (_http_error(429), True),   # standard rate-limit
        (httpx.ConnectError("boom"), True),  # TransportError subclass — transient
        (_http_error(400), False),  # genuine bad-request — do NOT retry
        (_http_error(403), False),  # genuine forbidden — do NOT retry
        (_http_error(500), False),  # 5xx not in eval retry scope (reranker handles)
        (RuntimeError("nope"), False),
        (ValueError("nope"), False),
    ],
)
def test_is_rate_limit_classification(exc: BaseException, expected: bool) -> None:
    assert _is_rate_limit(exc) is expected


# ── retrieve_with_throttle behaviour ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_returns_result_on_success() -> None:
    engine = MagicMock()
    engine.retrieve = AsyncMock(return_value=_result())

    out = await retrieve_with_throttle(
        engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
    )

    assert out.reranked is False
    engine.retrieve.assert_awaited_once_with(query="q", kb_id="kb", top_k=5)


@pytest.mark.asyncio
async def test_retries_on_401_then_succeeds() -> None:
    engine = MagicMock()
    engine.retrieve = AsyncMock(side_effect=[_http_error(401), _result()])

    out = await retrieve_with_throttle(
        engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
    )

    assert out is not None
    assert engine.retrieve.await_count == 2  # 1 rate-limited + 1 success


@pytest.mark.asyncio
async def test_does_not_retry_on_genuine_4xx() -> None:
    engine = MagicMock()
    engine.retrieve = AsyncMock(side_effect=_http_error(400))

    with pytest.raises(httpx.HTTPStatusError):
        await retrieve_with_throttle(
            engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
        )

    assert engine.retrieve.await_count == 1  # immediate reraise, no retry burn


@pytest.mark.asyncio
async def test_does_not_retry_on_generic_error() -> None:
    engine = MagicMock()
    engine.retrieve = AsyncMock(side_effect=RuntimeError("boom"))

    with pytest.raises(RuntimeError):
        await retrieve_with_throttle(
            engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
        )

    assert engine.retrieve.await_count == 1


@pytest.mark.asyncio
async def test_reraises_after_attempts_exhausted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EVAL_RETRIEVE_RETRY_ATTEMPTS", "3")
    engine = MagicMock()
    engine.retrieve = AsyncMock(side_effect=_http_error(429))

    with pytest.raises(httpx.HTTPStatusError):
        await retrieve_with_throttle(
            engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
        )

    assert engine.retrieve.await_count == 3  # attempts cap honoured


@pytest.mark.asyncio
async def test_throttle_delay_applied(monkeypatch: pytest.MonkeyPatch) -> None:
    sleep_mock = AsyncMock()
    monkeypatch.setattr(throttle_mod.asyncio, "sleep", sleep_mock)
    engine = MagicMock()
    engine.retrieve = AsyncMock(return_value=_result())

    await retrieve_with_throttle(
        engine, query="q", kb_id="kb", top_k=5, throttle_s=0.5,
    )

    sleep_mock.assert_awaited_once_with(0.5)


@pytest.mark.asyncio
async def test_throttle_skipped_when_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    sleep_mock = AsyncMock()
    monkeypatch.setattr(throttle_mod.asyncio, "sleep", sleep_mock)
    engine = MagicMock()
    engine.retrieve = AsyncMock(return_value=_result())

    await retrieve_with_throttle(
        engine, query="q", kb_id="kb", top_k=5, throttle_s=0,
    )

    sleep_mock.assert_not_awaited()  # delay <= 0 → no sleep at all
