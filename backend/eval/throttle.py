"""W44 F4.4 — eval-only throttle + extended retry around `engine.retrieve`.

The eval orchestrator fires ~50 queries back-to-back at the Azure Cohere rerank
endpoint, which rate-limits a sustained burst with a (misleading) HTTP **401**.
Single queries are healthy; the production reranker's own 3-retry-over-~7s
(`retrieval/reranker/cohere.py:78`) is not enough to outlast a sustained-burst
rate-limit window, so the 401 propagates, the eval query errors, and the empty
context drags Recall@5 / faithfulness down — the W44 F4 "eval-harness decay"
finding (false regression that masked the real chunker no-regression result).

This helper fixes it at the **eval layer only**:
  (a) **throttle** — space eval queries apart so the burst never trips the
      rate-limit in the first place (primary, preventive), and
  (b) **retry** — wrap `engine.retrieve` in a longer exponential backoff as a
      safety net for any rate-limit that still slips through.

It deliberately does **NOT** touch the production reranker retry config
(`cohere.py`) — that is the locked §3.2 vendor path and changing its backoff
would alter production latency. W44 plan §2 F4.4 scope: "eval-only,唔掂
production reranker".

Knobs (env, read at call time so they honour a `monkeypatch.setenv` in tests and
a per-run override at backend start):
  EVAL_RETRIEVE_THROTTLE_S       per-query pre-call delay in seconds (default 1.0)
  EVAL_RETRIEVE_RETRY_ATTEMPTS   max attempts on a rate-limit signal (default 5)
"""

from __future__ import annotations

import asyncio
import os

import httpx
import structlog
from tenacity import (
    AsyncRetrying,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

from retrieval.retrieval_engine import RetrievalEngine, RetrievalResult

logger = structlog.get_logger(__name__)

_DEFAULT_THROTTLE_S = 1.0
_DEFAULT_RETRY_ATTEMPTS = 5

# Rate-limit signals worth retrying. Azure Cohere returns a *misleading* 401 on a
# sustained-burst rate-limit (verified W44 F4: single query healthy, eval burst
# 401s); 429 is the standard signal; transport errors are transient connection
# blips. Genuine 4xx (e.g. 400 bad-request, real 403) are NOT retried — they
# would only burn attempts and delay surfacing a real bug.
_RETRYABLE_STATUS = (401, 429)


def _is_rate_limit(exc: BaseException) -> bool:
    """Predicate for `retry_if_exception` — True only for retryable rate-limit /
    transport signals (see `_RETRYABLE_STATUS`), False for any other error."""
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code in _RETRYABLE_STATUS
    return isinstance(exc, httpx.TransportError)


async def retrieve_with_throttle(
    engine: RetrievalEngine,
    *,
    query: str,
    kb_id: str,
    top_k: int,
    throttle_s: float | None = None,
) -> RetrievalResult:
    """Sleep `throttle_s` (default `EVAL_RETRIEVE_THROTTLE_S`, else 1.0) then call
    `engine.retrieve` with an extended rate-limit backoff. Eval-only resilience
    wrapper — see the module docstring for rationale and scope.

    `throttle_s` is an explicit override (used by unit tests to skip the delay);
    when `None` the env knob is read at call time.
    """
    delay = (
        throttle_s
        if throttle_s is not None
        else float(os.getenv("EVAL_RETRIEVE_THROTTLE_S", str(_DEFAULT_THROTTLE_S)))
    )
    attempts = int(
        os.getenv("EVAL_RETRIEVE_RETRY_ATTEMPTS", str(_DEFAULT_RETRY_ATTEMPTS))
    )

    if delay > 0:
        await asyncio.sleep(delay)

    async for attempt in AsyncRetrying(
        retry=retry_if_exception(_is_rate_limit),
        stop=stop_after_attempt(attempts),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        reraise=True,
    ):
        with attempt:
            if attempt.retry_state.attempt_number > 1:
                logger.warning(
                    "eval_retrieve_rate_limit_retry",
                    kb_id=kb_id,
                    attempt=attempt.retry_state.attempt_number,
                )
            return await engine.retrieve(query=query, kb_id=kb_id, top_k=top_k)

    # Unreachable: AsyncRetrying with reraise=True either returns above on success
    # or re-raises the last exception once attempts are exhausted.
    raise AssertionError("retrieve_with_throttle: AsyncRetrying exhausted without outcome")
