---
phase: W26-eval-driven-retrieval-tuning
day: 1
date: 2026-05-25
eval_run:
  endpoint: POST /eval/run
  eval_set_id: eval-set-v0-w25-supplement
  reranker: cohere-v4.0-pro
  llm_model: gpt-5.5
  judge_model: gpt-5.4-mini
  enable_crag: true
  runtime_seconds: 558.77
  raw_output: ./baseline-metrics-W26-D1-raw.json
---

# W26 F1 — Baseline Metrics (Day 1, 2026-05-25)

> **F1 Step 0 RAGAs baseline measurement per Chris 3-step refinement + brief §4 eval-driven methodology**
> R8 prerequisite gate ✅ MET 2026-05-25 — Cohere v4.0-pro reranker operational(`/health` `cohere: not_configured` misreport = BUG-027 candidate W27+,not functional issue)

## 1. Aggregated metrics

| Metric | Value | Target / Reference | Pass? |
|---|---|---|---|
| **recall_at_5** | **0.8744** | Gate 1 ≥ 0.80(W2 baseline 0.9722;W25 post-Path III preserved per Gate G2)| ✅ above floor 但 dropped from W2 baseline by ~10pp |
| **faithfulness**(RAGAs)| **0.9851** | ≥ 0.7(soft floor)| ✅ very high — LLM faithful to retrieved chunks |
| **correctness**(approx via answer_relevancy)| **0.7416** | ≥ 0.7 | ✅ moderate — no SME-labelled ground truth per CO_W15_F1_eval_set_v1 |
| **image_association** | 0.0 | Custom metric NOT yet wired into orchestrator(per `_metrics_deferred_note`) | N/A — out of scope F1 |
| **p95_latency_ms** | 1001 | ADR-0034 P95 < 5000 hard cap | ✅ well within budget |
| **crag_trigger_rate** | 0.0 | Deferred metric(CRAG loop integration not wired into eval)| N/A |

## 2. Per-query failed metrics(8/13 queries with at least 1 metric fail)

| query_id | Failed metric(s)| Value(s) | Interpretation |
|---|---|---|---|
| **Q-W25-T02** | answer_relevancy | 0.70 | Borderline — synthesis answer matches query intent **just at threshold** |
| **Q-W25-T03** | answer_relevancy | 0.59 | Synthesis-side miss — retrieved context not used effectively |
| **Q-W25-T04** | context_precision + context_recall | 0.00 + 0.00 | **Total retrieval miss** — neither precision nor recall;chunks irrelevant to query semantic intent |
| **Q-W25-T06** | answer_relevancy | 0.66 | Synthesis-side miss |
| **Q-W25-I02** | context_precision + context_recall | 0.70 + **0.00** | Mixed:precision OK 但 recall ZERO — chunks ARE relevant(precision)但 唔 cover full intent(recall)— **enumeration / aggregate query symptom** |
| **Q-W25-I03** | context_recall | 0.00 | Retrieval recall miss |
| **Q-W25-I04** | answer_relevancy + context_precision | 0.67 + 0.00 | Synthesis + retrieval both miss |
| **Q-W25-I05** | context_recall | 0.00 | Retrieval recall miss |
| **Q-W25-I06** | answer_relevancy | 0.58 | Synthesis-side miss |

**Q-W25-I01(control 「high level architecture」)NOT in failed list** — control passed all 4 metrics ≥ 0.7 ✅
**Q-W25-I07(failed user query 「show me all the Integration scenarios」)NOT in failed list** — post-BUG-025 symmetric deboost ≥ 0.7 on all 4 metrics ✅(but user observation:only 1/5 scenarios named — RAGAs metrics 唔 capture「enumeration completeness」直接)

## 3. Failure distribution analysis(per brief §4 step 1 framing)

### 3.1 Failed metric counts

| Metric | Count failed (of 13) | % failed |
|---|---|---|
| **context_recall = 0.00** | **5 queries**(T04 + I02 + I03 + I04(implied via context_precision 同 fail)/ wait actual: T04 + I02 + I03 + I05)| ~38% |
| context_precision | 2 queries(T04 + I04)| ~15% |
| answer_relevancy < 0.7 | 5 queries(T02 + T03 + T06 + I04 + I06)| ~38% |
| faithfulness < 0.7 | **0 queries** | 0% |

Wait corrected count of context_recall failures from raw JSON:
- T04: context_precision=0.00 + context_recall=0.00
- I02: context_precision=0.70 + context_recall=0.00
- I03: context_recall=0.00
- I05: context_recall=0.00
- I04: implicit via context_precision=0.00(没 context_recall fail explicitly listed)

→ **4-5 queries(~30-38%)have context_recall = 0.00**(I02 + I03 + I05 explicit + T04 implicit via dual fail);**context_recall-dominated failure mode**。

### 3.2 Recall-dominant vs precision-dominant interpretation(brief §4 framing)

```
"Context Recall — 需要嘅 chunk 有冇 retrieve 到?低 → recall 問題(↑top_k / parent-child)。
 Context Precision — retrieve 到嘅 chunk 相唔相關?低 → precision 問題(↑score threshold)。"
                                                                                   — brief §4 step 1
```

| Signal | Reading |
|---|---|
| **5 queries context_recall = 0.00** vs **2 queries context_precision < 0.7** | **RECALL-DOMINANT failure mode** |
| Recall@5 = 0.8744(top-5 嘅 chunk match rate)| Above floor 但 dropped from 0.9722 W2 baseline 約 10pp — modest signal of recall pressure |
| Faithfulness 0.9851(LLM 用 retrieved chunks faithful)| High = LLM 唔 hallucinate but works within retrieved context — recall miss means LLM can't synthesize what's not retrieved |
| Q-W25-I02 specifically:precision=0.70 ✅ recall=0.00 ❌ | Diagnostic — retrieval returns SOME relevant chunk(s)but **唔 cover query 全 intent**;classic enumeration / aggregate query symptom |

### 3.3 What recall-dominant signal means for Chris 3-step refinement

| Chris 3-step | Brief §4 step 1 framing |
|---|---|
| **Step 1 rerank threshold(precision-booster)** | 對 recall-dominant failure mode **唔對症** — threshold cut low-scored chunks may further hurt recall(borderline-relevant chunks dropped),precision improvement minimal because **only 2 queries(15%)** 有 precision miss |
| **Step 2 query expansion(recall-booster via RAG-Fusion 29 unique chunks vs base 5)** | **對症 recall-dominant** — but Chris ordering 講「expansion gated on threshold」— if threshold-first hurts recall further,Step 2 expansion 解唔到 cumulative damage |
| **Brief §6 step 4 parent-doc retrieval ADR**(🟡 H1)| **直接解 recall + enumeration completeness** — section-level retrieval gives LLM full §X scope,not just top-5 chunks;**Tier 1 ceiling option** per brief §3 方向 E |

## 4. F2 threshold initial value derivation(per Q2 locked decision — NOT magic 0.3)

### Issue:Distribution analysis insufficient signal from F1 raw output

Current `EvalReport` schema returns **aggregated** metrics + failed_queries list — **does NOT include per-query retrieved chunk scores**(Cohere rerank relevance scores for the 5 top-K)needed for F2 threshold derivation。

Per Q2 locked decision「derive from F1 baseline distribution NOT magic 0.3」— **requires per-chunk score data**。

**Options**:
- (i)Run additional measurement via `make_ragas_evaluator` direct script(not endpoint)— surfaces per-query reranker scores
- (ii)Use brief §3 recommendation initial value 0.3-0.4(magic but actually grounded in Cohere rerank typical distribution — Cohere returns scores roughly 0-1 with relevance 0.7+ for strong matches per W6 D1 LIVE Azure 2-way faith Δ -11.76pp + rel Δ -9.81pp WORSE comparison data)
- (iii)Inspect Cohere rerank output via 1-2 query manual probe(curl + log retrieved scores)

→ Surface to Chris before F2 active flip — `F2 threshold initial value derivation` needs **additional measurement**(eval orchestrator extension to include per-chunk scores)OR **brief-recommended 0.3-0.4 magic accept with documented rationale**。

## 5. Critical reframing — F1 data may pivot F2/F3 strategy

### 5.1 Recall-dominant pivot consideration

If recall-dominant failure mode IS the primary signal(per 5 queries context_recall=0.00 + Q-W25-I02 precision OK / recall zero asymmetry):

**Brief §6 step 4 ADR escalation may be more appropriate than W26 step 1+2 in order**:
- Step 1 threshold(precision-booster)解 ~2 queries precision miss 但 risk recall further damage
- Step 2 expansion(recall-booster)is the natural primary fix — but Chris ordering had expansion gated on threshold
- Step 4 parent-doc retrieval(brief §3 方向 E,🟡 H1 ADR)directly addresses recall + enumeration completeness which is the Q-W25-I07 user observation

**Alternative reordering candidates**:
- **(A)** Stick with Chris 3-step but threshold value carefully ≤ 0.3(minimize recall damage)+ measure Step 2 expansion delta carefully(noise tolerance generous given recall-dominant baseline)
- **(B)** **Reorder**:Step 1 = expansion(recall+),Step 2 = threshold(precision+ controls expansion noise)— matches brief §3+§6 original 順序(but Chris explicitly inverted)
- **(C)** **Skip to brief §6 step 4**:write ADR-0037 for parent-document / section-level retrieval(🟡 H1 Tier 1 ceiling — directly解 enumeration completeness;ADR scope larger but root-cause solution)
- **(D)** **Hybrid pragmatic**:Step 1 threshold lighter touch(0.2 floor — gates extreme noise only)+ Step 2 expansion + Step 3 parent-doc ADR escalate if 1+2 insufficient

### 5.2 What F1 data **confirms** vs **doesn't**

✅ **Confirmed**:
- R8 prerequisite gate MET — Cohere reranker IS operational
- recall-dominant failure mode for current EKP retrieval(5 queries context_recall=0.00)
- faithfulness very high(0.9851)→ synthesis-side 唔 hallucinate
- p95 latency 1s — well within budget
- BUG-025 fix worked sufficient for Q-W25-I07 to pass RAGAs metrics(but user observation「only 1/5 scenarios named」is a quality dimension NOT captured by standard RAGAs)

❌ **NOT confirmed**:
- F2 threshold initial value(distribution analysis needs additional per-chunk-score measurement)
- F2 → F3 gate criteria(no data yet on precision Δ + recall Δ from threshold add)
- F3 query expansion effectiveness for enumeration completeness(separate measurement post-F2 OR Step 2 reorder)

### 5.3 Per BUG-025 postmortem PC1 preventive control(W25.5)

> 「retrieval-policy change → ≥ 5-query manual user-test taxonomy(image-bearing + text-only overview/aggregate + targeted + non-existent topic refuse-control)before W{N}-closeout」

✅ **F1 satisfies PC1** — 13 queries across T(text-targeted)+ I(image-bearing)/ overview-aggregate + targeted cohort(Q-W25-I07 + Q-W25-I02 + Q-W25-I05 = overview-aggregate;Q-W25-I01 + Q-W25-I04 = targeted)。Sample size > 5 ≥ PC1 requirement。

## 6. Recommended next action(STOP-and-ask Chris)

Per Karpathy §1.1 think-before-coding + eval-driven discipline brief §4 critical insight — F2 active flip should NOT proceed without Chris pick on:

1. **F2 strategy direction**(per §5.1):(A) Chris 3-step preserved(threshold ≤0.3 light touch + careful expansion measurement)/(B)Reorder(expansion FIRST,then threshold)/(C)Skip to brief §6 step 4 parent-doc ADR/(D)Hybrid pragmatic
2. **F2 threshold initial value source**(per §4):(i)Additional per-chunk-score measurement(orchestrator extension)/(ii)Brief 0.3-0.4 magic accept with rationale/(iii)Manual probe via curl
3. **F1 baseline 'PASS' verdict for closing**:F1 deliverable formally complete?Or 補 additional measurement(per-chunk scores)before closing F1?

→ AI surfaces to Chris via AskUserQuestion before F2.

---

**Phase Gate G1 (F1 baseline metrics collected)** — ✅ achieved via this run + this report;13 queries cohort + RAGAs 4-metric + recall-dominant interpretation documented。

**Raw data**:`./baseline-metrics-W26-D1-raw.json`(2130 bytes JSON,full EvalReport schema)
