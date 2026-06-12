# W65 — progress(config-test 圖片 section 覆蓋 proxy)

## Day 1(2026-06-12)— kickoff

### 隊列修正(重要)
- 用戶指示「繼續下一項按隊列係 ③(W65)」→ R6 grounding 發現 **隊列 ③ 係幻影項**:
  faithfulness 抗噪三件套早已完成(W49 N-run band = 決策 7 Option 1 / W50 length-bias
  affordance / W51 distinct_sections 對沖),roadmap 明文「決策 7 → ✅ RESOLVED」。
  根源 = memory `project_per_kb_tunable_config_vision` 發現 ⑤⑥(2026-06-06 寫)stale —
  **memory 已修正**(標 RESOLVED + 保留歷史 context)。
- 隊列直接跳 ④;用戶 AskUserQuestion 揀「**輕量 proxy 先行**」(GT 型 image-recall 留
  成功定義拍板後)。
- 再 grounding 收窄:`figure_count_raw/dedup`(ref vs unique)**已存在**(W43)→ W65 範圍
  = 單一新指標 `image_section_count`(W51 文字 proxy 嘅圖片版鏡像)。

### R6 核實(詳 plan.md 頭注)
- 計算位 config_test.py:119-134 / band :147-156;前端 row pattern page.tsx:2335 + mockup
  ekp-page-kb.jsx:1155 + ekp-page-doc-detail.jsx:652;`ImageRef.source_section`(BUG-026)
  資料來源,空值 fallback citation.section_path。

### 三件套 committed(R1 gate)
- `docs(planning): W65 config-test image-section-coverage kickoff`
