---
phase: W30-synthesizer-prefer-specific
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
start_date: 2026-05-26
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
