# EKP Phase Planning Process

> **目的**:本文件係 EKP project 嘅 **Phase-Based Rolling Planning Framework** 嘅 source of truth。
> 任何 multi-day implementation work 都必須跟呢套流程。CLAUDE.md §10 routing 入面,任何 phase 級 task 都 reference 返呢度。

**Version**: 1.0 | **Effective**: 2026-04-30 | **Owner**: Chris(技術 Lead)

---

## 1. 為何存在(Why)

| 痛點 | 解法 |
|---|---|
| AI assistant 跳入 implementation 而無 sprint-level plan,工作零碎 | Per-phase plan + checklist + journal,無 plan 唔開工 |
| 一次過寫 W1–W12 plan 太僵化,實際撞 reality 即 obsolete | **Rolling JIT**:每 phase 喺 kickoff 先寫 plan,前 phase 結束 retro 觸發下 phase kickoff |
| 多個 session / 多 dev 之間 context 流失 | Phase folder 自包含 audit trail(plan + checklist progress + journal) |
| Decision drift / scope creep 無 trace | Plan 有 changelog,deviation 必須 log |

---

## 2. Phase Folder Naming Convention

```
docs/01-planning/W{NN}-{phase-name-kebab-case}/
```

- `W{NN}`:sprint week number,2 位 zero-pad,對應 [`architecture.md` §6.1](../architecture.md) sprint plan
- `{phase-name-kebab-case}`:phase 嘅 descriptive 短名

| Sprint week | Folder name(suggested) |
|---|---|
| W1 Foundation Setup | `W01-foundation` |
| W2 Multi-format Ingestion + Chunking | `W02-multi-format-ingestion` |
| W3 Chat + Hybrid Retrieval + Citations | `W03-chat-retrieval-citation` |
| W4 CRAG + Eval + Reranker Shootout | `W04-crag-eval-shootout` |
| W5 Optimization + L3 Stretch | `W05-optimization` |
| W6 Final Eval + Demo + Beta Prep | `W06-final-eval-demo` |
| W7 Beta Hardening Sprint 1 | `W07-beta-hardening-1` |
| W8 Beta Hardening Sprint 2 | `W08-beta-hardening-2-deploy` |
| W9 Beta Internal Testing | `W09-beta-testing` |
| W10 Beta Refinement | `W10-beta-refinement` |
| W11 Staged Rollout 25→50% | `W11-rollout-25-50` |
| W12 Staged Rollout 100% | `W12-rollout-100` |

**注意**:**唔可以一次過建立所有 W01–W12 folder**。每 folder 喺對應 phase kickoff 先建立(rolling)。

---

## 3. Per-Phase Artifacts(3 docs)

```
docs/01-planning/W{NN}-{phase}/
├── plan.md         ← Phase kickoff 寫,locked,改要 changelog
├── checklist.md    ← 由 plan 衍生,atomic checkbox,daily tick
└── journal.md      ← Daily progress + 結尾 retro section
```

### 3.1 `plan.md`

**用途**:Phase 嘅 contract — 我哋承諾交咩、靠咩 OQ、達咩標準。
**Lifecycle**:Kickoff 寫好 → status=`active` → phase 中 locked(改要 changelog)→ closeout status=`closed`。

**必有 sections**:
1. Frontmatter(phase id,start_date,end_date,status,spec_refs)
2. Scope statement(1 段)
3. Deliverables(有 ID、spec ref、OQ deps、acceptance criteria、effort estimate)
4. Success Criteria(phase gate,table 形式)
5. Risks(phase-specific risk register)
6. Day-by-day breakdown(rough)
7. Dependencies on prior phase(carry-over from W{NN-1} retro)
8. Plan changelog(初始空,deviation 入呢度)

Template:[`_templates/plan.md.tpl`](./_templates/plan.md.tpl)

### 3.2 `checklist.md`

**用途**:Plan deliverables 嘅 atomic 分解,每個 item ≤ 1–2 hour effort,AI 同 dev daily tick。
**Lifecycle**:Kickoff derive → daily 更新 → closeout 全 tick(或 explicit defer)。

**必有 sections**:
1. Frontmatter(phase id,plan_ref,status)
2. Per-deliverable atomic checkbox list(每 item 都 trace 返 plan deliverable ID)
3. Cross-cutting items(commit、OQ sync、retro 等)

Template:[`_templates/checklist.md.tpl`](./_templates/checklist.md.tpl)

### 3.3 `journal.md`

**用途**:Daily 進度 audit trail + phase 結尾 retro。
**Lifecycle**:Kickoff Day 0 init → daily Day-N entry → closeout 寫 retro section。

**必有 sections**:
1. Frontmatter(phase id,plan_ref,checklist_ref,status)
2. Day-N entries(date,done,decisions / OQ resolved,blockers,commits)
3. Retro section(phase 末填:what worked、what didn't、surprises、carry-overs、ADR triggers)

Template:[`_templates/journal.md.tpl`](./_templates/journal.md.tpl)

---

## 4. Lifecycle(kickoff → daily → closeout)

```
                   ┌─────────────────────────────┐
                   │ Phase N-1 journal retro     │
                   │ section signed              │
                   └──────────────┬──────────────┘
                                  │
                                  ▼
              ┌──────────────────────────────────────┐
              │ Phase N kickoff(0.5 day):            │
              │ 1. mkdir W{NN}-{phase}/              │
              │ 2. cp _templates/* → folder/         │
              │ 3. Fill plan.md(scope from §6.1     │
              │    + carry-over from prev retro)     │
              │ 4. Derive checklist.md from plan     │
              │ 5. Init journal.md Day 0 entry       │
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
              │    + journal.md(last 3 Day entries) │
              │ 3. Identify next unchecked item     │
              │ 4. Confirm with user if ambiguous   │
              │ 5. Implement                        │
              │ 6. Commit + tick checklist          │
              │ 7. Update journal Day-N entry       │
              │ 8. If OQ resolved → sync            │
              │    decision-form.md                 │
              │ 9. If plan deviation → changelog    │
              └──────────────┬───────────────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │ Phase N closeout:                    │
              │ 1. All checklist items 完成 OR       │
              │    explicit defer(reason in journal)│
              │ 2. Write retro section in journal   │
              │ 3. Generate ADR for any             │
              │    architecturally-adjacent dec     │
              │ 4. Commit:                          │
              │    docs(planning): close W{NN} retro│
              │ 5. Mark journal.md status=closed    │
              │ 6. Trigger Phase N+1 kickoff        │
              └──────────────────────────────────────┘
```

---

## 5. Binding Rules(R1–R5)

| ID | Rule | Trigger if violated |
|---|---|---|
| **R1** | 任何 multi-day implementation 之前必須有 phase `plan.md` committed | STOP,ask user 開 kickoff |
| **R2** | Daily commit 必須 reference `journal.md` Day-N entry(`docs(planning):` housekeeping commit 例外) | Reviewer 拒 merge,要求 journal update |
| **R3** | Plan deviation(scope change / new deliverable / 取消 deliverable)必須先 log 入 `plan.md` changelog | 唔可以 silent drift,explicit log |
| **R4** | OQ resolved → 同步更新 `decision-form.md` AND `journal.md` Day-N entry mention | 兩處都要 reflect |
| **R5** | Phase closeout 之前任何 architectural-adjacent decision(per CLAUDE.md §5.1 H1)必須寫 ADR | Block phase closeout |

呢 5 條 rule 喺 CLAUDE.md §10 Phase Planning Workflow 補強,屬 process-level binding。

---

## 6. AI Session Start Protocol

每個 Claude session 開始(在 CLAUDE.md §0 Quick Identity Check 之後):

```
1. 讀 CLAUDE.md(若未讀)
2. Identify active phase:
   - 望 docs/01-planning/W*/journal.md frontmatter status=active 嘅 phase
   - 應該只有 1 個(否則 STOP and ask)
3. 讀 active phase:
   a. plan.md(全份,知 scope + deliverables + criteria)
   b. checklist.md(全份,知 progress)
   c. journal.md 最近 3 個 Day-N entries(知 context + blockers)
4. Identify next un-checked checklist item
5. 唔清楚 / item 嘅 acceptance criteria 模糊 → ask user(per §13 When in Doubt)
```

**Anti-pattern**:Skip step 3 直接寫 code = violate R1。

---

## 7. Human Dev Responsibilities

| Phase stage | Human action |
|---|---|
| Kickoff | Approve `plan.md` scope + deliverables + acceptance criteria 之前 AI 唔 start |
| Daily | Provide OQ resolutions when blockers surface |
| Mid-phase | Approve plan changelog 重大 deviation |
| Closeout | Review retro section,confirm ADR coverage,sign-off |

---

## 8. Anti-patterns(必避免)

| ❌ Anti-pattern | ✅ Correct |
|---|---|
| 一次過建立 W01–W12 所有 folder | Rolling:每 phase kickoff 先建 |
| 寫 implementation 唔 update checklist | 每 commit 後同步 tick |
| Plan 中 deliverable 改晒但無 changelog | Deviation 必須 log,explicit `## 7. Plan Changelog` 入面 |
| Skip retro / 草草寫一句「OK」 | Retro 至少 cover what worked / didn't / carry-overs |
| OQ resolved 只 update decision-form 唔提 journal | R4 要兩處 reflect |
| Multi-day work 無 plan 直接做 | R1 STOP,先 kickoff |
| `docs/architecture.md` 改動唔 trigger ADR | R5 phase 內 architectural change 必 ADR |

---

## 9. Examples

**Concrete example**:[`W01-foundation/`](./W01-foundation/) — EKP 第一個 phase,2026-04-30 啟動,Day 1 已執行(8 deliverables / 7 commits),W1 末 retro。

---

## 10. PROCESS.md 嘅 evolve

呢份 PROCESS.md 自身屬 process foundation,改動規則:
- 加 / 改 binding rule(R1–R5):必須 user explicit approve
- 加 routing entry / clarification:可自行 update
- 改 phase folder naming convention:重大,必須 user approve
- 改動 commit message 用:`docs(planning): update PROCESS — <summary>`

---

**End of PROCESS.md**
**Source of truth for EKP phase planning。**
