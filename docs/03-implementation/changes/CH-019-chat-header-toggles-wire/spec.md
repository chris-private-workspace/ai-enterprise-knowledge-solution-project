---
id: CH-019
title: Chat header 三個裝飾掣 wire 上真行為(CRAG / Show images / Focus mode)
status: done            # proposed → 用戶 2026-07-03 approve → 實作完成 + tsc/eslint 綠(manual smoke 留用戶)
created: 2026-07-03
requester: 用戶(2026-07-03 測試發現三掣「有殼無行為」,揀 (a) 三個一齊 wire)
---

# CH-019 — Chat header 三掣 wire

## 1. 背景

W22 F4 mockup direct-copy(H7)重現咗 chat header 四個右側控件嘅視覺,但只 wire 咗 Sources 掣;**CRAG switch / Show images switch / Focus mode eye 三個一直係靜態裝飾**(`chat/page.tsx:995-1010`:switch 係無 onClick 嘅 `<span data-on="true">`,Focus button 無 onClick)。用戶 2026-07-03 測試發現,揀「三個一齊 wire」。

**前置查證**:`QueryRequest`(`lib/api/query.ts:67`)已有 `enable_crag?: boolean`;backend `query.py:445` 已 gate(schema 預設 `True`)→ CRAG wire **零 backend 改動**。Focus 所需嘅兩個收合機制(`historyCollapsed` / `sourcesCollapsed`)已存在。

## 2. 行為規格(三件)

### ① CRAG switch
- `useState(true)`(預設 on,對齊 backend `enable_crag: bool = True`)。
- 撳 switch → toggle;`data-on` 綁 state(mockup switch 樣式本身支援 `data-on` 兩態,無新視覺)。
- 送 query 時傳 `enable_crag: cragEnabled` 落 `streamQuery` body。
- Off 時該條 query 唔行 CRAG L2 self-correction(答案唔會出 CRAG strip);only per-query,唔持久化。

### ② Show images switch
- `useState(true)`(預設 on = 現行行為)。
- Off = **顯示層藏圖**:answer 內 inline 交織圖 + 末尾 gallery 唔 render(圖照收、citations 照到,切返 on 即時重現 — 唔改 query / 唔改 recall)。
- **範圍界定**:只藏 assistant 訊息內圖片;Sources panel / citation 縮圖不受影響(mockup 無定義,取最保守解釋)。

### ③ Focus mode(hide all panels)
- `useState(false)`。
- On → `historyCollapsed=true` + `sourcesCollapsed=true`(一鍵收兩 panel);off → 兩者還原 `false`。
- Eye button active 時加 `background: oklch(var(--muted))` highlight —— 沿用隔籬 BookOpen 掣嘅現有 active pattern(一致,無新視覺發明)。
- 簡單版語義:focus off = 兩 panel 都開(唔記住 focus 前嘅個別狀態)。

## 3. 唔做(out of scope)

- 三個 state 都唔持久化(session 內 per-page;localStorage 持久化 = 另議)。
- `enable_intent_routing` 等其他 query 旋鈕唔加掣。
- Sources panel 內圖 / Image Library 行為不變。
- Backend 零改動。

## 4. H7 考量

Mockup 係靜態 demo,三掣本來就有視覺無行為;wire 行為唔改 visual output(switch `data-on` 兩態樣式 mockup 已有;Eye active highlight 沿用既有 BookOpen pattern)→ 唔觸 H7 deviation。

## 5. 驗證

- `tsc` / `eslint` exit 0。
- Manual smoke checklist:CRAG off 送 query → 無 CRAG strip(可再 on 對比);Show images off → 圖即藏、on → 即現(免重送);Focus on → 兩 panel 收 + eye highlight,off → 還原;Sources 掣原行為無 regression。
- UI component test 屬 nice-to-have(H6 不涵蓋)— 唔加(三個純 display-state wire)。

## 6. 實作記錄(2026-07-03,單檔 `app/(app)/chat/page.tsx`)

- Parent 加三個 session-only state(`cragEnabled` / `showImages` / `focusMode`)+ focus handler(一鍵 set 兩個既有 collapse state)。
- `streamQuery` body 加 `enable_crag: cragEnabled`(零 backend 改動)。
- ChatHeader:兩個 switch 由靜態 span 改互動(`role="switch"` + `data-on` + `tabIndex` + onClick/onKeyDown,跟 `settings-doc-profiling.tsx` 既有 pattern);Eye 掣 wire `onToggleFocus` + active highlight(沿用 BookOpen pattern)+ title 兩態。
- `showImages` 經 ChatThread → MessageRow 傳落:off → `imagePlan=null`(AnswerBodyMarkdown 走既有 marker-strip 路)+ `trailingImages=[]`(0 gallery groups);圖照收,switch 返 on 即時重現免重送。

## 7. Changelog

| 日期 | 動作 | 決定人 |
|---|---|---|
| 2026-07-03 | spec 建立(proposed) | 用戶 |
| 2026-07-03 | 用戶 approve → 實作完成;`tsc` exit 0 / `eslint` exit 0(唯一 warning 係 pre-existing no-img-element,line 1978 非本次);manual smoke 留用戶(§5 清單) | 用戶(2026-07-03) |
