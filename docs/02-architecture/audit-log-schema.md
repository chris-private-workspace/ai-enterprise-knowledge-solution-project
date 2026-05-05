---
component: C07-observability
status: active
created: 2026-05-14
updated: 2026-05-14
spec_refs:
  - architecture.md §7.4 Day-2 Readiness — Audit log requirement
  - components/C07-observability.md
  - CLAUDE.md §5.5 H5 security & privacy
---

# Audit Log Schema(W7 D3 F3.2)

> **Lifecycle**:living document(W7 D3 baseline → W3+ Langfuse SDK wire 後 cascade verification)

## 1. Purpose

Every request through `/query/**`,`/kb/**`,`/feedback`,`/auth/**` emits a single structured `audit_log` event so:

1. **Day-2 ops**(architecture.md §7.4):oncall traces a user complaint via `request_id` → reproduces the exact API call hit
2. **Compliance**(Beta+ requirement,architecture.md §8.5 R-B6):who accessed which KB at what time,for security review
3. **Cost monitoring**(F2.5 partner — `rate_limit_exceeded` + `audit_log` correlate via `user_id`):per-user usage drives W8 cost dashboard

## 2. Schema(structured event,JSON-rendered via structlog)

```json
{
  "event": "audit_log",
  "level": "info",
  "timestamp": "2026-05-14T08:14:23.512Z",
  "request_id": "f4c1a8e2-3d2f-4a1b-9c5e-7e2f0b8c4d6a",
  "user_id": "00000000-0000-0000-0000-000000000001",
  "tenant_id": "00000000-0000-0000-0000-0000000000ff",
  "audit_action": "POST /query",
  "status_code": 200,
  "duration_ms": 842
}
```

## 3. Field reference

| Field | Type | Source | Required | Note |
|---|---|---|---|---|
| `event` | string | structlog logger name | Y | Always `"audit_log"` |
| `level` | string | structlog | Y | `"info"`(success / non-5xx); 5xx 仍係 info because audit row 屬於 happens-anyway record |
| `timestamp` | ISO-8601 | structlog `TimeStamper` | Y | UTC |
| `request_id` | uuid4 | header `X-Request-ID` if present,else generated | Y | Echoed back in response header |
| `user_id` | string \| null | F1.2.1 mock `oid` or real Entra ID `oid` from validated JWT | N | `null` when unauthenticated(401 path)|
| `tenant_id` | string \| null | F1.2.1 mock `tid` or real Entra ID `tid` | N | `null` when unauthenticated |
| `audit_action` | string | `<HTTP_METHOD> <path>` | Y | URL query string omitted to avoid sensitive args leak |
| `status_code` | int | response status | Y | Includes 401 / 429 / 4xx / 5xx,not just 2xx |
| `duration_ms` | int | request handler wall-time | Y | Wall-time including all middleware downstream of audit |

## 4. Redaction policy(CLAUDE.md §5.5 H5 — MUST)

The audit log middleware **MUST NEVER** emit:

- ❌ Request body bytes(query payload,KB create payload,feedback comment)
- ❌ Response body bytes(retrieved chunk text,synthesized answer)
- ❌ Authorization header value
- ❌ Any header containing the substrings `secret`,`key`,`token`,`password`,`api-key`
- ❌ Cookie values
- ❌ Stack traces / exception messages(those go to error log,not audit log)

The full prompt + response remain in **Langfuse trace**(encrypted at rest,access-controlled);audit log is the **lightweight observability index**,not a content store.

## 5. Retention

- **POC + W7 dev**:in-process structlog → stdout(no retention);Langfuse self-host 30-day rolling
- **Beta(W8-W10)**:Azure Container Apps stdout → Azure Monitor 30-day default;Langfuse self-host 30-day rolling
- **Production(W11+)**:Azure Monitor → 90-day default;optional 1-year cold archive per compliance review;Langfuse cloud 30-day standard tier

## 6. Wiring

- **Middleware**:`backend/api/middleware/audit_log.py`(F3.1 W7 D3)
- **Order**:registered **OUTERMOST** in Starlette stack so 429 from `RateLimitMiddleware` 仍會被 audit
- **Scope**:`protected_prefixes = ("/query", "/kb", "/feedback", "/auth")` — `/health` 公開保留 unaudited(避免 ACA liveness probe noise)
- **Identity resolution**:reuse `authenticate_{mock,msal}` → `(oid, tid)` matched with F1.3 + F2 keys for cross-correlation

## 7. Verification

- F3.4 unit tests(`backend/tests/test_audit_log.py`):
  - Tag presence on 200 path
  - Tag presence on 401 path with `user_id=null` + `tenant_id=null`
  - Redaction sanitization:Authorization header value never appears in event payload
  - request_id round-trip:input `X-Request-ID` echoed back in response header
- F3.5 LIVE smoke(W7 D3+ if Chris dev server available):`/query` 5 requests → tail structlog → 5 `audit_log` events with `request_id` traceable;Langfuse trace 顯示 audit tags

## 8. Cross-component dependencies

| Component | Wired |
|---|---|
| **C07 Observability** | structlog JSON renderer(`langfuse_tracer.init_tracer`); future Langfuse SDK W3+ |
| **C08 API Gateway** | `app.add_middleware(AuditLogMiddleware)` 註冊 outermost |
| **C11 Identity & Access** | `authenticate_mock` / `authenticate_msal` for `(oid, tid)` resolution(reuse F1.2.1 + F1.3 entry points)|

## 9. Future(Tier 2 / out-of-scope)

- ❌ Per-request body diff capture — Tier 2 forensics scope
- ❌ Cross-tenant aggregation queries — Tier 2 multi-tenancy
- ❌ Real-time anomaly detection on audit stream — Tier 2 SIEM integration

## 10. Update history

| Date | Change | Reason |
|---|---|---|
| 2026-05-14 | Initial schema(W7 D3 F3.2)| F3.1 middleware landed;baseline for W3+ Langfuse SDK wire |
