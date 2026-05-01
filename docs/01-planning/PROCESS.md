# EKP Workflow Framework

> **目的**:本 doc 係 EKP project 嘅 **workflow source of truth**。任何 work 開始之前必須跟呢套流程。CLAUDE.md §10 routing 入面,任何 task 級 work 都 reference 返呢度。

**Version**: 2.0 | **Effective**: 2026-05-01 | **Owner**: Chris(技術 Lead)
**Supersedes**: PROCESS.md v1.0(phase-only framework)— v2.0 加入 change + bugfix workflow + AI auto-classification

---

## 0. Why this exists(updated v2.0)

| 痛點 | v1.0 解法(phase-only)| v2.0 解法(3 task types)|
|---|---|---|
| AI assistant 跳入 implementation 而無 sprint-level plan,工作零碎 | Per-phase plan + checklist + progress | 同 |
| 無法區分 phase work / change request / bug fix → 一律當 ad-hoc 做 | (沒 differentiation)| **3 explicit workflows + AI auto-classification** |
| Change / bug fix 缺乏 documented process,易漏 verification + traceability | (沒 covered)| **Per-type spec / report + checklist + progress** |
| 滾動式規劃只 cover phase-level | rolling JIT phase | 同 + change / bugfix on-demand instances |

---

## 1. Task Type Classification(AI Routing)

### 1.1 Decision Tree

```
incoming task
    │
    ├─► matches active phase plan F<n> deliverable?       → Phase/Sprint workflow
    │
    ├─► modifying existing feature behavior(non-bug)?
    │      AND scope < 3 days?
    │      AND well-defined acceptance criteria?            → Change workflow
    │
    ├─► fixing incorrect / broken / regressed behavior?    → Bug-fix workflow
    │
    └─► trivial(typo / single-line / < 30min)?             → Trivial:just commit
                                                              (no doc folder needed)
```

### 1.2 Classification Heuristics(AI 用)

| Signal in user request | Likely type |
|---|---|
| "implement F<n>" / matches active phase | Phase/Sprint |
| "改 X 嘅 behavior" / "add Y option" / "modify Z" / "enhance W" / "support Z format" | Change |
| "X 唔 work" / "broken" / "fail" / "regression" / "wrong result" / "錯咗" | Bug-fix |
| "fix typo" / "rename variable" / "update comment" | Trivial |

### 1.3 AI Classification Protocol

When AI receives a task that's not unambiguous trivial:

1. **Classify** based on §1.2 heuristics
2. **Propose to user** explicitly:「我判斷呢個係 [Phase / Change / Bug-fix],建議走 X workflow,即係先準備 [plan.md / spec.md / report.md]。OK?」
3. **Wait for user confirm**(or override classification)
4. **Open corresponding doc**(per §1.4 R1 binding)before any code

### 1.4 Pre-Implementation Guard(R1 strengthened)

> **冇對應 doc 唔可以開始 code**。HARD constraint per type:

| Type | 必有 pre-doc | If missing | Trigger |
|---|---|---|---|
| Phase/Sprint | `plan.md` + `checklist.md` | STOP, ask user 開 phase kickoff | R1.phase |
| Change | `spec.md`(scope + acceptance approved by user)| STOP, propose draft spec, await user approve | R1.change |
| Bug-fix | `report.md`(symptom + repro + severity confirmed)| STOP, propose draft report, await user confirm | R1.bugfix |
| Trivial | None | Proceed directly to commit | — |

---

## 2. Phase / Sprint Workflow

### 2.1 Folder Convention
`docs/01-planning/W{NN}-{phase-name-kebab}/`

(Per `architecture.md §6.1` sprint plan;`W01`-`W12` Tier 1 scope)

### 2.2 Per-Phase Artifacts(3 docs)

```
docs/01-planning/W{NN}-{phase}/
├── plan.md         ← Phase scope contract(locked at kickoff;deviation → §7 changelog)
├── checklist.md    ← Atomic checkbox items derived from plan(daily tick)
└── progress.md     ← Daily Day-N entries + 結尾 retro
```

> **Note**:v1.0 嘅 `journal.md` 已 rename 為 `progress.md`(v2.0 unified naming)。`W01-foundation/` 已 migrate per migration commit。

Templates:[`_templates/phase/`](./_templates/phase/)

### 2.3 Lifecycle

```
                   ┌─────────────────────────────┐
                   │ Phase N-1 progress retro    │
                   │ section signed              │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────┐
              │ Phase N kickoff(0.5 day):            │
              │ 1. mkdir W{NN}-{phase}/              │
              │ 2. cp _templates/phase/* → folder/   │
              │ 3. Fill plan.md(scope from §6.1     │
              │    + carry-over from prev retro)     │
              │ 4. Derive checklist.md from plan     │
              │ 5. Init progress.md Day 0 entry      │
              │ 6. Commit:                           │
              │    chore(planning): kickoff W{NN}    │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │ Daily execution(per AI session):     │
              │ 1. Read CLAUDE.md(per usual)         │
              │ 2. Read W{NN}/plan.md               │
              │    + checklist.md                   │
              │    + progress.md(last 3 entries)    │
              │ 3. Identify next unchecked item     │
              │ 4. Confirm with user if ambiguous   │
              │ 5. Implement                        │
              │ 6. Commit + tick checklist          │
              │ 7. Update progress Day-N entry      │
              │ 8. If OQ resolved → sync            │
              │    decision-form.md                 │
              │ 9. If plan deviation → changelog    │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │ Phase N closeout:                    │
              │ 1. All checklist items 完成 OR       │
              │    explicit defer(reason in progress)│
              │ 2. Write retro section in progress  │
              │ 3. Generate ADR for any             │
              │    architecturally-adjacent dec     │
              │ 4. Commit:                          │
              │    docs(planning): close W{NN} retro│
              │ 5. Mark progress.md status=closed   │
              │ 6. Trigger Phase N+1 kickoff        │
              └──────────────────────────────────────┘
```

### 2.4 Existing Example
[`W01-foundation/`](./W01-foundation/)

---

## 3. Change Workflow

### 3.1 When to Use

| Use Change workflow if... | Don't use Change(use other)if... |
|---|---|
| Modifying behavior of existing feature | Adding totally new feature(use Phase work)|
| Scope < 3 days estimate | Multi-week effort(use Phase work)|
| Behavior was correct, now changing it | Behavior was incorrect(use Bug-fix)|
| Doesn't fit current phase F-deliverable | Already in phase plan(use Phase work)|

### 3.2 Folder Convention
`docs/03-implementation/changes/CH-{NNN}-{kebab-name}/`

### 3.3 ID Convention
`CH-001`, `CH-002`, ... 3-digit zero-pad sequential, **monotonic project-wide**(don't restart per phase)

### 3.4 Per-Change Artifacts(3 docs)

```
docs/03-implementation/changes/CH-{NNN}-{kebab}/
├── spec.md         ← What changes / why / scope / acceptance(spec contract;locked after approve)
├── checklist.md    ← Atomic implementation items
└── progress.md     ← During-execution log + completion summary
```

Templates:[`_templates/change/`](./_templates/change/)

### 3.5 Lifecycle

```
1. AI classifies user request → Change → propose spec.md draft
2. User approves spec scope + acceptance criteria
3. mkdir CH-{NNN}-{kebab}/
4. cp _templates/change/* → folder/
5. Fill spec.md(scope + acceptance + risks),status=approved
6. Derive checklist.md from spec §3 acceptance
7. Init progress.md Day 1 entry
8. Implement, daily update progress + tick checklist
9. Closeout:tick all acceptance criteria, write completion summary in progress
10. Commit closeout, status=done
```

### 3.6 Examples
(待 first change CH-001 落地)

---

## 4. Bug-Fix Workflow

### 4.1 When to Use

| Use Bug-Fix if... | Don't use(use other)if... |
|---|---|
| Behavior was correct(per spec / design) but now incorrect | Behavior was always incorrect / spec gap → Change(or escalate to spec edit) |
| Fix < 3 days estimate | Multi-week refactor → Phase work |
| Reproducible(or detectable via trace) | Vague "feels slow" without metrics → triage first |

### 4.2 Folder Convention
`docs/03-implementation/bugs/BUG-{NNN}-{kebab-name}/`

### 4.3 ID Convention
`BUG-001`, `BUG-002`, ... 3-digit zero-pad, monotonic project-wide

### 4.4 Per-Bug Artifacts

```
docs/03-implementation/bugs/BUG-{NNN}-{kebab}/
├── report.md           ← Symptom + repro + impact + severity(report contract;locked after triage)
├── checklist.md        ← Investigation + fix + regression test + verify
├── progress.md         ← Timeline log + closeout summary
└── postmortem.md       ← OPTIONAL — Sev1/Sev2 mandatory, Sev3+ encouraged if recurring
```

Templates:[`_templates/bugfix/`](./_templates/bugfix/)

### 4.5 Severity Scale

| Severity | Definition | Postmortem? | Example |
|---|---|---|---|
| **Sev1** | Production outage / data loss / security breach | ✅ Mandatory | API completely down;data leak |
| **Sev2** | Major feature broken / critical user impact | ✅ Mandatory | Search returns wrong results;auth bypass |
| **Sev3** | Minor feature degraded / specific user impact | 🟡 Encouraged if pattern recurring | Citation render misaligned;slow pagination |
| **Sev4** | Cosmetic / edge case / low-impact | ⏸️ Optional | Typo in error message;edge case format |

### 4.6 Lifecycle

```
1. AI classifies user report → Bug-fix → propose report.md draft
2. User confirms repro steps + impact + severity
3. mkdir BUG-{NNN}-{kebab}/
4. cp _templates/bugfix/* → folder/
5. Fill report.md, status=triaged
6. Derive checklist.md(investigation + fix + regression + verify)
7. Init progress.md Day 1 entry
8. Reproduce locally → status=investigating
9. Identify root cause → status=fixing
10. Implement fix + regression test → status=verifying
11. Verify in env → status=done
12. (if Sev1/Sev2 OR pattern-recurring)Write postmortem.md
13. Update RISK_REGISTER.md if pattern is new(per CC-4)
```

### 4.7 Examples
(待 first bug BUG-001 落地)

---

## 5. Binding Rules(R1-R5,extended for v2.0)

| ID | Rule | Trigger if violated |
|---|---|---|
| **R1** | **Pre-implementation doc must exist**(per type:plan/spec/report)| STOP, ask user 開對應 kickoff;reviewer reject merge |
| **R2** | Daily commit must reference `progress.md` Day-N entry(`docs(planning):` housekeeping commits 例外)| Reviewer 拒 merge,要求 progress update |
| **R3** | Plan / spec / report deviation 必須先 log 入對應文件 changelog 或 amendment section | 唔可以 silent drift |
| **R4** | OQ resolved → 同步更新 `decision-form.md` AND 對應 progress entry mention | 兩處都要 reflect |
| **R5** | Architectural-adjacent decision(per CLAUDE.md §5.1 H1)→ ADR + tag affected component(s)(per CC-2)| Block closeout |

呢 5 條 rule 喺 CLAUDE.md §10 補強,屬 process-level binding。

---

## 6. AI Session Start Protocol(extended v2.0)

Per Claude session start(after CLAUDE.md §0 + §10):

```
1. Read CLAUDE.md(if not yet)
2. Identify any active task(check incoming user request)
3. CLASSIFY task type:
   a. Active phase work → goto 4
   b. New change request → goto 5
   c. New bug report → goto 6
   d. Trivial → goto 7
4. (Phase) Read W{NN}/{plan, checklist, progress.md last 3 entries}
   → identify next un-checked checklist item → confirm → execute
5. (Change) Propose draft spec.md → confirm scope + acceptance with user
   → mkdir CH-NNN, fill spec, derive checklist → execute
6. (Bug-fix) Propose draft report.md(extract symptom + repro from user message)
   → confirm severity + repro with user
   → mkdir BUG-NNN, fill report, derive checklist → investigate
7. (Trivial) Implement directly, single commit
8. **NEVER skip step 3-6**(R1 binding)— STOP and ask if classification unclear
```

**Anti-pattern**:Skip classification 直接寫 code = R1 violation。

---

## 7. Human Dev Responsibilities

| Stage | Human action |
|---|---|
| Kickoff(any type)| Approve `plan.md` / `spec.md` / `report.md` 之前 AI 唔 start |
| Daily | Provide OQ resolutions when blockers surface;answer ambiguous classification |
| Mid-execution | Approve plan/spec/report changelog 重大 deviation |
| Closeout | Review retro / closeout summary, confirm ADR coverage, sign-off |

---

## 8. Anti-patterns(必避免)

| ❌ Anti-pattern | ✅ Correct |
|---|---|
| 一次過建立 W01–W12 所有 phase folder | Rolling:每 phase kickoff 先建 |
| Implementation 唔 update checklist + progress | 每 commit 後同步 tick |
| Plan / spec / report 中 scope 改晒但無 changelog | Deviation 必 log,explicit `## 7. Spec Changelog` 入面 |
| Skip retro / postmortem(Sev1/Sev2)/ 草草寫一句「OK」 | Retro / postmortem 至少 cover what worked / didn't / action items |
| OQ resolved 只 update decision-form 唔提 progress | R4 要兩處 reflect |
| Multi-day work 無 plan / spec / report 直接做 | R1 STOP,先 kickoff |
| Architecture change 唔 trigger ADR | R5 必 ADR |
| Change actually has bug element 但只 spec(無 report)| Re-classify or split into both Change + BugFix instances |
| Skip §1 classification → jump implementation | R1 violation,STOP and reclassify |

---

## 9. Examples

- **Phase**:[`W01-foundation/`](./W01-foundation/)— first phase already active
- **Change**:(待 first change CH-001 落地;will become reference example)
- **Bug-fix**:(待 first bug BUG-001 落地;will become reference example)

---

## 10. PROCESS.md Evolution Rules

呢份 PROCESS.md 自身屬 process foundation,改動規則:
- 加 / 改 binding rule(R1-R5):必須 user explicit approve
- 加 routing entry / clarification:可自行 update
- 加新 task type(beyond 3 current):重大,必須 user approve
- 改 phase / change / bugfix folder naming convention:重大,必須 user approve
- 改動 commit message 用:`docs(process): update PROCESS — <summary>`

---

**End of PROCESS.md v2.0**
**Source of truth for EKP workflow framework。**
