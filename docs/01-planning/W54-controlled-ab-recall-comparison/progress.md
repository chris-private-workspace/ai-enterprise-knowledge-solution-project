# W54 — Controlled Shared-Question A/B Recall Comparison · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應 Day-N entry(R2)。

---

## Day 1 — 2026-06-06

### Context / kickoff
W53 closed + pushed(`505a2de`,heading_aware 真 strategy + chunk-strategy self-retrievability 比較)。用戶 explicit 指示 **W54 起點 = controlled shared-question A/B**(text-anchored ground truth + keyword-mode recall)—— **W53 self-retrievability 嘅嚴謹版,消除 per-config 問題集 confounding**。正正收 W53 plan §1 明文 deferred 嘅「controlled A/B(shared text-anchored QA)」。

### 決策(Chris explicit 指示 2026-06-06)
- **方法學 = controlled shared-question A/B**:同一個 **frozen question set** 跨所有 strategy 評分(對比 W53 per-config 重生 → 消除問題難度 confounding)
- **Ground truth = text-anchored**:錨喺文字(非 chunk_id;chunk_id 跨 reindex 變)
- **Recall = keyword-mode**:chunk_id-agnostic,跨 strategy 可比

### R6 grep 驗證(plan kickoff — 揭三個令字面前提部份唔成立嘅 code-reality)
1. **EvalRunner 已內建 keyword-mode recall**(`runner.py:166-184`):mode 選擇 `use_strict = validated and acceptable_ids and not placeholder-prefix`;否則走 keyword path → `recall = |expected_answer_keywords ∩ top-K chunk_text(case-insensitive substring)| / |expected_answer_keywords|`。**純文字包含、chunk_id 無關** = 跨 strategy 評分需要嘅指標 → **W53 summary 講「需新 keyword harness」前提部份唔成立** → reuse EvalRunner keyword mode,**零新 recall 數學**(mirror W52 reuse strict mode)。
2. **section_path 係 strategy-invariant**:W53 `HeadingAwareChunker` = `LayoutAwareChunker` subclass,繼承同一 section-walk → layout_aware / heading_aware 對同一文件產生**相同 section_path**(headings 喺 parse 定,先於 chunking)→ 可作 **strategy-independent 文字錨點**(按 section group passages)。
3. **W53 `run_strategy_recall_comparison` dataclass 不可直接 reuse**:`StrategyRecallComparison` docstring 明標「**NOT a controlled A/B**」+ `StrategyRecallResult.recall_at_k` 標「W52 self-supervised」→ 套去 W54 controlled A/B 會 **mislabel** → W54 自己嘅 `ControlledStrategyResult` / `ControlledStrategyComparison`(controlled-framing)+ thin loop;真正 reuse 點 = EvalRunner keyword mode + `_collect_chunks`(synthetic_qa)+ W52 generator pattern。

- `_collect_chunks(engine, kb_id)`(synthetic_qa.py)已返 `{chunk_id, chunk_text, section_path}` → 直接 reuse(同 package import)。
- 下一個 ADR = **0045**(W54 無 H1 → 唔用)。

### Key design lock(plan §2)
- **文字錨點 = strategy-invariant section passages**:group by `(doc_id, tuple(section_path))` → concat section 文字 → 截斷 `max_passage_chars`(~4000)→ 丟空/過短。選 section-anchored 而非 fixed-char-window(語意自然 + 零新 windowing code + reuse 已返 section_path;Karpathy simplicity)。
- **keyword-mode = reuse EvalRunner**:eval-set `validated=False` + `acceptable_chunk_ids=[]` + `expected_answer_keywords` 填值 → 保證 `use_strict=False` → keyword path。無 keyword pair 丟(避 `if expected_keywords else 0.0` 假 0)。
- **shared set 生成一次 + freeze**:`build_shared_eval_set(...)` 喺 strategy loop **前**跑一次,寫 frozen YAML(可審計)→ 每 strategy 用同一檔評分。
- **判 LLM 單 call 返 Q + keywords**(JSON);judge `gpt-5.4-mini`(成本政策);無 cred → None graceful。

### 誠實 framing(R1 — 誠實階梯第四期)
W51 coverage proxy → W52 synthetic 非人手 ground truth → W53 self-retrievability 非 controlled A/B → **W54 controlled A/B**(shared frozen set ✓ 消 confounding)。**但兩個限制仍要標清**:(1) 仍非人手 ground truth(LLM Q + LLM keyword);(2) keyword-containment 係 lexical proxy(含詞 chunk ≠ 正確 answer-bearing chunk;section-anchored 問題可被多 chunk 答中 → 偏寬鬆)→ **相對信號非絕對 verdict**。docstring / 報告 / eval-methodology §10.6 三處標。

### Done(F0)
- F0 R1 phase 三件套建立(plan/checklist/progress);Phase Gate G1-G5 定義;無 H1 → 無 ADR

### Commits
- `<pending>` F0 kickoff
