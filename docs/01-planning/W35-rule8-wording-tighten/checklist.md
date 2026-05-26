---
phase: W35-rule8-wording-tighten
plan_ref: ./plan.md
status: active   # F0 kickoff 2026-05-26
last_updated: 2026-05-26
---

# Phase W35 — Checklist

> Atomic checkbox(每 item ≤ 1-2 hour effort)。Rule 8 wording tighten + LIVE RAGAs re-verify + latency re-verify。Single-line prompt edit + test assertions sync + measurement-driven gate。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify + session-start sync)

- [x] F0.1 Create `docs/01-planning/W35-rule8-wording-tighten/` folder
- [x] F0.2 R6 Day 0 recursive grep verify — **catch (1) `prompt_builder.py:30` Rule 8 verbatim 5 phrases**(`cite ALL of them` / `partial information` / `each fact ... backed by every chunk` / `two chunks describe the same scenario` / `both warrant a citation marker`);**catch (2) `test_prompt_builder_dispatch.py:207-221` 5 assertions lock**;**catch (3) W33 commit `16b9b3d` verbatim restoration source — W35 是 first divergence,test docstring 「Restored verbatim」 wording 需 update**
- [x] F0.3 Draft `plan.md` 7-section per W34 closed-phase template
- [x] F0.4 Draft `checklist.md` atomic items derived from plan §2 deliverables(this file)
- [x] F0.5 Draft `progress.md` Day 0 entry — kickoff action + R6 catch report + 3 wording options surface + W34 F1+F2 baseline reference + decision tree pre-implementation surface
- [x] F0.6 Commit kickoff `b2f4ca3` — `docs(planning): kickoff W35-rule8-wording-tighten + R6 Day 0 catch Rule 8 verbatim wording + test assertions lock + 3 wording options surface`
- [x] F0.7 session-start.md §10 W35 row append `🟡 active 2026-05-26`(commit `b2f4ca3`)+ W34 row 4 commits backfilled `aa1c24e`+`448cb3b`+`0087092`+`6734161` + W36+ rolling JIT row preserved(commit `8c08557`)

## F1 — Rule 8 wording tighten + LIVE RAGAs eval(~2-3h)

### F1.0 Surgical edit(`backend/generation/prompt_builder.py:30`)

- [x] F1.0.a Option B locked initially per user pick 2026-05-26
- [x] F1.0.b Edit Rule 8 line wording Option B applied
- [x] F1.0.c Attribution comment updated per Option B
- [x] F1.0.d ruff `All checks passed!` ✅

### F1.1 Test assertions sync(`backend/tests/test_prompt_builder_dispatch.py:207-221`)

- [x] F1.1.a Function renamed `_cite_breadth` → `_cite_sufficient` + 5 Option B assertions
- [x] F1.1.b Test docstring updated W33→W35 trajectory
- [x] F1.1.c Rule 7 v2 + Rule 6 non-regression assertions unchanged
- [x] F1.1.d Function rename decision = `_cite_sufficient`(umbrella concept across A/B/C options)

### F1.2 pytest baseline preserve

- [x] F1.2.a Scoped pytest test_prompt_builder_dispatch.py = **14 passed** ✅
- [x] F1.2.b Full pytest suite = **1084 passed + 25 skipped + 0 failed in 384.38s** ✅(W34 closeout exact preserve)

### F1.3 Backend explicit kill+restart(per PC-W32-1 + PC-W33-1 + PC-W34-1)

- [x] F1.3.a Postgres `SELECT 1` = 1 ready_for_query ✅(PC-W33-1)
- [x] F1.3.b Langfuse `/api/public/health` 200 OK ✅(PC-W34-1,需 30s timeout cover post-restart warmup);Docker UI 一度卡住 user 重啟 Docker
- [x] F1.3.c 冇 existing backend on :8000 → 直接 start fresh `python -m api.server` → 5/5 /health components OK

### F1.4 Invoke /eval/run + capture EvalReport(Option B initial)

- [x] F1.4.a `backend/w35-f1-ragas-runner.py` created(adapt W34 runner + W34 F1 baseline 0.9836 / 0.7669 / 0.8936 / 1331ms reference + W34 -2pp envelope 0.9637)
- [x] F1.4.b Raw JSON `w35-f1-option-b-raw.json`(renamed F1.7 audit trail);Option C result `w35-f1-option-c-raw.json`
- [x] F1.4.c **runtime Option B 478s + Option C 475s** vs W34 642s = **-25% / -26%** ⭐

### F1.5 Aggregate vs W34 F1 baseline

- [x] F1.5.a 4-metric mean comparison table(Option B + Option C / W34 F1 / delta pp)— inline progress.md Day 1
- [x] F1.5.b failed_queries detail Option B 11 / Option C 10(I07 came back vs Option B)
- [x] F1.5.c Per-query metric breakdown documented
- [x] F1.5.d Decision tree branch verdict per plan §3 G1 — **G1 preserve Option B / G1 IMPROVED Option C ⭐**

### F1.6 Decision tree application

- [x] F1.6.a Outcome branch Option B = preserve;Option C = IMPROVED(beyond preserve)
- [x] F1.6.b F1.7 contingency triggered per Option B correctness -5pp side effect(user lock path (β))
- [x] F1.6.c W36+ priority queue update — DEMOTE Option A more aggressive;PRESERVE PC-W34-1/2 housekeeping(documented progress.md Day 1)

### F1.7 Contingency Option B → Option C re-tighten(per user lock path (β) 2026-05-26)

- [x] F1.7.a NOT applicable(G1 preserved,no "break")
- [x] F1.7.b Option C re-tighten — plan §7 changelog amendment R3 + prompt_builder.py:30 B→C + test_prompt_builder_dispatch.py 5 assertions B→C + pytest 14 PASS + ruff PASS + raw JSON rename + backend kill PID 32632 + restart → 5/5 OK + F1.4 re-run Option C 475s → G1 IMPROVED 0.9876 + p95 -17% + correctness -1.90pp from W26 baseline

### F1.8 Commit + progress.md Day 1

- [ ] F1.8.a Commit `feat(generation): W35 F1 Rule 8 wording tighten Option C re-tighten + LIVE RAGAs eval evidence — G1 IMPROVED 0.9876 + p95 -17% + runtime -26%`(combined Option B initial ship + F1.7 Option C contingency lifecycle)
- [x] F1.8.b progress.md Day 1 entry — F1.0 + F1.1 + F1.2 + F1.3 + F1.4 Option B + F1.5+F1.6 decision verdict Option B + F1.7 contingency Option C + Option C final verdict + W36+ priority queue update + carry-overs

## F2 — Latency re-verify(A.2,~1h)

### F2.1 5-run latency measurement

- [ ] F2.1.a `backend/w35-f2-runner.py`(adapt `w34-f2-runner.py`)Q-W25-I07 5 runs + Q-W25-I01 5 runs back-to-back
- [ ] F2.1.b Backend stderr log capture structlog JSON events `uvicorn-restart-w35.log.err`
- [ ] F2.1.c Aggregate 10-run mean — I07 + I01 avg total + synth_overall + synth_llm_completion + synth_expand_citations + synth_prompt_build

### F2.2 Aggregate citation count + latency DROP determination

- [ ] F2.2.a Per-query avg citation count table(W35 / W34 F2 / delta abs + delta %)
- [ ] F2.2.b Per-stage latency table(W35 / W34 F2 / delta ms + delta %)
- [ ] F2.2.c G2 measurable citation count DROP — target I07 ≤ 5 AND I01 ≤ 8(W34 baseline 6 / 10.2)
- [ ] F2.2.d G3 measurable LLM emit latency DROP — target synth_llm_completion ≤ 14098ms(-10% W34 baseline 15665ms)

### F2.3 Commit + progress.md Day 2

- [ ] F2.3.a Commit `feat(observability): W35 F2 latency re-verify + citation count DROP measurement vs W34 F2 baseline`
- [ ] F2.3.b progress.md Day 2 entry — 10-run latency table + citation count delta + tighten effect verdict

## F3 — Decision tree analysis + closeout

### A. Combined decision tree(F1 outcome × F2 outcome)

- [ ] A.1 RAGAs branch determined — G1 preserve / flag / break per plan §3
- [ ] A.2 Citation count branch determined — G2 drop / inconclusive / null
- [ ] A.3 LLM emit latency branch determined — G3 drop / inconclusive / null
- [ ] A.4 Intersect → W36+ priority queue update per plan §F3 A.4 matrix

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [ ] plan.md frontmatter `status: active → closed`(measurement-driven PASS OR closed_partial verdict)
- [ ] checklist.md cross-cutting tick + N/A reason(this file)
- [ ] progress.md retro 7-section(What Worked + What Didn't / Surprises + Carry-overs + ADR Triggers + Phase Gate Result + W36+ Priority Queue Locked + Actual vs Planned Effort)
- [ ] session-start.md §10 W35 row `🟡 active` → `✅ closed` + §11 W35 CLOSED block prepend
- [ ] 🚧 RISK_REGISTER NEW R candidate — DEFERRED W36+ default(G1 preserve outcome expected;若 F1.6 break/flag 則 promote NEW R)
- [ ] ADR README — no NEW ADR(F1.0 Rule 8 wording tighten = non-architectural prompt content per H1)

### C. `.env` cleanup + W36+ priority queue evaluation

- [ ] `.env` cleanup — W29 env override preserved unchanged
- [ ] W36+ candidate prioritization update per F3 decision tree intersect — PC-W34-1 + PC-W34-2 + (j') + PC-W33-1 + lower priority preserved 候選 + long-term carry-over(documented retro §W36+ Priority Queue Locked)

### D. Commit + push

- [ ] F3 closeout commit — `feat(generation): W35 F2 latency re-verify + W35 closeout {PASS|PARTIAL} — decision tree intersect verdict`
- [ ] Push origin/main(per W33-W34 user-instruction precedent)

---

## Cross-Cutting

- [ ] All deliverables committed to git(F0.6 kickoff + F1.8 F1 + F2.3 F2 + F3 closeout)
- [ ] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved expected
- [ ] All architectural-adjacent decisions documented as ADR — N/A F1.0 Rule 8 wording tighten + F2.1 latency re-verify(re-use W34 instrumentation)both non-architectural per plan §1 + §4 R5
- [ ] `progress.md` retro section written — 7-section per closeout commit
- [ ] `progress.md` frontmatter status flipped to `closed` OR `closed_partial` per outcome
- [ ] Phase W36+ kickoff trigger noted in retro — candidates list update per F1.6 + F2.2 intersect

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
