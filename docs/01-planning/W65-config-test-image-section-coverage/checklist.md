# W65 — checklist(config-test 圖片 section 覆蓋 proxy)

## F1 — backend
- [x] `api/schemas/config_test.py`:`RunMetrics.image_section_count: int` + `ConfigRunSummary.image_section_count: MetricBand`(additive,docstring 註明 proxy 非 recall)
- [x] `api/routes/config_test.py`:run loop 計算(unique checksum 去重 → source_section 非空用之,空就 fallback citation.section_path)+ band 聚合
- [x] `tests/test_config_test_route.py`:多 section / 重複圖 / 空 source_section fallback / 無圖 0 — 4 case + multi-run route 斷言
- [x] pytest 該檔全綠(17 passed)+ ruff clean

## F2 — mockup sync(H7,行先過 F3)
- [x] `references/design-mockups/ekp-page-kb.jsx`:KbTestMetric 加「圖片章節數」row(`sub="有圖 section 覆蓋 · proxy 非 recall"`)+ 簽名 + call-site 示範值
- [x] `references/design-mockups/ekp-page-doc-detail.jsx`:DocTestMetric 同款 row

## F3 — frontend
- [x] TS `RunMetrics` / `ConfigRunSummary` interface 加欄位
- [x] `kb/[id]/page.tsx` ConfigTestPanel 加 row(沿用 ConfigMetric)
- [x] `doc-config-tab.tsx` DocConfigTestPanel 加 row
- [x] tsc exit 0(清 stale `.next` types 後)+ eslint 0 + vitest 11 passed(含「圖片章節數」雙卡 render 斷言)

## F4 — live 驗證 + 收爐
- [x] backend 重啟(載新 code)+ config-test 一跑出數:Q005 `image_section_count=6` = GT S17–S22 全覆蓋(AC3)
- [x] rollup §4.5 doc-sync(W65 + 隊列 ③ 幻影項修正記錄)
- [x] plan closeout + progress retro(code commit `e8e61ba`)
