---
phase: W65
name: config-test-image-section-coverage
status: active       # draft | active | closed
created: 2026-06-12
owner: "Claude (AI) — 技術 Lead Chris 審閱"
gap: "差距 ④ 輕量切法(用戶 2026-06-12 揀「輕量 proxy 先行」)— 試跑面板圖片軸補無需 GT 嘅 section 覆蓋 proxy"
adr: null            # additive response metric(W48/W51 precedent),零 schema 遷移 / 零 vendor / 零 pipeline 行為改動 → 無 ADR
spec_refs:
  - docs/01-planning/W51-config-test-completeness-proxy/   # 文字版 distinct_sections precedent(本指標 = 圖片版鏡像)
  - docs/01-planning/W63-q005-section-miss-diagnosis/      # b-1 section-miss + ref-vs-unique 發現(動機)
  - docs/03-implementation/bugs/BUG-026-*                  # ImageRef.source_section propagate(資料來源)
---

# W65 — config-test 圖片 section 覆蓋 proxy

> **緣起**:隊列 ④ 原案(GT 型 image-recall 入 UI)經 R6 grounding 收窄:`figure_count_raw/dedup`
> (ref vs unique)**已存在**(W43);faithfulness 抗噪三件套(W49/W50/W51)**已完成**(決策 7
> RESOLVED — 原隊列 ③ 係 stale memory 生成嘅幻影項,memory 已修正)。真正缺口得一個:
> **圖片軸冇 section 覆蓋 proxy** — W51 `distinct_sections` 係文字覆蓋,但圖片可以集中喺一個
> section(W63 b-1 形態:Setup 章圖全失,文字覆蓋睇唔出)。用戶揀「輕量 proxy 先行」,
> GT 型 recall 留成功定義拍板後。
>
> **R6 核實**:計算位 `backend/api/routes/config_test.py:119-134`(RunMetrics 構建)+ band 聚合
> `:147-156`;schema `api/schemas/config_test.py`(RunMetrics / ConfigRunSummary);前端 row pattern
> `frontend/app/(app)/kb/[id]/page.tsx:2335-2344`(`KbTestMetric` 式 k/v/sub/band)+
> `doc-config-tab.tsx` 對應;mockup 落點 `references/design-mockups/ekp-page-kb.jsx:1155-1156` +
> `ekp-page-doc-detail.jsx:652-653`(現有 row 組件,零新視覺原語);`ImageRef.source_section`
> (api/schemas/query.py:18,BUG-026 C-ii propagate)= 指標資料來源,舊 KB 未 reindex 時可能空
> → fallback 用 citation.section_path。

## 1. 指標定義

**`image_section_count`** = 該 run 返回圖片(以 checksum 去重後)所覆蓋嘅 distinct section 數。
每張 unique 圖嘅 section key = `tuple(img.source_section)`(非空)否則 fallback
`tuple(citation.section_path)`(空 source_section = 舊 ingest)。Per-run int + N-run `MetricBand`,
與 `distinct_sections` 並列判讀(文字覆蓋廣 + 圖片覆蓋窄 = b-1 風險信號)。

## 2. 交付物 + Gate

| # | 交付 | Gate |
|---|---|---|
| **F1** | backend:`RunMetrics.image_section_count` + `ConfigRunSummary.image_section_count`(additive)+ route 計算 + `test_config_test_route.py` 新 cases(含 source_section 空 fallback) | pytest 該檔全綠 + ruff clean |
| **F2** | mockup sync(H7,DD-5 pattern):`ekp-page-kb.jsx` + `ekp-page-doc-detail.jsx` 各加一行 `圖片章節數` row(沿用 KbTestMetric / DocTestMetric) | 兩 mockup 與 frontend 文案一致 |
| **F3** | frontend:TS type + KB panel(page.tsx)+ doc panel(doc-config-tab.tsx)各加 row | tsc + lint clean + vitest 相關 suite 綠 |
| **F4** | live 驗證(config-test 一跑,新 row 出數)+ doc-sync(rollup §4.5 + 隊列修正記錄)+ closeout | 判決寫低 |

## 3. Acceptance Criteria

- **AC1**:backend 新欄位 additive(舊 client 不破壞),per-run + band 計算正確(unit test 含:
  多 section 圖 / 重複圖只計一次 / source_section 空 fallback / 無圖 = 0)。
- **AC2**:H7 — mockup 與 frontend 同步落地,row 沿用現有組件(零新視覺原語 = fidelity by
  construction);文案兩邊一致。
- **AC3**:live config-test 跑一次,新 row 喺 KB 級 + doc 級兩個 panel 都出數。
- **AC4**:零 pipeline 行為改動(只讀 response 計 counter)→ 無 ADR;隊列 ③ 幻影項修正記錄落
  rollup(防止 stale memory 再生成)。

## 4. 風險

- **R1 🟢 source_section 空**(舊 ingest):fallback citation.section_path,test 覆蓋。
- **R2 🟢 vitest 文案斷言**:nested `<b>` 多 match 坑(W49/W50 教訓)— 斷言用 leaf node。

## 5. 非目標

- ❌ GT 型 image-recall / per-KB GT 儲存(等成功定義)。
- ❌ 改 `cap_images_per_answer` dedup 行為(W63 H1-adjacent 候選,獨立決策)。
- ❌ 新視覺組件 / panel 重排(H7 — 只加 row)。

## 6. H 核對

- **H1**:additive response metric(W48/W51 precedent)→ 不觸;**H6**:config-test route 非強制
  名單但跟 W43-W51 precedent 補 test;**H7**:mockup 先行同步(F2 行先過 F3),沿用現有 row
  組件;**H5**:無 secret / 無 .env。

## 7. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-06-12 | Initial plan(active)| 隊列 ④ 輕量切法;R6 發現 ref-vs-unique 已存在 + 隊列 ③ 係已完成項(W49/W50/W51)→ 範圍收斂至單一 image_section_count 指標 |
