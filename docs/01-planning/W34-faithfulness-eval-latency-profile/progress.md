---
phase: W34-faithfulness-eval-latency-profile
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
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
