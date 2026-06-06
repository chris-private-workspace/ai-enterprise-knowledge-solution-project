# ADR-0044: heading_aware chunk strategy(section-bounded)+ chunk_strategy ingest wiring

**Date**: 2026-06-06
**Status**: Accepted
**Approver**: Chris

## Context

W53(兩者合一下半截)要用 W52 嘅 self-supervised synthetic recall harness **跨 `chunk_strategy` 比較** ingestion 質素。但 think-before-coding(CLAUDE.md §1.1)+ R6 grep 揭咗三個令字面「跨 chunk_strategy 比較」唔成立嘅 code-reality:

1. **`chunk_strategy` 比較係 degenerate**:`backend/ingestion/chunker/strategies.py` —— `auto` / `layout_aware` / `slide_based` **全部 delegate 去同一個 `LayoutAwareChunker`**(對 docx/pdf 產生 bit-identical chunks),而 `heading_aware` **`raise NotImplementedError`**(W3+ deferred,從未實作)。即係**冇兩個真正唔同嘅 `chunk_strategy` 可比較**。

2. **reindex 路徑 `_select_chunker`(`backend/api/routes/documents.py:137`)只睇 `chunker_max_images_per_chunk` cap,完全 IGNORE `chunk_strategy`**。`run_kb_reindex` → `_run_ingest_pipeline` → `_select_chunker(deps, kb_config)` 永遠回 LayoutAwareChunker(global singleton 或 per-cap factory)。`run_kb_reindex` docstring(line 749-751)寫住「a UI `chunk_strategy` change takes effect」,實際 **over-promise** —— chunk_strategy 從未 wired 入 ingest chunker 選擇。

3. **跨 reindex chunk_id 會變**(不同 chunking → 不同邊界 → 不同 chunk_id)→ W52 strict chunk_id recall 唔能跨 strategy 直接 reuse(由 W53 方法學決策「per-config 重生 QA」解決,非本 ADR 範圍)。

Chris AskUserQuestion(2026-06-06)揀:**比較軸 = 實作 `heading_aware` 真 strategy**(令 `chunk_strategy` 真正有兩個唔同選項可比)+ Recall = per-config 重生 QA。

`heading_aware` 改變 chunking 行為(`architecture.md §3.3` Multi-Format Strategy + §3.5 chunking + §4.5 `KbConfig.chunk_strategy` enum 已列但 deferred)→ 觸發 H1(CLAUDE.md §5.1)→ 本 ADR。接 chunker ADR lineage(0041 image-density / 0042 per-KB cap / 0043 reindex)。

## Decision

**(a) `heading_aware` = section-bounded 粗粒度 chunking。**
語意:每個 heading-bounded section 盡量做**一個** chunk,**只**喺累積超過 `hard_cap_tokens`(retrieval / embedding 安全線,維持 LayoutAwareChunker 既有 1500)先 split;**取消** `target_tokens`(500)嘅 sub-hard-cap 平衡 split;**取消** adjacent-short-merge。仍保留 image-cap force-split(ADR-0041 W44 圖洪保護)、table-as-chunk、low_value_flag、section_path heading-walk。

對比 `layout_aware`(target-balanced split @500 + merge tiny sub-sections)→ `heading_aware` 產生**更粗、更少** chunk。呢個係兩個 chunking policy 嘅乾淨 A/B:**target-balancing + merge ON(layout_aware)vs OFF(heading_aware)**,兩者同一 `hard_cap` + 同一 image-cap,隔離變量。

**實作 = thin subclass(Karpathy zero parsing rewrite)**:`HeadingAwareChunker(LayoutAwareChunker)`(`backend/ingestion/chunker/heading_aware.py`)`__init__` 設 `target_tokens = hard_cap_tokens`(令 soft-target flush 只喺 hard_cap 觸發)+ `min_chunk_merge_floor = 0`(令 `_should_merge` 對所有 chunk return False → 永不 merge),其餘 section-walk / token-count / image-cap / table / low_value 全 reuse 父類 `chunk()` 同 helper,零重寫。

**(b) `chunk_strategy` wiring 入 ingest 路徑。**
- `strategies.select_chunker`:`heading_aware` → `HeadingAwareChunker()`(移除 `NotImplementedError`)。
- `documents.py _select_chunker(deps, kb_config)`:按 `kb_config.chunk_strategy` dispatch —— `heading_aware` → `HeadingAwareChunker`(combine per-KB image-cap);其餘(`layout_aware` / `slide_based` / `auto`)→ 既有 LayoutAwareChunker path(`deps.chunker` singleton 或 `deps.make_chunker(cap)` factory,**strategy≠heading_aware 時 bit-identical fall-through**)。
- 順帶 close 發現 2 嘅 W46 reindex over-promise gap —— reindex 之後 `chunk_strategy` 真正生效。

## Alternatives Considered

- **比較軸 = `chunker_max_images_per_chunk`(圖數 cap)**:唯一已 wired 嘅 per-KB ingestion 旋鈕,但**只對 image-dense 文件有信號**(text-only KB 變 cap 幾乎無效)。Chris 否決(揀真 chunk_strategy 分化)。
- **比較軸 = chunk size(`target_tokens` / `hard_cap_tokens`)per-KB exposed**:真正改 chunk 邊界(任何文件都有信號),但 `target_tokens` 等未 per-KB exposed → 需新 plumbing 入 `KbConfig` schema + reindex pipeline(較大 scope,KbConfig schema 改 = 額外 H1)。否決(scope)。
- **維持 degenerate(唔實作 heading_aware)**:W53 無法做有意義比較。否決。
- **`heading_aware` = 純 section-bounded 無 hard_cap split**:section >8191 token 爆 embedding limit。否決(R1 安全)→ 保留 hard_cap split。
- **`heading_aware` 用更高 hard_cap(近 8191)**:更「純」section-bounded 但引入新 hard_cap 值 + 更大 chunk(retrieval precision concern)+ 唔再隔離變量。否決(揀同一 hard_cap,乾淨隔離 target-balancing/merge 變量)。
- **dedicated 全新 chunker class(非 subclass)**:重複 section-walk / token / image-cap 邏輯,違反 Karpathy §1.2 + §1.3。否決(thin subclass 已達「真 strategy」目的 + 最大 reuse)。

## Consequences

- **Positive**:`chunk_strategy` enum 真正有兩個唔同選項;W53 recall 比較有真信號;順帶 close W46 reindex `chunk_strategy` over-promise gap(reindex 真 honor strategy);zero parsing rewrite(subclass reuse);strategy≠heading_aware 時 ingest 行為 bit-identical(零 regression risk)。
- **Negative**:多一個 chunker class + dispatch 分支需維護;`heading_aware` 粗 chunk 可能 retrieval precision 較低(屬比較實驗預期觀察,非缺陷)。
- **Neutral**:`heading_aware` 仍受 image-cap(ADR-0041)+ hard_cap 約束;per-config 重生 QA 嘅 recall = self-retrievability 非 controlled A/B(W53 方法學誠實 framing,非本 ADR)；chunk-size per-KB plumbing 留更未來。

## References
- `architecture.md` §3.3(Multi-Format Strategy)+ §3.5(chunking)+ §4.5(`KbConfig.chunk_strategy`)
- ADR-0041(chunker image-density deep fix)/ ADR-0042(per-KB ingest-time image cap)/ ADR-0043(original-file storage + KB-level reindex)
- ADR-0004(layout-aware chunking — not character-based)
- W52 `backend/eval/synthetic_qa.py`(self-supervised recall harness — W53 per-config reuse)
- `backend/ingestion/chunker/strategies.py` + `layout_aware.py` + `backend/api/routes/documents.py:_select_chunker`
- CLAUDE.md §5.1 H1(architectural change — chunking 行為改 → ADR)
