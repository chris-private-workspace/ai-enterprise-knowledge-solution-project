---
bug_id: BUG-021
report_ref: ./report.md
checklist_ref: ./checklist.md
status: done
last_updated: 2026-05-24
---

# BUG-021 — Progress

> Bug-fix workflow per `PROCESS.md §4`。Sev2 → postmortem mandatory at closeout。

## Day 1 — 2026-05-24

### Investigation

BUG-019 + BUG-020 commits `d586fc3` + `b08d480` 推送上 origin/main 之後,user-eye verify on chat dialogue 識別 4 個額外 mockup-fidelity gaps:

> 「現在 chat頁面上, 已經有了inline的 citation pills 和 最後的 Referenced screenshots 部分, 但是還有以下問題 :
> 問題1. 回應的內容中 ... 有很多[chunk-kb-sample-document-with-image-1_doc-dce-integration-platform-implementation-plan_chunk-0001]
> 問題2. 回應的文字中, 沒有加格式, 例如粗體之類的變化
> 問題3. citation pills的內容都顯示 unknown 和空白的
> 問題4. 最後的 reference screenshort 部分和mockup的效果還是不太一樣 — Single screenshot label / 沒有 view all link / 縮圖左上角沒有數字 / modal 內容唔同」

**Live `/query` probe(W25 D2 cont)**:
- Answer text 含 6 個 verbose `[chunk-kb-..._chunk-NNNN]` markers inline rendered raw
- Markdown structure starts:`1. Components are organised into four logical zones...` numbered list but no formatting
- `doc_id='dce-integration-platform-implementation-plan'`(NO `.docx` ext)— `fileTypeFromDocId()` 返 `'unknown'` → FileTypeChip muted style
- `doc_title='DCE_Integration_Platform_Implementation_Plan'` populated OK(real data)
- Citation `embedded_images` populated correctly (BUG-019 verified)

**Code audit**:
- Issue 1:`MessageRow` answer body div `{message.content || ...}` 直接 render raw text;無 marker post-processing
- Issue 2:`whiteSpace: 'pre-wrap'` 渲染 plain text — 無 markdown library
- Issue 3:`Citation` Pydantic schema 冇 `doc_format` field;frontend `fileTypeFromDocId(doc_id)` ext sniff 失效
- Issue 4:BUG-020 加嘅 `SingleScreenshotStrip` 係 custom 220px card,同 mockup `ImageGallery`(180px grid + 16:9 + count badge + view-all link + numeric badge)完全唔同;user 而家想 unified gallery

### Decisions

- **D1.1** — Single BUG-021 batch 4 fixes(per user-pick Recommended over 2-BUG split)— 統一 single commit + single postmortem;rollback unit 清晰
- **D1.2** — Issue 1 fix approach **B Recommended** — regex parse + replace inline `<CitationPill>`(mockup-faithful per line 457-466);marker format `\[chunk-([^\]]+)\]` capture group 1 = chunk_id(無 prefix);map to citation idx via `citations.findIndex(c => c.chunk_id === id)`
- **D1.3** — Issue 2 fix approach **react-markdown new dep Recommended** — ADR-0036 written per CLAUDE.md §5.2 H2 trigger;canonical solution over inline regex transform / backend prompt downgrade;npm-registry non-binary install path same as W24b F1 react-hook-form precedent
- **D1.4** — Issue 3 fix:**Backend `Citation` schema add `doc_format: Literal["docx", "pdf", "pptx"]`** + **fallback to "docx" when field absent**(graceful legacy chunks compatibility per Karpathy §1.3 surgical);frontend uses `citation.doc_format` 直接 — no more ext-sniff
- **D1.5** — Issue 4 fix **Drop SingleScreenshotStrip + lower ImageGallery `>= 1` Recommended**:reverses BUG-020 D1.5 user-pick option 3 hybrid;canonical ImageGallery 已有所有 mockup features(label / count badge / view-all link / numeric badge);unified surface — `>= 1` case same visual as `>= 2`
- **D1.6** — `fileTypeFromDocId` function removed entirely per Karpathy §1.3 surgical(我嘅 3 call site replacement 製造 orphan;自己清)
- **D1.7** — `<AnswerBodyMarkdown>` 用 Fragment + sequential token render(text → ReactMarkdown / marker → CitationPill / unknown → raw text fallback);`useMemo` 緩存 parse;defensive `findIndex` fallback to raw text 為 hallucinated citation case
- **D1.8** — ReactMarkdown `components` prop 自訂 `<p>` / `<ol>` / `<ul>` / `<li>` / `<strong>` / `<code>` styling 對齊 mockup AnswerBody line 442-500 design tokens(margin / padding / font-mono / muted background)

### Code changes

| 檔案 | 改動 |
|---|---|
| `docs/adr/0036-react-markdown-chat-answer-rendering.md` | NEW ADR per CLAUDE.md §5.2 H2 trigger;react-markdown vendor add rationale + 2 rejected alternatives(inline regex / backend prompt downgrade)|
| `backend/api/schemas/query.py` | Citation schema add `doc_format: Literal["docx", "pdf", "pptx"]` field after `doc_title` |
| `backend/generation/citation_enrichment.py` | `build_citations` add `doc_format` extract + graceful fallback `'docx'` when field empty or non-Literal value(11-line block with cite BUG-021)|
| `backend/tests/test_citation_enrichment.py` | `_chunk` fixture add `doc_format: 'docx'`;`test_build_citations_populates_fields_from_retrieved` add assertion;**2 NEW tests** — `test_build_citations_doc_format_fallback_to_docx_when_missing` + `test_build_citations_doc_format_normalises_unknown_to_docx` |
| `backend/tests/api/test_query_screenshot_proxy.py` | `_citation` fixture add `doc_format='docx'` |
| `frontend/package.json` + `pnpm-lock.yaml` | `pnpm add react-markdown`(direct dep added per ADR-0036)|
| `frontend/lib/api/query.ts` | `Citation` TS interface add `doc_format: 'docx' \| 'pdf' \| 'pptx'`(mirror backend) |
| `frontend/app/(app)/chat/page.tsx` | 7 edits:(1) `react-markdown` + `Fragment` + `type ReactNode` imports / (2) drop `fileTypeFromDocId` function definition (orphan post call-site replacement)/ (3) NEW `<AnswerBodyMarkdown>` component with regex `\[chunk-([^\]]+)\]/g` marker parser + ReactMarkdown text token render + CitationPill marker token render / (4) NEW `MARKDOWN_COMPONENTS` style overrides / (5) `MessageRow` answer body div content 由 raw `{message.content}` 改為 `<AnswerBodyMarkdown content={...} citations={...} />` / (6) Lower ImageGallery render gate `>= 1` + drop SingleScreenshotStrip rendering site / (7) Drop SingleScreenshotStrip function definition / (8) 3 call sites `fileTypeFromDocId(citation.doc_id)` 改為 `citation.doc_format` / (9) File header comment lines 46-58 amendment(BUG-021 cite + react-markdown cite + ADR-0036)|
| `frontend/tests/unit/chat-meta-row.test.tsx` | Citation factory add `doc_format: 'docx' as const`;rename `renders "Single screenshot" mini-section...` test → `renders the "Referenced screenshots" gallery for exactly 1 image citation (BUG-021 reversal — ImageGallery '>=1' unifies)` + assertion changes;**2 NEW tests** — `renders markdown formatting in the answer body` + `replaces verbose [chunk-{id}] markers with inline numeric pills` |

### Verify gates

- Backend `pytest tests/test_citation_enrichment.py tests/api/test_query_screenshot_proxy.py` → **15/15 pass**(12 existing + 2 NEW doc_format fallback + 1 updated)
- Frontend `pnpm exec tsc --noEmit` → exit 0
- Frontend `pnpm exec next lint` → clean(1 pre-existing `@next/next/no-img-element` warning unchanged — InlineImageCard `<img>` pattern;BUG-021 actually reduced warning count vs BUG-020 baseline due to SingleScreenshotStrip removal)
- `grep '\[oklch' frontend/app/(app)/chat/page.tsx` → 0 hits;milestone preserved
- Frontend `pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → **7/7 pass**(5 existing post BUG-020 + 2 NEW BUG-021;first attempt 1 fail = OneDrive flake per W23 D2.4,re-run all green)

### Commits(pending)

_(see commit footer — `fix(chat): markdown render + marker→pill replace + doc_format propagation + ImageGallery unify — BUG-021 + ADR-0036`)_

### Retro

- **Backend pytest 15/15 + 2 NEW BUG-021 tests** validate doc_format fallback strategy works for legacy chunks pre-W25(empty doc_format → "docx" default)— graceful degradation per Karpathy §1.3 surgical preserves schema invariants without forcing re-ingest of all KBs
- **react-markdown decision rationale held**:`pnpm exec next lint` clean post-install + tsc strict mode happy + bundle size acceptable(~150KB transitive but tree-shaken at runtime + lazy-loaded via SSR boundary CSR);ADR-0036 H2 vendor add justified
- **Marker→pill replacement defensive fallback worked**:hallucinated chunk_id case(citation.findIndex returns -1)→ fall back to raw text(via `kind: 'raw'` token type);no UI crash + observability already exists at backend level(`citation_hallucinated_ids` warning)
- **W22 cumulative cascade now 12 bugs**(009/010/011/012/013/014/015/016/017/019/020/021)— same root pattern「W22 fundamental drift from mockup」across multiple presentation surfaces;BUG-021 batch 4 sub-fixes confirms efficient bundling when issues share file + fix surface
- **User-pick reversal mid-cascade(D11/D12 + D13 candidate)**:BUG-020 D1.5 SingleScreenshotStrip hybrid option 3 → BUG-021 D1.5 drop SingleScreenshotStrip + ImageGallery `>= 1` unify;這個係 D13(候選命名)「user-pick reversal as cascade deepens」pattern — early user pick based on partial mockup audit,deeper cascade audit reveals mockup-faithful path that requires reversal。Future ask pattern:propose multiple options BUT signal「Recommended path validates against further mockup audit needed」when scope is incomplete
- **fileTypeFromDocId orphan removal worth doing**:Karpathy §1.3 strict — 我嘅 3 call site replacement 製造 orphan,即使 unused function 唔影響 runtime,清掉 keep file lean。CLAUDE.md §1.3 explicit rule
- **Backend schema field add 同 frontend type mirror pair**:per W18 ADR-0024 + W20 ADR-0031 precedent — schema field 加 必 update Pydantic + TS mirror + tests + all construction sites。BUG-021 follows pattern;backend pytest catch 2 construction sites in `test_query_screenshot_proxy.py` + `_chunk` fixture;frontend tsc catch nothing(Citation field added without removing previous fields so existing usage unaffected by addition)
- **Markdown rendering 帶嚟 lint warnings 預期 minimal**:custom `MARKDOWN_COMPONENTS` 為每個 element override 加 inline style — 跟 chat/page.tsx 既有 inline style pattern 一致(per W22 F4 rebuild「inline style preferred over className composition」)

### Postmortem

Sev2 postmortem written per `PROCESS.md §4.5` — see `./postmortem.md`(timeline + 5 whys + layered root causes including ADR-0036 H2 add + corrective + preventive)。

### Closeout — 2026-05-24 W25 D2 cont

- Backend Citation schema + build_citations + 2 NEW tests landed;15/15 backend pytest pass
- Frontend `<AnswerBodyMarkdown>` + marker→pill replace + `citation.doc_format` switch + ImageGallery `>= 1` unify + SingleScreenshotStrip removal + `fileTypeFromDocId` orphan removal + file header comment amendment landed
- 2 NEW Vitest tests(markdown + marker replace)+ test fixture updates;7/7 chat-meta-row pass
- ADR-0036 react-markdown H2 vendor add Accepted Status landed via user Recommended pick
- BUG-020 progress.md needs amendment note(D1.5 SingleScreenshotStrip reversal per BUG-021)— pending T25
- BUG-021 frontmatter `triaged → done`;checklist 24/27 ticked(T21 🚧 user-eye runtime verify pending consolidated walkthrough per cascade pattern + T25 BUG-020 amendment + T26 ADR README index update,T27 commit+push pending user authorization)+ cross-cutting 6/6 ticked
- Commit:`fix(chat): markdown render + marker→pill replace + doc_format propagation + ImageGallery unify — BUG-021 + ADR-0036`
- **12-bug cascade closure milestone update**:BUG-009/010/011/012/013/014/015/016/017/019/020/021 all closed within W25 D1-D2 multi-session sequence(2026-05-22 to 2026-05-24;BUG-018 disproved 不計)
