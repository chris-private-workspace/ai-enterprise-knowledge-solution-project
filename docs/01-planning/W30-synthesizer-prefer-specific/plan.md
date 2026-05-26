---
phase: W30-synthesizer-prefer-specific
name: "Synthesizer SYSTEM_PROMPT NEW Rule 7 — prefer §X.Y specific section chunks over §X overview/intro chunks when both surface for same query (per W29 Run 5 cite-bottleneck evidence + path (i) Option C only — Option A already shipped W25 D4 CH-005 Rule 6)"
sprint_week: W30
start_date: 2026-05-26
end_date: 2026-05-26   # same-day collapse expected per W22-W29 AI compression pattern
status: closed_partial   # per W30 F3 closeout 2026-05-26 — Phase Gate PARTIAL per plan §3 G5 measurement-experiment-fail-policy(G1 strict 0/5 + G1 relaxed 0/5 + G1 marginal 0pp 改善 vs W29 baseline = G1 fully FAIL;walkthrough cite rate UNCHANGED 20%;2-citation rate +20pp moderate behavior change but not targeting §8.1-§8.5 walkthrough — Run 5 cited §8.6 Coverage summary 而非 §8.1-§8.5 walkthrough;§8.x top-5 surface 2/5→1/5 -20pp regression but likely reformulator stochasticity)。**Rule 7 REVERTED per Karpathy §1.3 surgical** + plan G5 G1 fully FAIL branch — change without measurable G1 benefit → revert(don't accumulate prompt complexity);W31+ Option B「cite-confidence threshold relax」elevate為 next surgical attempt;Rule 7 wording 「specific subsection」 empirical 顯示 too abstract — LLM interpreted liberally(§8.6 Coverage summary 都 qualify)not narrowly §8.1-§8.5 walkthrough
spec_refs:
  - architecture.md §3.2     # synthesizer + citation contract
  - architecture.md §3.5     # citation invariant
prior_phase: W29-reformulator-diagnose
trigger_memo: |
  W29 F3 Path A Setting tune `QUERY_EXPANSION_PER_VARIANT_OVERFETCH=8 + QUERY_EXPANSION_RRF_K=30` produced
  retrieval-side +40pp improvement (2/5 §8.x in top-5) but synthesizer cite-rate only 20% (1/5 walkthrough
  cited)。Run 5 critical evidence:§8.4 chunk-0051 surfaced top-5 position 3 但 LLM 只 cite chunk-0044 intro
  — synthesizer cite-decision layer 係 W29 PARTIAL closeout 後嘅 remaining bottleneck。

  **R6 Day 0 recursive grep verify catch**:`backend/generation/prompt_builder.py` line 28 SYSTEM_PROMPT
  Rule 6 已 ship CH-005 R14 mitigation 2026-05-24 (commit `8418b57`)— literal:「For overview / aggregate
  queries, synthesize what IS available from the chunks even if coverage is partial; explicitly note any
  gaps via 'Based on available documentation:' framing rather than refusing entirely」。

  即 **path (i) Option A「synthesize from collective context」ALREADY shipped**。 真正未 ship 嘅 path (i)
  sub-option = **Option C「prefer §X.Y specific chunks over §X overview chunks」directive** — NOT in current
  prompt。 Option B「cite-confidence threshold relax」mechanism vague + may overlap with Option C,defer。
related_adrs: []    # no NEW ADR expected — prompt rule addition within ADR-0034 framework
---

# Phase W30 — Synthesizer SYSTEM_PROMPT Rule 7「Prefer Specific Over Overview」

> **Plan version**:1.0(initial)
> **Owner**:Chris(技術 Lead)+ AI(implementation)
> **Approved by**:Chris(chat 2026-05-26 — 「執行 (i') Synthesizer system prompt tune」+ AskUserQuestion 2nd R6 redirect Recommended pick:「W30-synthesizer-prefer-specific — Option C 單獨 ship」)
> **Trigger memo**:W29 F3 Run 5 synthesizer cite-bottleneck evidence + R6 Day 0 catch path (i) Option A already-shipped → scope redirect to Option C only

## 1. Scope

### 1.1 W29 carry-over context

W29 F3 5-run reproducibility test against Q-W25-I07 with Path A Setting tune(`overfetch=8 + rrf_k=30`):

| Run | Citations | Walkthrough cited | §8.x in top-5 | Cited IDs |
|----:|----------:|------------------:|--------------:|-----------|
| 1   | 1         | 0                 | 0             | 0044 |
| 2   | 2         | **1 (§8.4)** ✅  | 1             | 0044/**0051** |
| 3   | 1         | 0                 | 0             | 0044 |
| 4   | 1         | 0                 | 0             | 0044 |
| 5   | 1         | **0**(§8.4 surfaced 但未 cited)| 1 | 0044 |

**Run 5 critical evidence**:§8.4 chunk-0051 surfaced top-5 position 3 但 LLM 只 cite chunk-0044 intro。 即 **synthesizer cite-decision layer 係 remaining bottleneck**(retrieval-side already +40pp improvement)。

### 1.2 R6 Day 0 catch (same as W29 pattern — saved redundant work)

`backend/generation/prompt_builder.py` line 28 SYSTEM_PROMPT Rule 6(commit `8418b57` CH-005 2026-05-24):

```
6. For overview / aggregate queries (e.g. "show me all X", "list all Y", "describe the integration
   scenarios"), synthesize what IS available from the chunks even if coverage is partial; explicitly note
   any gaps via "Based on available documentation:" framing rather than refusing entirely. Only emit the
   refusal phrase (Rule 2) when chunks are COMPLETELY off-topic — not when partial coverage exists.
   (CH-005 — R14 mitigation 2026-05-24)
```

**Option 對照**:

| Path (i) sub-option | Status | Evidence |
|---|---|---|
| **A**: 「synthesize from collective context rather than refuse」 | ✅ **ALREADY shipped Rule 6 W25 D4** via CH-005 `8418b57` | W29 D0 evidence:refused=False;Rule 6 effective for un-refuse behavior |
| **B**: cite-confidence threshold relax | NOT in prompt | Mechanism vague — could be Settings parameter / prompt instruction;defer W31+ |
| **C**: 「prefer §X.Y specific chunks over §X overview chunks」directive | NOT in prompt | Run 5 Q-W25-I07 directly bottleneck — §8.4 surfaced 但 LLM 揀 intro;W30 主軸 |

### 1.3 Option C surgical design

**NEW Rule 7** to add after Rule 6 in `prompt_builder.py:28`:

```
7. When BOTH overview/intro chunks (e.g. "§8. Integration scenarios" intro listing A-E) AND specific
   subsection chunks (e.g. "§8.1 Scenario A — Customer service request submission") are available in
   the retrieved chunks for the SAME query, PREFER citing the specific subsection chunks over the
   overview/intro chunk when those subsections directly answer parts of the user's question. Use the
   overview chunk only as supporting context (e.g. "Based on available documentation:" framing), not
   as the primary citation source. The overview chunk's enumerated summary alone is INSUFFICIENT —
   each enumerated item should be supported by its corresponding specific subsection chunk where
   available. (W30 — synthesizer cite-bottleneck mitigation 2026-05-26)
```

**Karpathy §1.2 simplicity**:single-rule addition,no other prompt change,no Settings change,no code module change beyond `prompt_builder.py:28` literal SYSTEM_PROMPT 文字 expansion。

**Citation invariant preserved**:Rule 7 唔改 chunk_id format / dispatch chain / refusal phrase / language match — pure LLM cite-decision guidance。

### 1.4 Out of scope(deferred)

- ❌ **path (i) Option B cite-confidence threshold relax**(W30 Surgical scope — defer W31+ if Option C insufficient)
- ❌ **path (ii) CRAG threshold trial**(H1 boundary,higher risk — preserve W31+ candidate)
- ❌ **(k) wire reformulator into eval/orchestrator.py**(orthogonal axis — separate W31+ phase)
- ❌ W29 Setting tune `.env` env override — preserved unchanged(`overfetch=8 + rrf_k=30` W29 baseline)
- ❌ RAGAs eval delta re-run — primary gate is Q-W25-I07 user-test cite rate(per W29 G1 pattern)
- ❌ Synthesizer.py code change — Rule 7 是 prompt literal text only,no code logic change
- ❌ ADR ship — Rule 7 是 prompt iteration within ADR-0034 + ADR-0007 (CRAG L2) framework,non-architectural

### 1.5 Sprint week origin

**W19+ rolling JIT**(per CLAUDE.md §10 R1 + session-start.md §10 W30+ row);呢個 phase **唔喺 architecture.md §6.1 原 W1-W12 sprint 表內** — 屬 W29 closeout 觸發嘅 follow-up surgical fix(類似 W25.5 / W27 / W28 / W29 rolling 性質)。

---

## 2. Deliverables

### F0 — Kickoff(plan + checklist + progress + R6 verify)— **DONE Day 0**

- **Spec ref**:CLAUDE.md §10 R1 + R6
- **H1 trigger**:否(governance only)
- **Acceptance criteria**:
  1. ✅ `docs/01-planning/W30-synthesizer-prefer-specific/{plan,checklist,progress}.md` committed
  2. ✅ R6 Day 0 recursive grep verify — `backend/generation/prompt_builder.py` line 20-28 SYSTEM_PROMPT verified;Rule 6 ALREADY shipped Option A → scope redirect to Option C only
  3. session-start.md §10 timeline row W30 active status entry append
- **Effort estimate**:~1h
- **Owner**:AI

### F1 — Implementation:NEW Rule 7 + unit test

- **Spec ref**:`backend/generation/prompt_builder.py` line 20-28 SYSTEM_PROMPT
- **H1 trigger**:否(prompt rule addition within existing framework)
- **OQ deps**:無
- **Acceptance criteria**:
  1. NEW Rule 7 added to SYSTEM_PROMPT(per §1.3 design literal)
  2. NEW unit test in `backend/tests/test_prompt_builder.py`(若 file exists)OR `backend/tests/test_prompt_builder_dispatch.py`(W27 F1 ship file)— assert SYSTEM_PROMPT 內 Rule 7 literal text 包含「PREFER citing the specific subsection chunks over the overview/intro chunk」
  3. Backend pytest 1060 baseline preserved(regression 0)
  4. ruff + mypy strict on touched code clean(W26 baseline 18 pre-existing per `CO_W25_mypy_strict_debt` 維持)
- **Effort estimate**:~30-45 min
- **Owner**:AI

### F2 — 5-run reproducibility verify Q-W25-I07

- **Spec ref**:W29 F3 5-run baseline measurement methodology
- **H1 trigger**:否
- **OQ deps**:F1 done + backend reload via WatchFiles touch
- **Acceptance criteria**:
  1. Backend reload via `touch backend/storage/settings.py` mtime trigger(per W29 F3 lesson — WatchFiles 唔 watch .py 直接但會 trigger via Settings module re-import)— OR explicit restart if Rule 7 prompt 不 reload
  2. curl POST /query Q-W25-I07「Show me all the Integration scenarios.」5 runs reproducibility
  3. Measure per-run:citations count / walkthrough_cited / §8.x in top-5
  4. Compare to W29 F3 baseline:walkthrough_cited 1/5 = 20% / §8.x in top-5 2/5 = 40%
  5. Save `f2-5run-reproducibility-W30-D0-raw.txt` + per-run JSON outputs in `backend/w30-f2-multi-run-{1-5}.json`
- **Effort estimate**:~15-20 min
- **Owner**:AI

### F3 — Closeout — Phase Gate + cross-doc sync + commit + push

- **Spec ref**:CLAUDE.md §12 self-verification + §10 R3+R5
- **H1 trigger**:否
- **OQ deps**:F1 + F2 done
- **Acceptance criteria**:
  **A. Phase Gate G1-G5 evaluation**:
  1. G1 PRIMARY:5-run aggregate walkthrough_cited rate VS W29 baseline 20% — expected improvement signal:
     - G1 strict pass = ≥ 2 distinct walkthrough cited in ≥ 1 run (5-run cumulative)
     - G1 relaxed pass = ≥ 1 walkthrough cited per run for ≥ 3/5 runs (60% cite rate)
     - G1 marginal = >20% cite rate improvement vs W29 baseline
  2. G2:backend pytest 1060 baseline preserved
  3. G3:ruff + mypy strict on touched code clean
  4. G4:NEW unit test PASS
  5. G5:measurement-experiment-fail-policy applied if G1 marginal — keep Rule 7 in prompt(per Karpathy §1.3 — surgical-yet-non-destructive change preserved if measurable improvement);若 G1 fully FAIL or REGRESS → revert Rule 7 + PARTIAL closeout + W31+ Option B elevate

  **B. Cross-doc sync per CLAUDE.md §10 R3+R5**:
  6. plan.md frontmatter `status: active → closed`(若 PASS / relaxed PASS / marginal improvement)OR `closed_partial`(若 FAIL)
  7. checklist.md cross-cutting tick + N/A reason
  8. progress.md retro 7-section
  9. session-start.md §10 W30 row `🟡 active` → `✅ closed` / `closed_partial`
  10. session-start.md §11 W30 CLOSED block prepend
  11. RISK_REGISTER — no flip expected(R15 preserved;W30 mitigates partial bottleneck)
  12. COMPONENT_CATALOG.md C05 status note 1-line append(若 Rule 7 ships)
  13. ADR README — no NEW ADR ship + no amendment(prompt iteration within existing framework)

  **C. Commit + push**:
  14. F3 closeout commit per W29 closeout pattern HEREDOC + Co-Authored-By
  15. Explicit user instruction needed before push(per safety constraint;user 已 say「執行」於 W30 implies authorization through closeout)

- **Effort estimate**:~30-45 min
- **Owner**:AI

---

## 3. Phase Gates (G1-G5)

| Gate | 描述 | Pass criteria | Fail action |
|---|---|---|---|
| **G1 (PRIMARY)** | 5-run Q-W25-I07 walkthrough cite rate vs W29 baseline 20% | strict: ≥ 2 distinct walkthrough cited in ≥ 1 run / relaxed: ≥ 1 walkthrough cited per run for ≥ 3/5 / marginal: >20% improvement | PARTIAL closeout + Option B elevate W31+ |
| **G2** | Backend pytest regression 0 | `pytest tests/` = 1060 + 25 skipped + 0 failed | STOP + fix |
| **G3** | ruff + mypy strict on touched code clean | `ruff check backend/generation/prompt_builder.py` + `mypy --strict backend/generation/prompt_builder.py` = 0 NEW errors | STOP + fix |
| **G4** | NEW unit test PASS for Rule 7 presence | `pytest backend/tests/test_prompt_builder*.py` includes Rule 7 assertion | STOP + fix |
| **G5** | Measurement-experiment-fail-policy applied if G1 marginal/FAIL | G1 marginal → keep Rule 7 + PARTIAL closeout / G1 FAIL+REGRESS → revert Rule 7 + W31+ Option B | proceed per Q4 |

---

## 4. Rules (R1-R6 per CLAUDE.md §10 + EKP discipline)

- **R1** Plan committed before any code change(this commit landing = R1 satisfied)
- **R2** Daily commit ↔ progress.md Day-N entry mapping
- **R3** Plan deviation → §7 changelog mandatory
- **R4** OQ resolved → decision-form.md + progress Day-N mention(W30 no OQ deps)
- **R5** Architectural-adjacent → ADR(Rule 7 is prompt rule addition within existing ADR-0034 + ADR-0007 framework — no NEW ADR / no amendment expected)
- **R6** Pre-active-flip 5-step grep verify — already applied Day 0(path (i) Option A catch)

---

## 5. Dependencies

- **D0** Backend running on port 8000(per W29 same-session continuity)
- **D1** WatchFiles auto-reload OR manual restart for Rule 7 prompt to take effect
- **D2** Q-W25-I07 KB `sample-document-with-image-1` accessible(per W29 confirmed)

---

## 6. Prior Phase Carry-overs

### From W29 closeout retro

- **(ii) CRAG threshold trial** — H1 boundary,downgrade to W31+ second priority
- **(k) wire reformulator into eval/orchestrator.py** — H4 systemic gap,orthogonal axis W31+ candidate
- **(c) RAGAs orchestrator-aware judge tune** 大幅降低 priority(W28 closed G1+G2+G4+G5)
- **(d) F3 query expansion** subsumed by W29 F1 audit
- **NEW (e) `make_ragas_evaluator` structlog stage emit** — operability orthogonal,W31+ candidate
- **NEW (f) Settings-default-tests** — quick win orthogonal,W31+ candidate
- **BUG-026 + BUG-027** cosmetic / **W22 D8 setup.md §8.6** / **W16 F1-F4 Track A IT cred** parallel — preserved untouched

### From W29 R6 lesson

- PC-W29-1 R6 Day 0 grep verify before strengthening — **APPLIED again W30 Day 0** catching path (i) Option A already-shipped(Rule 6 CH-005)→ scope redirect to Option C only
- PC-W29-2 backend Langfuse API audit > standalone test — preserved
- PC-W29-3 eval pipeline coverage gap detection — defer W31+ (k)

---

## 7. Changelog

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-05-26 | AI + Chris | Initial plan committed Day 0;**R6 Day 0 catch** — path (i) Option A「synthesize from collective context」 ALREADY shipped CH-005 Rule 6 W25 D4 → scope redirect to Option C「prefer specific over overview」only per user 2nd AskUserQuestion Recommended pick + Karpathy §1.2 一次只郁一個旋鈕;Option B + (k) eval-wire deferred W31+ |

---

**Plan binding**:per CLAUDE.md §10 R1 — no W30 code change until this plan + checklist + progress kickoff Day 0 entry committed per W22-W29 same-day kickoff pattern。
