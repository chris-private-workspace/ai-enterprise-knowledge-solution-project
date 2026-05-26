---
phase: W30-synthesizer-prefer-specific
plan_ref: ./plan.md
status: active
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

## F1 — Implementation NEW Rule 7 + unit test

- [ ] Edit `backend/generation/prompt_builder.py` line 28 — append NEW Rule 7 to SYSTEM_PROMPT(per plan §1.3 literal design)
- [ ] NEW unit test:`backend/tests/test_prompt_builder_dispatch.py`(W27 F1 ship file)OR NEW `backend/tests/test_prompt_builder_rule7.py` — assert SYSTEM_PROMPT contains「PREFER citing the specific subsection chunks over the overview/intro chunk」literal
- [ ] Backend pytest 1060 baseline preserved — `pytest tests/` regression check
- [ ] ruff + mypy strict on `backend/generation/prompt_builder.py` clean(no NEW errors;W26 baseline 18 pre-existing 維持)
- [ ] Commit F1 `feat(prompt): W30 F1 SYSTEM_PROMPT Rule 7 — prefer §X.Y specific over §X overview chunks (Option C synthesizer cite-bottleneck mitigation)`

## F2 — 5-run reproducibility verify Q-W25-I07

- [ ] Backend reload — touch `backend/storage/settings.py` mtime trigger WatchFiles + verify reload via /health(`SYSTEM_PROMPT` literal will be re-read via Python module re-import path)— if reload doesn't pick up prompt change → explicit restart
- [ ] curl POST /query Q-W25-I07「Show me all the Integration scenarios.」5 runs reproducibility
  - Per run save `backend/w30-f2-multi-run-{1-5}.json`
  - Per run measure:citations count / walkthrough_cited / §8.x in top-5
- [ ] Save aggregate report `f2-5run-reproducibility-W30-D0-raw.txt` — 5-run table + W29 baseline 20% comparison + verdict
- [ ] Commit F2 `docs(eval): W30 F2 5-run reproducibility verify Q-W25-I07 — walkthrough cite rate {N/5} vs W29 baseline 1/5`

## F3 — Closeout — Phase Gate + cross-doc sync + commit + push

### A. Phase Gate G1-G5 evaluation

- [ ] G1 PRIMARY 5-run walkthrough_cite_rate vs W29 20% baseline
  - G1 strict (≥ 2 distinct walkthrough cited in ≥ 1 run) — PASS / FAIL
  - G1 relaxed (≥ 1 walkthrough cited per run for ≥ 3/5) — PASS / FAIL
  - G1 marginal (>20% improvement vs W29 baseline) — PASS / FAIL
- [ ] G2 backend pytest 1060 baseline preserved
- [ ] G3 ruff + mypy strict on touched code clean
- [ ] G4 NEW unit test PASS
- [ ] G5 measurement-experiment-fail-policy:G1 marginal → keep Rule 7 + PARTIAL closeout(per Karpathy §1.3 — non-destructive surgical change preserved if measurable improvement);G1 fully FAIL+REGRESS → revert Rule 7 + W31+ Option B elevate

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [ ] plan.md frontmatter `status: active → closed`(若 PASS / relaxed PASS / marginal improvement)OR `closed_partial`(若 fully FAIL)
- [ ] checklist.md cross-cutting 全 tick + N/A items 標明 reason
- [ ] progress.md retro 7-section + Phase Gate G1-G5 result + What worked / What didn't / Surprises / Carry-overs to W31+ / ADR triggers
- [ ] session-start.md §10 timeline row update — W30 row `🟡 active` → `✅ closed` / `closed_partial`
- [ ] session-start.md §11 W30 CLOSED block prepend(per W26-W29 precedent)
- [N/A] RISK_REGISTER R15 — preserved(W30 mitigates partial bottleneck only,not full closure;W29 reframed R15 status preserved)
- [ ] COMPONENT_CATALOG.md C05 status note 1-line append(若 Rule 7 ships permanent)
- [N/A] ADR README — no NEW ADR / no amendment(prompt iteration within ADR-0034 + ADR-0007 framework)

### C. `.env` cleanup + W31+ priority queue evaluation

- [ ] `.env` cleanup — W29 Setting tune `overfetch=8 + rrf_k=30` env override **PRESERVED**(W29 baseline,independent of W30 prompt change)
- [ ] W31+ candidate prioritization update:
  - 若 W30 G1 PASS → Option B + (ii) CRAG decay,(k) eval-wire H4 + NEW (h) RAGAs full re-eval candidate
  - 若 W30 G1 marginal → keep Rule 7 + W31+ Option B「cite-confidence threshold relax」elevate
  - 若 W30 G1 fully FAIL → revert Rule 7 + W31+ Option B elevate + path (ii) CRAG threshold H1 boundary elevate(STOP+ask + ADR governance)

### D. Commit + push

- [ ] Commit F3 closeout `docs(planning): W30 closeout {PASS|PARTIAL} — Rule 7 prefer specific over overview / G1 {N/5} walkthrough cite rate vs W29 1/5 / Option C synthesizer cite-bottleneck mitigation`
- [ ] Push origin/main(per explicit user instruction)

---

## Cross-Cutting

- [ ] All deliverables committed to git
- [N/A] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved this phase
- [N/A] All architectural-adjacent decisions documented as ADR — Rule 7 is prompt iteration within existing framework
- [ ] `progress.md` retro section written
- [ ] `progress.md` frontmatter status flipped to `closed` / `closed_partial`
- [ ] Phase W31+ kickoff trigger noted in retro

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
