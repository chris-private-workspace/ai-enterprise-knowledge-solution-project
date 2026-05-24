---
bug_id: BUG-020
report_ref: ./report.md
status: done
last_updated: 2026-05-24
---

# BUG-020 — Checklist

> Derived from `report.md §6 Acceptance for Fix`。Sev2 H7 fidelity regression。

## Investigation

- [x] **T1** — Audit `frontend/app/(app)/chat/page.tsx` line 1163-1164 `citationMode === 'inline'` gate identified;line 166 `citationMode` hard-coded `'sidebar'`;pills 永遠唔 render
- [x] **T2** — Audit `InlineCitationPills`(line 1238)— numeric badges only,使用 HTML `title` tooltip,**冇 mockup line 515-578 完整 hover popover** mechanism
- [x] **T3** — Audit `ImageGallery` gate(line 1175)`>= 2` mockup-conforming behavior;user query data 1 image case 觸發 skip
- [x] **T4** — Mockup `references/design-mockups/ekp-page-chat.jsx` line 515-578 CitationPill function definition reviewed:per-pill `hoverState` + absolute popover with file icon + doc title + section path + preview text + relevance score
- [x] **T5** — Live `/query` probe verified citation/image distribution patterns:typical query 1-6 citations,圖片實際分布 1 image per query(W25 D2 dataset)

## Fix — Code

- [x] **T6** — `frontend/app/(app)/chat/page.tsx`:Remove `citationMode === 'inline'` gate(原 line 1163);CitationPillsRow 改為 unconditional render when `!message.isStreaming && message.citations.length > 0`;render 出 answer body div 之後作為 discrete row(per mockup line 326 footer meta row pattern + line 515-578 CitationPill function structure)
- [x] **T7** — Replace `InlineCitationPills` numeric-only-with-title row with mockup-faithful **`CitationPillsRow` + `CitationPill`** pair:per-pill `useState(hovered)` + absolute-positioned popover overlay(`FileTypeChip` + doc title + relevance score + section path + chunk title — preview text fallback to chunk_title since Citation schema 冇 `preview` field)
- [x] **T8** — NEW **`SingleScreenshotStrip`** function:`imageCitations.length === 1` 觸發;compact visual(「Single screenshot」label + 220px thumbnail card + doc title + section path footer + click → modal);place 渲染在 InlineImageCard map 之後 + ImageGallery `>=2` 之前(per user-pick hybrid option 3 — mockup `>=2` gate preserved + 1-image case fills collective-section UX gap)
- [x] **T9** — File header comment lines 46-58 amendment:remove「CitationPill」from misleading「abstractions not matching mockup component breakdown」list + 加 6-line 解釋 BUG-020 restoration:CitationPill hover popover from mockup line 515-578 + double-pattern「W22 silent drop + gating misconfiguration」+ SingleScreenshotStrip user-pick hybrid option 3 deviation

## Tests

- [x] **T10** — `frontend/tests/unit/chat-meta-row.test.tsx` 加 2 NEW BUG-020 tests:
  - `renders "Single screenshot" mini-section for exactly 1 image citation`(verify === 1 branch + ImageGallery skipped)
  - `renders citation pills unconditionally after answer body`(verify gate removal — pill + panel idx 同時出現)
  - Existing `Referenced screenshots gallery for 2+ image citations` unchanged
- [x] **T11** — `pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → **5/5 pass**(3 existing + 2 NEW)

## Verification

- [x] **T12** — `pnpm exec tsc --noEmit` → exit 0
- [x] **T13** — `pnpm exec next lint` → clean(2 pre-existing `@next/next/no-img-element` warnings;BUG-015 ImageThumb + BUG-019 InlineImageCard + BUG-020 SingleScreenshotStrip 都跟同一 pattern;Next.js `<Image />` 需要 loader config 處理 same-origin proxy,Karpathy §1.2 simplicity wins;NOT NEW regression)
- [x] **T14** — `grep '\[oklch' frontend/app/(app)/chat/page.tsx` → **0 hits**;milestone preserved through BUG-020 changes
- [x] **T15** — Backend `tests/test_citation_enrichment.py + tests/api/test_query_screenshot_proxy.py` → 13/13 pass(verified W25 D2 cont session post BUG-019,backend wiring untouched per Karpathy §1.3 surgical)

## Runtime Verify

- [ ] 🚧 **T16** — Explicit user-eye runtime verify on chat page CitationPill hover popover + Single-screenshot strip render — consolidated 喺 post-commit walkthrough(per BUG-009-017 + BUG-019 cascade pattern)

## Closeout

- [x] **T17** — `progress.md` closeout summary + Day 1 entry + retro
- [x] **T18** — `postmortem.md` Sev2 mandatory per PROCESS.md §4.5
- [x] **T19** — `report.md` status `done`(already pre-set);`checklist.md` `in-progress → done`
- [x] **T20** — Commit + push

---

## Cross-Cutting

- [ ] **C1** — H1 architectural change:N/A(pure frontend presentation per mockup;Single-screenshot 屬 user-driven UX deviation NOT architectural)
- [ ] **C2** — H5 security:N/A
- [ ] **C3** — H6 test coverage:Vitest test added per T10
- [ ] **C4** — H7 design fidelity:THIS BUG = H7 regression fix;CitationPill 100% mockup-faithful;SingleScreenshotStrip 屬 user-pick deviation but mockup-spirit-aligned
- [ ] **C5** — Commit references progress entry per R2
- [ ] **C6** — Memory `feedback_design_fidelity.md` 可考慮 D11 pattern「remove pre-W22 UI that IS in mockup」extend with「+ gating misconfiguration」double-pattern(BUG-019 root pattern + BUG-020 extension)
