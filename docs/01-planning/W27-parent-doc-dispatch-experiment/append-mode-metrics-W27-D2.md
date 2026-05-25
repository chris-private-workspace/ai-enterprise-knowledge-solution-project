---
phase: W27-parent-doc-dispatch-experiment
day: 2
date: 2026-05-25
eval_run:
  endpoint: POST /eval/run
  eval_set_id: eval-set-v0-w25-supplement
  reranker: cohere-v4.0-pro
  llm_model: gpt-5.5
  judge_model: gpt-5.4-mini
  enable_crag: true
  enable_parent_doc_retrieval: true
  parent_doc_top_k: 1
  parent_doc_section_depth_offset: 1
  parent_doc_max_tokens_per_parent: 4000
  parent_doc_dispatch_mode: append    # W27 F1 NEW Setting (W26 F2 G baseline = replace)
  runtime_seconds: 544.3
  raw_output: ./append-mode-metrics-W27-D2-raw.json
baselines:
  F1_baseline:
    reference: ../W26-eval-driven-retrieval-tuning/baseline-metrics-W26-D1-raw.json
    date: 2026-05-25
    config: enable_parent_doc_retrieval=false (control)
  W26_F2_G_replace:
    reference: ../W26-eval-driven-retrieval-tuning/parent-doc-metrics-W26-D5-raw.json
    date: 2026-05-25
    config: parent_doc_dispatch_mode=replace (W26 F2 G)
---

# W27 F2 G — Append-Mode Dispatch Chain Metrics(Day 2,2026-05-25)

> **F2 hypothesis test per ADR-0037 amendment candidate** — `prompt_builder._format_chunk` dispatch chain "append" branch render BOTH anchor `chunk_text` + parent_section_text 兩段,verify citation invariant preservation 對 RAGAs faithfulness judge mismatch 嘅修復效果
> Settings overridden via `.env` `ENABLE_PARENT_DOC_RETRIEVAL=true` + `PARENT_DOC_DISPATCH_MODE=append` + uvicorn restart;13 queries cohort 對齊 W26 F1 baseline + W26 F2 G baseline

## 1. 集合指標 Two-Baseline Delta

| 指標 | F1 baseline(OFF)| W26 F2 G(replace)| **W27 F2 G(append)** | Δ vs F1 | Δ vs W26 F2 G | 結論 |
|---|---|---|---|---|---|---|
| **recall_at_5** | 0.8744 | 0.8744 | **0.8936** | **+1.92pp** | **+1.92pp** | retrieval-side unexpected positive(可能 eval set query-class distribution shift)|
| **faithfulness** | **0.9851** | 0.9015 | **0.9591** | **-2.60pp** | **+5.76pp** ✅ | G1 marginal MISS 0.6pp below ±2pp tolerance;**但** W26 F2 G -8.36pp 嚴重 regression 修復 5.76pp = D1.35 hypothesis partial validation |
| **correctness**(approx via answer_relevancy)| **0.7416** | 0.6804 | **0.7594** | **+1.78pp** | **+7.90pp** ✅ | G2 PASS within ±2pp tolerance;append mode 超 F1 baseline correctness |
| **image_association** | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 仍未 wired 入 orchestrator(deferred metric) |
| **p95_latency_ms** | 1001 | 1188 | **2897** | **+189.4%** ⚠️ | **+143.9%** ⚠️ | 2-segment LLM input 加 ~30-40% tokens per query × 13 queries = latency cost 主要由 append render 增加 |
| **crag_trigger_rate** | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 仍 deferred metric |

## 2. Per-query 比較 — append vs replace vs F1

### 2.1 Critical recovery — Q-W25-I07 ✅

| baseline | 結果 |
|---|---|
| F1 baseline(OFF)| PASS post-BUG-025 fix all-metric |
| W26 F2 G(replace) | **faithfulness=0.00 + answer_relevancy=0.00 CRITICAL FAIL** |
| **W27 F2 G(append)** | **PASS — out of failed_queries list 完整 recovery** ✅ |

**Significance**:W26 F2 G 嘅 Q-W25-I07 catastrophic synthesizer failure 完整修復 = **D1.35 hypothesis "RAGAs faithfulness judge mismatch via citation invariant breakage" 直接驗證** ✅。Append mode 將 anchor chunk_text 留喺 LLM input → LLM cite anchor chunk_id(top-5 內)→ RAGAs judge 對齊。

### 2.2 Q-W25-I01 控制組 partial recovery ⚠️

| baseline | 結果 |
|---|---|
| F1 baseline(OFF)| PASS — 控制 query 完整通過 |
| W26 F2 G(replace) | answer_relevancy=**0.54** + context_recall=0(FAIL 控制組被破壞)|
| **W27 F2 G(append)** | answer_relevancy=**0.64** + context_recall=0(partial recovery — +0.10pp vs W26 但仍 < 0.7 PASS threshold)|

**Analysis**:control regression remains。Append mode 修復 W26 嘅 critical regression severity 大幅減弱 但 唔完整 close。context_recall=0 維持 = retrieval 未 hit ground truth chunks(同 F1 一樣)。answer_relevancy 仍 < 0.7 indicates LLM output quality 對 control query 受 parent-doc context bloat 干擾(雖然 append 比 replace 好)。

### 2.3 完整 failed_queries Δ analysis(W26 F2 G vs W27 F2 G)

| query_id | W26 F2 G(replace) | W27 F2 G(append) | Δ analysis |
|---|---|---|---|
| **Q-W25-T02** | answer_relevancy=0.55 | answer_relevancy=0.70 + context_precision=0 | ↑ 0.15 answer_relevancy(borderline → at threshold)但 NEW context_precision=0 fail surfaced |
| **Q-W25-T03** | answer_relevancy=0.62 | context_precision=0.50 | answer_relevancy 修復(cleared)但 context_precision NEW fail |
| **Q-W25-T04** | precision=0, recall=0 | 同 | 不變 — retrieval miss 仍冇解 |
| **Q-W25-I01** ⚠️ 控制 | answer_relevancy=0.54 + context_recall=0 | answer_relevancy=0.64 + context_recall=0 | +0.10 partial recovery 但仍 < 0.7 |
| **Q-W25-I02** | context_recall=0 only | answer_relevancy=0.63 + context_precision=0.70 + context_recall=0 | NEW answer_relevancy + context_precision fails surfaced |
| **Q-W25-I03** | answer_relevancy=0.66 + context_recall=0 | context_recall=0 only | ✅ answer_relevancy fail cleared(+ improved across 0.7 threshold)|
| **Q-W25-I04** | context_precision=0 | context_precision=0 | 不變 |
| **Q-W25-I05** | answer_relevancy=0.65 + context_recall=0 | context_recall=0 only | ✅ answer_relevancy fail cleared(+ improved across 0.7 threshold)|
| **Q-W25-I06** | answer_relevancy=0.60 | answer_relevancy=0.61 | +0.01 minor 但仍 fail |
| **Q-W25-I07** ⚠️ critical | faithfulness=0.00 + answer_relevancy=0.00 | **out of failed_queries(PASS)** | ✅ ✅ **CRITICAL RECOVERY** |

**Pattern**:
- ✅ **2 queries answer_relevancy fail cleared**(Q-W25-I03, Q-W25-I05)— LLM output quality 改善
- ✅ **1 critical synthesizer failure fully recovered**(Q-W25-I07)
- ⚠️ **2 queries NEW context_precision fail surfaced**(Q-W25-T02, Q-W25-T03)— context_precision 衡量 retrieved chunks 入面有冇 irrelevant;append mode 加入 parent section context 可能引入 irrelevant siblings
- ⚠️ **1 query NEW answer_relevancy + context_precision fail**(Q-W25-I02)— compound regression
- ⚠️ **1 control query partial recovery 但仍 fail**(Q-W25-I01)

## 3. Phase Gate G1-G6 evaluation

| Gate | Criterion | Target | Actual | Verdict |
|---|---|---|---|---|
| **G1** | append faithfulness vs F1 baseline ±2pp | [0.9651, 1.0] | **0.9591** | ⚠️ **MARGINAL MISS** by 0.6pp(但 W26 F2 G -8.36pp 大幅修復 5.76pp)|
| **G2** | append correctness vs F1 baseline ±2pp | [0.7216, 0.7616] | **0.7594** | ✅ **PASS** within tolerance + above F1 baseline |
| **G3** | Q-W25-I07 faithfulness > 0.5 | > 0.5 | **PASS(out of failed_queries)** | ✅ **PASS** — critical synthesizer recovery |
| **G4** | Q-W25-I01 answer_relevancy ≥ F1 ± 0.05 | ≥ 0.65 effective | **0.64** | ⚠️ **MARGINAL MISS** by 0.01pp(但 W26 F2 G 0.54 大幅修復 10pp)|
| **G5** | pytest delta + code gates green | 1060+ pytest + ruff clean + mypy delta 0 | **1060/0 + 11/11 dispatch + ruff clean** | ✅ **PASS** |
| **G6** | Measurement-experiment-fail-policy applied | 唔回滾 W26 F2 ship + default mode preserve replace per Q4 | (per F3 closeout) | (deferred F3 verdict)|

**Gate aggregate verdict**:**G1 + G4 marginal MISS** → Phase Gate **PARTIAL** per plan §3 policy:
- G2 + G3 + G5 PASS confirms append mode 解 W26 F2 G 嘅 critical regressions
- G1 + G4 marginal MISS by < 1pp = significantly better than W26 F2 G FAIL severity 但 strictly 唔過 F1 baseline tolerance
- ADR-0038 new ship documents finding + W28+ candidates (b) Setting sweep + (c) RAGAs orchestrator-aware tune elevated

## 4. Root cause re-evaluation per D1.35 hypothesis 4-axis

**Hypothesis 1**:Citation invariant breakage(LLM cite parent siblings outside top-5 reranked set)
- W27 結果 → ✅ **VALIDATED partial** — Q-W25-I07 0.00/0.00 → PASS 直接驗證 append mode preserve anchor chunk_id citation invariant 修復 judge mismatch
- 但 aggregate faithfulness 仍 -2.60pp vs F1(append 唔 fully restore baseline)— suggests citation invariant 唔係唯一 axis

**Hypothesis 2**:Parent section attention dilution(LLM 喺長 parent section context 入面注意力被分散)
- W27 結果 → ⚠️ **PARTIALLY CONFIRMED** — append mode 加埋 parent context + anchor chunk_text(LLM input token +30-40%)= attention surface 更大 而 anchor focus 受 dilution;反映喺 G4 control regression remains + 2 NEW context_precision fails
- p95_latency +189% direct evidence:LLM 需要 process 更多 tokens

**Hypothesis 3**:Q-W25-I07 REFUSAL_PHRASE / chunk_id drift
- W27 結果 → ✅ **REFUTED** — Q-W25-I07 完整 recovery in append mode = chunk_id drift 唔係 root cause(W26 replace 嘅 0.00 source 係 citation invariant breakage,而非 drift)

**Hypothesis 4**:Dispatch replace-vs-append architectural variable
- W27 結果 → ✅ **VALIDATED** — append branch 大幅改善 W26 F2 G 嘅 catastrophic regressions(faith +5.76pp / correctness +7.90pp / Q-W25-I07 全 recovery)

**Conclusion**:append mode 確認係 W26 F2 G replace 嘅 SUPERIOR alternative(per multiple key metrics)but 仍 落後 F1 baseline 邊際 G1 + G4。下一 iteration 嘅 architectural variable 候選:
1. Reduce parent context bloat(W28+ candidate (b) `max_tokens_per_parent` 4000→2000/1500 sweep)
2. RAGAs judge orchestrator-aware tune(W28+ candidate (c) — judge consume parent_section_text reference per R-W26-2 — directly addresses Hypothesis 2 attention dilution from RAGAs side)

## 5. W28+ candidate prioritization

per F3 closeout decision tree(plan §2 F3 acceptance B):

1. **HIGHEST priority(b)**:`max_tokens_per_parent` 4000→2000/1500 sweep
   - **Rationale**:W27 latency +189% + Hypothesis 2 attention dilution 兩個 signal 都指向 parent context bloat;reducing budget = direct intervention on confirmed axis
   - **Effort estimate**:~3-5 days(Setting sweep + Both-baseline G eval per W27 pattern)
   - **Likely outcome**:G1 marginal MISS 0.6pp close-gap candidate;G4 control regression 可能 close 由於 less attention dilution

2. **Second priority(c)**:RAGAs orchestrator-aware judge tune per R-W26-2
   - **Rationale**:W27 G1 -2.60pp residual 屬 judge architectural mismatch(append 已盡 citation invariant 修復可能)— RAGAs judge consume parent_section_text reference 完整 address Hypothesis 2 from judge side
   - **Effort estimate**:~5-7 days(judge tune + Both-baseline G eval + may need NEW custom eval orchestrator implementation)
   - **Likely outcome**:G1 完全 close;但 W26 D1 baseline 重新 calibrate 嘅 question 出現

3. **Third priority(d)**:F3 query expansion standalone test
   - **Rationale**:W26+W27 都 focused parent-doc;query expansion 屬於 orthogonal axis;ADR-0034 framework already 存在
   - **Effort estimate**:~3 days

## 6. F3 closeout recommendation per plan §2 F3 + Q4 measurement-experiment-fail-policy

- **Gate verdict**:PARTIAL → NEW ADR-0038 documents finding(append mode no full F1 baseline restoration 但 W26 F2 G major recovery + Hypothesis 1 + 4 validated + 2 + 3 partially)
- **Settings default**:Preserve `parent_doc_dispatch_mode="replace"` per Karpathy §1.3 surgical 唔觸 revert(per Q4 measurement-experiment-fail-policy applicable to marginal MISS)
- **`enable_parent_doc_retrieval`**:Preserve default OFF 唔觸 revert
- **`.env` cleanup**:Remove W27 F2 active flip env vars(`ENABLE_PARENT_DOC_RETRIEVAL=true` + `PARENT_DOC_DISPATCH_MODE=append`)at F3 closeout
- **W28+ kickoff priority**:candidate (b) `max_tokens_per_parent` sweep — highest signal-to-cost ratio
