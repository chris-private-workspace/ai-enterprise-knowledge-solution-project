---
phase: W19-frontend-audit-and-adr-draft
plan_ref: ./plan.md
status: active
last_updated: 2026-05-16
---

# Phase W19 — Checklist

> Atomic checkbox(每 item ≤ 0.5–2 hour effort)。Status:`active` from kickoff 2026-05-16(user directive + AskUserQuestion answer = the authorization)。
> 每 item done 後 `[ ]→[x]` + commit ref;延後項標 🚧 + reason(per CLAUDE.md §10 sacred rule — 唔可以刪未勾選 item)。
> **W19 is audit + ADR drafts + planning only — NO `frontend/` code change in this phase**。

## F0 — Kickoff cascade

- [x] F0.1 NEW `docs/01-planning/W19-frontend-audit-and-adr-draft/{plan,checklist,progress}.md` created with `status: active` — `(this commit)`
- [x] F0.2 NEW `docs/01-planning/W19-frontend-audit-and-adr-draft/audit/` subfolder created with `.gitkeep` — `(this commit)`
- [x] F0.3 `docs/adr/README.md` — reserved ADR-0025 / 0026 / 0027 / 0028 / 0029 slots with `Status: Reserved (W19 F3)`(5 rows added after ADR-0024 + footnote「next available 0025」→「0025–0029 Reserved 2026-05-16, next 0030」)— `(this commit)`
- [x] F0.4 `docs/12-ai-assistant/01-prompts/01-session-start.md` — NEW W19 row in §10(`active 2026-05-16`,Default focus = "audit + ADR drafts,NO `frontend/` code change")+ W18+ → W20+ shift with Wave A/B/C/D candidates;Last-Updated + Prior moved + Update-history entry added — `(this commit)`
- [x] F0.5 Confirmed NO `architecture.md` amendment at W19 kickoff(per F0.5 verify-no-op pattern same as W18 F2.4)— `architecture.md v6 §5` still reflects W18 ADR-0024 amendment state unchanged;F3 ADR drafts will *propose* amendments,actual `architecture.md` inline-tag edits land per-ADR in W20+ kickoffs per the §3.4/§3.7/ADR-0024 precedent — `(this commit)`(verified, no edit)

## F1 — Full mockup audit per `.jsx`(17 files + shell + data + styles + tweaks)

- [ ] F1.1 NEW `audit/W19-mockup-jsx-audit.md` — per-route table covering all 14 Tier 1 routes + 8 Tier 2 Labs routes + the shell;columns:Route / File / Component structure / Mock data deps / Tier classification / IA compliance / Visual identity / Deviation from `architecture.md v6 §5`
- [ ] F1.2 Summary section at end — "All deviations identified" list,each tagged with F3 ADR feed(0025–0029)or "no ADR — covered by ADR-0024" or "Tier 2 — Lab page,no Tier 1 implementation"
- [ ] F1.3 `tweaks-panel.jsx` audit — confirm design-time tool only,NOT shipping;documented in Wave A note
- [ ] F1.4 `styles.css` audit — confirm `oklch()` tokens match `frontend/lib/theming/tokens.ts`(Warm Charcoal + Coral Accent per ADR-0015 W12 D2);flag any divergence
- [ ] F1.5 `ekp-data.jsx` audit — sample 5–10 mock data shapes against `backend/api/schemas/*.py`;flag shape mismatch → F2 backend gap or F3 ADR amend
- [ ] F1.6 Spec-ref grep verification(per CO_W14_process_grep_verify formalized) — for every "deviation" claim,grep `architecture.md v6 §5` + `COMPONENT_CATALOG.md` for the relevant section text to confirm the gap exists where claimed

## F2 — Backend gap map(14 Tier 1 routes × endpoint × schema)

- [ ] F2.1 NEW `audit/W19-backend-gap-map.md` — per-route table:Route / Frontend data needs(from F1) / Required endpoint / Status(supported / partial / missing / mock-only) / Wave block / Owner Cn
- [ ] F2.2 Cumulative backend-work list — extracted from F2.1 `missing` + `partial` rows;grouped by Cn(C02 / C07 / C08 / C11 / C12 + new C14 / C16)+ Wave
- [ ] F2.3 "Blocks Wave A/B/C" classification — explicit per-Wave dep list
- [ ] F2.4 Real backend code grep — for each F2.1 row, grep `backend/api/routes/` + `backend/api/schemas/` for actual route + schema definition(or absence);cite file:line as evidence

## F3 — ADR drafts × 5(Status = Proposed,await F6 approval)

- [ ] F3.1 NEW `docs/adr/0025-kb-detail-8-tabs-expansion.md` — KB Detail 5→8 tabs(Images / Chunking Lab / Access);Context / Decision / Alternatives / Consequences / References;`Status: Proposed`;hard dep on ADR-0027 acceptance(Access tab) documented
- [ ] F3.2 NEW `docs/adr/0026-settings-6-tab-hub-and-connections-backend.md` — Settings v1 thin → 6-tab hub;**option set**(A read-only / B fully editable / C hybrid)— each option's backend scope + Wave C impact spelled out;`Status: Proposed (awaiting Chris pick at F6)`
- [ ] F3.3 NEW `docs/adr/0027-users-tier-1-5-rbac.md` — /users Tier 1.5 NET NEW;**option set**(A full RBAC / B minimal 3-role / C stage);each option's table additions + Cn scope + Wave C impact;`Status: Proposed (awaiting Chris pick at F6)`
- [ ] F3.4 NEW `docs/adr/0028-kb-new-5-step-wizard.md` — /kb/new 5-step wizard;Multimodal step Tier 1/2 boundary explicit;`Status: Proposed`
- [ ] F3.5 NEW `docs/adr/0029-doc-detail-3-pane-layout.md` — /doc-detail/[kbId]/[docId] 3-pane;route topology decision point flagged for F6;`Status: Proposed`
- [ ] F3.6 Each ADR draft has "Decision Pending User Approval" placeholder + cross-refs F1 audit + F2 gap map
- [ ] F3.7 `docs/adr/README.md` — fill the 5 reserved slots(F0.3) with `Status: Proposed`,context cell summary,"Next NNNN = 0030"

## F4 — Wave breakdown(W20–W23+ phase skeletons)

- [ ] F4.1 NEW `audit/W19-wave-breakdown.md` — 4 Wave skeletons:
  - Wave A — W20-frontend-wave-a(`/dashboard` + `/chat` + `/kb` + `/kb/[id]`)— ADR-0025 dep;backend = mostly supported + ad-hoc dashboard endpoint;est ~3-5d
  - Wave B — W21-frontend-wave-b(`/doc-detail` + `/eval` + `/traces/[traceId]`)— ADR-0029 dep;backend mostly supported;est ~2-3d
  - Wave C — W22-frontend-wave-c(`/settings` + `/users` + auth polish + real-MSAL ship)— ADR-0026 + ADR-0027 dep;**mock + real both ship** per user 岔口 2;backend HIGH scope;est ~5-8d
  - Wave D — Tier 2 hold(8 `/labs/*` post-Beta governance Q12)— NOT pre-created
- [ ] F4.2 Dep ordering — explicit "Wave A must close before B?" diagram;current draft = A+B parallel,C needs A done,D requires Beta launch
- [ ] F4.3 Per-Wave H4 boundary policing list — features that surface as disabled affordance per F5 catalog
- [ ] F4.4 岔口 → Wave impact diagram — Option A/B/C for each 岔口 → Wave C scope changes summarized

## F5 — Tier 2 disabled-affordance catalog

- [ ] F5.1 NEW `audit/W19-tier2-disabled-affordance-catalog.md` — enumerate every disabled-affordance instance(topbar language / Forgot password / Multimodal Vision / Slide screenshots / Perceptual hash / Public KB / Anonymous API key / Power User role / Custom role / Power User mapping / Distributed token cache / Anonymous API keys / Add provider / `/labs/*` 8 pages)
- [ ] F5.2 Per-affordance handling spec — for each item:affordance pattern(native disabled / aria-disabled+toast / coral badge / route hidden);tooltip text(consistent voice);coral accent usage guard;H4 rationale;Tier 2 trigger condition
- [ ] F5.3 `<DisabledAffordance>` or `<Tier2Affordance>` component design sketch — single shared component for consistent wiring across Waves;design pattern only,not built in W19
- [ ] F5.4 `/labs/*` routing decision option set — A:Labs in `<AppShell>` sidebar section;B:flag-gated;C:prototype only;recommend C for Wave A-C ship,A for post-Beta governance

## F6 — Phase closeout + Chris approve + W20+ kickoff trigger

- [ ] F6.1 Chris review session — go through 4 audit files + 5 ADR drafts;answer:岔口 1(ADR-0027 Option A/B/C)+ 岔口 2(ADR-0026 Option A/B/C)+ F5.4(/labs/* routing A/B/C)+ F3.5(/doc-detail route name)
- [ ] F6.2 Each ADR(0025–0029) Status `Proposed` → `Accepted` per Chris approval(iterate if needed);ADR README slot status updates
- [ ] F6.3 W19 phase Gate verdict landed in progress.md(PASS / PARTIAL / FAIL with explicit rationale per the W12-W18 pattern)
- [ ] F6.4 W19 `plan.md` + `checklist.md` + `progress.md` frontmatter `status: active` → `closed`
- [ ] F6.5 W19 `progress.md` retro — 7 sections(What worked / What didn't & friction / Surprises / Decisions / Carry-overs to W20+ / Time tracking / Spec-ref alignment)
- [ ] F6.6 `session-start.md` hygiene catch-up — §3(no Cn status change,flag "5 ADRs Accepted, W20+ pending");§10 W19 row → closed verdict;W20+ NOT pre-created(rolling JIT);§11 carry-overs(5 Accepted ADRs become W20+ tracking);§12 Milestones row(累計 17→18);Last-Updated + Update-history
- [ ] F6.7 W20-frontend-wave-a kickoff candidate flagged in session-start.md §10 W19 row;actual W20 phase folder created in a separate kickoff cascade(NOT at W19 closeout — rolling JIT precedent W17→W18 / W18→W19)
- [ ] F6.8 No new W19 OQ expected — confirm `decision-form.md` untouched(strategic 岔口 → Accepted ADR options,not new OQs)

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)— `docs(planning):` housekeeping commits exempt
- [ ] Component tag in commit message — F1/F2/F3 = governance + audit / F4 = governance / F5 = cross-Cn UI pattern / F6 = governance
- [ ] OQ status sync to `decision-form.md`(R4)— expected no-op(strategic 岔口 → ADR options, not new OQs);confirm at F6
- [ ] CLAUDE.md §5.1 H1 — W19 = the H1 ADR drafting phase(F3) + R1 plan(F0) + R5 ADR-before-implementation(W20+ kickoffs gated on F6 ADR acceptance)
- [ ] CLAUDE.md §5.2 H2 — NO new dependency in W19(audit only);F3 ADR-0026 Option B may surface Key Vault SDK as a new dep — flagged in that ADR not introduced
- [ ] CLAUDE.md §5.4 H4 — Tier 2 boundary policing is the F5 deliverable
- [ ] CLAUDE.md §3 conventions — NO `frontend/` or `backend/` code change in W19;all output = .md audit + .md ADRs;Plan / checklist / progress markdown follow the W18 template structure
- [ ] Karpathy §1.1 think-before-coding — W19 is itself the "think" phase for the design-mockups implementation work,by-design
- [ ] Karpathy §1.2 simplicity — W19 audit aims for the **minimum** set of ADRs(5);if F1 surfaces a 6th deviation,flag + decide whether it's ADR-worthy or covered by an existing ADR's "Consequences"
- [ ] Karpathy §1.3 surgical — NO mockup edits;NO `architecture.md` edits;NO `COMPONENT_CATALOG.md` Cn design-note rewrites;all editorial work lands in W20+ kickoffs

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + §7 changelog,然後再加 checklist item。延後 item 標 🚧 + reason,**唔可以刪**未勾選 `[ ]`。
