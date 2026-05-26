---
phase: W34-faithfulness-eval-latency-profile
plan_ref: ./plan.md
status: active
last_updated: 2026-05-26
---

# Phase W34 — Checklist

> Atomic checkbox(每 item ≤ 1-2 hour effort)。Measurement-only phase — A.1 RAGAs eval + A.2 latency profile,no production behavior shift。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify + session-start sync)

- [x] F0.1 Create `docs/01-planning/W34-faithfulness-eval-latency-profile/` folder
- [x] F0.2 R6 Day 0 recursive grep verify — **catch (1) `build_ragas_samples` missing W32 (h') wiring**(`backend/eval/orchestrator.py:95` synth.synthesize() not propagating `engine + kb_id` kwargs;PC-W32-2 integration gap realized);**catch (2) `make_ragas_evaluator` Azure key dependency satisfied via `.env` AZURE_OPENAI_API_KEY**;W33 SYSTEM_PROMPT Rule 7 v2 + Rule 8 verified present(post-W33 F1 commit `149aebd`);W32 (h') Settings + Synthesizer wire intact
- [x] F0.3 Draft `plan.md` 7-section per W33 closed-phase template
- [x] F0.4 Draft `checklist.md` atomic items derived from plan §2 deliverables(this file)
- [x] F0.5 Draft `progress.md` Day 0 entry — kickoff action + R6 catch report + W26 F1 baseline reference + decision tree pre-implementation surface
- [x] F0.6 Commit kickoff `aa1c24e` — `docs(planning): kickoff W34-faithfulness-eval-latency-profile + R6 Day 0 catch build_ragas_samples missing W32 (h') wiring + measurement-only phase scope`
- [x] F0.7 session-start.md §10 W34 row append `🟡 active 2026-05-26`(commit `aa1c24e`)+ W35+ rolling JIT row defer(decision tree intersect-driven)+ W33 row 維持 closed PASS

## F1 — Faithfulness LIVE RAGAs eval(A.1,~2-3h)

### F1.0 R6 catch surgical patch(`backend/eval/orchestrator.py:91-100`)

- [x] F1.0.a `build_ragas_samples` line 95 propagate `engine=engine, kb_id=q_kb_id` 入 synth.synthesize() call(W32 F1.1.a kwargs)+ inline justification comment
- [x] F1.0.b No existing test infrastructure for `build_ragas_samples` — skipped per plan §F1.0.b non-blocking allowance(AsyncMock pattern accepts any kwargs so existing test_crag.py mocks 仍兼容)
- [x] F1.0.c pytest test_crag.py + test_e1_e5_e12_smoke.py + test_observe_query_route.py = **24 passed in 479.14s** ✅ no regression;ruff `eval/orchestrator.py` clean

### F1.1 Eval-set selection

- [x] F1.1.a `docs/eval-set-v0-w25-supplement.yaml` 13 queries against `sample-document-with-image-1` KB(Q-W25-I07 line 296 + Q-W25-I01 line 178 + 11 corpus-matched T01-T06 + I02-I06)— no NEW eval-set authoring

### F1.2 Invoke /eval/run + capture EvalReport

- [x] F1.2.a `backend/w34-f1-ragas-runner.py` POST /eval/run with Bearer dev-token + eval_set_id payload + capture full EvalReport JSON
- [x] F1.2.b Backend explicit kill+restart per PC-W32-1 + PC-W33-1(Langfuse :3000 + Postgres :5432 pre-flight verified post-Docker restart;backend lifespan ~5min + bind :8000)
- [x] F1.2.c Raw JSON saved `backend/w34-f1-ragas-eval-raw.json`;**runtime 642.2s** ≈ 10.7min(W26 F2.20 ref 492s + W33+W32 overhead)

### F1.3 Aggregate vs W26 F1 baseline

- [x] F1.3.a 4-metric mean table — faith **0.9836** vs W26 F1 0.9851 = **-0.15pp**;correctness **0.7669** vs 0.7416 = **+2.53pp IMPROVED**;recall@5 0.8936 vs 0.8744 = +1.92pp;p95_latency 1331ms vs 1001ms = +33%
- [x] F1.3.b failed_queries detail(10 entries excluding orchestrator note)— 9 context_precision/recall keyword-mode limitations + 2 InstructorRetryException judge LLM artifacts(I06+I07 complex multi-step queries gpt-5.4-mini parsing failure;not pipeline regression)
- [x] F1.3.c Per-query breakdown documented inline progress.md
- [x] F1.3.d Decision tree branch verdict — **G1 preserve TRIGGERED**(faith 0.9836 ≥ 0.9651)

### F1.4 Decision tree application

- [x] F1.4.a Outcome branch = **G1 preserve** — W33 over-citation +143% on I01 user-test BENIGN per RAGAs measurement;faithfulness 仍 well within W26 F1 -2pp envelope
- [x] F1.4.b NOT "break" → F1.5 contingency NOT triggered
- [x] F1.4.c W35+ priority queue update:Rule 8 wording tighten + W32 (h')-only isolation eval BOTH DEMOTED to optional refinement(no fault-driven trigger)

### F1.5 Contingency

- [x] **F1.5 NOT TRIGGERED** — G1 preserve outcome means W32 (h')-only isolation eval 不必要;Rule 7 v2 + Rule 8 production ship preserved

### F1.6 Commit + progress.md Day 1

- [ ] F1.6.a Commit `feat(eval): W34 F1 build_ragas_samples engine + kb_id propagation per W32 (h') parity + LIVE RAGAs eval evidence — G1 preserve faith 0.9836 / correctness +2.53pp`
- [x] F1.6.b progress.md Day 1 entry — F1.0 patch + F1.2 eval result + decision tree G1 preserve + F1.5 NOT triggered + actual vs planned effort table

## F2 — Latency profile structlog stage timing(A.2,~1-2h)

### F2.1 Structlog stage timing instrumentation

- [ ] F2.1.a `synthesizer.synthesize` overall — log `synth_overall_latency_ms` at return
- [ ] F2.1.b prompt-build sub-stage — wrap `build_prompt(...)` with timer + log `synth_prompt_build_latency_ms`
- [ ] F2.1.c LLM chat completion sub-stage — wrap `client.chat.completions.create(...)` with timer + log `synth_llm_completion_latency_ms` + `prompt_tokens` + `completion_tokens`
- [ ] F2.1.d `citation_expansion.expand_citations` overall — log `expand_citations_overall_latency_ms`
- [ ] F2.1.e `engine.list_chunks` parallel batch sub-stage — wrap `asyncio.gather` with timer + log `expand_list_chunks_batch_latency_ms` + `unique_docs_count`
- [ ] F2.1.f Same log binding pattern as existing W22 observability(no new logger / convention)

### F2.2 5-run latency measurement

- [ ] F2.2.a Q-W25-I07 5 runs back-to-back + Q-W25-I01 5 runs back-to-back via `backend/w34-f2-runner.py`
- [ ] F2.2.b Capture per-run JSON + structlog JSON via `2>backend/w34-f2-structlog.log`
- [ ] F2.2.c Aggregate per-stage mean latency across 10 runs

### F2.3 Aggregate dominant cost determination

- [ ] F2.3.a Per-stage breakdown table(LLM emit / prompt token / engine-fetch / other)
- [ ] F2.3.b Identify dominant cost(>50% of W33-W32 +57-91% latency slowdown)
- [ ] F2.3.c W35+ priority queue update per F2 outcome
- [ ] F2.3.d Decision branch:LLM emit / prompt token / engine-fetch / mixed

### F2.4 Commit + progress.md Day 2

- [ ] F2.4.a Commit `feat(observability): W34 F2 structlog stage timing + 10-run latency profile`
- [ ] F2.4.b progress.md Day 2 entry — instrumentation summary + 10-run latency table + dominant cost verdict

## F3 — Decision tree analysis + closeout

### A. Combined decision tree(F1 outcome × F2 outcome)

- [ ] A.1 RAGAs branch determined(preserve / flag / break)
- [ ] A.2 Latency branch determined(LLM emit / prompt token / engine-fetch / mixed)
- [ ] A.3 Intersect → W35+ ship recommendation matrix(per plan §3.F3.A)

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [ ] plan.md frontmatter status `active → closed` per outcome
- [ ] checklist.md cross-cutting tick + N/A reason
- [ ] progress.md retro 7-section
- [ ] session-start.md §10 W34 row `🟡 active` → `✅ closed`
- [ ] session-start.md §11 W34 CLOSED block prepend
- [ ] RISK_REGISTER NEW R candidate(if F1.4 verdict = break OR flag)
- [ ] ADR README — no NEW ADR expected per plan §1 + §4 R5

### C. `.env` cleanup + W35+ priority queue evaluation

- [ ] `.env` cleanup — W29 env override preserved unchanged(no `.env` change this phase)
- [ ] W35+ candidate prioritization per F1.4 + F2.4 intersect outcome(Rule 8 wording tighten / Rule 7 v2 compact / engine-fetch async pool / partial revert / multi-axis combined / preserve do-nothing)

### D. Commit + push

- [ ] F3 closeout commit — combined with F1 + F2 evidence(per W31-W33 closeout pattern atomic)
- [ ] Push origin/main(per W33 user-instruction precedent)

---

## Cross-Cutting

- [ ] All deliverables committed to git(F0.6 kickoff + F1.6 F1 + F2.4 F2 + F3 closeout)
- [ ] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved expected
- [ ] All architectural-adjacent decisions documented as ADR — N/A F1.0 kwargs propagation + F2.1 instrumentation both non-architectural per plan §1 + §4 R5
- [ ] `progress.md` retro section written — 7-section per closeout commit
- [ ] `progress.md` frontmatter status flipped to `closed` OR `closed_partial` per outcome
- [ ] Phase W35+ kickoff trigger noted in retro — candidates list update per F1.4 + F2.4 intersect

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
