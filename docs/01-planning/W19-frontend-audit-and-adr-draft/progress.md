---
phase: W19-frontend-audit-and-adr-draft
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
last_updated: 2026-05-16
---

# Phase W19 — Progress

> Daily log + decisions + commits + closing retro。每 commit 對應一個 Day-N entry mention(R2;`docs(planning):` / `docs(adr):` housekeeping commits exempt)。
> Plan deviation → `plan.md` §7 changelog（R3）。OQ resolved → `decision-form.md` + Day-N mention（R4）。
> **W19 is audit + ADR drafts + planning only — NO `frontend/` code change in this phase**。

---

## Day 0 — Kickoff(2026-05-16)

### Trigger

W18-app-shell-ia closed 2026-05-11(phase Gate PASS WITH SMOKE-USER-DEFERRED CAVEAT)→ `references/design-mockups/` high-fidelity HTML prototype + 17 `ekp-page-*.jsx` + DESIGN_README + PAGE_INVENTORY landed in repo 2026-05-16(commit `08b74af`,with `.gitignore` exception + CLAUDE.md v1.4→v1.5 routing + session-start.md §5 entry + Update history row).

The user(Chris)directive same-day 2026-05-16:「現在我們可以先把 design-mockups 的內容 先進行實作,因為之前即使把項目的規劃內容都準備了大部分,但是前端的部分其實一直都沒有規劃好,而且也不太能夠表達項目所實現了的功能流程,現在可以完整地去運用這些mockup內容,把這些前端的部分都完整地準備出來,之後再逐一把裡面的UIUX流程對應到不同的後端功能部分,當然如果發現是現在的後端功能還不支援,就會思考和規劃如何能夠讓它們能被實現,這就是我們接下來要最高優先去執行的工作」

AI surface(per CLAUDE.md §5.1 H1 + §10 R1)— the design-mockups → real-`frontend/` implementation is a **multi-sprint Phase work** that triggers:
1. **H1 architectural change**:3 known design-stage expansions(KB Detail 5→8 tabs / Settings v1→6 tabs / `/users` NET NEW Tier 1.5) + at audit 2 more(`/kb/new` 5-step vs spec 3-step / `/doc-detail/...` route + 3-pane layout vs spec `/admin/kb/[id]/chunks/[doc_id]` chunk inspector) → 5 ADRs required
2. **Backend gap** larger than frontend code work — esp. Settings → Connections / API Keys / `/users` RBAC have no current backend support
3. **R1 binding**:no multi-day implementation without plan;rolling JIT discipline favors splitting into multiple sub-phases over one big phase

AI proposed phase structure(W19 = audit-and-adr-draft / W20–W22 = Wave A/B/C implementation / W23+ Tier 2 hold) + 2 AskUserQuestion strategic decisions:

1. **First step** — user picked: "W19 audit-and-adr-draft phase folder kickoff(推薦)" → this phase
2. **Track A auth path** — user picked: "Mock-auth 繼續做 default,W22 同時 ship mock + real(推薦)" → W22 Wave C concurrently ships mock-auth + real-MSAL feature-flagged;independent of Track A IT cred landing time

岔口 1 (/users RBAC scope) + 岔口 2 (Settings Connections scope) deferred to F6 Chris review session — ADR-0026 + ADR-0027 will be drafted as option sets,Chris picks at F6 + the picked option becomes the Accepted ADR.

### Kickoff cascade(`(this commit)`)

- **W19 phase folder created** — `docs/01-planning/W19-frontend-audit-and-adr-draft/{plan,checklist,progress}.md` + `audit/.gitkeep`;`status: active`(per user directive — same Day-0-flip pattern as W17 D0 / W18 D0,not the usual draft→active flip;the directive + AskUserQuestion answers ARE the authorization per CLAUDE.md §5.1 H1)— `(this commit)`
- **Plan §2 deliverables F0–F6** = audit + ADR drafts + planning(NOT ADR-D1-D9 mapping like W18 — W19 is the **plan phase** for the design-mockups work,not the implementation of any single ADR;the 5 ADRs are themselves F3 deliverables)— `(this commit)`
- **Out-of-W19-scope explicit**:NO `frontend/` code change;NO new backend endpoint;NO `architecture.md v6 §5` amendment(F3 ADR drafts *propose* the amendments — actual inline-tag edits land per-ADR in W20+ kickoffs);NO Cn design-note rewrites;NO Tier 2 implementation;NO Track A activation
- **ADR-0025 / 0026 / 0027 / 0028 / 0029 reserved** in `docs/adr/README.md`(F0.3 — landed at kickoff so concurrent AI sessions see the reservations);"Next NNNN" advances 0025 → 0030
- **session-start.md §10 W19 row** — landed at kickoff(not closeout)— per the W17→W18 precedent the active-phase signal needs to be visible Day 0(F0.4)
- **No `architecture.md` amendment** at W19 kickoff — different from the W18 pattern where ADR-0024 amendment landed at W18 kickoff because ADR-0024 was already Accepted before W18 started;W19 starts with ADRs in *Proposed* state — amendments land per-ADR in W20+ kickoff each invokes(F0.5)

### Pre-kickoff state notes(grounding the audit)

- **W18 IA chrome locked** — `<AppShell>` top bar + collapsible sidebar(5 modules)+ main content + Cmd+K + flat URLs + login-gate + `/dashboard` + `/settings` are the LOCKED ground for W20+ implementation;W19 audit confirms the prototype adheres + W20+ work fills in,not re-IA
- **Design tokens locked** — `tokens.ts` Warm Charcoal + Coral Accent oklch + Inter + JetBrains Mono + radius 0.25/0.5/0.75rem — per ADR-0015 W12 D2;prototype `styles.css` mirrors this;F1.4 audits the match
- **shadcn/ui + Lucide locked**(H2)— prototype DESIGN_README acknowledges + ships its own stripped components for portability;**Wave A-C real implementation must use shadcn/ui + Lucide**(not the prototype's stripped components)
- **Backend baseline state** — W17 F3 RAGAs 4-metric integrated into `/eval/run`+`/eval/shootout`(real backend Wave B-ready);W16 F5 stub closure cascade done(`debug/trace/{id}` + KB doc listing real Wave B-ready);CH-001(per-doc upload/reindex/delete 24 backend tests) closed 2026-05-12 — `/kb/[id]/upload` + Pipeline tab fundamentally backed;**Settings + /users + per-component `/health` = the big backend gaps F2 maps**
- **Mock-auth default** — `FEATURE_AUTH_MOCK=true` / `NEXT_PUBLIC_AUTH_MOCK=true` continues default through W22(per user 岔口 2 decision);real MSAL feature-flagged + ready-to-flip when Track A IT cred lands
- **R8 corp-proxy state** — 7 cumulative occurrences;3 Plan B realised(Playwright system-Chrome 2026-05-13 / Azurite native npm 2026-05-14 / Langfuse SDK mobile hotspot 2026-05-16);no R8 dependency for W19(audit-only,no install needed)

### Carry-overs addressed by W19(from session-start.md §11 + W18 retro)

| Carry-over | W19 deliverable |
|---|---|
| design-mockups landed implementation kickoff(user directive 2026-05-16)| F0-F6 = the audit + ADR + plan phase that authorizes W20+ implementation |
| `<LoginGate>` `// TODO(W16)` tightening(real-MSAL `router.replace('/login')` once Q11 Track A cred wiring is live)| F3 ADR-0027 RBAC scope decision influences when this flips;user 岔口 2 = Wave C ships mock+real both,independent of Track A timing |
| Dashboard "recent queries" + "latest evaluation" empty-state CTAs | F2 backend gap map identifies the missing endpoints(Q6 query log + eval-run cache);Wave A may or may not fill,depending on ADR-0026 Option scope |
| Dashboard "system health" → richer `/health`(per-component connectivity)| F2 documents the gap;Wave A `/dashboard` System health stays backend-up/down liveness until Wave C Settings → Connections "test connection" lands |
| CO_W15_F3_dark_mode_visual_verify + CO_W15_F4_interactive_flow_E2E | NOT advanced by W19(audit-only);Wave A E2E picks them up;user pre-Beta smoke caveat preserved |

W19 does **NOT** address(stay W16 / Tier 2 / parallel track):

- CO16 Track A IT cred + R-B1(W16 F1 — parallel,Wave C ships mock+real per user 岔口 2)
- CO17 🚧 F1.5b(Postgres-path runtime smoke)+ 🚧 F3.5b(RAGAs live-verify Azure-key-bound)— W19 audit-only,no install
- CO19 25% Beta cohort rollout(W16 F2 — Beta phase parallel)
- CO_F6a/b/c ACS email retry / BackgroundTasks / SPF-DKIM(Track A)
- CO_W15_F1_eval_set_v1 — needs Chris SME labels per Q14(unrelated)
- CO_W15_F3_aria_full_audit — Tier 2 full screen-reader audit(W19 audit-only)
- CO13 / AF3(ADR-0013 reserved)

### Actual vs Planned Effort(running — fill per day)

| Deliverable | Planned | Actual | Variance / note |
|---|---|---|---|
| F0 Kickoff cascade | ~0.3d | ~0.2d(this session) | F0.1 Phase folder + plan/checklist/progress — `(this commit)`;F0.2 `audit/.gitkeep` — `(this commit)`;F0.3 `docs/adr/README.md` 5 reserved slots(0025-0029) + Next NNNN advance 0025→0030 — `(this commit)`;F0.4 `session-start.md` §10 W19 row + W18+→W20+ shift + Last-Updated + Update-history entry — `(this commit)`;F0.5 verified no `architecture.md` amendment at kickoff(F3 ADR drafts propose,per-ADR amendments land in W20+ kickoffs)— `(this commit)` |
| F1 Mockup `.jsx` audit | ~0.8d | — | — |
| F2 Backend gap map | ~0.8d | — | — |
| F3 ADR drafts × 5 | ~1.2d | — | — |
| F4 Wave breakdown | ~0.4d | — | — |
| F5 Tier 2 catalog | ~0.5d | — | — |
| F6 Closeout | ~0.3d(synthesis;Chris review = own time block)| — | — |

### Next

- F0.3 — `docs/adr/README.md` reserve ADR-0025–0029 slots(Status: `Reserved (W19 F3)`)+ advance Next NNNN block 0025 → 0030
- F0.4 — `session-start.md` §10 add W19 row(`active`) + Last-Updated + Update-history entry
- F0.5 — confirm no `architecture.md` amendment at kickoff(verify by reading)
- F1 — full mockup audit per `.jsx`(start with `ekp-shell.jsx` + `ekp-page-dashboard.jsx` + `ekp-page-kb.jsx`,then iterate)
- await user feedback on the kickoff cascade if needed before F1 starts

---

**Lifecycle reminder**:呢個 phase `status=active`(2026-05-16,per user directive)。重大 deviation 入 plan.md §7 changelog(per R3)。W20+ phase folder **唔會** pre-create(per CLAUDE.md §10 R1 rolling-JIT — W20-frontend-wave-a kickoff post-W19-F6 closeout decision per ADR-0025 + Wave A scope authorization)。
