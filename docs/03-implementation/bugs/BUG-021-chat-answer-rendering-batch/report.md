---
bug_id: BUG-021
title: "Chat answer rendering 4-fix batch — verbose marker → inline pill replace + markdown render + Citation.doc_format propagation + ImageGallery `>= 1` unify (drop SingleScreenshotStrip)"
severity: Sev2
status: done
reported: 2026-05-24
reporter: "Chris(chat 2026-05-24 W25 D2 — post BUG-019 + BUG-020 push,user-eye verify on chat dialogue identified 4 mockup-fidelity gaps:(1) LLM verbose chunk markers `[chunk-kb-..._chunk-NNNN]` 直接顯示喺 answer text 內 instead of mockup-style inline numeric pills (2) Answer text 純 plain text 渲染,冇 markdown formatting(bold/list/heading)(3) CitationPill hover popover FileTypeChip 顯示『Unknown』 + section path 空白 (4) BUG-020 加嘅 SingleScreenshotStrip 同 mockup ImageGallery effect 唔同 — 缺 view-all link / numeric badge / different modal)"
affects_components: [C05, C08, C10]    # Generation Pipeline (Citation schema) + API Gateway (build_citations) + Chat Interface UI
spec_refs:
  - architecture.md §4.5     # Citation schema (adds doc_format field)
  - architecture.md §5.4     # Chat View spec
  - references/design-mockups/ekp-page-chat.jsx  # H7 canonical visual spec
  - docs/adr/0036-react-markdown-chat-answer-rendering.md  # H2 vendor add ADR
  - CLAUDE.md §5.7           # H7 Design Fidelity Constraint
related: [BUG-009, BUG-010, BUG-011, BUG-012, BUG-013, BUG-014, BUG-015, BUG-016, BUG-017, BUG-019, BUG-020]
---

# BUG-021 — Chat answer rendering batch (4 fixes)

> **Report version**:1.0(initial batch report — 4 sub-issues per user-pick batch single BUG)
> **Triage approver**:AI self-triaged **Sev2** per CLAUDE.md §5.7 H7 — user explicit framing「現在 chat頁面上, 已經有了inline的 citation pills 和 最後的 Referenced screenshots 部分, 但是還有以下問題...」listing 4 specific mockup-fidelity gaps;同 BUG-019 + BUG-020 同層;12-bug cascade extension。

## 1. Symptom

User 喺 Chat page query「what is high-level architecture」against `sample-document-with-image-1` KB(post BUG-019 + BUG-020 fixes `d586fc3` + `b08d480` deployed),觀察 4 個 mockup-fidelity issues:

### Issue #1 — Verbose chunk markers inline in answer text

LLM synthesis answer 直接 emit `[chunk-kb-sample-document-with-image-1_doc-dce-integration-platform-implementation-plan_chunk-0011]` style verbose markers — 6 markers found in test answer。Mockup intent(line 457-466)用 inline numeric `<CitationPill>` 顯示(`[1]`、`[3]` 形式)+ hover popover detail。

### Issue #2 — No markdown formatting

Backend synthesizer emit markdown(numbered list `1. ... 2. ...` + 可能 `**bold**` 等)但 frontend `<MessageRow>` answer body div `whiteSpace: 'pre-wrap'` render plain text — 冇 bold / list / heading styling。Mockup `references/design-mockups/ekp-page-chat.jsx` AnswerBody(line 442-500)用 structured `<p>` + `<ol>` + `<b>` + `<CodeChip>` elements 表明 formatted output expectation。

### Issue #3 — CitationPill popover「Unknown」+ 空白

Hover citation pill 觸發 popover 顯示「Unknown」file type chip + 空白 section path。Live probe verified:
- `doc_id='dce-integration-platform-implementation-plan'`(無 `.docx`/`.pdf`/`.pptx` 副檔名)
- Frontend `fileTypeFromDocId(doc_id)` 返 `'unknown'` → FileTypeChip 渲染 muted style with「Unknown」label
- `Citation` schema 冇 `doc_format` field;但 actual file IS `.docx`(per W25 ingest metadata)
- doc_title 其實 populated `'DCE_Integration_Platform_Implementation_Plan'`(real data OK)
- section_path 喺 popover render `{citation.section_path.map((s, j) => <span key={j}>{s}</span>)}` 但好像因 className `section-path text-xs` 嘅 CSS 對應失效顯示空白

### Issue #4 — SingleScreenshotStrip 唔對應 mockup ImageGallery

BUG-020 加嘅 SingleScreenshotStrip(per user-pick option 3 hybrid)同 mockup ImageGallery 4 處唔同:
1. Label「Single screenshot」vs mockup「Referenced screenshots」
2. 缺「View all in Image Library →」link(mockup line 630)
3. 縮圖左上角缺 numeric badge(mockup line 645-649)
4. 點 thumbnail 觸發嘅 modal 同 mockup 顯示內容唔一樣
5. User-pick BUG-020 option 3 hybrid 而家逆轉 → 想要 unified ImageGallery handle 1-image case too

## 2. Reproduction Steps

1. Ensure all 11-bug cascade fixes deployed(`origin/main` post `b08d480`)
2. Open `http://localhost:3001/chat`,select KB `sample-document-with-image-1`
3. Query「what is high-level architecture」(1 citation × 1 embedded image)
4. **Expected**(per mockup line 442-500 + 515-578 + 621-664 + ADR-0036):
   - Answer text formatted markdown(numbered list / bold / heading)
   - Verbose `[chunk-...]` markers 替換為 inline numeric `<CitationPill>`
   - Hover pill → popover shows actual file type chip + doc title + section path + chunk title + score
   - 結尾「Referenced screenshots」section(同 ImageGallery,whether 1 或 2+ images)+ count badge + view-all link + numeric badge top-left on thumbnails
5. **Actual**:
   - Answer plain text + visible verbose `[chunk-kb-...]` markers
   - CitationPill popover「Unknown」file chip + 空白 section
   - 結尾「Single screenshot」section + 220px card + no view-all link + no numeric badge

## 3. Root Cause

### Issue #1 root cause
Backend synthesizer prompt emit verbose marker format `[chunk-{chunk_id}]`(包 chunk-prefix);frontend `<MessageRow>` answer body div `{message.content || ...}` 直接渲染 raw text;`whiteSpace: 'pre-wrap'` preserve newline 但無 marker post-processing → verbose markers visible inline。

### Issue #2 root cause
LLM synthesizer prompt encourages structured markdown output(numbered lists for steps,bold for emphasis);frontend `MessageRow` 用 plain `<div>` + `pre-wrap` render text;無 markdown renderer。

### Issue #3 root cause
`Citation` Pydantic schema(`backend/api/schemas/query.py`)冇 `doc_format` field。Frontend `chat/page.tsx` `fileTypeFromDocId(citation.doc_id)` 依賴 `doc_id` 字串 ext sniff 但 `doc_id` 來自 ingest 時 user-supplied identifier(無 ext required)→ fallback `'unknown'` → FileTypeChip muted styled。

Section path empty rendering:popover 內用 `<div className="section-path text-xs">{citation.section_path.map(...)}</div>` — `section-path` CSS class 喺 globals.css 有 styling 加 `▸` separator(per mockup),但 fallback rendering 可能視覺上唔明顯。Need verify。

### Issue #4 root cause
BUG-020 D1.5 decision 保留 mockup `>= 2` ImageGallery gate + 加 NEW SingleScreenshotStrip for `=== 1` case(per user-pick option 3 hybrid)。SingleScreenshotStrip 係 custom simplified visual(220px card)而非 mockup ImageGallery layout(180px grid + 16:9 aspect + numeric badge + view-all link)。User 而家 explicit pick「Drop SingleScreenshotStrip + lower ImageGallery `>= 1`」reverses earlier decision。

## 4. Scope

- ✅ Backend `backend/api/schemas/query.py`:Add `doc_format: Literal["docx", "pdf", "pptx"]` field to `Citation` model
- ✅ Backend `backend/generation/citation_enrichment.py`:`build_citations` populate `doc_format` from chunk fields(retrieved chunk fields contains `doc_format` per index schema)
- ✅ Backend tests:`test_citation_enrichment.py` add `doc_format` assertion;`test_query_screenshot_proxy.py` may need fixture update if Citation construction explicit
- ✅ Frontend `frontend/package.json`:`pnpm add react-markdown` per ADR-0036
- ✅ Frontend `frontend/lib/api/query.ts`:Add `doc_format` to `Citation` TS interface
- ✅ Frontend `frontend/app/(app)/chat/page.tsx`:
  - (a) `MessageRow` answer body:wrap content with `<ReactMarkdown>` + custom `<p>` / `<ol>` styling
  - (b) Pre-process content:regex parse `[chunk-(chunk_id)]` → map to citation idx → inline numeric pill component
  - (c) Use `citation.doc_format` instead of `fileTypeFromDocId(citation.doc_id)`
  - (d) Lower ImageGallery gate `>= 1`;drop SingleScreenshotStrip code + rendering site
  - (e) File header comment amendment cite BUG-021 + ADR-0036
- ✅ Frontend tests `frontend/tests/unit/chat-meta-row.test.tsx`:
  - Update `renders "Single screenshot"...` test → `renders ImageGallery for 1+ image citation` (since SingleScreenshotStrip dropped)
  - Update Citation fixture with `doc_format: 'docx'` field
  - Add NEW test:markdown rendering(bold / numbered list); marker parse (verbose marker → numeric pill)

## 5. Severity Rationale

**Sev2** per CLAUDE.md §5.7 H7:
- Same level as BUG-019 + BUG-020 — H7 design fidelity regression batch
- 4 distinct mockup gaps,影響 chat dialogue primary user-facing surface
- 12-bug cascade extension(image-pipeline backend → chat-presentation full H7 chain expansion)
- ADR-0036 H2 trigger(react-markdown new dep)record required per CLAUDE.md §6 ADR format

## 6. Acceptance for Fix

### Issue #1 marker parse + inline pill replace
- [ ] Regex `\[chunk-([^\]]+)\]` parse `message.content` capturing chunk_id
- [ ] Map captured chunk_id → citation idx via `citations.findIndex(c => c.chunk_id === captured)`
- [ ] Replace marker text with inline numeric `<CitationPill>` component(reuse existing CitationPill function with hover popover)
- [ ] Verbose markers no longer visible inline;answer text clean

### Issue #2 markdown rendering
- [ ] `pnpm add react-markdown`(ADR-0036 H2)
- [ ] `<ReactMarkdown>` wrap MessageRow answer body content
- [ ] Custom component styling(`<p>` / `<ol>` / `<ul>` / `<strong>` / `<code>`)match mockup AnswerBody design tokens
- [ ] LLM markdown output(numbered list / bold / inline code)renders formatted

### Issue #3 doc_format propagation
- [ ] Backend `Citation` schema add `doc_format: Literal["docx", "pdf", "pptx"]`
- [ ] Backend `build_citations` populate from chunk `doc_format` field(retrieved chunk metadata)
- [ ] Frontend `Citation` TS interface add `doc_format`
- [ ] Frontend `CitationPill` popover + `PanelSourceCard` 用 `citation.doc_format` 而非 `fileTypeFromDocId(doc_id)`
- [ ] FileTypeChip 正確顯示「DOCX」/「PDF」/「PPTX」(no more「Unknown」)

### Issue #4 ImageGallery unify
- [ ] Lower ImageGallery gate `>= 1`(line 1175)
- [ ] Drop SingleScreenshotStrip function definition + rendering site
- [ ] BUG-020 progress.md amendment(D1.5 decision reversal note)
- [ ] File header comment line 46-58 BUG-021 amendment:remove SingleScreenshotStrip cite + 加 ImageGallery `>=1` unified note

### Cross-cutting
- [ ] ADR-0036 `Accepted` Status confirmed
- [ ] Vitest `chat-meta-row` updated tests pass
- [ ] Backend `pytest tests/test_citation_enrichment.py + tests/api/test_query_screenshot_proxy.py` pass(+doc_format assertions)
- [ ] `tsc --noEmit` exit 0;`next lint` clean(no NEW warning);`[oklch`=0 milestone preserved
- [ ] User-eye runtime verify(consolidated walkthrough per cascade pattern)

## 7. Related

- BUG-009-020 cascade(W25 D1-D2 11-bug image-pipeline + chat-presentation)
- ADR-0036(react-markdown H2 dep add — NEW for this BUG)
- ADR-0031 Option B(W20 F3 chat advanced surfaces — original scope)
- CLAUDE.md §5.7 H7 + §5.2 H2 + §6 ADR format
- `feedback_design_fidelity.md` memory candidates(D11 + D12 from BUG-019/020 + potential D13 from BUG-021「user-pick reversal mid-cascade」)
