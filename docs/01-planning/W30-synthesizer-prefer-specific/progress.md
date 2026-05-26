---
phase: W30-synthesizer-prefer-specific
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed_partial   # per W30 F3 closeout 2026-05-26 — Phase Gate PARTIAL + Rule 7 REVERTED per Karpathy §1.3 surgical
start_date: 2026-05-26
end_date: 2026-05-26
last_updated: 2026-05-26
---

# Phase W30 — Progress Journal

> Daily progress per CLAUDE.md §10 R2 binding;commit hash ↔ Day-N entry mapping mandatory(except `docs(planning):` housekeeping commits)。

---

## Day 0 — 2026-05-26 (Kickoff + R6 catch + Option C scope locked)

### Action

- W29-reformulator-diagnose closed_partial post-`8e8df12` push
- User F4 carry-over pick:**W31+ (i') synthesizer prompt tune elevated HIGHEST priority**
- User session continuation:「現在開始執行 1 ⭐ (i') Synthesizer system prompt tune — option A/B/C per memory mitigation paths」
- **R6 Day 0 pre-active-flip recursive grep verify** triggered before any code change(per CLAUDE.md §10 R6 + Karpathy §1.1 think-before-coding + W29 R6 lesson)

### R6 catch detail

讀完 `backend/generation/prompt_builder.py` line 20-28 `SYSTEM_PROMPT`:

```
20	SYSTEM_PROMPT = f"""You are Ricoh's internal Knowledge Assistant. Answer the user's question using ONLY the retrieved knowledge chunks below.
21	
22	Rules:
23	1. Cite every fact with [chunk-{{chunk_id}}] markers immediately after the sentence that uses the chunk...
24	2. If the retrieved chunks do not contain enough information, reply with exactly the phrase: "{REFUSAL_PHRASE}"...
25	3. Lead with a direct one-sentence answer to the user's question; then provide supporting details...
26	4. Match the user's language (English / 繁體中文 / 日本語)...
27	5. Never fabricate chunk_ids; only cite chunks shown below.
28	6. For overview / aggregate queries (e.g. "show me all X", "list all Y", "describe the integration scenarios"), synthesize what IS available from the chunks even if coverage is partial; explicitly note any gaps via "Based on available documentation:" framing rather than refusing entirely. Only emit the refusal phrase (Rule 2) when chunks are COMPLETELY off-topic — not when partial coverage exists. (CH-005 — R14 mitigation 2026-05-24)"""
```

**Rule 6 已 ship CH-005 R14 mitigation commit `8418b57` W25 D4(2026-05-24)** — literal **path (i) Option A「synthesize from collective context rather than refuse」instruction**。

連帶 verify W29 D0 evidence:
- W25 D4 (2026-05-24) Q-W25-I07:**refused: True** + 0 citations
- W29 D0 (2026-05-26) Q-W25-I07:**refused: False** + 5-scenario enumerate from intro + 1 citation
- Rule 6 IS effective for un-refuse behavior post-W25.5 + W26-W28 cumulative retrieval improvements

**Real W30 gap**:Rule 6 says「synthesize what IS available」 + 「Based on available documentation:」framing,**但 NO instruction to PREFER specific subsection chunks over intro chunk**。

W29 F3 Run 5 evidence:§8.4 chunk-0051 surfaced top-5 position 3 但 LLM 揀 cite chunk-0044 intro only — exact pattern Rule 6 doesn't address。

### Option 對照(per memory `project_synthesizer_overview_refuse_w25_d4.md` path (i) sub-options)

| Path (i) sub-option | Status | W30 scope |
|---|---|---|
| **A**: 「synthesize from collective context rather than refuse」 | ✅ **ALREADY shipped Rule 6 W25 D4** CH-005 `8418b57` | OUT(已 ship) |
| **B**: cite-confidence threshold relax | NOT in prompt | OUT(defer W31+ if Option C insufficient — mechanism vague) |
| **C**: 「prefer §X.Y specific chunks over §X overview chunks」directive | NOT in prompt | **IN — W30 主軸** |

### AskUserQuestion 2nd round (scope redirect per W29 R6 pattern)

User Recommended pick:**W30-synthesizer-prefer-specific — Option C 單獨 ship**(option 1)。

### Option C surgical design

NEW Rule 7 to add after Rule 6 in `prompt_builder.py:28`:

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

### Deliverables Day 0

- ✅ `docs/01-planning/W30-synthesizer-prefer-specific/` folder created
- ✅ `plan.md` v1.0 drafted per W29 closed-phase 7-section template
- ✅ `checklist.md` v1.0 drafted per W29 atomic items pattern
- ✅ `progress.md` Day 0 entry written(this entry)
- ⏳ Commit `docs(planning): kickoff W30-synthesizer-prefer-specific + R6 path (i) Option A Rule 6 already-shipped catch + scope redirect to Option C only` pending
- ⏳ session-start.md §10 W30 active append + W31+ rolling JIT row update + §11 W29 closed_block preserve pending

### Commits

- pending kickoff commit

### Decisions logged

- **D30.0.1**:W30 phase classification = **Phase** per W29-style multi-deliverable + user-test acceptance + 5-run reproducibility methodology
- **D30.0.2**:W30 scope = **Surgical Option C only** per user 2nd AskUserQuestion Recommended pick(Option B + (k) eval-wire deferred W31+ per Karpathy §1.2 一次只郁一個旋鈕)
- **D30.0.3**:W30 acceptance gate = **G1 PRIMARY 5-run walkthrough cite rate vs W29 baseline 20%**(strict/relaxed/marginal tiers per plan §3)
- **D30.0.4**:W30 G1 marginal-pass fallback = **keep Rule 7 + W31+ Option B elevate**;G1 fully-FAIL+REGRESS fallback = revert Rule 7 + W31+ Option B + path (ii) CRAG H1 elevate(STOP+ask + ADR governance)
- **D30.0.5 R6 SCOPE REDIRECT**:**path (i) Option A ALREADY shipped Rule 6 W25 D4** — W30 scope redirect from「path (i) all options」to「Option C single rule addition」per Karpathy §1.1 think-before-coding + R6 recursive verify(same pattern as W29 R6 catch)

---

## Day 0 cont — 2026-05-26 (F1 implementation + F2 verify + F3 PARTIAL closeout)

### F1 implementation

- NEW Rule 7 appended to `backend/generation/prompt_builder.py:28` SYSTEM_PROMPT(literal per plan §1.3):「When BOTH overview/intro chunks ... AND specific subsection chunks ... are available in the retrieved chunks for the SAME query, PREFER citing the specific subsection chunks over the overview/intro chunk ...」
- NEW unit test `test_system_prompt_includes_rule_7_prefer_specific_over_overview` in `backend/tests/test_prompt_builder_dispatch.py` — assert Rule 7 phrases present + Rule 6 still present(non-regression)
- Pytest:11/11 → 12/12 PASS;full pytest 1060 → **1061 + 25 skipped + 0 failed**;ruff clean;mypy module-path config quirk pre-existing(W26 baseline 18 errors + `CO_W25_mypy_strict_debt` carryover unchanged)

### F2 5-run reproducibility verify

Backend reload via `touch backend/generation/prompt_builder.py` + WatchFiles + /health=ok。5 curl POST /query Q-W25-I07 back-to-back:

| Run | Citations | Walkthrough cited | §8.x in top-5 | Cited IDs |
|----:|----------:|------------------:|--------------:|-----------|
| 1   | **2**     | **1 (§8.4)** ✅  | 1             | 0044/**0051** |
| 2   | 1         | 0                 | 0             | 0044 |
| 3   | 1         | 0                 | 0             | 0044 |
| 4   | 1         | 0                 | 0             | 0044 |
| 5   | **2**     | 0(§8.6 chunk-0055 cited NOT §8.1-§8.5)| 0 | 0044/**0055** |

### F2 aggregate vs W29 baseline

| Metric | W29 baseline | W30 Rule 7 | Delta |
|---|---|---|---|
| Walkthrough cite rate(distinct A-E)| 1/5 = 20% | 1/5 = 20% | **0pp(identical)** |
| 2-citation rate | 1/5 = 20% | 2/5 = 40% | +20pp(behavior change but not targeting walkthrough)|
| §8.x in top-5 surface | 2/5 = 40% | 1/5 = 20% | **-20pp regression**(likely reformulator stochasticity)|
| Avg citations per response | 1.2 | 1.4 | +17% |

### Critical observations

1. **Walkthrough cite rate UNCHANGED** — Rule 7 didn't move primary KPI
2. **Run 5 NEW behavior**:cited chunk-0044 intro + chunk-0055 §8.6 Coverage summary — §8.6 是 specific subsection but **NOT** §8.1-§8.5 individual walkthrough — Rule 7 wording「specific subsection」太 abstract,LLM 解讀過寬
3. **§8.x top-5 surface dropped 2/5 → 1/5** — likely reformulator stochasticity(每 run 3 variants → different fan-out → different RRF surface),NOT Rule 7-induced

### F3 Phase Gate G1-G5 verdict

| Gate | Result | Status |
|---|---|---|
| G1 strict (≥ 2 distinct walkthrough cited) | 0/5 | **FAIL** ❌ |
| G1 relaxed (≥ 1 walkthrough cited per run for ≥ 3/5) | 1/5 | **FAIL** ❌ |
| G1 marginal (>20% improvement vs W29 baseline) | 0pp改善 | **FAIL** ❌ |
| G2 pytest 1060 baseline preserved | 1061 add → 1060 post-revert | **PASS** ✅ |
| G3 ruff + mypy strict clean | ruff PASS;mypy pre-existing | **PASS** ✅ |
| G4 NEW unit test PASS | 12/12 pre-revert | **PASS** ✅ |
| G5 measurement-experiment-fail-policy | G1 fully FAIL → revert Rule 7 + W31+ Option B elevate | **revert direction applied** |

### F3 closeout decision

Per **Karpathy §1.3 surgical**(change without measurable benefit → revert,don't accumulate prompt complexity)+ **plan §3 G5 explicit fallback**:

**Decision**:**Option α — Revert Rule 7 + PARTIAL closeout + W31+ Option B elevate**

- Rule 7 reverted from `prompt_builder.py:28` 
- NEW unit test removed from `test_prompt_builder_dispatch.py`(11/11 PASS post-revert,1060 pytest baseline restored)
- Backend reload via `touch prompt_builder.py` mtime

### Decisions logged Day 0 cont

- **D30.F1.1**:Rule 7 added per plan §1.3 literal design
- **D30.F1.2**:NEW unit test asserts Rule 7 phrases + Rule 6 non-regression
- **D30.F2.1**:5-run reproducibility test methodology applied(same as W29 F3)
- **D30.F2.2**:G1 fully FAIL verdict — walkthrough cite rate 0pp改善 + §8.x top-5 -20pp regression(stochastic)
- **D30.F3.1**:**Rule 7 REVERTED** per Karpathy §1.3 + plan G5 explicit fallback
- **D30.F3.2**:**W31+ Option B「cite-confidence threshold relax」elevated HIGHEST priority** + path (ii) CRAG threshold H1 boundary downgrade(STOP+ask + ADR governance + Karpathy §1.2 一次只郁一個旋鈕)
- **D30.F3.3**:Rule 7 wording「specific subsection」empirical 顯示 too abstract — W31+ candidate refined wording targeting §X.M numbering pattern explicitly

### Commits Day 0 cont

- ⏳ F3 closeout commit pending(combined F1+F2 evidence + Rule 7 add + revert + plan/checklist/progress/session-start sync atomic per W30 PARTIAL closeout pattern)

---

## Retrospective

### 1. Phase status

**PARTIAL closeout** per Q4 measurement-experiment-fail-policy:
- G1 strict (≥ 2 §8.x walkthrough cited) — 0/5 FAIL
- G1 relaxed (≥ 1 walkthrough cited per run for ≥ 3/5) — 1/5 = 20% FAIL
- G1 marginal (>20% improvement vs W29 20% baseline) — 0pp改善 FAIL
- G2 pytest baseline 1060 preserved (add 1061 → revert 1060) — PASS
- G3 ruff PASS / mypy pre-existing carryover — PASS
- G4 NEW unit test 12/12 pre-revert / 11/11 post-revert — PASS
- G5 fail-policy applied — Rule 7 REVERTED + W31+ Option B elevate — direction applied

### 2. What worked

- **R6 Day 0 catch saved redundant work** (3rd consecutive phase W29→W30):path (i) Option A「synthesize from collective context」 ALREADY shipped Rule 6 W25 D4 CH-005 `8418b57` → scope redirect to Option C only。 Without R6 verify,W30 plan would have tried「strengthen synthesizer prompt with Option A directive」which is redundant work
- **F1 implementation surgical**:single-rule addition to SYSTEM_PROMPT,1 NEW unit test,zero code logic change beyond literal string — fast iteration cycle
- **F2 5-run reproducibility methodology**(per W29 F3 pattern):captures synthesizer non-determinism + provides robust verdict against single-curl false negative/positive
- **F3 Karpathy §1.3 surgical discipline**:G1 fully FAIL → revert without preserving "marginal behavior change" sentiment — clean baseline restoration;prompt complexity not accumulated for unproven benefit

### 3. What didn't work

- **Rule 7 wording「specific subsection」太 abstract** — Run 5 evidence LLM cited chunk-0055 §8.6 Coverage summary 作為「specific subsection」例子,而非 narrowly §8.1-§8.5 individual walkthrough。 W31+ candidate refined wording could target「§X.M」numbering pattern explicitly
- **2-citation behavior change(+20pp)NOT targeted** — Rule 7 prompted LLM to cite more chunks but didn't reliably specify §8.1-§8.5 walkthrough preference;may benefit other query shapes not tested but為 W30 G1 KPI noise
- **§8.x top-5 surface -20pp regression** — likely reformulator stochasticity not Rule 7-induced(prompt-level change shouldn't affect retrieval-level surface);但 5-run sample size limits statistical confidence

### 4. Surprises

- **Run 5 chunk-0055 §8.6 Coverage summary cited** — UNEXPECTED that LLM would choose §8.6 over §8.1-§8.5 individual walkthroughs。 §8.6 IS technically more specific than §8 intro but lacks walkthrough detail。 Suggests LLM cite-decision driven by chunk_title vocabulary patterns (「Coverage summary」looks comprehensive) rather than semantic content depth
- **2-citation rate doubled (20% → 40%)** — Rule 7 had broader「cite more」effect even though specific walkthrough preference didn't materialize。 Side-effect or main-effect? Open question for W31+ wording refinement
- **§8.x top-5 surface dropped** despite same reformulator + RRF settings as W29 baseline — confirms reformulator stochasticity dominates retrieval-side variance across 5-run sample size

### 5. Carry-overs to W31+(rolling JIT NOT pre-created)

- **(B') HIGHEST NEW** — path (i) Option B「cite-confidence threshold relax」elevate(W30 PARTIAL closeout G1 fully FAIL → user-pre-chosen fallback per plan G5)。 Mechanism options:
  - (B'.a) Settings parameter for chunk relevance score threshold(low-score chunks not cited)
  - (B'.b) Prompt instruction「cite ALL chunks that overlap with answer paragraph keywords」regardless of confidence
  - (B'.c) Post-hoc citation expansion(synthesizer cites primary chunk → enrich with neighbor walkthrough chunks if score ≥ threshold)
- **(Rule 7 v2 wording refinement)** — W31+ candidate target「§X.M numbering pattern」explicitly OR replace「specific subsection」 with「individual walkthrough section」more concrete terminology
- **(ii) Path (ii) CRAG threshold trial** — H1 boundary,downgrade to W31+ second priority(STOP+ask + ADR governance)
- **(k) wire reformulator+fused_retrieve into `backend/eval/orchestrator.py`** — H4 systemic gap,orthogonal axis,W31+ candidate
- (c) RAGAs orchestrator-aware judge tune 大幅降低 priority
- (d) F3 query expansion subsumed
- NEW (e) `make_ragas_evaluator` structlog stage / NEW (f) Settings-default-tests / BUG-026 + BUG-027 / W22 D8 setup.md / W16 Track A IT cred parallel

### 6. ADR triggers

- **No NEW ADR ship** — Rule 7 是 prompt iteration within existing ADR-0034 + ADR-0007 framework(reverted so no permanent record needed)
- **ADR-0034 NOT amended** — reformulator + framework unchanged;Settings unchanged

### 7. Process improvements / preventive controls

- **PC-W30-1**:R6 Day 0 catch saved redundant work (3rd time consecutive W29→W30)— formalize 「Day 0 grep verify SYSTEM_PROMPT current state BEFORE proposing prompt rule addition」 pattern in PROCESS.md(W31+ candidate)
- **PC-W30-2**:5-run reproducibility methodology robust for synthesizer non-determinism + small-sample retrieval stochasticity disambiguation — W29 F3 methodology validated by W30 F2 repeat
- **PC-W30-3**:Karpathy §1.3 surgical discipline strict enforcement — "marginal behavior change" without target-metric improvement → revert(don't accumulate complexity for unproven side-effects);plan G5 explicit fallback enables clean revert decision without ambiguity

---
