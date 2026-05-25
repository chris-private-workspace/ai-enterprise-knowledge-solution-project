---
phase: W26-eval-driven-retrieval-tuning
day: 5
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
  runtime_seconds: 492.1
  raw_output: ./parent-doc-metrics-W26-D5-raw.json
baseline_run:
  reference: ./baseline-metrics-W26-D1-raw.json
  date: 2026-05-25
  enable_parent_doc_retrieval: false
---

# W26 F2 — Parent-Document Retrieval Metrics(Day 5,2026-05-25)

> **F2 Step 1 parent-document retrieval eval per ADR-0037 §Implementation Deliverables G**
> Settings overridden via `.env` `ENABLE_PARENT_DOC_RETRIEVAL=true` + uvicorn restart;13 queries cohort 對齊 F1 D1 baseline(`eval-set-v0-w25-supplement.yaml`)

## 1. 集合指標 Delta vs F1 baseline

| 指標 | F1 baseline(OFF)| W26 F2(ON) | Delta | 結論 |
|---|---|---|---|---|
| **recall_at_5** | 0.8744 | 0.8744 | **0.0** | 不變(parent-doc stage 喺 retrieval 之後)|
| **faithfulness** | **0.9851** | **0.9015** | **-8.36pp** ↓ | **嚴重 regression** — LLM 唔 faithful to chunks |
| **correctness**(approx via answer_relevancy)| **0.7416** | **0.6804** | **-6.12pp** ↓ | regression |
| **image_association** | 0.0 | 0.0 | 0.0 | 仍未 wired 入 orchestrator |
| **p95_latency_ms** | 1001 | 1188 | **+18.7%** | 仍在 ADR-0034 5s budget 範圍 |
| **crag_trigger_rate** | 0.0 | 0.0 | 0.0 | 仍 deferred metric |

## 2. Per-query 比較

### 2.1 F1 baseline 9 failed → W26 F2 10 failed(整體 net +1 fail)

| query_id | F1 baseline failed metrics | W26 F2 failed metrics | Δ analysis |
|---|---|---|---|
| **Q-W25-T02** | answer_relevancy=0.70 | answer_relevancy=**0.55** | ↓ 0.15 regression(borderline → clear fail)|
| **Q-W25-T03** | answer_relevancy=0.59 | answer_relevancy=0.62 | ↑ 0.03 minor improvement |
| **Q-W25-T04** | context_precision=0, context_recall=0 | 同 | 不變 — 完全 retrieval miss 仍冇解 |
| **Q-W25-T06** | answer_relevancy=0.66 | (no fail listed) | ✅ improved 跨 threshold |
| **Q-W25-I02** | context_precision=0.70 + context_recall=0 | context_recall=0 | precision improved(no longer fail)但 recall 仍 0 |
| **Q-W25-I03** | context_recall=0 | answer_relevancy=0.66 + context_recall=0 | NEW answer_relevancy fail added |
| **Q-W25-I04** | answer_relevancy=0.67 + context_precision=0 | context_precision=0 | answer_relevancy 改善 |
| **Q-W25-I05** | context_recall=0 | answer_relevancy=0.65 + context_recall=0 | NEW answer_relevancy fail added |
| **Q-W25-I06** | answer_relevancy=0.58 | answer_relevancy=0.60 | minor ↑ but 仍 fail |
| **Q-W25-I01**(F1 PASSED 控制 query)| ✅ all pass | **answer_relevancy=0.54 + context_recall=0** | ❌ **NEW FAILURE — 控制 query 被破壞** |
| **Q-W25-I07**(F1 PASSED post-BUG-025)| ✅ all pass | **faithfulness=0.00 + answer_relevancy=0.00** | ❌ **CRITICAL — synthesizer 完全失敗** |

### 2.2 兩個 critical regressions 深入

#### Q-W25-I01「How does the high-level architecture look like? Show me the system zones.」

- **F1 baseline**:全 4 metrics ≥ 0.7 pass(W25 D4 user-test 報告嘅 milestone query —「2 citations + 1 with screenshot ✅」)
- **W26 F2 parent-doc**:answer_relevancy=0.54 + context_recall=0(control query 被破壞)
- **可能原因**:parent_doc_top_k=1 抓 top-1 anchor 嘅 parent section,但 `section_path[:-1]` parent 可能 covers 整個架構大 section,引入太多 off-topic 內容(eg 其他 architectural principles)沖淡 high-level overview 焦點

#### Q-W25-I07「Show me all the Integration scenarios.」

- **F1 baseline**:全 pass(post-BUG-025 fix 解了 silent-drop;user-test 觀察「1/5 scenarios named」係 enumeration completeness gap,非 RAGAs metric)
- **W26 F2 parent-doc**:**faithfulness=0.00 + answer_relevancy=0.00** — LLM synthesis 完全脫離 retrieved chunks
- **可能原因**:Parent section 抓住 §8 全部 5 個 scenarios + intro + 周邊 chunks,token 量遠超 anchor 範圍;LLM 可能 trigger Rule 2 REFUSAL_PHRASE 或產生 completely unrelated content;或者 chunk_text vs parent_section_text dispatch 之後 LLM 用 parent section 而生成 citations 對 anchor chunk_id 唔對齊 → RAGAs faithfulness/relevancy judge 嚴重失分

### 2.3 context_recall 改善程度檢測(對應 G3 hard gate)

5 個 F1 baseline failed-cohort context_recall=0 queries:

| query_id | F1 baseline context_recall | W26 F2 context_recall | Δ |
|---|---|---|---|
| Q-W25-T04 | 0.00 | 0.00 | 0.0 |
| Q-W25-I02 | 0.00 | 0.00 | 0.0 |
| Q-W25-I03 | 0.00 | 0.00 | 0.0 |
| Q-W25-I04 | (implicit via precision=0,no explicit recall fail listed)| (no recall fail listed)| improved? |
| Q-W25-I05 | 0.00 | 0.00 | 0.0 |

**5-failed-cohort improvement**:**0/5 measurable recall improvement**;parent-doc 完全冇解到 enumeration / aggregation query 嘅 context_recall=0 問題。

加上 NEW recall=0 regressions:
- Q-W25-I01 context_recall=0(NEW)
- Q-W25-I03 NEW answer_relevancy fail
- Q-W25-I05 NEW answer_relevancy fail

**Net effect**:G3 hard gate(context_recall improvement ≥ TBD pp on 5 failed-cohort)**FAIL** —— 0 改善 + 1 新 recall fail。

## 3. F2 → F3 gate 評估

依 W26 plan §3 hard gates G3 + G4(本日 D1 cont 4 rescoped wording):

| Gate | Criterion | Actual | Verdict |
|---|---|---|---|
| **G3** | `context_recall` improvement ≥ TBD pp on 5 failed-cohort queries | **0/5 改善**,且 NEW Q-W25-I01 控制 query context_recall=0 | **FAIL** |
| **G4** | `faithfulness` regression ≤ TBD pp | **-8.36pp regression**(0.9851 → 0.9015);Q-W25-I07 critical faithfulness=0 | **FAIL severely** |

**F2 → F3 gate 結論**:**FAIL** — 唔應該 trigger F3 query expansion(per Chris plan §8 Q3 + Q7:gate criteria 唔過 → AskUserQuestion Chris pick go/no-go)。

## 4. Root cause hypothesis

### 4.1 為什麼 parent-doc 反而 hurt

Hypothesis(基於 Q-W25-I07 critical failure 同 Q-W25-I01 控制 query regression):

1. **Parent section 太大,LLM context dilution**:
   - `parent_doc_top_k=1` + `parent_doc_max_tokens_per_parent=4000` → 整個 §X section 餵 LLM
   - 但 §X section 可能包含 5+ scenarios + 描述 + 過渡段落,而 query 只關注其中 1-2 個
   - LLM 嘅 attention 被 parent section irrelevant parts 拉走,faithfulness ↓ + answer_relevancy ↓

2. **Citation invariant 設計 vs RAGAs judge mismatch**:
   - 我設計嘅 dispatch chain:LLM 見 `parent_section_text` 但 citation 用 anchor `chunk_id`
   - RAGAs judge 對住 retrieved chunks(top-K reranked,5 個 chunks)做 faithfulness 評分
   - LLM 因為見 parent_section_text 而生成嘅 statements 可能 reference parent section 內容 *並非* top-5 reranked chunks 之一 → judge 認為 LLM「unfaithful」
   - 結果:**設計上 valid 嘅 architectural enhancement,被 RAGAs 評分機制誤判為 unfaithful**

3. **Q-W25-I07 完全 0 分**:
   - Synthesizer 可能因為 parent_section_text 大段 vs query「show me all the Integration scenarios」semantic mismatch 而 trigger REFUSAL_PHRASE(prompt rule 2)
   - 或者 LLM 生成 mostly-from-parent-section 答案但 citation chunk_ids 對唔到 retrieved set → RAGAs faithfulness = 0

### 4.2 W27+ sweep 候選改進

如果 W26 closeout direction 同意保留 parent-doc 作 W27+ 改進候選:

| 改進方向 | 預期效果 | Effort |
|---|---|---|
| `max_tokens_per_parent` 4000 → 2000 / 1500 | 減 LLM context dilution | 1 setting tune + 1 eval run |
| `parent_doc_top_k` 1 → 2-3 + dedupe | 多 anchor section 可能 cover query intent breadth(對 enumeration 適用)| 2 setting tune + 2 eval run |
| Dispatch chain 改:append parent_section_text 而非 replace | LLM 同時見 raw chunk + parent section,citation 對 raw chunk 仍 valid | prompt_builder 重寫 + 1 eval run |
| Parent-section 加入 citation-aware framing(eg「relevant sibling context」prefix)| 同上但更 explicit | prompt_builder 改 + 1 eval run |

但 W26 scope 已 close per Chris 3-step refinement;呢啲屬於 W27+ NEW Change scope。

## 5. 建議下一步(STOP-and-ask Chris)

依 Chris plan §8 Q3 + Q4 鎖定決策 + F2 → F3 gate AskUserQuestion 觸發條件:

### 5.1 W26 closeout direction 三個方案(per plan §2 F3 acceptance #4)

| 方案 | 行動 | 對應 plan §2 F3 directions |
|---|---|---|
| **(α)** F2 → F3 gate FAIL + W26 closeout **PARTIAL** | Default `enable_parent_doc_retrieval=False` 保留作 W27+ measurement opt-in capability;NOT default flip。Carry-over「parent-doc Setting sweep」+「parent-doc dispatch chain reconsider」記 W27+ NEW Change scope。F3 query expansion 暫不啟動 — Chris original plan §1.2 Step 2 嘅 prerequisite「parent-doc improvement」唔成立 | 對應 plan §2 F3「no improvement / regression → PARTIAL + escalate W27+」 |
| **(β)** F3 query expansion 仍啟動測試 | 雖然 F2 fail,F3 RAGAs eval `ENABLE_QUERY_EXPANSION=true`(ADR-0034 framework already exists),measure stand-alone 效果(可能對 enumeration 有幫助即使 parent-doc 唔得)| Variant of plan §2 F3「conditional execution if gate pass」flipped to「conditional execution if Chris pick」 |
| **(γ)** W26 直接 closeout PARTIAL,F3 + parent-doc 都留 W27+ | 最 surgical — 一個 cleanup commit 結束 W26;parent-doc / query expansion 都屬 W27+ separate phase | 對應 plan §2 F3「PARTIAL CAVEAT + escalate W27+」 |

### 5.2 Chris pick 需要決定

1. **W26 closeout direction**:(α)/(β)/(γ)三選一?
2. **F2 → F3 gate criteria 寫入 plan §3 Hard Gates 嘅 TBD 值** for retrospective record:
   - G3 actual:0/5 cohort improvement(failed criterion)
   - G4 actual:-8.36pp(failed criterion)
   - 建議 retro 標 G3 TBD=「≥1/5 cohort improvement」+ G4 TBD=「≤ -2pp regression」作 record purposes
3. **Parent-doc default OFF 保留 vs revert ADR-0037**:
   - 保留:`enable_parent_doc_retrieval=False` default — Setting 仍 available for W27+ tune;ADR-0037 §Implementation Deliverables 已 ship + tests 全綠 + governance 整全
   - Revert:刪 parent_doc_retriever module + Settings + pipeline wire(rollback path)— 但 measurement evidence 同 governance 都已 land,revert 屬 destruction over-engineering per Karpathy §1.3
   - **建議保留** —— ADR-0037 §Q4 已 lock「default OFF measurement experiment」policy,F2 fail 唔觸 revert(measurement-first discipline 預期 to ship-or-revert separately)

## 6. 已恢復 `.env`

eval 完成後即時 restore `.env`(remove `ENABLE_PARENT_DOC_RETRIEVAL=true`);後續 backend default behavior = parent-doc OFF(per Q4 Recommended default)。

---

**Phase Gate G3 + G4(F2 → F3 gate hard gates)** — ❌ **FAIL** via this run;F3 conditional execution gate **NOT triggered**;W26 closeout direction pending Chris AskUserQuestion(task #212)。

**Raw data**:`./parent-doc-metrics-W26-D5-raw.json`(2350 bytes JSON,full EvalReport schema)
**Reference baseline**:`./baseline-metrics-W26-D1-raw.json`(F1 D1 default OFF baseline)
