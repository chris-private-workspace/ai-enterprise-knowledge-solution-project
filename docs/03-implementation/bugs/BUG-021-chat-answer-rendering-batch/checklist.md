---
bug_id: BUG-021
report_ref: ./report.md
status: done
last_updated: 2026-05-24
---

# BUG-021 — Checklist

> Derived from `report.md §6 Acceptance for Fix`。Sev2 H7 batch fix。

## Setup

- [x] **T1** — ADR-0036 written:react-markdown H2 vendor add(Recommended over inline regex / plain text alternatives;npm-registry non-binary,no R8 mitigation)

## Backend (Issue #3 doc_format propagation)

- [x] **T2** — `backend/api/schemas/query.py` `Citation` model:Add `doc_format: Literal["docx", "pdf", "pptx"]` field(default omitted — required;backend always populate)
- [x] **T3** — `backend/generation/citation_enrichment.py` `build_citations`:populate `doc_format=str(f.get("doc_format", ""))` from retrieved chunk fields(check `doc_format` exists in index schema)
- [x] **T4** — `backend/tests/test_citation_enrichment.py`:Update existing tests to include `doc_format` in fixture + assert `Citation.doc_format` populated correctly
- [x] **T5** — `backend/tests/api/test_query_screenshot_proxy.py`:Update fixture Citation construction with `doc_format` if explicit
- [x] **T6** — Run `pytest tests/test_citation_enrichment.py tests/api/test_query_screenshot_proxy.py` → pass

## Frontend — Install + types

- [x] **T7** — `pnpm add react-markdown` (per ADR-0036)
- [x] **T8** — `frontend/lib/api/query.ts` `Citation` TS interface:Add `doc_format: 'docx' | 'pdf' | 'pptx'`(mirror backend schema)

## Frontend — Code (Issue #1 marker + Issue #2 markdown + Issue #3 use doc_format + Issue #4 unify gallery)

- [x] **T9** — `frontend/app/(app)/chat/page.tsx` `MessageRow` answer body:
  - Pre-process `message.content`:regex `/\[chunk-([^\]]+)\]/g` parse markers,split content into text+marker tokens
  - Render via `<ReactMarkdown>` for text tokens + inline `<CitationPill>` for marker tokens
  - Map captured chunk_id → citation idx via `citations.findIndex(c => c.chunk_id === id)`(NOT prefixed with 'chunk-' — backend marker prefix exists, citation chunk_id doesn't)
- [x] **T10** — Custom `<ReactMarkdown>` component overrides:`<p>` margin tokens / `<ol>` / `<ul>` padding / `<strong>` weight / `<code>` background per mockup AnswerBody styling(lines 442-500)
- [x] **T11** — `CitationPill` popover + `PanelSourceCard`:Replace `fileTypeFromDocId(citation.doc_id)` with `citation.doc_format`(`fileType` direct from schema field)
- [x] **T12** — Lower `ImageGallery` gate from `>= 2` to `>= 1`(line 1175)
- [x] **T13** — Drop `SingleScreenshotStrip` function definition + render call(BUG-020 D1.5 reversal per BUG-021 user-pick)
- [x] **T14** — File header comment lines 46-58 amendment:cite BUG-021 reversal + drop SingleScreenshotStrip + ImageGallery `>=1` unified + ADR-0036 react-markdown cite

## Tests

- [x] **T15** — `frontend/tests/unit/chat-meta-row.test.tsx`:
  - Update existing Citation fixture `imageRef` + `citation` factory to include `doc_format: 'docx'`
  - Update `renders "Single screenshot" mini-section...` test → `renders ImageGallery for 1+ image citation`(verify ImageGallery `>= 1` lowered gate)
  - Add NEW test:`renders markdown bold/list formatting`(simulate LLM emit `**bold** and 1. list`)
  - Add NEW test:`replaces verbose chunk markers with inline pills`(simulate LLM emit `text [chunk-{id}] text`)
- [x] **T16** — `pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → all pass

## Verification

- [x] **T17** — `pnpm exec tsc --noEmit` → exit 0
- [x] **T18** — `pnpm exec next lint` → clean(NO NEW warning vs BUG-020 baseline)
- [x] **T19** — `grep '\[oklch' frontend/app/(app)/chat/page.tsx` → 0 hits(milestone preserved)
- [x] **T20** — Live `/query` probe:verify Citation response includes `doc_format` field

## Runtime Verify

- [ ] 🚧 **T21** — Explicit user-eye runtime verify on chat page — markdown formatted text + inline numeric pills replace verbose markers + popover正確顯示「DOCX」file type + Referenced screenshots(1+ images)gallery — consolidated walkthrough per cascade pattern

## Closeout

- [x] **T22** — `progress.md` closeout summary + Day 1 entry + retro
- [x] **T23** — `postmortem.md` Sev2 mandatory per PROCESS.md §4.5
- [x] **T24** — `report.md` status `triaged → done`;`checklist.md` `in-progress → done`
- [x] **T25** — `BUG-020/progress.md` Closeout 加 amendment note(D1.5 SingleScreenshotStrip reversal per BUG-021;reference BUG-021 commit)
- [x] **T26** — `docs/adr/README.md` ADR-0036 index row 加(若 doc 存在 index)
- [x] **T27** — Commit + push(user explicit authorization required)

---

## Cross-Cutting

- [ ] **C1** — H1 architectural change:N/A(pure presentation + schema field add per existing chunk metadata path)
- [ ] **C2** — H2 vendor change:**TRIGGERED** — react-markdown new dep per ADR-0036(user-approved via AskUserQuestion)
- [ ] **C3** — H5 security:N/A(react-markdown default no raw HTML — XSS-safe)
- [ ] **C4** — H6 test coverage:Vitest tests added per T15
- [ ] **C5** — H7 design fidelity:THIS BUG = H7 regression fix batch(4 mockup gaps closed)
- [ ] **C6** — Commit references progress entry per R2
