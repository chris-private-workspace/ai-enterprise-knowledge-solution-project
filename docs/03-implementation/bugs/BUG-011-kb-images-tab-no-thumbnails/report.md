---
bug_id: BUG-011
title: "KB Images tab renders gradient placeholder instead of real screenshot thumbnails — proxy URL available, ImageCard never <img>-renders it"
severity: Sev3          # Sev1 | Sev2 | Sev3 | Sev4 (per PROCESS.md §4.5)
status: done            # triaged | investigating | fixing | verifying | done | wont-fix
reported: 2026-05-23
reporter: "Chris(chat 2026-05-23 「在 /kb/sample-doc-with-image-1?tab=images 雖然看到圖片的數量是8, 但是看不到任何圖片內容」)"
affects_components: [C09]     # KB Detail page rendering (Admin Console UI surface)
spec_refs:
  - architecture.md §5            # Application UI tier
  - references/design-mockups/ekp-page-kb-extras.jsx ImageCard (mockup baseline — placeholder-only by prototype limitation)
related: [BUG-009, BUG-010]       # BUG-009 fixed upload; BUG-010 wired counter + private-blob proxy; BUG-011 is the last leg = frontend render
---

# BUG-011 — KB Images tab renders placeholder instead of real thumbnails

> **Report version**:1.0(initial)
> **Triage approver**:AI self-triaged **Sev3**(text retrieval / chat answer 不受影響;受影響者僅 KB Detail → Images tab 嘅縮圖**可見性**);**用戶 chat 確認開 BUG-011 + H7 deviation Option A authorized 2026-05-23**(AskUserQuestion answer:Render 真縮圖 with onError fallback)。

## 1. Symptom

BUG-009 + BUG-010 接通晒 screenshot 嘅 upload + counter + private-blob proxy 之後,用戶開 `/kb/sample-doc-with-image-1?tab=images` 仍然睇唔到任何圖片內容 —— 縮圖網格 render 嘅係 gradient + `<Layers>` icon placeholder,完全冇 render 真嘅 `<img>` element。

## 2. Reproduction Steps

1. 用一個有真實 screenshot blob 嘅 KB(`sample-doc-with-image-1`,8 張圖經 BUG-009 upload + BUG-010 counter 已 wire)
2. 開 `http://localhost:3001/kb/sample-doc-with-image-1?tab=images`
3. 預期:8 個縮圖卡每張顯示真實圖片
4. 觀察:8 個卡片,每張 hero 區係 gradient 漸層 + `<Layers>` icon + page label —— **無真實圖片內容**
5. Browser network tab:整個 page lifecycle **冇任何** `GET /kb/.../screenshots/<sha>.png` request(因為冇 `<img>` 觸發)

**Reproduction reliability**:Always(deterministic)。

**Environment**:local dev,Next.js 14 App Router,backend `http://127.0.0.1:8000`,Azurite npm 3.35.0。

## 3. Expected vs Actual

| 範疇 | Expected | Actual |
|---|---|---|
| Images tab grid hero 區 | 真實 screenshot thumbnail | gradient + `<Layers>` icon placeholder |
| Browser network `/screenshots/<sha>.png` | 8 個 GET(每張縮圖一個)| 0 個 GET |
| BUG-010 proxy 路徑端到端可見性 | UI 可見 | UI 仍唔可見(proxy 已通 — curl 200,但 `<img>` 唔觸發) |

## 4. Impact

- **Affected users / scenarios**:任何開 KB Detail → Images tab 嘅用戶 —— badge 數字準確,但內容無法 visual inspect。
- **Workaround available?**:技術用戶可以直接 curl proxy URL 或開 browser address bar paste blob URL —— 非實用 workaround。
- **Data loss / corruption?**:No(圖片 blob 本身存喺 Azurite,proxy 有效)。
- **Security implication?**:No(proxy route 維持 private blob 模型;呢個 bug 只係 render 層唔接)。

## 5. Severity Justification

**Sev3** per `PROCESS.md §4.5`:text retrieval / Gate 1 / chat 答案文字完全正常;chat 內 `<ImageGallery>` 引用渲染獨立成立(BUG-010 已 wire,亦會走 proxy URL);受影響僅 KB Detail → Images tab 嘅圖片**可見性**。無 data loss、無 security regression。對「KB image gallery 功能」係硬 blocker。Sev3 → **無需 postmortem**。

## 6. Initial Diagnosis(root cause confirmed)

2026-05-23 經 frontend code review + browser network panel + BUG-010 proxy probe 逐項確認:

- **Root cause**:`frontend/app/(app)/kb/[id]/page.tsx` 嘅 `ImageCard` 組件(line 890-981)hero 區只 render gradient + `<Layers>` icon + page label,**完全冇 `<img>` element**。`KbImageItem.url`(BUG-010 之後已係 `/kb/{kb_id}/screenshots/{sha}.png` 絕對 proxy URL)從未喺 JSX 入面被 reference。
- **Why it stayed dormant**:呢個組件係 W22 frontend presentation rebuild 時寫嘅(`b22b2d2` / W22 F6 KB cluster);當時整條 screenshot pipeline 因 R12(Azurite 403)從未端到端跑通 —— 所以個 placeholder 係「臨時佔位」,等 pipeline 通咗先 wire。BUG-009 + BUG-010 通咗 backend 一側,呢個係**最後一段未接嘅 frontend leg**。
- **Mockup precedent**:`references/design-mockups/ekp-page-kb-extras.jsx:100-152` 嘅 mockup `ImageCard` 自己都係 render gradient + `<IcLayers>` placeholder(連 `ImageDetailModal` `:170-184` preview 區都係 placeholder,`blob_url` 當文字顯示)—— 因為 mockup 係**冇 image server 嘅靜態 HTML prototype**,placeholder 係 prototype 技術限制,**唔係刻意嘅設計**。

**H7 deviation Option A authorized**(用戶 2026-05-23 AskUserQuestion answer)— 把 130px gradient hero 換成 `<img src={img.url}>` `object-fit: cover`,保留 page label overlay + `screenshot_type` badge + ocr_text/doc_name lower section;`onError` 時 fall back 返現有 gradient + Layers placeholder。**Mockup 嘅 placeholder render 由「全部 placeholder」→「有圖時真縮圖,無圖 / 載入失敗時 placeholder」** —— 屬於 mockup 嘅 prototype 限制嘅實作層 reconciliation,而非 redesign。

非架構 / vendor / storage-layout 改動(純 frontend component render layer)→ **唔觸發 H1 / H2,唔需 ADR**。**H7 deviation 已 surfaced + authorized**(per CLAUDE.md §5.7 H7 Required behavior steps 1-3 全部 satisfied),proceed implement。

## 7. Acceptance for Fix(checklist preview)

- [x] Root cause confirmed — `ImageCard` 從未 reference `img.url` 進行 `<img>` render
- [x] H7 deviation Option A authorized(2026-05-23 AskUserQuestion answer)record 入 progress.md
- [x] **Fix** — `frontend/app/(app)/kb/[id]/page.tsx` `ImageCard`(line 890+):130px gradient hero 換成 `<img src={img.url} alt={img.ocr_text || 'screenshot'}>` `object-fit: cover`;`useState` for `imgError`;`onError` 時 fall back 返 gradient + `<Layers>` placeholder;保留 page label overlay + 下方 ocr_text/doc_name/badge
- [x] H7 design fidelity self-verify — 整個 card layout(borderRadius / overflow / 130px hero height / lower section spacing / typography)維持 mockup-faithful;只係 hero 區 inner content 換 placeholder → real-image-with-fallback
- [x] Verify gates — `pnpm exec tsc --noEmit` exit 0;`pnpm exec next lint` clean;`Grep '[oklch'` count = 0 milestone preserved;frontend dev server boot OK(:3001 returns 307 redirect to login = auth-gate active = expected)
- [ ] Runtime verify — 🚧 **user pre-Beta smoke**(Chrome MCP extension 未連線):browser 開 `/kb/sample-doc-with-image-1?tab=images` → 8 真縮圖 + 0 placeholder + network 8 × `GET /screenshots/<sha>.png` 200。Backend proxy 本身 BUG-010 已 curl-verified;chat page 用同樣 pattern 已 production
- [x] **Out of scope(不修)**:`ImageDetailModal`(mockup `:154` `onClick` → modal)—— 現有 frontend `ImageCard` 冇 `onClick` / 冇 modal wired,屬 W20 F5 mockup-expansion 未實作 scope(non-existent feature,非 regression);BUG-011 只修 grid card thumbnail render

## 8. Report Changelog

| Date | Change | Reason | Approver |
|---|---|---|---|
| 2026-05-23 | Initial triage(Sev3)+ H7 deviation Option A authorized — BUG-009/010 接通後驗證 `/kb/.../images?tab=images` 8 圖仍 placeholder render;隔離出 frontend `ImageCard` 從未 reference `img.url`;mockup placeholder 屬靜態 prototype 限制,H7 deviation surface 後用戶 AskUserQuestion 揀 Option A | BUG-010 通晒 proxy URL 後 dormant frontend leg 浮現 | Chris(chat-confirm + AskUserQuestion 2026-05-23)|

---

**Lifecycle reminder**:Sev3 → `postmortem.md` 不需要(only Sev1/Sev2 mandatory per `PROCESS.md §4.5`)。
