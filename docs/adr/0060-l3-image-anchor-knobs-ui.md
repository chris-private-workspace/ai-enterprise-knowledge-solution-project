# ADR-0060: L3 per-doc config UI 暴露 inline marker + section 錨定旋鈕(design-stage expansion)

**Date**: 2026-06-15
**Status**: Accepted — 用戶 2026-06-15 session confirm「缺口 A」+ 揀方案 A(復用既有模式延伸)
**Approver**: Chris(技術 Lead,H1/H7 deviation)+ Stakeholder(scope)

## Context

ADR-0056 層 A 段③ 落地三層 UI(W78)+ profile 人手覆寫(W79)+ 現有 doc backfill(W80)後,做了一次
「層 A UI 可調性 gap 分析」,坐實一個缺口(**缺口 A**):

- backend `DocConfig`(`api/schemas/doc_config.py`)支援 **三個 per-doc 後處理旋鈕**的覆寫,但 **L3
  `doc-config-tab.tsx` UI 從未暴露**:
  - `enable_inline_image_markers`(W70 / ADR-0055 — 合成答案沿原文圖片位置帶 `[IMG#…]` 標記)
  - `enable_section_anchored_aux_images`(W75 / ADR-0056 段②d — un-anchored aux 圖注入同章節)
  - `section_anchor_max_per_anchor`(W75 F5 — 每錨點注入 cap,0 = 無 cap)
- `PUT /kb/{kb_id}/docs/{doc_id}/config` endpoint 已能寫呢三個欄位(backend 零缺口);純 frontend 缺口。

**H7 ground**:`enable_inline_image_markers` 喺 mockup **KB 層**有設計(`ekp-page-kb.jsx:918`
`KbTuneGroup` bool-only)+ KB 層 frontend 已落地;但 `enable_section_anchored_aux_images` +
`section_anchor_max_per_anchor` **mockup 完全冇 UI 設計**(只喺 `ekp-page-settings-tabs.jsx:92` 當唯讀欄位
名出現),**連 KB 層 frontend 都冇暴露**(W75 比 mockup 晚,當時只靠 env / `PATCH` per-KB config 設)。

把呢三個旋鈕放上 L3 = **新增 mockup 冇嘅設計元素** → 觸 H7(§5.7)。用戶 2026-06-15 vision「盡可能把功能
配置 / 調試都準備到 UI 頁面,讓用戶最大限度自行調試」+ explicit 揀**方案 A**(STOP+ask 後)。

## Decision

L3 `doc-config-tab.tsx` 新增一組「**Inline 圖文錨定**」,**復用既有 mockup-aligned component**
(`DocTuneGroup` / `DocSwitchKnob` / `DocTuneKnob` — W78 落地,對齊 KB 層 `KbTuneGroup` 模式):

- `DocTuneGroup` toggle header = `enable_inline_image_markers`(圖文錨定主 gate,對齊 mockup KB 層 inline
  marker `KbTuneGroup`)
- children(進階):
  - `DocSwitchKnob` = `enable_section_anchored_aux_images`(section 錨定 — un-anchored 圖入同章節)
  - `DocTuneKnob` = `section_anchor_max_per_anchor`(每錨點圖片上限,0 = 無 cap)

語意依賴:section 錨定(W75)靠 inline marker 機制注入 → P1_sop_imgdense preset 兩者同 ON;故 inline
marker 做主 toggle、section 錨定 + cap 做進階 children 合理。

**實作**:
- `lib/api/doc-config.ts` `DocConfig` interface 加三個 optional 欄位(mirror backend)。
- `doc-config-tab.tsx` `DOC_TUNE_KNOB_KEYS` 加三個 key → `setKnob` / `buildDraftConfig` / `dirty` /
  `overriddenCount` / `saveMutation`(`PUT /config`)**自動納入**(零新 plumbing)。
- **backend 零改動**(`DocConfig` + `PUT /config` 已支援)。

**性質**:design-stage expansion(mockup 之外的 UI 元素,**視覺零發明** — 全用既有 mockup-aligned
component);H7 deviation 用戶 explicit 批准。屬 H1-adjacent(per-doc config UI surface 擴展,但**不改**
backend contract / **不改** layout philosophy / **不改** 既有旋鈕)。

**Scope 邊界(唔做)**:
- **KB 層 section 錨定 UI** — 同樣缺(KB 層 frontend 都冇 section 錨定 UI),本 ADR 只補 doc 層(L3);
  KB 層另議。
- **Settings preset mapping 編輯**(缺口 B)— 另一獨立 phase,需 backend write API。
- **改 mockup**(方案 B)— 用戶揀方案 A,mockup 暫不動;將來補 mockup 走獨立 design sync。

## Alternatives Considered

### B. 先改 mockup 再實作
- **Reject**:最 H7-clean,但要喺 `ekp-page-doc-detail.jsx` + 對稱 `ekp-page-kb.jsx` 加 section 錨定設計
  + 實作,工作量大;用戶要快 + 復用既有模式視覺已一致。

### C. 只做 `enable_inline_image_markers`(有 mockup KB pattern)
- **Reject**:section 錨定(W75)係用戶要嘅核心「圖怎麼錨進答案」旋鈕,只做 inline marker 唔滿足
  「最大化 UI 可調」vision;且 section 錨定依賴 inline marker,一齊呈現語意完整。

### A.(採用)復用既有模式延伸
- **Accept**:全用既有 mockup-aligned component(視覺零發明)+ backend 零改動 + 一次補齊三個圖錨旋鈕;
  代價 = 一個小 ADR 記 design-stage expansion(mockup 之外 UI 元素,H7 deviation)。

## Consequences

**Positive**:
- L3 可調面 **10 → 13 旋鈕**;**section 錨定(W75)首次有 UI**(之前只能改 env / API)。
- 對齊用戶「最大化 UI 可調」vision;backend 零改動(reuse `DocConfig` + `PUT /config`)。
- 視覺零發明(既有 `DocTuneGroup`/`DocSwitchKnob`/`DocTuneKnob`)→ H7 風險最低化。

**Negative**:
- **mockup 之外的 design-stage expansion**(H7 deviation)— 用戶批准,記此 ADR;將來補 mockup 走獨立
  design sync(`ekp-page-doc-detail.jsx` + `ekp-page-kb.jsx`)。
- KB 層 section 錨定 UI 仍缺(scope 邊界,另議)→ 同一旋鈕 doc 層有 UI / KB 層冇,短期不對稱。

**Neutral**:
- backend `DocConfig` schema 不變;`PUT /config` 不變;既有 10 旋鈕不變。
- 新旋鈕 default null = 繼承 per-KB(production-preserve,未設即 bit-identical)。

## References
- 前置 ADR:ADR-0056 段③(三層 UI)/ ADR-0050(per-doc config)/ ADR-0055(W70 inline marker)/
  ADR-0040(config-scope 四層)
- 缺口分析:本 session「層 A UI 可調性 gap 分析」(缺口 A = L3 缺 3 旋鈕;缺口 B = Settings preset mapping
  唯讀)
- backend:`api/schemas/doc_config.py`(三欄位已支援)/ `PUT /kb/{kb_id}/docs/{doc_id}/config`(已寫)
- mockup:`ekp-page-kb.jsx:918`(inline marker `KbTuneGroup`)/ section 錨定 mockup 缺
- 約束:CLAUDE.md §5.7 H7(design fidelity — design-stage expansion 用戶批准)/ §5.1 H1(UI surface 擴展)
- 用戶 vision:memory `project_per_kb_tunable_config_vision`(最大化 UI 可調)
