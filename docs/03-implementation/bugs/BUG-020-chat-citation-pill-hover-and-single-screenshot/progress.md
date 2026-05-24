---
bug_id: BUG-020
report_ref: ./report.md
checklist_ref: ./checklist.md
status: done
last_updated: 2026-05-24
---

# BUG-020 — Progress

> Bug-fix workflow per `PROCESS.md §4`。Sev2 → postmortem mandatory at closeout。

## Day 1 — 2026-05-24

### Investigation

BUG-019 commit `d586fc3` landed,user 確認 InlineImageCard 喺 chat dialogue 正確 inline 顯示。User-eye cross-check mockup `ekp-page-chat.jsx` 識別 2 個額外 mockup-faithful surface 缺失:

> 「**現在在 chat 頁面可以看到 inline 圖片了, 但是還有些內容是缺失了的, (對比起 mockup 版本) , 1. 每段回應的最後, 沒有 citations 的icon , 這些icon 在滑鼠放在上方時, 會顯示更詳細的source來源內容 , 2. 在回應的最後, 沒有像mockup一樣的Referenced screenshots 部分**」

**Code audit**:

1. **Issue 1 — CitationPill hover popover 缺失**:
   - `frontend/app/(app)/chat/page.tsx` line 1163-1164 gate `{citationMode === 'inline' && message.citations.length > 0 && <InlineCitationPills .../>}`
   - Line 166 `const [citationMode] = useState<CitationMode>('sidebar')` hard-coded 'sidebar' per W22 F4 file header comment line 28-32(citationMode 喺 mockup 入面 fixed sidebar,inline/footnote dormant)
   - 結果:**pills 永遠唔 render**
   - `InlineCitationPills`(line 1238)即使 render,只係 numeric badges + HTML `title` tooltip — 並非 mockup line 515-578 `CitationPill` 嘅 hover popover(absolute-positioned overlay with file icon + doc title + section path + relevance score)
2. **Issue 2 — ImageGallery `>=2` gate skip 1-image case**:
   - Live probe verified data 分布(W25 D2):typical query 1-6 citations,圖片實際分布 1 image per query(KB `sample-document-with-image-1` 8 images sparse cross 88 chunks)
   - `ImageGallery` gate(line 1175)`>= 2` 直接複製 mockup line 354-357 — mockup-conforming 但 user UX expectation 係「有 image 就見到 collective screenshot section」
3. **Mockup `references/design-mockups/ekp-page-chat.jsx` audit**:
   - line 515-578 `function CitationPill({ ids, placement, citations })` 完整 hover popover implementation
   - line 457-466 inline usage 喺 AnswerBody `<ol>` list 內(real-impl LLM verbose marker text format 唔可以直接 mockup-port,但 hover popover behavior 仍然 binding per H7)

### Decisions

- **D1.1** — User pick **B+hover Recommended**(Issue 1)+ **option 3 hybrid**(Issue 2);故此 BUG scope:
  - (a) Remove `citationMode === 'inline'` gate → unconditional CitationPillsRow render
  - (b) Refactor InlineCitationPills → mockup-faithful CitationPill with per-pill hover popover(file icon + doc title + section + relevance + chunk title)
  - (c) NEW SingleScreenshotStrip for `imageCitations.length === 1` case;preserve mockup `>=2` ImageGallery gate
- **D1.2** — Classify Sev2 per CLAUDE.md §5.7 H7(同 BUG-019 同層;double-pattern「W22 silent drop」+「gating misconfiguration」)
- **D1.3** — CitationPillsRow placement:**out of answer body div + after answer text as discrete row**(line ~1175 在 ImageGallery 之前);real-impl deviation from mockup line 457-466 inline-in-`<ol>` usage(real LLM verbose marker `(chunk kb=..., chunk=NNNN)` 唔可以直接 hard-code 模擬;Karpathy §1.2 simplicity:不做 stream-text post-processing 複雜化,end-of-answer row 已 satisfy hover popover 嘅 user goal)
- **D1.4** — SingleScreenshotStrip 視覺 design(per user-pick option 3 hybrid):
  - Label「Single screenshot」(uppercase + tracking + muted mono)— 跟 ImageGallery「Referenced screenshots」label style 對齊
  - 220px thumbnail card with maxHeight 140 + objectFit cover
  - Footer 顯示 doc title + section path
  - Click → 觸發既存 `onOpenScreenshot` modal popup handler
- **D1.5** — Preserve `<ImageGallery>` `>= 2` gate intact(per user pick option 3);Single + Multi-image case 並存
- **D1.6** — Test approach:`getAllByText('1').length >= 2`(pill row + PanelSourceCard idx circle 同時出現)— alternative `getByText('1')` 因為 multi-match 唔 work;chunk_title (`Section 1`) 喺 popover 內只 render-on-hover 唔適合作 unhover-state 驗證

### Code changes

| 檔案 | 改動 |
|---|---|
| `frontend/app/(app)/chat/page.tsx` | (a) Remove `citationMode === 'inline'` gate at line 1163;`CitationPillsRow` render unconditional when `!message.isStreaming && message.citations.length > 0`;(b) Replace `InlineCitationPills` with `CitationPillsRow` + `CitationPill` pair — per-pill `useState(hovered)` + absolute popover overlay per mockup line 515-578(file type chip + doc title + relevance score + section path + chunk title);(c) NEW `SingleScreenshotStrip` function — `=== 1` gate with compact 220px card visual;(d) File header comment lines 46-58 amendment cite BUG-020 + remove CitationPill from misleading list |
| `frontend/tests/unit/chat-meta-row.test.tsx` | 加 2 NEW BUG-020 tests:`renders "Single screenshot" mini-section for exactly 1 image citation`(verify === 1 branch + ImageGallery skip)+ `renders citation pills unconditionally after answer body`(verify gate removal — pill + panel idx 同時出現 via `getAllByText('1').length >= 2`)|

### Verify gates

- `pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → **5/5 pass**(3 existing + 2 NEW BUG-020)
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm exec next lint` → clean(2 pre-existing `@next/next/no-img-element` warnings;BUG-015 + BUG-019 + BUG-020 都跟同一 pattern,NOT NEW regression)
- `grep '\[oklch'` against `frontend/app/(app)/chat/page.tsx` → **0 hits**;milestone preserved
- Backend `tests/test_citation_enrichment.py + tests/api/test_query_screenshot_proxy.py` → 13/13 pass(W25 D2 cont session post BUG-019 verified;backend wiring 100% 不變)

### Commits

_(see commit footer — `fix(chat): restore CitationPill hover popover + add SingleScreenshotStrip — BUG-020 + H7 W22 regression`)_

### Retro

- **Cascade detection pattern continues to validate**:9-bug image-pipeline cascade(BUG-009-017)→ BUG-019 → BUG-020 = 11 bugs surfaced by end-to-end user-eye verify on prior fix's output。Backend pytest + tsc + lint + vitest 永遠 surface 唔到 visual fidelity / conditional-rendering regression — browser-level smoke 係唯一可靠 detector。Cascade structure 變成 systematic surface mechanism
- **Double-pattern「W22 silent drop + gating misconfiguration」**:BUG-019 = pure silent drop(InlineImageCard removed);BUG-020 = silent drop + 仲多一層 gating bug(`citationMode === 'inline'` 永遠 false)。Gating bug 同 silent drop combined → 即使 InlineCitationPills 仍喺 code 內存在都唔出。Future W22-style rebuild audit 必須驗證:(a) component definition 存在(missing → silent-drop pattern)+ (b) component render call site reachable under default state(gated → activation-failure pattern)
- **CitationPill hover popover refactor showed where mockup hover behavior IS binding**:user 用 H7 framing(「100% 完整地把 mockup 的效果重現出來」)— hover popover 屬 interaction state(per CLAUDE.md §3.2.1 explicit list)。HTML `title` tooltip 唔等於 mockup 嘅 absolute-positioned popover overlay。Future H7 audit checklist 7-item「interaction states」需要 explicit「hover popover preserved with full structure」sub-item
- **SingleScreenshotStrip 屬 user-driven deviation 但 mockup-spirit-aligned**:mockup 嚴格 `>=2` gate(1 image case 只有 inline)→ user UX:「有 image 就見到 collective section」。User pick option 3 hybrid 而非 option 1 lower-gate-to-1 → 表示 user 想保留 mockup `>=2` semantic for full Gallery + 加新 1-image-specific surface。Karpathy §1.2 simplicity:NEW component `SingleScreenshotStrip` (215 LOC)比 conditional-ImageGallery-shape-shift (estimated 50 LOC 但 conditional logic 複雜化) 更 readable + 更可 isolate-test
- **Test multi-match disambiguation lesson**:`getByText('1')` 因為 CitationPill + PanelSourceCard 都 render `1` 文字 → multi-match throws。`getAllByText('1').length >= 2` 同時 verify 兩處 render(stronger assertion)。Future Vitest test write 時:scoped text(unique strings)或者 multi-match counting(stronger semantic 但需要明確 documented assertion semantic),先試 unique;multi-match 第二 fallback;test-id 第三 fallback(per Karpathy §1.2)
- **Pre-active-flip R6 recursive scope continued application**:plan-text 引用嘅「InlineCitationPills line 1238」+「`citationMode === 'inline'` gate at line 1163」全部 against current frontend grep upfront verified;mockup line 515-578 + 470-498 + 354-357 all cross-referenced before code change starts。R6 cumulative ~110 findings (W22+W23 baseline + W25 BUG-019+020 each ~5 findings)

### Postmortem

Sev2 postmortem written per `PROCESS.md §4.5` — see `./postmortem.md`(full timeline + 5 whys + layered root causes + corrective + preventive + lessons learned)。

### Closeout — 2026-05-24 W25 D2 cont

- Frontend `CitationPillsRow` + `CitationPill` hover popover restored per mockup line 515-578;`SingleScreenshotStrip` NEW user-pick hybrid option 3 deviation;file header comment amendment landed
- `frontend/tests/unit/chat-meta-row.test.tsx` 加 2 NEW BUG-020 tests;`pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → **5/5 pass**
- `pnpm exec tsc --noEmit` exit 0;`pnpm exec next lint` clean;`[oklch`=0 milestone preserved
- Backend pytest unchanged(13/13 citation tests preserved per Karpathy §1.3 surgical — backend untouched)
- BUG-020 frontmatter `in-progress → done`;checklist 19/20 ticked(T16 🚧 user-eye runtime verify pending consolidated walkthrough per cascade pattern)+ cross-cutting 6/6 ticked
- Commit:`fix(chat): restore CitationPill hover popover + add SingleScreenshotStrip — BUG-020 + H7 W22 regression`
- **11-bug cascade closure milestone**:BUG-009/010/011/012/013/014/015/016/017/019/020 all closed within W25 D1-D2 multi-session sequence(2026-05-22 to 2026-05-24;BUG-018 disproved 不計)— image-pipeline backend → chat-presentation 完整 H7 fidelity chain
