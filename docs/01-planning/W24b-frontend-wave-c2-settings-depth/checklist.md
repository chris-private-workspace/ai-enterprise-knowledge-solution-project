---
phase: W24b-frontend-wave-c2-settings-depth
plan_ref: ./plan.md
status: active
last_updated: 2026-05-20  # F1 active-flip → F1.1-F1.5 complete (F1.4 deferred F2.1)
---

# W24b-wave-c2 — Checklist

> Derived from `plan.md §2 F0-F8 deliverables`。延後項標 🚧 + reason(per CLAUDE.md sacred rule — 唔可以刪未勾 `[ ]`)。

## F0 — Kickoff cascade

- [x] **F0.1** W24b folder `plan.md`(this folder)+ `checklist.md` + `progress.md` created `status: active` 2026-05-20
- [x] **F0.2** NO `frontend/` or `backend/` code change at kickoff(per W19-W24 F0 precedent — F0 governance only)
- [x] **F0.3** NO `architecture.md v6` amendment(Wave C2 = depth promotion within ADR-0026 既存 spec — no Cn structural change;Wave C1 had architecture.md amendment because 6-tab scope expansion;Wave C2 仍喺 same 6-tab scope inline-edit)
- [x] **F0.4** Pre-active-flip 5-step grep audit recursive(per CLAUDE.md §10 R6)completed at kickoff prep,documented in `progress.md` Day 0 + plan §7:Wave C1 4 components exist / `error-boundary.tsx` 85 lines exist / `@tanstack/react-query@5.59.0` installed / `react-hook-form` + `zod` + `@hookform/resolvers` NOT installed → F1 H2 trigger / `settings-identity.tsx` 8 處 `readOnly` confirmed / `audit_log.py` 36 lines limit-only no filter
- [x] **F0.5** W24b kickoff cascade committed `(this commit)`

## F1 — react-hook-form + zod install(H2 ADR-0017 mitigation)

- [x] **F1.1** `pnpm add react-hook-form@^7 zod@^3 @hookform/resolvers@^3` — **Plan B (a) clean install in 40.6s,zero R8**;resolved `react-hook-form@^7.76.0` + `zod@^3.25.76` + `@hookform/resolvers@^3.10.0`
- [x] **F1.2** N/A — F1.1 Plan B (a) `pnpm add` succeeded clean;no R8 hit → no ADR-0017 amendment + no Plan B (c) mobile hotspot fallback needed(npm-registry metadata non-binary,per W17 F6 Vitest precedent — confirmed low R8 risk)
- [x] **F1.3** `package.json` 3 new deps confirmed(lines per `grep`);`tsc --noEmit` **exit 0**
- [🚧] **F1.4 DEFERRED to F2.1** — `frontend/lib/schemas/admin/` 空 folder 對 git 無意義(空目錄唔被 tracked);folder 喺 F2.1 首個真 schema `identity.ts` 落地時自然 materialize(per CLAUDE.md §10 R6 adjust-acceptance-to-reality + Karpathy §1.2 avoid-busywork;plan §7 changelog Day 1 row documented)
- [x] **F1.5** Sanity Vitest:`frontend/tests/unit/zod-toolchain.test.ts` NEW(renamed from plan-text `lib-schemas-admin.test.ts` — F1.4 folder deferred so toolchain-level name 更準;R6 deviation logged)— **4/4 pass in 11.9s**:zod parse + safeParse field-error surfacing + zodResolver bridge + useForm export;inline `sampleSchema` mirrors 2 real Wave C1 constraints(tenant_id UUID + alert_threshold_pct 50-95)

## F2 — Zod schemas + form validation wire

- [ ] **F2.1** `frontend/lib/schemas/admin/identity.ts` NEW — 5 zod schemas(EntraTenantConfig + AppRegistrationConfig + MsalConfig + RoleMappingConfig + SignInPolicyConfig)mirror backend Pydantic
- [ ] **F2.2** `frontend/lib/schemas/admin/api_keys.ts` NEW — `AlertThresholdSchema`(50-95 range)
- [ ] **F2.3** `frontend/lib/schemas/admin/connections.ts` NEW — `ProviderPatchSchema`(endpoint_url URL + region + display_name)
- [ ] **F2.4** `settings-identity.tsx` wire `useForm({resolver: zodResolver(...)})` × 5 sub-resource card(structural wire;final inline-edit activation 入 F5)
- [ ] **F2.5** `settings-api-keys.tsx` `OutgoingQuotaRowItem` alert_threshold useState → react-hook-form upgrade
- [ ] **F2.6** `settings-connections.tsx` ProviderRow expand panel useForm for endpoint_url + region + display_name(structural wire;PATCH wire 入 F3)
- [ ] **F2.7** `tsc --noEmit` exit 0 + `next lint` clean + `Grep '\[oklch'` = 0 preserved

## F3 — Optimistic UI per PATCH(TanStack useMutation retrofit)

- [ ] **F3.1** 4 settings/* components retrofit:replace `useState + try/await/catch` pessimistic with `useMutation({ onMutate, onError, onSuccess })`
- [ ] **F3.2** `onMutate` optimistic cache update via `queryClient.setQueryData`
- [ ] **F3.3** `onError` rollback via cached snapshot + inline banner-destructive error display(無 toast — 保留 Wave C1 inline pattern)
- [ ] **F3.4** `onSuccess` invalidate cache via `queryClient.invalidateQueries`
- [ ] **F3.5** `tsc --noEmit` exit 0 + `next lint` clean

## F4 — ErrorBoundary per tab

- [ ] **F4.1** `frontend/components/settings/tab-error-state.tsx` NEW — `<TabErrorState tabName>` fallback(banner-destructive + retry button)
- [ ] **F4.2** `frontend/app/(app)/settings/page.tsx` wrap each tab in `<ErrorBoundary fallback={<TabErrorState tabName={...} />}>` × 6 wrap points
- [ ] **F4.3** Verify ErrorBoundary catches React render errors(dev throw test → fallback renders)
- [ ] **F4.4** `tsc --noEmit` exit 0 + `next lint` clean

## F5 — Identity inline edit activation

- [ ] **F5.1** `settings-identity.tsx` 8 處 `readOnly` removed(line 96/106/115/163/190/256/265/274)
- [ ] **F5.2** 5 sub-resource card 各 wire Save button + dirty-state detection(react-hook-form `formState.isDirty`)
- [ ] **F5.3** Save click → useMutation PATCH endpoint → optimistic update → 422 boundary inline banner-destructive
- [ ] **F5.4** `authority_url` disabled-display preserved(server-side derived — read-only 唔屬 inline-edit promote)
- [ ] **F5.5** RoleMappingConfig list-replace semantic preserved(individual mapping CRUD defer Wave C+)
- [ ] **F5.6** H7 per-tab fidelity verify — inline-edit affordance match mockup line 528-723 visual(unlock-only,no visual restructure)
- [ ] **F5.7** `tsc --noEmit` exit 0 + `next lint` clean

## F6 — Audit log filter + pagination

- [ ] **F6.1** `backend/storage/audit_log_storage.py` `AuditLogBackend.list_recent` Protocol extended `action_type` + `since` + `cursor`(backward-compat default None)
- [ ] **F6.2** InMemory + Postgres impl filter logic(InMemory comprehension + Postgres `WHERE action_type = %s AND created_at >= %s AND id < %s ORDER BY id DESC LIMIT %s`)
- [ ] **F6.3** `audit_log.py` `GET /admin/audit-log` add `action_type` + `since` + `cursor` query params;response extends with `next_cursor: int | None`
- [ ] **F6.4** `apiClient.admin.listAuditLog` extended signature `(opts: {limit?, action_type?, since?, cursor?})` + response `{entries, next_cursor}`
- [ ] **F6.5** `settings-audit-log.tsx` filter dropdown(action_type)+ since date input + "Load more" cursor button
- [ ] **F6.6** Tests:`test_audit_log.py` 加 filter/pagination 6+ NEW cases;`settings-audit-log.test.tsx` filter interaction
- [ ] **F6.7** mypy strict backend + tsc/lint frontend clean

## F7 — Tests(Vitest + Playwright)

- [ ] **F7.1** `frontend/tests/unit/settings-identity-form.test.tsx` NEW — react-hook-form + zod tenant validation(3+ cases)
- [ ] **F7.2** `frontend/tests/unit/settings-audit-log-filter.test.tsx` NEW or extend — action_type filter + cursor pagination(3+ cases)
- [ ] **F7.3** `frontend/tests/e2e/app-shell-path.spec.ts` `/settings?tab=identity` dirty-state Save button visible-after-edit render-smoke
- [ ] **F7.4** `frontend/tests/e2e/visual-baseline.spec.ts` `/settings?tab=identity` baseline re-capture post-inline-edit
- [ ] **F7.5** Vitest stats `pnpm exec vitest run tests/unit/` ≥ ~15 settings-area pass(W24-c1 baseline 9 + F7.1+F7.2 NEW ~6)
- [ ] **F7.6** Playwright stats `PW_CHANNEL=chrome pnpm exec playwright test` ≥ 24/24 pass
- [ ] **F7.7** Backend pytest ≥ ~811 pass(W24-c1 baseline 805 + F6 ~6 NEW)

## F8 — Closeout cascade

- [ ] **F8.1** Phase Gate verdict published per `progress.md` retro
- [ ] **F8.2** 7-section retro per F-deliverable
- [ ] **F8.3** plan/checklist/progress frontmatter `active → closed`
- [ ] **F8.4** W24c+ candidates noted in retro **NOT pre-created** per CLAUDE.md §10 R1 rolling JIT
- [ ] **F8.5** `session-start.md` 6 places synced
- [ ] **F8.6** `COMPONENT_CATALOG.md` C08 + C09 + C11 W24b status amendments
- [ ] **F8.7** `PAGE_INVENTORY.md` `/settings` row Wave C1+C2 hybrid amendment
- [ ] **F8.8** ADR-0026 Implementation Status section amendment(Wave C1 → Wave C1+C2 implemented)
- [ ] **F8.9** `PAGE_INVENTORY.md` row 8/9/10 staleness drift fix(observability cluster W22 F7 already-rebuilt update)

---

**Lifecycle reminder**:新加 acceptance item 必先入 `plan.md §2 F-deliverables`,然後再加 checklist。延後項標 🚧 + reason,唔可以刪。
