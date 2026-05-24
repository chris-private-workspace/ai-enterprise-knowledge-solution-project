---
bug_id: BUG-021
report_ref: ./report.md
checklist_ref: ./checklist.md
progress_ref: ./progress.md
status: complete
last_updated: 2026-05-24
severity: Sev2
postmortem_required: true
---

# BUG-021 — Postmortem

> Sev2 postmortem per `PROCESS.md §4.5`。Root cause analysis + 5 whys + corrective + preventive。

## TL;DR

W22 F4 chat presentation rebuild(2026-05-18)同 BUG-019 + BUG-020 fix cycle 仍未 cover 嘅 4 個 mockup-fidelity gap:(1) Backend synthesiser emit verbose `[chunk-{chunk_id}]` markers inline 喺 answer text,frontend 直接 raw-render(2) Backend emit markdown(numbered list / bold)但 frontend `whiteSpace: 'pre-wrap'` plain-text-only render(3) `Citation` Pydantic schema 缺 `doc_format` field → frontend `fileTypeFromDocId(doc_id)` ext-sniff fallback `'unknown'` → CitationPill popover FileTypeChip 顯示「Unknown」muted style(4) BUG-020 D1.5 user-pick option 3 hybrid 加咗 SingleScreenshotStrip,但 user 而家對比 mockup ImageGallery `>= 2` 嘅 4 個 missing features(label / count badge / view-all link / numeric badge top-left)後 explicitly pick「Drop SingleScreenshotStrip + lower ImageGallery `>= 1`」reversal。

Fix landed same session via 7 frontend edits + 2 backend(schema + builder)edits + 1 NEW ADR-0036 react-markdown H2 vendor add + 2 NEW Vitest tests + 2 NEW backend pytest tests + test fixture updates。Total 15/15 backend pytest pass + 7/7 chat-meta-row pass + tsc/lint/`[oklch`=0 milestone preserved。

## Timeline

| Time(2026-05-18 / 2026-05-24)| Event |
|---|---|
| **2026-05-18 W22 D4** | W22 F4 chat presentation rebuild — `<MessageRow>` answer body div render raw `{message.content}` with `whiteSpace: 'pre-wrap'`(plain text fidelity);無 markdown renderer 加入;backend marker post-processing 不存在 |
| **2026-05-18 W22 closeout** | W22 phase Gate PASS — per-page H7 7-item self-verify ALL passed across 15 routes;但 **H7 verify focused on layout/spacing/typography/color tokens visible state**,no LLM-output rendering coverage(verbose marker rendering / markdown formatting 屬 data-driven runtime feature)|
| **2026-05-24 W25 D2 ~16:30** | BUG-019 commit `d586fc3` landed — InlineImageCard restoration;chat dialogue inline image OK |
| **2026-05-24 W25 D2 ~17:15** | BUG-020 commit `b08d480` landed — CitationPill hover popover + SingleScreenshotStrip(D1.5 user-pick option 3 hybrid);chat dialogue 4 surface elements 改善 |
| **2026-05-24 W25 D2 ~17:18** | User push authorized;2 commits pushed origin/main `6a2e733..b08d480` |
| **2026-05-24 W25 D2 ~17:22** | User-eye verify on `/chat` page post-push surfaced 4 NEW mockup-fidelity gaps(verbose markers visible / no markdown formatting / Unknown FileTypeChip / Single-screenshot vs Referenced-screenshots gallery)|
| **2026-05-24 W25 D2 ~17:25** | AI live `/query` probe 確認 4 issue root cause:6 verbose markers in answer / markdown structure `1. ... 2. ...` plain rendered / `doc_id` has no ext → fileTypeFromDocId returns 'unknown' / 1-image case skip mockup ImageGallery `>= 2` gate |
| **2026-05-24 W25 D2 ~17:30** | Mockup audit:ImageGallery(line 619-664)已有所有 features missing in SingleScreenshotStrip;ADR-0036 react-markdown H2 vendor add proposal written |
| **2026-05-24 W25 D2 ~17:32** | AskUserQuestion 4 questions — all Recommended picks accepted(B+hover marker-replace / react-markdown new dep / drop SingleScreenshotStrip + ImageGallery `>= 1` / Single BUG-021 batch)|
| **2026-05-24 W25 D2 ~17:35** | BUG-021 docs landed(report/checklist/progress + ADR-0036)|
| **2026-05-24 W25 D2 ~17:40** | Backend changes(Citation schema + build_citations + 2 NEW tests + fixture updates)landed;15/15 backend pytest pass |
| **2026-05-24 W25 D2 ~17:45** | `pnpm add react-markdown` install completed(npm-registry path,no R8 issue,43.8s duration with 77 transitive packages)|
| **2026-05-24 W25 D2 ~17:55** | Frontend 7 edits + 2 NEW Vitest tests + fixture updates landed;tsc exit 0,lint clean,oklch=0,7/7 chat-meta-row pass |

**Time-to-detect**:6 days from W22 deploy 2026-05-18 to W25 D2 user-eye verify 2026-05-24(same window as BUG-019 + BUG-020 — common cascade detection lag);**Time-to-diagnose**:7 min(live probe + mockup audit);**Time-to-fix**:50 min(diagnose → docs + 7 frontend edits + 2 backend edits + 2 NEW backend tests + 2 NEW Vitest tests + dependency install + verify gates iterate);**Total user-visible exposure**:6 days(local-dev only,Sev2 from H7 fidelity regression hiding 4 distinct LLM-output rendering surfaces)

## 5 Whys

**Why #1**:Chat dialogue 4 mockup-fidelity gaps 同時存在(verbose markers / no markdown / Unknown FileTypeChip / SingleScreenshotStrip vs Referenced screenshots gallery)?
→ (a) Frontend 從未實作 backend output post-processing(marker parse / markdown render)(b) Citation schema 缺 `doc_format` field 令 frontend ext-sniff fallback 失效(c) BUG-020 D1.5 user-pick option 3 SingleScreenshotStrip 係 hybrid quick-fix 而非 mockup-canonical canonical layout reuse。

**Why #2**:Why was answer-body post-processing(marker parse + markdown render)never implemented despite W19/W20/W22 chat rebuilds?
→ W19 F1 mockup audit + W20 F3 chat advanced surfaces + W22 F4 chat strict-fidelity rebuild — 三輪 cycle 都 focused on **structural** UI components(ChatHeader / ChatThread / MessageRow / SourcesStrip / CitationPanel / etc.)。**LLM output rendering** 被當作「data passing through」,從未 surface 為獨立 component design concern。Mockup `<AnswerBody>` 用 hard-coded `<p>` / `<ol>` / `<b>` / `<CodeChip>` JSX elements 暗示 markdown-rendered intent,但 hard-coded JSX 無 translate 為 frontend rendering pipeline design — 純粹 mockup placeholder。

**Why #3**:Why was `doc_format` not in Citation schema since inception(W3 D2 F3)?
→ W3 D2 F3 citation_enrichment 設計專注 chunk_id → Citation field 映射,直接從 retrieved chunk fields 過 `doc_id` / `doc_title` / `chunk_title` 等。當時 frontend 仍未實作 FileTypeChip popover,所以 schema 唔需要 doc_format;後續 W20 F3 + W22 F4 加 FileTypeChip 用 doc_id ext-sniff 為 inferred type — typical user-supplied identifier 通常無 ext → fallback `'unknown'` 從 schema 設計 inception 已存在 silent gap。**Backend schema design**(W3)同 **frontend type-derivation logic**(W20)分別兩個 owner 加得;cross-component schema field reuse never audited。

**Why #4**:Why did BUG-020 D1.5 user-pick option 3 SingleScreenshotStrip 需要 BUG-021 reversal?
→ BUG-020 AskUserQuestion 提出 option 3「保留 mockup `>= 2` ImageGallery gate + 加 NEW Single-screenshot mini-section」當時 framing 為「user UX expectation = 有 image 就見 collective section」+「Karpathy §1.2 simplicity = NEW component 比 conditional-ImageGallery-shape-shift 簡單」。**Incomplete mockup audit:當時無 enumerate mockup ImageGallery 嘅 4 個 features**(label / count badge / view-all link / numeric badge)所以 user pick 唔知 SingleScreenshotStrip 會 lack 呢 4 個 features。User-eye verify post-BUG-020 deploy 對比 mockup 之後 surface gap → pick reversal。Karpathy §1.1 think-before-coding 應該 trigger 完整 mockup feature inventory before option proposal — 但呢個 audit gap 喺 BUG-020 cycle 內 fall through。

**Why #5**:Why does `feedback_design_fidelity.md` D1-D9 + D11/D12 candidates(BUG-019/020)not catch這類「LLM output rendering pipeline never implemented」+「user-pick reversal as cascade deepens」pattern?
→ Catalog patterns 都係 W22 in-session correction patterns(D6 over-extending §13 / D7 preserve pre-W22 UI / D8 vendor SDK cap / D9 plan-text contamination)+ silent-drop patterns(D11 BUG-019 / D12 BUG-020 effectively-dead-code-via-gating)。BUG-021 surfaced 2 NEW patterns:
- **D13(候選)「LLM output rendering pipeline never explicitly designed in frontend rebuild cycle」** — W19/W20/W22 all focused on structural components,LLM output rendering(marker parse + markdown render)not enumerated;data-driven surface rendering 屬 inherent gap
- **D14(候選)「User-pick reversal as cascade deepens」** — Earlier option pick based on incomplete mockup feature inventory;cascade deepens reveals mockup-faithful canonical path that requires reversal(per BUG-020 D1.5 → BUG-021 D1.5)

## Root Causes(Layered)

1. **Mechanical**:`<MessageRow>` answer body `whiteSpace: 'pre-wrap'` + raw `{message.content}` render → 4 gaps simultaneously(verbose markers visible + no markdown formatting + ext-sniff fallback Unknown + SingleScreenshotStrip vs ImageGallery 等都 mechanical cause = frontend rendering pipeline gap)
2. **Schema design**:Citation Pydantic schema 從 W3 D2 F3 inception 缺 `doc_format` field;cross-component schema field need(frontend FileTypeChip 加入時)never trigger backend schema audit
3. **Mockup audit incomplete**:BUG-020 user pick option 3 hybrid 基於 incomplete ImageGallery feature inventory;`pre-active-flip R6 recursive grep verification` 未 applied to mockup feature matrix(只 applied to plan-text references)
4. **Process verification gap**:W22 H7 7-item per-page verify focused on structural visible state — LLM output rendering(data-driven runtime feature)未 explicit cover;data-coverage gap pre-existing
5. **Catalog gap**:D11/D12(BUG-019/020 candidates)cover「silent drop」+「gating misconfig」,但「pipeline-design-gap」(D13)+「user-pick reversal as cascade deepens」(D14)未 catalog
6. **Cross-system trade-off recognized**:react-markdown H2 vendor add 屬 unavoidable cost for mockup-faithful formatted output;`pnpm add` cost ~150KB transitive + maintenance burden vs inline regex transform cost(over time fragile + incomplete coverage)→ react-markdown decision rationale held per ADR-0036

## Corrective Actions(this BUG-021 cycle)

1. ✅ **Backend schema add `doc_format`** — Citation Pydantic + build_citations populate from chunk field + graceful fallback `'docx'` for legacy chunks
2. ✅ **Backend test coverage** — 2 NEW BUG-021 tests for doc_format fallback(empty + non-Literal value);15/15 pass
3. ✅ **Frontend AnswerBodyMarkdown** — regex parse `\[chunk-([^\]]+)\]` + map to citation idx + replace with inline `<CitationPill>` + raw fallback for hallucinated
4. ✅ **React-markdown ADR-0036** — H2 vendor add per CLAUDE.md §5.2;canonical solution over inline regex + backend prompt downgrade alternatives
5. ✅ **Markdown rendering** — `<ReactMarkdown>` with custom `components` prop styling `<p>` / `<ol>` / `<ul>` / `<li>` / `<strong>` / `<code>` 對齊 mockup AnswerBody design tokens
6. ✅ **doc_format propagation** — 3 frontend call sites `fileTypeFromDocId(citation.doc_id)` 改 `citation.doc_format`;`fileTypeFromDocId` function orphan removal per Karpathy §1.3 surgical
7. ✅ **ImageGallery unify** — gate `>= 2` → `>= 1`;SingleScreenshotStrip function + render call dropped;BUG-020 D1.5 reversal
8. ✅ **Vitest 2 NEW tests** — markdown formatting + marker→pill replace;7/7 chat-meta-row pass
9. ✅ **File header comment amendment** — BUG-021 cite + drop SingleScreenshotStrip + ADR-0036 react-markdown cite + 4 fix layer enumeration

## Preventive Actions(durable improvements)

1. **Anti-pattern catalog D13+D14 expansion**(future W26+ candidate) — `feedback_design_fidelity.md` add:
   - **D13**「LLM output rendering pipeline never explicitly designed in frontend rebuild cycle」— pattern from BUG-021 4 sub-issues all relate to runtime data-driven surface rendering not enumerated in W19/W20/W22 audits
   - **D14**「User-pick reversal as cascade deepens」— BUG-020 D1.5 → BUG-021 D1.5 reversal evidence;option proposal MUST enumerate mockup feature inventory completely
2. **H7 verification protocol amendment**(future CLAUDE.md §5.7 candidate) — 7-item amplify 加:
   - NEW Item 8「conditional-render + gate reachability inventory」(per BUG-020 postmortem)
   - NEW Item 9「LLM output rendering coverage」:per-page rebuild MUST verify rendering of all data-driven surfaces(LLM-emitted markdown / verbose markers / structured citations / images)against mockup intent — NOT just structural component layout
3. **Mockup audit completeness checklist**(future Karpathy §1.1 think-before-coding extension) — Before option proposal for any frontend fidelity decision,MUST grep mockup file for **full feature inventory** of the relevant component(label / count badge / link / badge / layout / interaction states);incomplete inventory → reversal risk per BUG-021 D14 pattern
4. **Cross-component schema field audit cadence**(future ADR-0023 follow-up) — Citation / KbConfig / 其他 cross-component Pydantic schemas MUST be cross-audited against frontend consumer pages each frontend rebuild cycle — frontend consumer adds 加新 derivable field consumption(eg FileTypeChip)應該 trigger backend schema audit(field 存在? 如不存在 → schema add)
5. **Pre-active-flip R6 recursive scope extension to mockup feature matrix**(future CLAUDE.md §10 R6 candidate) — current R6 = read plan literal + grep code base + surface mismatch + plan §7 changelog + adjust acceptance。Extend with **R6.6 mockup feature matrix verify**:option proposal author MUST enumerate ALL mockup feature inventory for related component before AskUserQuestion;incomplete inventory → label「mockup-audit-incomplete」warning in option description
6. **react-markdown maintenance discipline**(future ADR-0036 follow-up) — `frontend/package.json` 加 `react-markdown` 後,每次 frontend dep update cycle 必須 verify CVE / breaking changes;6-month review cadence;migration to v10+ when stable + tested
7. **Marker format contract documentation**(future architecture.md §4.5 amendment candidate) — Backend synthesiser marker format `[chunk-{chunk_id}]` 應該作 contract documented;frontend marker parser 應該對應 spec;future LLM prompt 變動 marker format 必須 cross-update frontend parser + 加 fallback for graceful migration

## Lessons Learned

- **Cascade detection pattern reliability extends past 11-bug streak**:BUG-009-017 + 019 + 020 + 021 = 12 bugs all surfaced by end-to-end user-eye verify on prior fix's output。Pattern reliability confirmed beyond statistical fluke;每個 bug fix 都 unlock 下一個 visible surface 嘅 fidelity gap detection。**「Cascade IS the verification mechanism」**
- **「Pipeline design」vs「component design」gap**:W19/W20/W22 frontend audit 都 focused on **component-tree** structure。LLM **output rendering pipeline**(marker parse + markdown render + 等 data-driven runtime features)被當作 implicit「passed-through」而非 explicit pipeline design — 結果 4 個 gaps 同時 surface。Future rebuild cycle 必須 enumerate「pipeline」surfaces 同「component」surfaces 並行
- **Schema field cross-component audit cadence重要**:Citation schema W3 D2 F3 inception 缺 `doc_format` 對 W3 era 內當時 frontend 唔關心;W20 F3 chat advanced 加 FileTypeChip 開始 derive doc type 但 silently fallback to ext-sniff with 'unknown' default。**No cross-audit moment ever triggered backend schema fix**。Future:any frontend new component needing structured backend data should trigger backend schema review
- **User-pick reversal protocol**:BUG-020 D1.5 option 3 → BUG-021 D1.5 reversal demonstrates option pick 唔等於 final design — 後續 deeper audit 可能 reveal mockup-faithful canonical path。**Option proposal should include「mockup-audit-completeness」label**(complete inventory of related component features documented before pick);否則 reversal risk surfaces
- **Karpathy §1.3 orphan cleanup rigorously**:`fileTypeFromDocId` function survived 3 call sites being replaced — without proactive cleanup,orphan accumulates。Karpathy §1.3 strict:「我嘅改動製造嘅 orphan(import / variable / function 因你嘅改動而 unused)要刪」— 即使 TypeScript strict mode 允許 unused function
- **react-markdown decision rationale held**:50KB minified gzipped(150KB transitive) acceptable cost for mockup-faithful formatted output。Inline regex transform 雖然 zero-dep 但 long-term maintenance cost(LLM prompt evolution / corner cases / partial markdown coverage)higher。ADR-0036 documented trade-off
- **Bundle 4 fixes into single BUG-021 was right call**:4 issues all in same chat/page.tsx + same fix surface(MessageRow rendering)+ same severity(Sev2 H7)+ user explicit pick batch。Single commit + single postmortem + single rollback unit。If 2-BUG split would have created 2x docs overhead + parallel-track confusion + 2x postmortem
- **Backend schema add backward compatibility via Literal-validation-fallback**:doc_format Literal field 加 schema 後,build_citations 用「raw value → check ∈ {docx, pdf, pptx} → fallback 'docx'」pattern。同 Karpathy §1.3 surgical 一致 — schema add 唔強制 chunks re-ingest;runtime gracefully degrade。Test coverage 2 NEW pytest validate fallback paths

---

**End of postmortem**
