# W53 — Chunk-Strategy Recall Comparison · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應 Day-N entry(R2)。

---

## Day 1 — 2026-06-06

### Context / kickoff
W52 closed + pushed(`ef34692`,synthetic-QA recall 基建)。用戶 pick 兩者合一下半截 = **W53 chunk-strategy 比較**(用 W52 recall 跨 strategy)。

### 決策(AskUserQuestion 2026-06-06)
- **比較軸 = 實作 `heading_aware` 真 strategy**(Chris;否決 image-cap 軸[只 image-dense 有信號] + chunk-size plumbing[較大 scope])
- **Recall 方法學 = per-config 重生 QA**(Chris;否決 shared text-anchored controlled A/B[需新 keyword harness])→ 每 strategy reindex 後由自己 chunks 重生 synthetic QA 跑 W52 strict recall,直接 reuse `run_synthetic_recall`

### R6 grep 驗證(plan kickoff — 揭三個令字面前提唔成立嘅 code-reality)
1. **chunk_strategy degenerate**:`strategies.py` —— `auto`/`layout_aware`/`slide_based` 全 delegate LayoutAwareChunker;`heading_aware` raise NotImplementedError → 冇兩個唔同 strategy 可比 → **本期實作 heading_aware**。
2. **`_select_chunker`(documents.py:137-150)只睇 `chunker_max_images_per_chunk`,IGNORE chunk_strategy** → 即使實作 heading_aware,reindex(`run_kb_reindex`→`_run_ingest_pipeline`→line 615 `_select_chunker`)都唔用佢;W46 reindex docstring(line 749-751)「chunk_strategy change takes effect」係 over-promise → **本期補 wiring,順帶 close gap**。
3. **跨 reindex chunk_id 變** → W52 strict chunk_id recall 唔能跨 strategy reuse → **per-config 重生 QA 方法學解決**(每 strategy 用自己 index 量自己 chunks)。
- LayoutAwareChunker 旋鈕:`target_tokens`/`hard_cap_tokens`/`min_chunk_merge_floor`/`max_images_per_chunk`(`layout_aware.py:78-94`)→ heading_aware reuse section-walk + token + image-cap 基礎設施,只換 split/merge policy。
- 下一個 ADR = **0044**(接 chunker lineage 0041/0042/0043)。

### heading_aware 語意(ADR-0044 核心 — kickoff lock)
section-bounded:每 heading section 盡量一 chunk,只超 `hard_cap_tokens`(embedding 8191 安全)先 split,**無 target_tokens 平衡 split、無 min-merge** → vs layout_aware(target-balanced + merge)= 更粗/少 chunk。仍 honor image-cap force-split(保 W44 圖洪保護)。

### 誠實 framing(R1/R2)
per-config 重生 QA → 每 strategy 問題集唔同(自己 chunks 生)→ recall 差異含**問題難度 confounding** → 量度 **self-retrievability(自檢索性)非 controlled A/B**;且建基 W52 synthetic recall(非人手 ground truth)。報告/docstring/ADR 三處標清。

### Done(F0)
- F0 R1 phase 三件套建立(plan/checklist/progress);Phase Gate G1-G5 定義

### Blockers / carry-over
- 無 blocker。live 比較 run 對 Azure 屬 smoke-deferred(judge cred + indexed KB + 原始檔 + Free-tier 402 繞;整合由 F4 stub 全測)。

### Commits
- (pending F0 commit)
