---
bug_id: BUG-011
report_ref: ./report.md
status: done
last_updated: 2026-05-23
---

# BUG-011 — Checklist

> Derived from `report.md §7 Acceptance for Fix`。延後項標 🚧 + reason(per CLAUDE.md sacred rule — 唔可以刪未勾 `[ ]`)。

## Investigation

- [x] **T1** — Root cause confirmed:`frontend/app/(app)/kb/[id]/page.tsx` `ImageCard`(line 890-981)hero 區只 render gradient placeholder,從未 reference `img.url` 做 `<img>` render
- [x] **T2** — Mockup precedent confirmed:`references/design-mockups/ekp-page-kb-extras.jsx:100-152` mockup `ImageCard` 同樣係 gradient placeholder(prototype 技術限制 — modal preview + blob_url 都係 text-only);**H7 deviation Option A authorized** 2026-05-23 via AskUserQuestion

## Fix

- [x] **T3** — `frontend/app/(app)/kb/[id]/page.tsx` `ImageCard`:130px gradient hero 換成 conditional `<img src={img.url} alt={img.ocr_text || 'screenshot'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}>` + `onError` → `setImgError(true)` fallback 返 gradient + `<Layers>` placeholder
- [x] **T4** — `useState<boolean>` for `imgError` per-card local state(component 由 pure function → stateful client component — `page.tsx` 本身已 `"use client"`,`useState` line 56 已 import)
- [x] **T5** — 保留 page label overlay(`p.{page_num}` 或 `—`)+ 下方 ocr_text(2-line clamp)+ doc_name + `screenshot_type` badge —— 100% 維持 mockup lower section fidelity

## Regression Test / Visual Verify

- [x] **T6** — H7 self-verify(per CLAUDE.md §12 Frontend fidelity check):card outer container 全部 unchanged;130px hero height unchanged;page label overlay position unchanged;lower section unchanged;只係 hero 區 inner content 由 always-placeholder → conditional real-`<img>`-with-onError-fallback。Mockup `ImageCard` 整體 card 結構維持 100% 對應
- [x] **T7** — Empty state regression — `items.length === 0` 分支(「No images extracted yet」)+ Loading skeleton banner + Error banner 都喺 `ImagesTab` 嘅 outer ternary,**未改動**;BUG-011 edit 只 scoped 喺 `ImageCard` 內部
- [ ] **T8** — Browser smoke 🚧 **user pre-Beta smoke**:Chrome MCP extension 未連線(同 W12-W18 / W20-W24 carry-over pattern);automated gates 全 green;backend proxy URL 本身 BUG-010 已 curl-verified HTTP 200 / image/png;chat page 用同樣 `<img>` + proxy URL pattern 已 production;BUG-011 edit structurally inherits 同樣 wiring

## Verification

- [x] **T9** — `pnpm exec tsc --noEmit` → **exit 0**(zero output)
- [x] **T10** — `pnpm exec next lint` → **✔ No ESLint warnings or errors**
- [x] **T11** — `Grep '[oklch'` in `frontend/` = **0 occurrences across 0 files**(milestone preserved)
- [x] **T12** — Re-run report.md §2 repro steps mapped to T8 — `<img>` element 現存喺 DOM(non-placeholder branch),browser request 會 fire proxy URL,fallback 路徑 onError-tested(structural) 但 jsdom 唔 fire 真 image load,所以 visual round-trip 屬 user pre-Beta smoke

## Closeout

- [x] **T13** — `progress.md` closeout summary(Day 1 timeline + root cause + H7 deviation rationale + fix summary + lessons)written
- [x] **T14** — `report.md` status `triaged → done`;`checklist.md` `in-progress → done`
- [x] **T15** — Commit 將會 reference progress.md Day 1 entry(R2)

---

## Cross-Cutting

- [x] **C1** — No ADR — H1(無架構/vendor/storage-layout 改動 — 純 frontend render layer)+ H2(無新 dependency)均不觸發
- [x] **C2** — H5 — N/A(無 secret / PII / plaintext-prompt-logging 觸碰;`<img>` GET 走 BUG-010 proxy route,blob 維持 private,auth 走現有 cookie session)
- [x] **C3** — H6 — N/A(`page.tsx` 不在 backend pipeline mandatory test list;frontend UI test nice-to-have)— **無新 Vitest 寫**:`ImageCard` 視覺 render 屬於 H7 user-eye verify domain,Vitest unit 對 `<img>` `onError` fallback 嘅斷言屬 low ROI(jsdom 唔 fire 真 image load lifecycle)
- [x] **C4** — H7 design fidelity — **deviation Option A explicitly authorized**(per CLAUDE.md §5.7 H7 Required behavior steps 1-3 satisfied via AskUserQuestion 2026-05-23);self-verify card-shell fidelity per T6 passed
- [x] **C5** — Commit references `progress.md` entry per R2
- [x] **C6** — `report.md` status flip + `checklist.md` flip + `progress.md` closeout summary per R2/R3
