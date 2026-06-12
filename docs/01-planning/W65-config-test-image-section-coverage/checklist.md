# W65 — checklist(config-test 圖片 section 覆蓋 proxy)

## F1 — backend
- [ ] `api/schemas/config_test.py`:`RunMetrics.image_section_count: int` + `ConfigRunSummary.image_section_count: MetricBand`(additive,docstring 註明 proxy 非 recall)
- [ ] `api/routes/config_test.py`:run loop 計算(unique checksum 去重 → source_section 非空用之,空就 fallback citation.section_path)+ band 聚合
- [ ] `tests/test_config_test_route.py`:多 section / 重複圖 / 空 source_section fallback / 無圖 0 — 4 case
- [ ] pytest 該檔全綠 + ruff clean

## F2 — mockup sync(H7,行先過 F3)
- [ ] `references/design-mockups/ekp-page-kb.jsx`:KbTestMetric 加「圖片章節數」row(`sub="有圖 section 覆蓋 · proxy 非 recall"`)
- [ ] `references/design-mockups/ekp-page-doc-detail.jsx`:DocTestMetric 同款 row

## F3 — frontend
- [ ] TS `ConfigRunSummary` interface 加 `image_section_count: MetricBand`
- [ ] `kb/[id]/page.tsx` ConfigTestPanel 加 row(沿用現有 metric row 組件)
- [ ] `doc-config-tab.tsx` DocConfigTestPanel 加 row
- [ ] tsc + lint clean + vitest 相關 suite 綠

## F4 — live 驗證 + 收爐
- [ ] backend 重啟(載新 code)+ config-test 一跑,KB 級 + doc 級新 row 出數(AC3)
- [ ] rollup §4.5 doc-sync(W65 + 隊列 ③ 幻影項修正記錄)
- [ ] plan closeout + progress retro
