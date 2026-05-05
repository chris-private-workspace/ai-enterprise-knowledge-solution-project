---
phase: W07-beta-deploy
plan_ref: ./plan.md
status: draft
last_updated: 2026-05-05
---

# Phase W07 — Checklist

> Atomic checkbox(每 item ≤ 0.5–2 hour effort per W6 C10 calibration:LIVE deploy days × 2;static days × 0.5)。
> Status:`draft` 直到 W6 D5 closeout sign-off + W7 D1 kickoff approval + Q11 IT confirm。
> 全 unchecked 至 W7 D1 implementation start。

## F1 — Microsoft Entra ID auth integration(C11,W7 critical path)

- [ ] **CRITICAL Q11 IT** F1.1 IT confirm Ricoh Entra ID tenant access(W7 D1 critical;fallback = mock auth dev mode if W7 D5 仍未 confirm)
- [ ] F1.2 MSAL Python SDK + msal-react integration scaffold(`backend/api/auth/` + `frontend/lib/auth/`)
- [ ] F1.3 Auth middleware on `backend/api/main.py` lifespan — protect `/query/**` + `/kb/**`;`/healthz` + `/livez` 公開
- [ ] F1.4 Login flow UI(C09 Admin + C10 Chat):redirect to Entra ID hosted login → callback → token store
- [ ] F1.5 Token refresh logic + logout endpoints
- [ ] F1.6 Unit tests:auth middleware reject unauth + valid token allow + expired token reject(mocked MSAL responses)
- [ ] F1.7 LIVE smoke:dev tenant Entra ID end-to-end login flow on local dev server

## F2 — Rate limiting middleware per-user concurrency cap(C08 + C11)

- [ ] F2.1 Token-bucket rate limiter middleware(per-user + per-IP fallback)— configurable via Settings
- [ ] F2.2 Rate limit thresholds Settings:50 req/min per user + 5 concurrent active queries(architecture.md §8.1 R5 spec)
- [ ] F2.3 429 response with Retry-After header on exceed
- [ ] F2.4 Unit tests:burst within budget OK + burst exceed → 429;concurrent cap enforce
- [ ] F2.5 Cost monitoring:rate-limit hit count → Langfuse tag(W8 cost dashboard data source)

## F3 — Audit logging per-query trail(C07)

- [ ] F3.1 Audit log middleware:tag every Langfuse trace with `user_id` + `request_id` + `audit_action` + `tenant_id`
- [ ] F3.2 Audit-specific tag schema document at `docs/02-architecture/audit-log-schema.md`(NEW)
- [ ] F3.3 Sensitive data redaction:never log full prompt payload to plaintext file(per CLAUDE.md §5.5 H5)
- [ ] F3.4 Unit tests:audit middleware tag presence + redaction sanitization
- [ ] F3.5 LIVE smoke:5 query through dev server → Langfuse trace 顯示 audit tags + request_id traceable

## F4 — Error handling polish(C08 + C09 + C10)

- [ ] F4.1 API error contract:every endpoint return `{"error": {"code", "message", "actionable_hint"}}` shape;NO raw stack trace
- [ ] F4.2 UI error boundary:user-friendly message + "retry" / "report" CTA;NO browser default error page
- [ ] F4.3 14 edge cases mapping(architecture.md §7.3 E1-E14):confirm each surfaces graceful message + log
- [ ] F4.4 Unit tests:5xx + 4xx + timeout each produce contract-compliant response;UI snapshot tests for error boundary
- [ ] F4.5 LIVE smoke:trigger E1 OOS query refusal + E5 LLM timeout + E12 KB delete during query → graceful UX

## F5 — Mobile responsive baseline complete(C09 + C10)

- [ ] F5.1 Tailwind responsive breakpoints audit `sm` `md` `lg` `xl` correctness on 4 main views(KB list / KB detail / Chat / Eval Console)
- [ ] F5.2 Mobile-only adjustments:hamburger nav + collapsible sidebars + touch-friendly tap targets
- [ ] F5.3 Citation card mobile UX:full-width vs sidebar adjust;screenshot modal mobile-friendly
- [ ] F5.4 Manual smoke test:Chrome DevTools mobile emulation 5 viewports(320 / 375 / 414 / 768 / 1024 width)
- [ ] F5.5 Pixel diff snapshots committed for regression catch(`frontend/tests/snapshots/`)

## F6 — Phase Gate closeout + W7 retro + W8 kickoff prep

- [ ] F6.1 W7 phase Gate verdict landed(F1-F5 outcomes documented + carry-overs to W8)
- [ ] F6.2 W07 progress.md retro 7 sections complete(per W6 retro structure precedent)
- [ ] F6.3 W08 phase folder kickoff:`docs/01-planning/W08-beta-deploy-sprint2/{plan,checklist,progress}.md` draft
- [ ] F6.4 W07 progress.md frontmatter status flipped to `closed`
- [ ] F6.5 OQ Q11 final Resolved sync to `decision-form.md`(Entra ID tenant access confirmed working)
- [ ] F6.6 R-B1 risk status update to `RISK_REGISTER.md`(Entra ID delay → mitigated or active per F1 outcome)

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1
- [ ] OQ status sync to `decision-form.md`(R4)— Q11 W7 D1 critical
- [ ] Risk register update if R-B1 (Entra ID delay) status changes
- [ ] CLAUDE.md §5.5 H5 security check:no secret commit;Cohere/Azure key in `.env` gitignored;Entra ID client secret only in `.env`(POC)→ Key Vault W8+

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
