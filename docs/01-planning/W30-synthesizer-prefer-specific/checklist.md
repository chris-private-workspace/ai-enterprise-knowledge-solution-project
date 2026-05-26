---
phase: W30-synthesizer-prefer-specific
plan_ref: ./plan.md
status: closed_partial   # per W30 F3 closeout 2026-05-26 — Phase Gate PARTIAL + Rule 7 REVERTED per Karpathy §1.3 surgical
last_updated: 2026-05-26
---

# Phase W30 — Checklist

> Atomic checkbox(每 item ≤ 1-2 hour effort)。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify)

- [x] Create `docs/01-planning/W30-synthesizer-prefer-specific/` folder
- [x] **R6 Day 0 catch surfaced** — `backend/generation/prompt_builder.py:28` SYSTEM_PROMPT Rule 6 已 ship CH-005 R14 mitigation 2026-05-24(commit `8418b57`)→ path (i) Option A「synthesize from collective context」ALREADY shipped → W30 scope redirect to Option C only per user 2nd AskUserQuestion Recommended pick
- [x] Draft `plan.md` per W29 closed-phase template — 7-section structure + frontmatter + §2 F0-F3 deliverables + §3 G1-G5 + §4 R1-R6 + §5 D0-D2 + §6 W29 carry-overs + §7 Changelog
- [x] Draft `checklist.md` per W29 closed-phase template — atomic items derived from plan §2 deliverables
- [x] Draft `progress.md` Day 0 entry — kickoff action + R6 catch + Option A pre-existing detail
- [ ] Commit `docs(planning): kickoff W30-synthesizer-prefer-specific + R6 path (i) Option A Rule 6 already-shipped catch + scope redirect to Option C only` per CLAUDE.md §10 R1 binding
- [ ] session-start.md §10 timeline row update — W30 active status entry append + W31+ rolling JIT row update + W29 row 維持 closed_partial

## F1 — Implementation NEW Rule 7 + unit test (then REVERTED per F3 G5 verdict)

- [x] Edit `backend/generation/prompt_builder.py` line 28 — append NEW Rule 7 to SYSTEM_PROMPT(per plan §1.3 literal design)— **REVERTED 2026-05-26 per F3 closeout(Karpathy §1.3 surgical + G1 fully FAIL)**
- [x] NEW unit test `test_system_prompt_includes_rule_7_prefer_specific_over_overview` in `test_prompt_builder_dispatch.py` — assert Rule 7 phrases present;**REVERTED 2026-05-26 with Rule 7 revert**
- [x] Backend pytest baseline preserved — full pytest 1060 → **1061 post-Rule-7-add**(+1 NEW unit test)→ 1060 post-revert
- [x] ruff PASS on touched files;mypy `--strict` module-path config quirk(pre-existing per W26 baseline + `CO_W25_mypy_strict_debt` carryover)— Rule 7 是 pure string literal,no type implication
- [N/A] F1 standalone commit — combined with F3 closeout commit per W30 PARTIAL closeout pattern(Rule 7 add + revert + evidence atomic)

## F2 — 5-run reproducibility verify Q-W25-I07 (Rule 7 active)

- [x] Backend reload via `touch backend/generation/prompt_builder.py` mtime trigger + WatchFiles + /health=ok verified
- [x] curl POST /query Q-W25-I07 5 runs back-to-back — per-run JSON in `backend/w30-f2-multi-run-{1-5}.json`
- [x] Aggregate report `f2-5run-reproducibility-W30-D0-raw.txt` — 5-run table + W29 baseline comparison + G1-G5 verdict
- [N/A] F2 standalone commit — combined with F3 closeout commit per W30 PARTIAL closeout pattern

## F3 — Closeout — Phase Gate + cross-doc sync + commit + push

### A. Phase Gate G1-G5 evaluation

- [x] G1 PRIMARY 5-run walkthrough_cite_rate vs W29 20% baseline
  - G1 strict (≥ 2 distinct walkthrough cited in ≥ 1 run) — **0/5 FAIL** ❌
  - G1 relaxed (≥ 1 walkthrough cited per run for ≥ 3/5) — **1/5 = 20% FAIL** ❌
  - G1 marginal (>20% improvement vs W29 baseline) — **0pp改善 IDENTICAL = FAIL** ❌
- [x] G2 backend pytest baseline preserved — 1061 post-Rule-7-add(+1 NEW unit test)→ 1060 post-revert
- [x] G3 ruff PASS;mypy module-path config quirk pre-existing(per W26 baseline)— Rule 7 pure string literal no type impact
- [x] G4 NEW unit test PASS pre-revert(12/12)→ 11/11 post-revert
- [x] G5 measurement-experiment-fail-policy applied — G1 fully FAIL → **revert Rule 7 per Karpathy §1.3 surgical + plan G5 explicit fallback** + W31+ Option B「cite-confidence threshold relax」elevate

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [x] plan.md frontmatter `status: active → closed_partial` per G1 fully FAIL — done
- [x] checklist.md cross-cutting tick + N/A reason — this commit
- [x] progress.md retro 7-section — this commit
- [x] session-start.md §10 W30 row `🟡 active` → `✅ closed_partial 2026-05-26`
- [x] session-start.md §11 W30 CLOSED_PARTIAL block prepend
- [N/A] RISK_REGISTER R15 — preserved(W30 didn't close cite-bottleneck;W29 reframed R15 status preserved)
- [N/A] COMPONENT_CATALOG.md C05 status — Rule 7 REVERTED so no permanent change to document
- [N/A] ADR README — no NEW ADR / no amendment

### C. `.env` cleanup + W31+ priority queue evaluation

- [x] `.env` cleanup — W29 Setting tune `overfetch=8 + rrf_k=30` env override **PRESERVED**(W29 baseline,independent of W30 prompt change)
- [x] W31+ candidate prioritization update:G1 fully FAIL branch applied — **W31+ Option B「cite-confidence threshold relax」elevated HIGHEST priority** + path (ii) CRAG threshold trial H1 boundary downgrade(STOP+ask + ADR governance + Karpathy §1.2 一次只郁一個旋鈕)+ (k) wire reformulator into eval/orchestrator.py orthogonal axis preserved / NEW Rule 7 wording refinement W31+ candidate(more concrete wording targeting §X.M numbering pattern)+ (c) RAGAs orchestrator-aware judge tune 大幅降低 priority / NEW (e) `make_ragas_evaluator` structlog stage / NEW (f) Settings-default-tests / BUG-026 + BUG-027 cosmetic / W22 D8 setup.md §8.6 / W16 F1-F4 Track A IT cred parallel

### D. Commit + push

- [x] Commit F3 closeout — combined with F1+F2 evidence(Rule 7 add + revert + 5-run reproducibility outputs + closeout sync atomic)per W30 PARTIAL closeout pattern
- [ ] Push origin/main(per explicit user instruction)

---

## Cross-Cutting

- [x] All deliverables committed to git(F0 `0b36ecf` + F1+F2+F3 combined closeout commit pending)
- [N/A] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved this phase
- [N/A] All architectural-adjacent decisions documented as ADR — Rule 7 是 prompt iteration within existing framework(reverted so no permanent record needed)
- [x] `progress.md` retro section written — 7-section per closeout commit
- [x] `progress.md` frontmatter status flipped to `closed_partial`
- [x] Phase W31+ kickoff trigger noted in retro — Option B cite-confidence threshold relax elevated HIGHEST + Rule 7 wording refinement W31+ candidate

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
