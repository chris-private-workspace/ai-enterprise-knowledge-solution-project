"""`GET /admin/usage-stats` — 4-stat strip (W24-wave-c1 F4 per ADR-0026 Option B).

Surfaces the 4-stat strip at the top of the API Keys & Quotas tab (mockup
line 748-753):

  API calls today   | Spend today (cap %)    | Token throughput (TPM) | Rate limit hits 24h

Data sources (per pre-active-flip audit):
  - Realtime usage: `observability.realtime_cost.fetch_realtime_usage` (24h window)
  - Daily cap baseline: `observability.cost_estimator.total_projected_daily_usd`
  - Rate-limit hits: Wave A scope = 0 placeholder
    (Wave B+ exposes via RateLimitMiddleware counter or Langfuse 429 audit)

Endpoint always returns 200 — observability fetch error never blocks the
dashboard (mirrors `/observability/cost-summary` graceful degradation pattern).
"""

from __future__ import annotations

from fastapi import APIRouter

from api.schemas.admin_api_keys import UsageStats4Stat
from observability.cost_estimator import total_projected_daily_usd
from observability.langfuse_tracer import get_langfuse_client
from observability.realtime_cost import fetch_realtime_usage, total_realtime_usd

router = APIRouter(prefix="/admin")


@router.get("/usage-stats", response_model=UsageStats4Stat)
async def get_usage_stats() -> UsageStats4Stat:
    client = get_langfuse_client()
    outcome = fetch_realtime_usage(client, window_hours=24)

    api_calls_24h = sum(r.call_count for r in outcome.rows)
    total_tokens_24h = sum(r.input_tokens + r.output_tokens for r in outcome.rows)
    # Rolling TPM over the 24h window = total_tokens / (24h * 60min). Wave A
    # approximation per Karpathy §1.2 simplicity-first; Wave B+ promotes to
    # a true rolling-60min window once the dashboard renders the chart.
    token_throughput_tpm = total_tokens_24h // (24 * 60) if total_tokens_24h > 0 else 0

    spend_today_usd = total_realtime_usd(outcome.rows)
    spend_cap_daily_usd = total_projected_daily_usd()
    spend_pct_used = (
        round((spend_today_usd / spend_cap_daily_usd) * 100, 1)
        if spend_cap_daily_usd > 0
        else 0.0
    )
    # Pydantic Field(le=200) clamps over-cap into the 200% ceiling so the
    # UI still renders without 422 on extreme outages.
    spend_pct_used = min(spend_pct_used, 200.0)

    return UsageStats4Stat(
        api_calls_24h=api_calls_24h,
        api_calls_delta_pct=None,  # Wave B+: requires prior-24h comparison fetch
        spend_today_usd=round(spend_today_usd, 4),
        spend_cap_daily_usd=round(spend_cap_daily_usd, 4),
        spend_pct_used=spend_pct_used,
        token_throughput_tpm=token_throughput_tpm,
        token_throughput_p95_in_cap=True,  # Wave B+: real P95 check via Langfuse
        rate_limit_hits_24h=0,  # Wave B+: wire via RateLimitMiddleware counter
        realtime_status=outcome.status,  # type: ignore[arg-type]
    )
