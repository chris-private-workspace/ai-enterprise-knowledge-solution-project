---
phase: W22-frontend-presentation-rebuild
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
last_updated: 2026-05-17
---

# Phase W22 — Progress

> Daily progress + decisions + commits;結尾 retro。Status:`active` from kickoff 2026-05-17(user explicit directive post-W21 partial-close H7-enforcement audit + 3 AskUserQuestion Recommended picks = the authorization)。

---

## Day 0 — 2026-05-17(Kickoff)

### Trigger

W21 partial-close H7-enforcement retro Day 1 揭露 W20 Wave A `/dashboard` 同 mockup 有 4 大 fundamental drift(TopBar / Sidebar / Main content shape / Typography)。User-eye side-by-side fidelity audit + 3-screenshot evidence → presentation layer rebuild not patch decision logged + W22 kickoff per CLAUDE.md §10 R1 rolling JIT + §5.7 H7 enforcement。

User explicit directive 2026-05-17:
> **「我認為應該是重新地去建立和準備所有本項目的頁面,而且是根據 mockup 的所有頁面效果,因為我要的是 presentation layer 的一致,而不是把整個 frontend 架構重構」**

Confirmed via AskUserQuestion 3 Recommended picks:
1. 即時 close W21 + kickoff W22-frontend-presentation-rebuild
2. Page rebuild ordering = user-facing impact priority(AppShell → /dashboard → /chat → /kb cluster → /kb-detail → 其他)
3. Mockup primitive 用 shadcn primitive 重寫(H2 vendor lock 規限技術;H7 規限 fidelity;shadcn primitive 缺失 → STOP+ask per H7 trigger)

### F0 — Kickoff cascade(landed)

**Branch**:`main` post-W21 F2 commit `55f876b`。Working tree:F0 commit will land:
- `docs/01-planning/W21-frontend-wave-b/{plan,checklist,progress}.md` — frontmatter `active` → `closed_partial` + Day 1 H7-enforcement retro section + Gate verdict PASS WITH PRESENTATION-LAYER-REBUILD-TRIGGERED CAVEAT
- `docs/01-planning/W22-frontend-presentation-rebuild/{plan,checklist,progress}.md`(NEW)— `status: active` 2026-05-17 kickoff
- `.claude/projects/.../memory/feedback_design_fidelity.md` — empirical-finding section appended 2026-05-17(updated separately,outside repo tree;not part of commit)
- `docs/12-ai-assistant/01-prompts/01-session-start.md` — 6 places synced(§3 / §10 / §11 / §12 / Last Updated / Update history)

**Commits this day**:`(this commit)` — W21 partial-close + W22 kickoff cascade(per W20 F9 closeout + W21 F0 + W18 ADR-0024 amend-by-note precedent — single cascade commit covering closeout + immediate next-phase kickoff is established pattern)

### Decisions captured at kickoff

| Decision | Rationale | Authority |
|---|---|---|
| **W22 scope = presentation layer rebuild 15 pages + AppShell**(NOT backend / NOT auth flow / NOT state mgmt) | User explicit framing「presentation layer 的一致,而不是把整個 frontend 架構重構」+ Karpathy §1.3 surgical(surgical unit = page-level rebuild,not localised token swap) | User directive 2026-05-17 + Karpathy §1.3 |
| **Page rebuild ordering = user-facing impact priority** | (1)AppShell cross-cutting(每頁出 — downstream pages 即時 inherit visual benefit)→(2)dashboard(landing impact)→(3)chat(primary use case)→(4)kb / kb-detail cluster(workflow surface)→(5)observability + settings 其他 | AskUserQuestion answer 2 (Recommended) |
| **Shadcn primitive 重寫 mockup visual,缺失 → STOP+ask per H7 trigger** | CLAUDE.md §3.2 H2 vendor lock 規限技術(stripped components 不可 verbatim copy);CLAUDE.md §5.7 H7 規限 fidelity(approximate 禁止)— 2 條 constraint 並存;mockup primitive 缺失嗰陣 STOP+ask = H7 trigger 第 3 條 | AskUserQuestion answer 3 (Recommended) + CLAUDE.md §5.7 |
| **W21 partial-close(NOT full-close)pattern** | F1+F2 backend deliverables real-shipped green(99/99 pytest);F3-F8 frontend deliverables fold 入 W22 with stricter fidelity discipline;checklist.md `[ ]` items 保留 per CLAUDE.md §10 sacred rule;呢個 partial-close pattern 屬 new — 之前 W12-W20 都係 "all deliverables landed" 或者 "smoke-deferred caveat";本 phase 嘅 driver(H7 fidelity audit)係 mid-phase emergent,partial-close 係 legitimate response | CLAUDE.md §10 R3 plan deviation must changelog(W21 plan §7 + W22 plan §0 都 changelog 咗) |
| **Mockup HTTP server workflow standardized**(`python -m http.server 8080` from `references/design-mockups/`) | 之前 file:/// 開 mockup,但 URL hash routing 唔好 paste + Chrome 某啲 API 受 file:// restrict;serve 後 `http://localhost:8080/EKP%20Platform.html#dashboard` 可以 paste-friendly,workflow seamless;3 server side-by-side(8080 mockup + 3001 frontend + 8000 backend)established as W22 standard fidelity-verify setup | Karpathy §1.4 goal-driven — define verifiable success criteria + iterate per page |
| **Per-page H7 verification gate formalized** | 每 F-deliverable acceptance criteria 包含 H7 7-item self-verify + user-eye side-by-side verify;NO「smoke-user-deferred」for fidelity itself;只允許 multi-viewport responsive 細項 / dark-mode drift / Playwright interactive flow defer | W21 retro decision + CLAUDE.md §5.7 H7 binding |
| **Rule-of-3 wizard primitive promotion NOW realize**(was W20 F6.2 carry-over;W21 Wave B 冇 wizard surface so defer;W22 has 4 wizard surfaces) | Wizard count = `/kb/new` 5-step + `/kb/[id]/upload` 3-step + `/register` 2-step + W13 verify-email = 4;Rule-of-3 trigger threshold已超(promote at 3rd occurrence);primitive extraction 而 4 用 sites consume = natural Karpathy §1.2 simplicity gain | W20 F6.2 carry-over realized W22 F5.3 |
| **Pre-active-flip grep verification 5-step formalized** | CO_W14_process_grep_verify cumulative 10+ occurrences(W13-W21 cumulative);W21 F2 plan-text deviations(「Langfuse Postgres query layer」+「extend W18 baseline」)再次 hit;formalize:(1)Read plan literal acceptance criteria(2)Grep code base for referenced files / functions / patterns(3)Surface mismatches upfront(4)Document deviations in plan §7 changelog at kickoff(5)Adjust acceptance criteria per actual reality | W21 retro process-improvement decision + CLAUDE.md §10 R3 |

### Tier 2 boundary enforcement(W22 throughout)

Per W19 F5 27-affordance Tier 2 catalog + `<DisabledAffordance>` shared component(W20 F1.5 landed,W22 preserved unchanged):

| Tier 2 surface | W22 treatment |
|---|---|
| Workspace switcher chevron(「Ricoh > RAPO」selector) | F1.2 `<DisabledAffordance>` chip |
| Sidebar Labs section(7 items:GraphRAG / Multi-Agent / Multi-Language / Fine-Tune / Workflow Builder / Personalization / Multi Tenancy) | F1.3 `<DisabledAffordance>` per item |
| Embedding vector preview(if Azure Search vector exposure expensive) | F6.4 `<DisabledAffordance variant="p3-preview" showBadge>` Tier 2 chip |
| Ops Metrics(if `EvalReport.ops_metrics` field missing) | F7.7 `<DisabledAffordance>` "Ops metrics — Wave C+" |
| CRAG fields(if `EvalReport.crag_*` fields missing) | F7.7 coverage-only display fallback |
| Settings 6-tab fully-editable scope(Wave C2) | F8.1 thin baseline + `<DisabledAffordance>` Tier 2 chips on Connections + API Keys + Audit log per Wave C2 future |
| `/users` Tier 1.5 RBAC scope(Wave C1) | NOT in W22 scope;`/users` route NOT touched |
| Real-MSAL feature flag activation(Wave C concurrent ship per user 岔口 2) | Mock-auth default continues through W22;real-MSAL Wave C scope |

### Actual vs Planned Effort(Day 0)

| F | Planned | Actual | Δ |
|---|---|---|---|
| F0.1 W21 partial-close cascade(frontmatter + retro) | 30 min | ~30 min | 0% |
| F0.2 W22 plan/checklist/progress create | 60 min | ~50 min | -17% |
| F0.3 memory empirical-finding append | 10 min | ~5 min | -50% |
| F0.4 session-start.md 6 places sync | 30 min | TBD | TBD |
| F0.5 NO frontend code | 0 | 0 | 0% |
| F0.6 commit cascade | 10 min | TBD | TBD |
| **Day 0 total** | **~2.5 hours** | TBD | TBD |

### Carry-overs to Day 1+

- **Day 1+** — F1 AppShell rebuild(TopBar + Sidebar + main wrap;cross-cutting effect;largest single-deliverable per session)~1-1.5 days planned
- **Day 2+** — F2 /login + /register rebuild ~0.5-1 day
- **Day 3** — F3 /dashboard rebuild ~1 day
- **Day 4-5** — F4 /chat rebuild ~1.5-2 days
- **Day 5-6** — F5 /kb list + /kb/new rebuild + Rule-of-3 wizard primitive promote ~1 day
- **Day 6-8** — F6 /kb/[id] 7-tab + /kb/[id]/upload + /kb/[id]/docs/[docId] cluster ~2-3 days
- **Day 8-9** — F7 /eval + /traces index + /traces/[traceId] cluster ~1.5-2 days
- **Day 9-10** — F8 /settings + cross-cutting closeout ~0.5-1 day
- **Total**:~8.5-12.5 plan-day budget(real-calendar collapse pattern 1.8-12× → likely ~2-4 actual days per W12-W20 trajectory)

---

<!-- Day 1+ entries appended as F1-F8 land. Template:

## Day N — YYYY-MM-DD

### F<n> — <deliverable> (landed)

**Branch**:...
**Commits this day**:...

#### What landed

- ...

#### Acceptance criteria status (per checklist.md)

- [x] F<n>.1 — ...

#### Deviations(if any)

| F# | Plan said | Actual | Why | Approver |
|---|---|---|---|---|

#### Decisions / new OQ / risk surfaced

- ...

#### Actual vs Planned Effort

| F | Planned | Actual | Δ |
|---|---|---|---|

#### H7 fidelity verify status(per page)

| Route | Mockup tab L | Impl tab R | 7-item self-verify | User-eye verify |
|---|---|---|---|---|
| /<route> | http://localhost:8080/EKP%20Platform.html#<hash> | http://localhost:3001/<path> | ☐/✅ each item | ☐/✅ |

#### Carry-overs to next Day-N

- ...

---

-->

## Retro(填 at F8 closeout)

> **Retro format**:per W18-W21 7-section convention
>
> 1. What worked
> 2. What didn't work & friction
> 3. Surprises
> 4. Decisions / new OQ / risk surfaced(non-trivial outcomes)
> 5. Carry-overs to W23+(NOT specific tasks per CLAUDE.md §10 R3 rolling JIT — themes only;W23 plan-day kickoff details refines)
> 6. Time tracking(plan-day budget vs actual real-calendar — W22 budget ~8.5-12.5 days;real-calendar collapse ratio target)
> 7. Spec-ref alignment(architecture.md v6 §5 amendments preserved + ADR-0014/0015/0024/0025/0028/0029/0031 implementation verification + ADR-0030 SKIPPED-absorbed status preserved)
>
> **Phase Gate verdict** = TBD(PASS / PARTIAL PASS / FAIL with explicit rationale)
>
> **Critical Gate item NEW for W22**:per-page H7 7-item self-verify ALL passed + per-page user-eye side-by-side verify ALL passed across 15 pages(NO「smoke-user-deferred」allowance for fidelity)。If 1-2 pages STOP+ask trigger(mockup detail unclear / shadcn primitive missing)→ defer that page to W23+ with explicit `🚧` reason;rest PASS。If fundamental drift discovered post-ship across multiple pages → FAIL → re-rebuild。

---

**Lifecycle reminder**:呢份 progress.md `status=active`(2026-05-17,per kickoff)。每 Day-N entry append;retro 喺 F8 closeout 寫。Status flip `active`→`closed` at F8.4。**Per-page H7 verification gate is the central new discipline this phase introduces** — replace previous「smoke-user-deferred caveat」allowance with mandatory user-eye verify before tick。
