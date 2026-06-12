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
- `docs(planning): W65 config-test image-section-coverage kickoff`(`0c17547`)

### F1 — backend ✅(pytest 17 passed + ruff clean)
- `_image_section_count` helper(config_test.py):unique checksum 去重 → `source_section` 非空用之,
  空 fallback citation `section_path`;`RunMetrics` / `ConfigRunSummary` additive 欄位 + band 聚合。
- 4 個 unit test(多 source_section / checksum 去重 / 空 fallback / 無圖 0)+ multi-run route 斷言。

### F2 — mockup 先行同步 ✅(H7)
- `ekp-page-kb.jsx` + `ekp-page-doc-detail.jsx`:`KbTestMetric` / `DocTestMetric` 各加
  「圖片章節數」row(`sub="有圖 section 覆蓋 · proxy 非 recall"`)+ component 簽名 + call-site
  示範值(刻意講 b-1 故事:文字 sec 闊 / 圖片 imgSec 窄)。零新視覺原語。

### F3 — frontend ✅(tsc 0 + eslint 0 + vitest 11 passed)
- TS `RunMetrics` / `ConfigRunSummary` 加欄位;KB Settings panel(page.tsx)+ per-doc panel
  (doc-config-tab.tsx)各加 row;vitest fixture 補 band + **render 斷言**(兩卡都出「圖片章節數」,
  防 Potemkin)。
- 沿途清咗 stale `.next` types(tsc TS6053 同 W65 無關,清後 exit 0)。

### F4 — live 驗證 ✅(AC3)
- backend 重啟載新 code → `POST /kb/drive-images-1/config-test`(Q005,runs=1):
  `distinct_sections=4 / image_section_count=6 / fig_raw=50(cap=50 hit)/ fig_dedup=31 / cits=11`。
- **指標出世即證用處**:Q005 GT = S17–S22 六個 section,`image_section_count=6` 完全覆蓋 —
  而且 **高過文字引用 section 數(4)**(鄰居補圖嘅 `source_section` 令圖片覆蓋睇得比 citation
  section 更真)。W64 persisted preset 嘅 section 覆蓋直接喺試跑面睇到。
- code commit:`e8e61ba`(backend + mockup + frontend 同 commit,H7 mockup-first 順序喺 commit 內
  陳述)。

### Retro
- 隊列 ③ 幻影項教訓:**stale memory 會生成假工作項** — R6 grounding 唔單止防 plan-text 污染,
  亦防「隊列本身」污染;memory 已修正(標 RESOLVED + 保留歷史)。
- 範圍三段收窄(GT 型 → 輕量 proxy → 單一指標)= Karpathy §1.2 嘅實踐:每次 grounding 都發現
  「已存在」嘅部分(ref-vs-unique W43 已有 / faithfulness 三件套 W49-W51 已有)。
- 隊列剩餘:**全部卡用戶 input** — prose GT(提供文件 + 標注)/ 成功定義(image-recall vs
  section 覆蓋)/ caption 路線取捨 / 跨 KB agent 意圖釐清。可執行項至此完結。
