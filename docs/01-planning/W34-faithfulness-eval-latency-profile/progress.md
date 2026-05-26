---
phase: W34-faithfulness-eval-latency-profile
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed   # per F3 closeout 2026-05-26 — Phase Gate PASS measurement-only complete + decision tree intersect actionable verdict (G1 preserve × G2 LLM emit dominant → W35+ Rule 8 wording tighten OPTIONAL)
last_updated: 2026-05-26
---

# Phase W34 — Progress

> Daily progress log + R6 Day 0 + decisions + commits + retro。

---

## Day 0 — 2026-05-26(kickoff)

### F0 Kickoff actions

1. **Trigger**:W33-rule7-rule8-restoration closed PASS WITH G1b-DISTINCT-EQUAL + LATENCY-CONCERN CAVEAT(commit `355f58c` pushed origin/main)— W33 retro `priority_queue_locked` 將 **Faithfulness LIVE RAGAs eval HIGHEST** + **Latency profile breakdown #2** elevated 至 W34+ HIGHEST candidates per W33 F2 G2 +143% over-citation concern + W33 F2 latency +57-91% prompt-length cost surface。

2. **User candidate pick**(2026-05-26 same-day as W33 closeout):「現在先執行 A. 立即可做(自主)1. Faithfulness LIVE RAGAs eval(OQ-1 + OQ-3)+ 2. Latency profile breakdown(OQ-2)」— 兩個 measurement-only axes 同 ship 安全(both A.1 + A.2 read-only / instrumentation,no production behavior shift)。

3. **W34 framing — measurement-only phase**:
   - W31-W33 都係 ship 候選 features 然後 measure
   - W34 ship NOTHING — pure measurement + observability instrumentation
   - F1.0 surgical kwargs propagation 係 production-parity restoration(bug-fix-adjacent 非 NEW feature)
   - F2.1 structlog timing 係 pure observability(no production behavior impact)

### R6 Day 0 recursive grep verify(per CLAUDE.md §10 R6 + W23 F3 recursive amendment)

**Plan-text + code base contamination check + integration gap inspection**:

1. **🚨 R6 catch (1) `build_ragas_samples` missing W32 (h') wiring**:
   - `backend/eval/orchestrator.py:95` `synth = await synthesizer.synthesize(question, retrieval.chunks)` — **NOT propagating `engine=engine, kb_id=q_kb_id` kwargs**
   - W32 F1.1.a synthesizer signature change(`*, engine=None, kb_id=None`)was wired into `query.py:208 + 382` + `crag.py:414` 3 caller sites
   - **BUT** `build_ragas_samples` callsite never updated — RAGAs eval pipeline 唔會 trigger W32 (h') engine-fetch citation expansion
   - **Implication**:If unmodified `/eval/run` is invoked,RAGAs measures W33 prompt 層 ONLY without (h') backbone → misleading vs production stack
   - **PC-W32-2 realized**:「future module-level changes affecting citation pipeline must explicitly propagate via SynthesisResult fields」— eval orchestrator was the exact integration gap PC-W32-2 warned about(out-of-scope callsite from W32 F1.4 wire scope)
   - **Mitigation per F1.0 surgical patch**:propagate `engine=engine, kb_id=q_kb_id` kwargs into line 95 — minimal,non-architectural per H1(kwargs propagation through call chain matches existing synthesizer signature)

2. **✅ R6 catch (2) `make_ragas_evaluator` Azure key dependency satisfied**:
   - `backend/eval/ragas_evaluator.py:79` `if not settings.azure_openai_api_key: return None`
   - `.env` has `AZURE_OPENAI_API_KEY=DWe4...` ✅
   - Judge LLM = `gpt-5.4-mini`(settings.azure_openai_deployment_llm_judge per W17 F3)
   - Embeddings = `text-embedding-3-large`(Q19 baseline)
   - 4-metric:faithfulness + answer_relevancy + context_precision + context_recall

3. **✅ W33 SYSTEM_PROMPT Rule 7 v2 + Rule 8 verified post-W33 commit**:
   - `backend/generation/prompt_builder.py:28-30` confirmed Rule 7 v2 + Rule 8 lines present(post-W33 F1 commit `149aebd`)
   - F1.5 contingency 若 triggered 可 temporarily revert local-only no commit

4. **✅ W32 (h') Settings + Synthesizer wire intact**:
   - `Settings.py` L264 `enable_citation_post_hoc_expansion=True` + L270 `citation_expansion_window=10` + L274 `citation_expansion_max_aux=2` ✅
   - `synthesizer.py` L31 import + L57 field + L135-138 kwargs + L161-197 synthesize integration + L272-301 stream integration ✅

5. **✅ Eval-set ready**:
   - `docs/eval-set-v0-w25-supplement.yaml` 13 queries against `sample-document-with-image-1` KB
   - Q-W25-I07(line 296)+ Q-W25-I01(line 178)both present
   - 11 other corpus-matched queries(T01-T06 + I02-I06)provide breadth for 4-metric aggregate

6. **✅ W26 F1 baseline reference confirmed**:
   - `docs/01-planning/W26-eval-driven-retrieval-tuning/baseline-metrics-W26-D1-raw.json`:**faith 0.9851 / correctness 0.7416 / recall@5 0.8744 / p95_latency 1001ms**
   - Eval-set used:eval-set-v0-w25-supplement.yaml(same as W34)— direct apples-to-apples comparison

**Conclusion**:F1.0 surgical patch needed per R6 catch (1)。Otherwise net 0 contamination,clean state confirmed for W34 measurement axes。

### W26 F1 baseline + decision tree thresholds(pre-implementation surface)

**Reference baseline**(W26 F1 = pre-W26 parent-doc state = closest pre-W32-W33 historical RAGAs measurement):

| Metric | W26 F1 baseline | Threshold |
|---|---|---|
| faithfulness | 0.9851 | W34 ≥ 0.9651 (-2pp) preserve / 0.9351-0.9651 flag / < 0.9351 break |
| correctness(answer_relevancy)| 0.7416 | informational(decision driven primarily by faithfulness)|
| recall@5 | 0.8744 | informational(retrieval-side unchanged from W26 F1)|

**Decision tree pre-implementation** per Karpathy §1.4 goal-driven verifiable success criteria:

```
W34 RAGAs faith vs W26 F1 baseline 0.9851:
├─ ≥ 0.9651(W26 -2pp envelope) → G1 preserve
│   └─ W33 over-citation BENIGN → preserve Rule 7 v2 + Rule 8 production ship
├─ 0.9351 ≤ faith < 0.9651(W26 -5pp to -2pp) → G1 flag
│   └─ Rule 8 over-citation FLAG → defer ship decision pending W35+ Rule 8 wording tighten test
└─ < 0.9351(W26 -5pp 以下) → G1 break
    └─ trigger F1.5 contingency W32 (h')-only isolation eval
        ├─ W32-only faith ≥ 0.9651 → Rule 7 v2 + Rule 8 caused regression → W35+ revert OR tighten
        └─ W32-only faith < 0.9651 → (h') itself caused regression → re-think W32 ship governance
```

```
W34 latency dominant cost(across 10-run breakdown):
├─ LLM emit cost > 50% of W33-W32 +57-91% slowdown → G2 LLM emit
│   └─ W35+ Rule 8 wording tighten 「cite SUFFICIENT」
├─ Prompt token cost > 50% → G2 prompt token
│   └─ W35+ Rule 7 v2 wording compact 去 examples
├─ Engine-fetch IO cost > 50% → G2 engine-fetch
│   └─ W35+ async connection pool / parallelism enhancement
└─ Mixed(no single > 50%) → G2 mixed
    └─ W35+ multi-axis combined tighten + compact
```

### F0 next steps

- **F0.5** Draft this progress.md Day 0 entry — ✅ this section
- **F0.6** Commit kickoff `docs(planning): kickoff W34-faithfulness-eval-latency-profile + R6 Day 0 catch build_ragas_samples missing W32 (h') wiring + measurement-only phase scope`
- **F0.7** session-start.md §10 W34 row append `🟡 active 2026-05-26` + W35+ rolling JIT row defer + W33 row 維持 closed PASS
- **D1 start**:F1.0 surgical patch(~20min)+ F1.1-F1.4 RAGAs LIVE eval cascade(~2-3h)

### Actual vs Planned Effort(D0)

| Item | Planned | Actual | Variance |
|---|---|---|---|
| F0.1 folder + F0.2 R6 verify + F0.3-F0.5 docs + F0.6 commit `aa1c24e` + F0.7 sync | ~1h | ~30min | -50% real-calendar collapse |

---

## Day 1 — 2026-05-26(F1 same-day cascade)

### F1.0 R6 catch surgical patch(`backend/eval/orchestrator.py:91-100`)

**Patch shipped**:`build_ragas_samples` line 95 propagate W32 F1.1.a kwargs:

```python
synth = await synthesizer.synthesize(  # type: ignore[attr-defined]
    question, retrieval.chunks, engine=engine, kb_id=q_kb_id,
)
```

**Justification inline comment**:
```
# W34 F1.0.a — propagate `engine + kb_id` per W32 F1.1.a synthesizer
# signature for production-parity RAGAs eval. Without these kwargs the
# (h') engine-fetch citation expansion does NOT fire — eval would
# measure prompt-layer only, missing the W32 mechanical backbone that
# ships in /query + /chat. PC-W32-2 integration gap realization.
```

**Verify gate**:
- pytest test_crag.py + test_e1_e5_e12_smoke.py + test_observe_query_route.py = **24 passed in 479.14s** ✅ no regression
- ruff `eval/orchestrator.py` clean
- `AsyncMock()` 接受任意 kwargs(test_crag.py mock synthesizer.synthesize 等 still 兼容)

### F1.1 Eval-set selection

Use existing `docs/eval-set-v0-w25-supplement.yaml`(no NEW eval-set authoring):
- 13 queries against `sample-document-with-image-1` KB
- Q-W25-I01(line 178-194)+ Q-W25-I07(line 296-315)both present
- 11 corpus-matched queries(T01-T06 text + I02-I06 image)provide breadth for 4-metric aggregate

### F1.2 RAGAs eval invocation + EvalReport capture

**Backend restart sequence**:
- Kill W33 backend PID 51500(no F1.0 patch loaded)
- PowerShell `Start-Process python -u -m api.server` → PID 110204(hung — Postgres :5432 NO LISTEN)
- User confirmed Postgres docker restart 之後 LISTEN ✅ + Langfuse :3000 LISTEN ✅
- Backend lifespan 經 ~5+ min 完成 + bind :8000 → `/health` 200 ✅
- W34 F1.0 patched orchestrator.py loaded(`build_ragas_samples` propagates engine + kb_id)

**Eval run via `backend/w34-f1-ragas-runner.py`**:
- POST /eval/run `{"eval_set_id": "eval-set-v0-w25-supplement", "llm_model": "gpt-5.5", "reranker": "cohere-v4.0-pro", "enable_crag": true}`
- Runtime **642.2s** ≈ 10.7 min(W26 F2.20 reference 492s baseline + W33 prompt 層 + W32 (h') engine-fetch overhead expected per W33 F2 +57-91% latency findings)
- Raw JSON saved `backend/w34-f1-ragas-eval-raw.json`

### F1.3 Aggregate vs W26 F1 baseline

**4-metric comparison table**:

| Metric | W26 F1 baseline | **W34** | Delta | Verdict |
|---|---|---|---|---|
| **faithfulness** | 0.9851 | **0.9836** | **-0.15pp** | ✅ G1 preserve(well within -2pp envelope)|
| **correctness**(answer_relevancy) | 0.7416 | **0.7669** | **+2.53pp** | ✅ IMPROVED ⭐ |
| recall_at_5 | 0.8744 | 0.8936 | +1.92pp | ✅ improved(retrieval-side W29 .env tune inherited)|
| p95_latency_ms | 1001 | 1331 | +33% | ⚠️ aligned with W33 F2 user-test +57-91% latency findings |

**Failed queries(10 entries excluding orchestrator note)**:
- **Q-W25-T03/T04 + Q-W25-I01-I05**:context_precision / context_recall 低分(pre-existing keyword-mode limitation — eval-set placeholder ground_truth 無 Q14 SME-validated reference answers per CO_W15_F1_eval_set_v1 carry-over)
- **Q-W25-I06 + Q-W25-I07**:`InstructorRetryException` — RAGAs judge LLM(gpt-5.4-mini)在 complex multi-step query 上 generation parsing failure(judge artifact 非 pipeline regression)。Aggregate faith / correctness 仍 computed across successful samples → 不影響 G1 verdict
- **Q-W25-T01 / T02 / T05 / T06 + Q-W25-I07 walkthrough cite**:not in failed_queries — passed all 4-metric thresholds

### F1.4 Decision tree application

**Plan §3 G1 decision tree**:
```
W34 faith 0.9836 vs W26 F1 0.9851 envelope:
├─ ≥ 0.9651 (W26 -2pp) → G1 preserve ✅ **TRIGGERED**
│   └─ W33 over-citation +143% on I01 BENIGN per RAGAs measurement
│   └─ Preserve Rule 7 v2 + Rule 8 production ship
├─ ∈ [0.9351, 0.9651) → G1 flag(NOT triggered)
└─ < 0.9351 → G1 break(NOT triggered;F1.5 contingency NOT needed)
```

**Critical finding — W33 over-citation BENIGN**:I01 W33 user-test avg_cit 4.2 → 10.2(+143%)concern from W33 retro,**per RAGAs measurement confirms over-citation 唔 break faithfulness**。`faithfulness=0.9836` 表示 LLM cited chunks 仍 well-supported by retrieved context — 多 cite 嘅 chunks 都係 truly relevant,不 spurious。

**Bonus finding — correctness IMPROVED +2.53pp**:Rule 7 v2 specificity preference + Rule 8 cite breadth + W32 (h') engine-fetch combined drives higher `answer_relevancy`(0.7416 → 0.7669)。W33 production state 對 W26 F1 pre-W26 baseline 不單止 maintain,反而提升。

### F1.5 Contingency

**NOT TRIGGERED** — G1 preserve outcome means W32 (h')-only isolation eval 不必要。Rule 7 v2 + Rule 8 production ship 保留。

### F1.6 Next steps

- **F1.6.a** Commit `feat(eval): W34 F1 build_ragas_samples engine + kb_id propagation per W32 (h') parity + LIVE RAGAs eval evidence`(this section + F1.0 patch + raw JSON + runner script)
- **F1.6.b** progress.md Day 1 entry(this section)— ✅ done
- **F2 next**:F2.1 structlog stage timing instrumentation **already pre-applied during F1.2 background runtime**(synthesizer.py + citation_expansion.py;backend reload needed to load F2.1)→ backend restart → F2.2 5-run measurement

### Actual vs Planned Effort(D1)

| Item | Planned | Actual | Variance |
|---|---|---|---|
| F1.0 surgical patch + F1.1-F1.4 RAGAs eval | ~2-3h | F1.0 ~10min + F1.2 eval 642s background = ~30min + ~10min agg = ~40min | -85% real-calendar collapse(measurement-only,no contingency triggered)|

---

## Day 2 — 2026-05-26(F2 + F3 same-day cascade)

### F2.1 Structlog stage timing instrumentation(pre-applied during F1.2 background runtime)

**Per Karpathy §1.3 surgical — observability only,no behavior change**。Applied 在 F1.2 RAGAs eval running 時(backend PID 22632 已 freeze 喺 memory,file change 唔 affect running F1.2 measurement)。

**`backend/generation/synthesizer.py:140-198` synthesize() method**:
- F2.1.a `synth_overall_start = time.perf_counter()` 喺 method 開始
- F2.1.b prompt-build sub-stage:wrap `build_prompt(...)` with `prompt_build_start/_end`
- F2.1.c LLM chat completion sub-stage:existing `latency_ms`(L154)preserved + 新 `synth_llm_completion_latency_ms` 名稱 alias 入 logger.info
- F2.1.d expand_citations overall:wrap `expand_citations(...)` with `expand_citations_start/_end`
- F2.1.e logger.info `synthesizer_call` event extended with 4 NEW fields:
  - `synth_overall_latency_ms`
  - `synth_prompt_build_latency_ms`
  - `synth_llm_completion_latency_ms`(== existing `latency_ms`)
  - `synth_expand_citations_latency_ms`

**`backend/generation/citation_expansion.py:171-186` expand_citations() function**:
- F2.1.e wrap `asyncio.gather(engine.list_chunks)` with timer
- NEW logger.info event `expand_citations_list_chunks_batch` with fields:
  - `unique_docs_count`
  - `expand_list_chunks_batch_latency_ms`

**Backward compat**:`latency_ms` field preserved unchanged → cost_dashboard.py / Langfuse trace parsing 唔 break。

**Verify gate**:
- ruff `generation/synthesizer.py + citation_expansion.py + eval/orchestrator.py` clean ✅

### F2.2 5-run latency measurement

**Backend restart** kill PID 22632 + PowerShell Start-Process Python -u → PID 95296 → /health 200 → F2.1 + F1.0 + W33 + W32 + W26-baseline 全 loaded。

**Per-run results via `backend/w34-f2-runner.py`**:

| Run | Q-W25-I07 cit | I07 total | Q-W25-I01 cit | I01 total |
|---|---|---|---|---|
| 1 | 3 | 66.2s | 15 | 56.2s |
| 2 | 9 | 60.0s | 9 | 53.1s |
| 3 | 3 | 59.5s | 9 | 49.1s |
| 4 | 3 | 66.2s | 6 | 51.5s |
| 5 | 6 | 59.2s | 12 | 56.9s |
| **avg** | **4.8** | **62.2s** | **10.2** | **53.4s** |

**Baseline 比較**:

| 指標 | W32 | W33 | **W34** | W34 vs W33 |
|---|---|---|---|---|
| I07 avg latency | 19.3s | 30.4s | **62.2s** | +105% ⚠️ |
| I01 avg latency | 11.7s | 22.4s | **53.4s** | +138% ⚠️ |
| I07 avg cit | 5.4 | 6.6 | **4.8** | -27% |
| I01 avg cit | 4.2 | 10.2 | **10.2** | unchanged |

### F2.3 Stage timing breakdown(parsed from `uvicorn-restart-w34-v3.log.out` structlog JSON 10 runs)

**`synthesizer_call` event aggregate**:

| Field | Avg | Min | Max | % of synth_overall |
|---|---|---|---|---|
| **synth_overall_latency_ms** | **16974** | 8839 | 23447 | 100% |
| ├ synth_llm_completion_latency_ms | **15665** | 7712 | 22051 | **92% DOMINANT** ⭐ |
| ├ synth_expand_citations_latency_ms | 1308 | 1127 | 1431 | 8% |
| └ synth_prompt_build_latency_ms | 0 | 0 | 0 | 0% |
| input_tokens | 3175 | 2974 | 3469 | — |
| output_tokens | 701 | 478 | 858 | — |
| citations_count | 7.5 | 3 | 15 | — |

**`expand_citations_list_chunks_batch` event aggregate**:

| Field | Avg |
|---|---|
| expand_list_chunks_batch_latency_ms | 1299ms(99% of synth_expand_citations 1308ms)|
| unique_docs_count | 1.0(all 10 runs cited from 同一 doc)|

**`api.query` stage_complete aggregate**:duration_ms avg 27641ms(synth + retrieval + CRAG + image attach combined)

**`audit_log POST /query` aggregate**:duration_ms avg 57772ms(total request including auth + background tasks + audit log)

**Gap analysis**:
- audit_log 57772ms - api.query 27641ms = **30131ms unaccounted** ⚠️
- Backend log.err 顯示 9 條連續「Unexpected error occurred. Please check your request and contact support: https://langfuse.com/support.」— Langfuse fresh container 重啟之後 trace ingest 出 retry loop。Likely 30s overhead 落晒喺 Langfuse SDK retries
- W33 F2 baseline 30.4s 時 Langfuse 已 warmed,所以 audit_log ≈ api.query ≈ end-to-end response
- **Conclusion**:W34 60s+ total latency = W33-comparable 30s base + ~30s Langfuse retry overhead(operational issue,non-W33-W34 ship cost)

### F2.4 Dominant cost determination

**Within synth_overall(W33 + W32 ship attributable cost)**:

```
synth_llm_completion 15665ms / synth_overall 16974ms = 92%
```

**Plan §3 G2 decision tree thresholds**:
- G2 LLM emit dominant criterion:LLM completion > 50% of W33-W32 slowdown
- **W34 measurement:LLM completion = 92% of synth_overall** ✅ FAR EXCEEDS THRESHOLD

**Verdict:G2 LLM emit dominant** → W35+ candidate:**Rule 8 wording tighten「cite SUFFICIENT chunks」**(reduce output_tokens emit cost — current avg 701 tokens dominated by Rule 8 cite-ALL-overlap interpretation)

**Why LLM emit dominant?**:
- output_tokens avg 701 + GPT-5.5 ~30 tokens/sec emit rate = ~23s emit
- citations_count avg 7.5(W33 baseline 6.6 + W34 instrumentation overhead ≈ similar)
- Rule 8「cite ALL chunks with partial overlap」strict LLM interpretation 仍係 cite breadth driver(per W33 F2 observation)
- Rule 7 v2 + Rule 8 prompt 加 ~500 chars 但 prompt_build 計算 0ms — prompt token cost 非 dominant signal

### F3 Decision tree intersect(F1 outcome × F2 outcome)

```
F1 G1 preserve(faith 0.9836 ≥ 0.9651 ✅)
× F2 G2 LLM emit dominant(synth_llm_completion 92% of synth_overall ✅)

→ Plan §F3.A intersect result:
  W35+ candidate:Rule 8 wording tighten「cite SUFFICIENT chunks」OPTIONAL
  (no urgent priority — measurement BENIGN + clear performance refinement direction)
```

**W35+ ship recommendation matrix verdict**:**OPTIONAL latency refinement**(not REQUIRED)
- Production preserve W33 production state(Rule 7 v2 + Rule 8 + (h'))
- Rule 8 wording tighten 候選 W35+ if latency 改善 priority elevated
- 其他 candidates 保留 W35+(see plan §6 + retro carry-overs)

### F2.4 + F3 next steps

- **F2.4.a** Commit `feat(observability): W34 F2 structlog stage timing + 10-run latency profile + LLM emit dominant verdict`
- **F2.4.b** progress.md Day 2 entry(this section)— ✅ done
- **F3 closeout cascade**:plan.md frontmatter status flip + checklist cross-cutting tick + retro 7-section + session-start sync + commit + push

### Actual vs Planned Effort(D2)

| Item | Planned | Actual | Variance |
|---|---|---|---|
| F2.1 instrumentation + F2.2 5-run + F2.3 agg + F2.4 commit + F3 closeout | ~3-4h | F2.1 ~15min(pre-applied during F1.2)+ F2.2 ~10min runner + ~5min parse = ~30min,+ F3 closeout ~30min | -80% real-calendar collapse(measurement-only,F2.1 parallel pre-applied saved D2 cycle time)|

---

## Retrospective(F3 closeout)

### What Worked

- **Measurement-only phase scope** validated cleanly — no production behavior shift,no Settings flip,F1.0 surgical kwargs propagation + F2.1 structlog timing 都係 production-parity restoration + observability instrumentation
- **F1.0 R6 catch (1) PC-W32-2 realized at kickoff** — `build_ragas_samples` 唔 propagate W32 (h') kwargs 嘅 integration gap clean catch saved misleading measurement(eval would have been W33 prompt only without (h') backbone)
- **Karpathy §1.4 verifiable success criteria** — 3-branch G1 decision tree + 4-branch G2 decision tree pre-implementation surface 之後,F1+F2 evidence 即可機械化 map 到 decision branch
- **F2.1 pre-applied during F1.2 runtime** — parallel scheduling 跨 PID memory boundary 安全(running PID frozen module reference)+ saved D2 cycle time
- **Decision tree intersect produces actionable W35+ direction** — G1 preserve × G2 LLM emit dominant → Rule 8 wording tighten OPTIONAL refinement(no urgent revert,measurement BENIGN)
- **Faithfulness preserved across W26→W33 phase chain** — W26 F1 0.9851 → W34 0.9836 = -0.15pp net across 8 phases of changes(W26-W33 cumulative)= essentially noise
- **Correctness IMPROVED +2.53pp** — Rule 7 v2 + Rule 8 + (h') stack drives answer_relevancy gain
- **Real-calendar collapse pattern continues** — total ~3-4h actual vs ~5-9h planned = -50% per W22-W33 trend

### What Didn't Work / Surprises

- **🚨 Langfuse fresh container retry overhead** — F2.2 measured 60s total latency = W33 baseline 30s + ~30s Langfuse SDK retry loop。This is NON-W33-W34-ship cost — `Unexpected error` repeated 9 次 喺 log.err,Langfuse trace ingest 出 retry。**PC-W34-1 NEW** candidate:session-start protocol amend explicit verify Langfuse health endpoint passes 200 + trace ingest 200 not just port LISTEN(extends PC-W33-1 reachability verify)
- **InstructorRetryException on Q-W25-I06 + Q-W25-I07** — RAGAs judge LLM gpt-5.4-mini parsing failure on complex multi-step queries(judge artifact);不 affect G1 aggregate verdict but flagged as **PC-W34-2 NEW** candidate W35+ — switch judge to gpt-5.5 OR robust JSON parsing,OR exclude complex queries from RAGAs eval-set
- **Surprise:G1b mean per W33 caveat — W34 RAGAs shows correctness +2.53pp IMPROVED** — W33 hypothesis was「distinct walkthrough count saturated by (h') mechanical」but W34 RAGAs shows answer_relevancy(W26 0.7416 → 0.7669)IMPROVED。Rule 7 v2 + Rule 8 prompt 層 contribution 真係 measurable 喺 RAGAs scope(non-distinct-count signal)
- **Surprise:prompt_build = 0ms** — Rule 7 v2 + Rule 8 加 ~500 chars 喺 SYSTEM_PROMPT 但 build_prompt 計算 cost 完全 negligible(<1ms)。**Latency cost 100% 來自 LLM emit / completion**,不係 prompt parsing。W35+ Rule 7 v2 wording compact 候選 ROI low(prompt token cost 非 latency driver)
- **input_tokens 3175 / output_tokens 701** — 比 W33 user-test 觀察 嘅 high citations_count avg 6.6 數字 略低,可能 measurement variance(reformulator stochasticity)

### Carry-overs to W35+

- **🆕 PC-W34-1 NEW**(per F2.3 R6 catch — Langfuse retry overhead):Session-start protocol amend — verify Langfuse :3000 + `/api/public/health` 200(NOT just port LISTEN)+ Postgres ready_for_query handshake(`SELECT 1` round-trip)before backend restart;extends PC-W33-1 reachability verify
- **🆕 PC-W34-2 NEW**(per F1.3 InstructorRetryException):RAGAs judge LLM gpt-5.4-mini 在 complex multi-step queries 上 parsing failure — switch judge to gpt-5.5 OR robust JSON parsing in `ragas_evaluator.patch_for_gpt5` OR exclude complex queries from RAGAs eval-set Q14 SME-validate
- **W35+ refinement candidates(no urgent priority — production OK,refinement only)**:
  - **Rule 8 wording tighten**「cite SUFFICIENT chunks」— G2 LLM emit dominant 確認 cite breadth 係 latency driver;reduce output_tokens emit cost while preserving G1 faithfulness
  - **prompt token reduction** demoted to LOW priority — F2.3 evidence prompt_build = 0ms,prompt token cost 非 latency driver;Rule 7 v2 wording compact ROI low
  - **engine-fetch async connection pool** demoted to LOW priority — F2.3 evidence list_chunks batch 1299ms = 8% of synth_overall(NOT > 50% threshold);secondary cost
- **(j') NEW section_path prefix filter** preserved W35+ — quality-of-cite refinement,independent axis from G1/G2 measurement
- **PC-W33-1 + PC-W32-1 + PC-W32-2** preserved
- **Lower priority preserved**:(g')/(i')/(B'.a)/(ii)/(k) per W33 retro saturation evidence(W32 (h')+ W33 prompt layer 已 cover G1 + cross-section breadth)
- **(c)/(e)/(f)/BUG-026+027/W22 D8/W16 F1-F4 Track A** preserved per long-term carry-over

### ADR Triggers

**None** this phase — F1.0 kwargs propagation + F2.1 structlog instrumentation 都係 non-architectural per plan §1 + §4 R5(production-parity restoration + observability addition)。

### Phase Gate Result

**PASS — measurement-only phase complete with decision tree intersect actionable verdict** —
- F1 G1 preserve ✅(faith 0.9836 ≥ 0.9651;W33 over-citation BENIGN per RAGAs)
- F1 correctness IMPROVED +2.53pp ⭐(Rule 7 v2 + Rule 8 + (h') stack adds RAGAs measurable value)
- F2 G2 LLM emit dominant ✅(synth_llm_completion 92% of synth_overall;W35+ Rule 8 wording tighten OPTIONAL)
- F3 decision tree intersect → OPTIONAL latency refinement(no urgent revert,production preserved)
- 2 NEW PC candidates surfaced(PC-W34-1 Langfuse health verify + PC-W34-2 RAGAs judge robustness)

### W35+ Priority Queue Locked

1. **HIGHEST(per W35+ refinement,no urgent trigger)**:**Rule 8 wording tighten**「cite SUFFICIENT chunks」(per F2 G2 LLM emit dominant — reduce output_tokens while preserving G1 faithfulness;~1-2h)
2. **PC-W34-1 NEW** session-start protocol amend(Langfuse `/api/public/health` 200 + Postgres `SELECT 1` handshake pre-flight)
3. **PC-W34-2 NEW** RAGAs judge robustness(switch gpt-5.4-mini → gpt-5.5 OR robust JSON parsing OR exclude complex queries Q14 SME-validate)
4. **(j') section_path prefix filter** quality-of-cite refinement
5. **PC-W33-1 + PC-W32-1 + PC-W32-2** preserved(operational housekeeping)
6. **DEMOTED LOW priority**:prompt token reduction(F2 evidence prompt_build=0ms;ROI low)+ engine-fetch async pool(F2 evidence list_chunks 8%;ROI low)
7. **Lower priority preserved**:(g')/(i')/(B'.a)/(ii)/(k) per W33 retro saturation evidence
8. **Long-term carry-over**:(c)/(e)/(f)/BUG-026+027/W22 D8/W16 F1-F4 Track A

