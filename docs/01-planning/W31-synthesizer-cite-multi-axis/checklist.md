---
phase: W31-synthesizer-cite-multi-axis
plan_ref: ./plan.md
status: closed_partial   # per F4 closeout 2026-05-26 — Phase Gate FAIL + full revert per Karpathy §1.3 + W30 Rule 7 precedent
last_updated: 2026-05-26
---

# Phase W31 — Checklist

> Atomic checkbox(每 item ≤ 1-2 hour effort)。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify + session-start sync)

- [x] F0.1 Create `docs/01-planning/W31-synthesizer-cite-multi-axis/` folder
- [x] F0.2 R6 Day 0 recursive grep verify — `prompt_builder.py:28` SYSTEM_PROMPT current state confirmed only Rule 1-6 present(W30 Rule 7 REVERTED per `e192464`)+ `Settings.py` L198-243 parent-doc + dispatch knobs current state confirmed + `synthesizer.py` synthesize+synthesize_stream call sites confirmed no existing post-hoc citation expansion logic + `citation_image_neighbors.py` W25 F5 D1 pattern confirmed as parallel reference for B'.c → **no shipped-pattern conflict for B'.b / B'.c / Rule 7 v2**(W31 multi-axis subset all 3 axes 新 work,not redundant)
- [x] F0.3 Draft `plan.md` 7-section per W30 closed-phase template
- [x] F0.4 Draft `checklist.md` atomic items derived from plan §2 deliverables(this file)
- [x] F0.5 Draft `progress.md` Day 0 entry — kickoff action + R6 catch report + (B'.b + B'.c + Rule 7 v2) multi-axis subset user pick rationale
- [x] F0.6 Commit kickoff `3a838b5` — `docs(planning): kickoff W31-synthesizer-cite-multi-axis + R6 Day 0 no-shipped-pattern confirm + (B'.b + B'.c + Rule 7 v2) multi-axis subset pick`
- [ ] F0.7 session-start.md §10 W31 row append `🟡 active 2026-05-26` + W32+ rolling JIT row defer + W30 row 維持 closed_partial

## F1 — Implementation(D1 estimate)

### F1.1 Prompt layer edit(`backend/generation/prompt_builder.py:28` SYSTEM_PROMPT)

- [x] F1.1.a NEW Rule 7 v2 `prompt_builder.py:28-30` —「§X.M numbering pattern」+ reference examples(§8.1/§8.2/§8.3, Scenario A walkthrough, Step 3.2)+ intro chunk insufficiency framing
- [x] F1.1.b NEW Rule 8 `prompt_builder.py:30-31` —「cite ALL of them」+「each fact backed by every chunk」+ two-chunks-same-scenario reference example
- [x] F1.1.c Rule 6 CH-005 preserved unchanged(non-regression test `test_system_prompt_rule_6_ch005_preserved_non_regression` PASS)

### F1.2 Backend layer NEW module(`backend/generation/citation_expansion.py`)

- [x] F1.2.a `expand_citations(answer_text, citation_ids, chunks, *, settings) → (expanded_text, expanded_citation_ids)` pure function signature
- [x] F1.2.b Neighbor inspection logic — same doc constraint + ±window chunk_index + score ≥ threshold + title regex `§\\d+\\.\\d+` filter(keyword overlap deferred Karpathy §1.2 simplicity — title pattern sufficient first cut)
- [x] F1.2.c Auto-insert `[chunk-{neighbor_id}]` markers + max_aux cap + dedupe against existing citation_ids + sort-by-distance prefer-closer
- [x] F1.2.d `backend/tests/test_citation_expansion.py` **15 unit tests** PASS — happy path / disabled flag / empty inputs / §X.M filter / score threshold / window boundary / same doc / dedupe / max_aux cap / closer-neighbor-preferred / cited-not-in-chunks defensive / multiple cited / self-at-distance-0 exclude / extract_citation_ids ordering

### F1.3 Settings NEW knobs(`backend/storage/settings.py:245-272`)

- [x] F1.3.a `enable_citation_post_hoc_expansion: bool = True` — W31 measurement default ON per Karpathy §1.4 goal-driven「make it pass」requires axis enabled
- [x] F1.3.b `citation_expansion_window: int = 3` — parallel to W25 F5 D1 `citation_neighbour_window=3`
- [x] F1.3.c `citation_expansion_score_threshold: float = 0.5` — Cohere v4.0-pro reranked range [0.5, 1.0] per W26 F1 D1 empirical
- [x] F1.3.d `citation_expansion_max_aux: int = 2` — parallel to W25 F5 D1 `citation_neighbour_max_aux_images=2`

### F1.4 Wire citation expansion into synthesizer pipeline

- [x] F1.4.a `synthesizer.py:135-152` — `synthesize` method wires `expand_citations` after `extract_citation_ids` + `refused` detection,only when not refused;passes `get_settings()` for runtime Settings read
- [x] F1.4.b `synthesizer.py:233-241` — `synthesize_stream` applies expansion in `result` event payload after stream complete(text-delta partial frames yielded before expansion;final `result` carries expanded answer + citation_ids)
- [x] F1.4.c Backward compat verified — `enable_citation_post_hoc_expansion=False` short-circuit inside `expand_citations` first 3 lines returns inputs unchanged(test `test_disabled_flag_returns_inputs_unchanged` PASS)

### F1.5 Unit tests + non-regression coverage

- [x] F1.5.a `test_prompt_builder_dispatch.py` +3 NEW tests — Rule 7 v2 + Rule 8 + Rule 6 non-regression PASS
- [x] F1.5.b `test_citation_expansion.py` 15 NEW tests PASS(see F1.2.d)
- [x] F1.5.c `test_synthesizer.py` +2 NEW tests — citation expansion wire enabled when not refused + skipped when refused PASS
- [x] F1.5.d backend pytest **1080 passed + 25 skipped + 0 failed**(W30 baseline 1060 → **+20 NEW W31** = exact)+ no existing test regression
- [x] F1.5.e ruff PASS(2 errors auto-fixed via `--fix`:unused pytest import in test file + import organization);mypy strict module-path quirk pre-existing per CO_W25_mypy_strict_debt(13 errors in other modules,`citation_expansion.py` 自身 W31 NEW module clean per --follow-imports=silent isolated check)

### F1 commit + progress.md Day 1

- [x] F1.6 Commit `16b9b3d` — `feat(generation): W31 F1 multi-axis prompt + post-hoc citation expansion(B'.b + B'.c + Rule 7 v2) + 20 NEW unit tests` per CLAUDE.md R2 daily commit binding
- [x] F1.7 progress.md Day 1 entry — implementation summary + test verdict(1080 pass / +20 net)+ ruff PASS + mypy citation_expansion clean + commit hash `16b9b3d` backfilled at this commit(per W30 R2 housekeeping pattern)

## F2 — 5-run reproducibility verify Q-W25-I07 + Q-W25-I01 control(D2 estimate)

- [x] F2.1 Backend reload via `touch backend/generation/prompt_builder.py` + WatchFiles trigger + /health=ok verify
- [x] F2.2 curl POST /query Q-W25-I07「show me all the Integration scenarios」5 runs back-to-back — **3 iterations cumulative**:v1(broken regex no-op,prompt-only effect)`w31-f2-v1-i07-multi-run-{1-5}.json` + v2(regex fix,threshold no-op)`w31-f2-v2-i07-multi-run-{1-5}.json` + v3(regex+threshold both fix)`w31-f2-v3-i07-multi-run-{1-5}.json` — 15 LIVE runs total
- [x] F2.3 curl POST /query Q-W25-I01「what is the high level architecture」5 runs back-to-back(control)— `w31-f2-v3-i01-multi-run-{1-5}.json` 5 LIVE runs(at v3 only,after threshold fix)
- [x] F2.4 Aggregate report inline progress.md F2 retro section — Q-I07 v1+v2+v3 walkthrough cite rate / Q-I07 citations count / Q-I01 G2 verdict ✅ no regression / G1-G6 verdict draft
- [x] F2.5 progress.md Day 2 F2 entry — v1+v2+v3 3-iteration table + W30+W29 baseline comparison + G1 fully FAIL verdict + 3 重 R6 catches catalogued

## F3 — Manual user-test 3-query cohort(D2 estimate;same-day as F2)

- [N/A] F3.1 Q-W25-I07 manual user-test — **subsumed by F2 v1+v2+v3 cumulative 15 LIVE runs**(stochasticity dominance + 3 重 R6 catches surfaced sufficient evidence for F4 decision without manual user-test extra)
- [N/A] F3.2 Q-W25-I01 control manual — subsumed by F2 v3 5-run control(refusals 0/5 + avg_cit 2.2 healthy → G2 ✅ no regression confirmed)
- [N/A] F3.3 NEW Q-W31-I08 query selection — N/A per F4 full revert decision(no production preserve so additional query coverage not needed)
- [N/A] F3.4 Visual citation render check — N/A per F4 full revert(no production cite-decision change)
- [N/A] F3.5 progress.md Day 2 F3 entry — F3 N/A reason logged in F2 retro

## F4 — Phase Gate G1-G6 evaluation + decision policy

### A. Phase Gate G1-G6 evaluation

- [x] G1 PRIMARY 5-run walkthrough_cite_rate vs W29+W30 20% baseline — **fully FAIL** ❌
  - G1 strict (≥ 2 distinct walkthrough cited in ≥ 1 run): **0/15 = 0%** ❌ across v1+v2+v3
  - G1 relaxed (≥ 1 walkthrough cited per run for ≥ 3/5): **4/15 = 26.7%** ⚠️(2 + 0 + 1)
  - G1 marginal vs W29+W30 baseline 20%: **+0pp net** ❌(v1 +20pp / v2 -20pp / v3 0pp average)
- [x] G2 control Q-W25-I01 no regression — ✅ **PASS**(refusals 0/5,avg_cit 2.2,avg_latency 11.4s)
- [x] G3 backend pytest baseline preserved 1080 PASS @ F1.5;**post-revert verified 1060** baseline(F4+F5 closeout pytest)
- [x] G4 ruff PASS on touched files;mypy strict citation_expansion.py clean(pre-revert);pre-existing module-path quirk preserved per CO_W25_mypy_strict_debt
- [x] G5 NEW unit tests PASS pre-revert(47/47:15 citation_expansion + 3 prompt_builder_dispatch + 2 synthesizer + 2 corpus-pattern v2 amend)→ post-revert 25/25 baseline restored
- [x] G6 measurement-experiment-fail-policy applied per Q4 — G1 fully FAIL → **full revert per Karpathy §1.3 + W30 Rule 7 precedent**(user AskUserQuestion 4-pick Option α 2026-05-26)

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [x] plan.md frontmatter `status: active → closed_partial` per G1 fully FAIL — done
- [x] checklist.md cross-cutting tick + N/A reason — this commit
- [x] progress.md retro 7-section + F2 retro 3-iteration evidence — this commit
- [x] session-start.md §10 W31 row `🟡 active` → `✅ closed_partial 2026-05-26`
- [x] session-start.md §11 W31 CLOSED_PARTIAL block prepend
- [N/A] RISK_REGISTER NEW R16 — N/A(W31 full revert means no production state introduced + Settings + module fully unwound;over-citation noise risk theoretical only)
- [N/A] COMPONENT_CATALOG C05 status — Rule 7 v2 + Rule 8 + citation_expansion module ALL REVERTED so no permanent change to document
- [N/A] ADR README — no NEW ADR / no amendment(F1 Rule 7 v2 + Rule 8 prompt iteration + F1.2 citation_expansion non-architectural per plan §1 scope decl;reverted so no permanent record)

### C. `.env` cleanup + W32+ priority queue evaluation

- [x] `.env` cleanup — W29 Setting tune `overfetch=8 + rrf_k=30` env override **PRESERVED**(W30+ baseline,independent of W31 prompt + module changes which are reverted)
- [x] W32+ candidate prioritization update per F4 fully FAIL branch:**(h') NEW HIGHEST** engine-fetch B'.c path 3(~1-2 days,mirror W25 F5 D1 pattern)elevated to top + (g') NEW 20-run sample methodology + (i') NEW reformulator deterministic temp=0 + (ii) CRAG threshold trial preserved + (k) wire reformulator into eval/orchestrator.py preserved + (c)(e)(f) BUG-026 + BUG-027 cosmetic + W22 D8 setup.md §8.6 + W16 F1-F4 Track A IT cred parallel track

### D. Commit + push

- [ ] F4+F5 closeout commit — combined with F2 + F3 (N/A) evidence(per W30 closeout pattern;7 file revert + plan/checklist/progress update + session-start.md sync atomic)
- [ ] Push origin/main(per explicit user instruction)

---

## Cross-Cutting

- [x] All deliverables committed to git(F0.6 kickoff `3a838b5` + F0.7 sync `7178133` + F1.6 implementation `16b9b3d` + F1.7 housekeeping `e26e5b3` + F4+F5 closeout pending this commit)
- [N/A] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved this phase
- [N/A] All architectural-adjacent decisions documented as ADR — F1.1 Rule 7 v2 + Rule 8 prompt iteration within framework + F1.2 citation_expansion module parallel pattern(non-architectural per plan §1 scope decl;all 3 axes REVERTED so no permanent record needed)
- [x] `progress.md` retro section written — 7-section per closeout commit(F2 retro 3-iteration + Phase Retro What worked / What didn't / Surprises / Carry-overs / ADR triggers / Phase Gate verdict / W32+ priority queue)
- [x] `progress.md` frontmatter status flipped to `closed_partial`
- [x] Phase W32+ kickoff trigger noted in retro — **(h') HIGHEST NEW** engine-fetch B'.c path 3 elevated + sequential ship strategy per W31 multi-axis lesson(避免 multi-axis trap until single-axis baseline established)

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
