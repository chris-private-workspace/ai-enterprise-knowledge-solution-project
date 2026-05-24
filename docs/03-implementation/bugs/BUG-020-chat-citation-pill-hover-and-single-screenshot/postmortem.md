---
bug_id: BUG-020
report_ref: ./report.md
checklist_ref: ./checklist.md
progress_ref: ./progress.md
status: complete
last_updated: 2026-05-24
severity: Sev2
postmortem_required: true    # PROCESS.md §4.5 — Sev1/Sev2 mandatory
---

# BUG-020 — Postmortem

> Sev2 postmortem per `PROCESS.md §4.5`。Root cause analysis + 5 whys + corrective + preventive。

## TL;DR

W22 F4 chat presentation rebuild(2026-05-18)誤判 `CitationPill` 為「custom abstraction not matching mockup component breakdown」並 silently 移除 hover popover behavior;倖存嘅 numeric-badge `InlineCitationPills` row 被 gate 喺 `citationMode === 'inline'` 而 mode hard-coded `'sidebar'`(per W22 file header comment line 28-32)→ **pills 永遠唔 render**。同時 `<ImageGallery>` 嘅 `>= 2` gate(mockup-conforming per line 354-357)令 user's typical 1-image-citation query 完全冇 collective「Referenced screenshots」section。Backend wiring 完整 + BUG-019 inline image card 已 restore,但 dialogue footer 對應 mockup line 515-578 CitationPill hover popover + line 354-357 collective section 兩處關鍵 user-facing surface 仍然缺失,user-eye verify post BUG-019 surfaced 兩個 gap。

Fix 同 session 內 landed:Remove `citationMode === 'inline'` gate → unconditional CitationPillsRow render;refactor `InlineCitationPills` → mockup-faithful `CitationPill` with per-pill hover popover(file icon + doc title + section path + chunk title + relevance score per mockup line 515-578);NEW `<SingleScreenshotStrip>` for `imageCitations.length === 1` case per user-pick hybrid option 3(保留 mockup `>= 2` Gallery gate + 加 1-image collective surface);file header comment amendment;2 NEW Vitest tests;5/5 chat-meta-row pass。

## Timeline

| Time(2026-05-18 / 2026-05-24)| Event |
|---|---|
| **2026-05-18 W22 D4** | W22 F4 chat presentation rebuild — file header comment 寫「`InlineImageCard, CitationPill, FeedbackBar, CragStrip — they were custom abstractions not matching mockup component breakdown`」。CitationPill 嘅 hover popover behavior(mockup line 515-578)同 InlineImageCard 一齊 silently dropped。倖存嘅 `InlineCitationPills` 係 W20 era numeric-badge implementation(non-mockup-faithful)+ 被 gate 喺 `citationMode === 'inline'` 而 W22 將 mode 固定 `'sidebar'`(per ekp-page-chat.jsx:79)→ effectively-dead-code |
| **2026-05-18 W22 closeout** | W22 phase Gate PASS WITH F8.7+F8.8 TEST-CLEANUP CARRY-OVER。Per-page H7 7-item self-verify ALL passed across 15 routes — 但 H7 verify focused on visible-state visual fidelity,**conditional-render + dead-code-via-gating 喺 zero-data state 都 surface 唔到** |
| **2026-05-24 W25 D2 ~16:30** | BUG-019 commit `d586fc3` landed — InlineImageCard restored inline rendering per mockup line 470-498 + 581-617;user 確認 chat inline image surface OK |
| **2026-05-24 W25 D2 ~17:00** | User-eye cross-check mockup `ekp-page-chat.jsx` post-BUG-019 — 識別 2 個額外 surface 缺失:(1) CitationPill hover popover 完全冇 (2) 1-image case 無「Referenced screenshots」collective section |
| **2026-05-24 W25 D2 ~17:02** | AI code audit — `citationMode === 'inline'` gate(line 1163)+ hard-coded `'sidebar'` mode(line 166)+ `InlineCitationPills` non-mockup-faithful 三重 issue 識別;ImageGallery `>= 2` gate mockup-conforming 但 1-image case skip |
| **2026-05-24 W25 D2 ~17:04** | Live `/query` probe verified data 分布:typical 1-6 citations,1 image per query(KB sample 8 images sparse across 88 chunks);user's test query「what is high-level architecture」exactly 1 citation × 1 image scenario |
| **2026-05-24 W25 D2 ~17:06** | AskUserQuestion picks:Issue 1 = **B+hover Recommended**(unconditional gate removal + hover popover restore at end-of-msg row,Karpathy §1.2 simplicity over stream-text marker parsing)+ Issue 2 = **option 3 hybrid**(preserve mockup `>=2` Gallery + add 1-image collective mini-section) |
| **2026-05-24 W25 D2 ~17:15** | BUG-020 docs landed(report/checklist/progress);4 code edits(gate removal + CitationPillsRow + CitationPill + SingleScreenshotStrip + file header comment amendment)+ 2 NEW Vitest tests landed |
| **2026-05-24 W25 D2 ~17:25** | `pnpm exec vitest run tests/unit/chat-meta-row.test.tsx` → 5/5 pass(initial 1 fail on `getByText('1')` multi-match → re-fix `getAllByText('1').length >= 2` semantic);tsc + lint + oklch=0 all green |

**Time-to-detect**:6 days(W22 deploy 2026-05-18 → W25 D2 user-eye verify 2026-05-24)— same window as BUG-019;**Time-to-diagnose**:5 min(code audit + live probe);**Time-to-fix**:40 min(diagnose → docs + 4 code edits + 2 NEW tests + verify gates + test fix iteration);**Total user-visible exposure**:6 days(low — no Beta users yet,W22 deploy local-dev only;Sev2 severity comes from H7 fidelity regression hiding W25 phase「image-association deep-fix」嘅 chat-side achievement)

## 5 Whys

**Why #1**:Chat 對話視窗結尾無 CitationPill hover popover + 無「Referenced screenshots」section(1-image case)?
→ (a) `InlineCitationPills` rendering gated on `citationMode === 'inline'` while mode hard-coded `'sidebar'` → pills 永遠唔 render;(b) Mockup `CitationPill` hover popover behavior(line 515-578)冇 port 入 frontend;(c) `<ImageGallery>` gate `>= 2` 直接複製 mockup line 354-357,1-image case skip。

**Why #2**:Why was CitationPill hover popover dropped + InlineCitationPills gated?
→ W22 F4 chat rebuild session 將 `CitationPill, FeedbackBar, CragStrip` 一齊分類為「custom abstractions not matching mockup component breakdown」並 silently delete hover popover behavior。Surviving `InlineCitationPills`(W20 era numeric-only)受到 W22 「citationMode is fixed at sidebar」decision 影響 — citationMode state machine 入面 inline/footnote 分支被視為 dormant,所以 `citationMode === 'inline'` gate 變成永遠 false。**Effectively-dead-code via gating misconfiguration**。

**Why #3**:Why did W22 rebuild misjudge CitationPill as a custom abstraction?
→ 同 BUG-019 InlineImageCard 情況一樣 root cause:W22 rebuild session 對 mockup component-tree audit 喺 high-level structure(ChatHeader / ChatThread / MessageRow / SourcesStrip / CitationPanel)集中,深度 conditional-rendering component(CitationPill — 喺 AnswerBody 內部 hard-coded 多次 usage + 獨立 function definition with hover state machine)被 lump 入「custom abstraction」分類。Mockup line 515-578 完整 function definition 同 line 457-466 inline usage 都被 漏掉。

**Why #4**:Why did per-page H7 7-item self-verify(W22 protocol)+ BUG-019 fix session H7 verify(BUG-019 commit `d586fc3`)not catch this gap?
→ H7 7-item(layout / spacing / typography / color tokens / interaction states / responsive / a11y)assume visible-state coverage。CitationPill hover popover 屬「interaction state」第 5 item,但 verify session 嘅 sample state 通常係 unhover(zero-hover-event scope)→ popover content 完全冇 trigger surface。同 conditional-render 一樣係 data-coverage / interaction-coverage gap — H7 protocol inherent limitation。

**Why #5**:Why does W22 anti-pattern catalog `feedback_design_fidelity.md` D1-D9 5-pattern 都 capture 唔到 呢個 double-pattern(silent drop + gating misconfig)?
→ D7(preserve pre-W22 UI NOT in mockup over-preservation)同 BUG-019 D11 候選 reverse case(remove pre-W22 UI IS in mockup under-preservation)都係 single-mode pattern。**「Effectively-dead-code via gating」唔等於 simple silent drop** — code 仍喺 file,grep 仲搵到 component,但 runtime 路徑 unreachable due to upstream state hard-coded。Need NEW pattern「D12 candidate:component exists but unreachable via gating misconfiguration」captures 呢類 hybrid case。

## Root Causes(Layered)

1. **Mechanical**:`InlineCitationPills` rendering gated by `citationMode === 'inline'` while mode hard-coded `'sidebar'`(line 166)→ effectively unreachable code path
2. **Misjudgment**:W22 rebuild dropped mockup `CitationPill` hover popover(line 515-578)同 BUG-019 InlineImageCard 同類「custom abstraction」mis-classification — 但 BUG-020 多一層 silent drop + gating combined
3. **Process verification gap**:H7 7-item verify focused on visible-state + unhover-state coverage;`interaction states` item 缺 explicit hover-trigger sub-item;dead-code-via-gating 唔 surface
4. **Catalog gap**:`feedback_design_fidelity.md` 5-pattern catalog 缺「effectively-dead-code via gating misconfiguration」pattern(D12 候選命名);BUG-019 D11 候選只 cover pure silent drop;BUG-020 hybrid double-pattern 需要 D12 額外 entry
5. **User UX vs mockup-strict trade-off recognized**:`>= 2` gate mockup-strict 但 user-typical-data-pattern(1 image per query)令 collective section 永遠 skip → mockup design intent(「1 image only inline-card-sufficient」)同 user UX expectation(「有 image 就見到 labelled collective section」)有 gap;user pick hybrid option 3 explicitly accept deviation

## Corrective Actions(this BUG-020 cycle)

1. ✅ **Gate removal** — Remove `citationMode === 'inline'` gate at line 1163;CitationPillsRow render unconditional when `!message.isStreaming && message.citations.length > 0`
2. ✅ **CitationPill hover popover restore** — Port mockup line 515-578 完整 hover popover behavior:per-pill `useState(hovered)` + absolute-positioned popover overlay(`FileTypeChip` + doc title + relevance score + section path + chunk title);Citation schema 冇 `preview` field 故 fallback to `chunk_title`
3. ✅ **SingleScreenshotStrip** — NEW component for `imageCitations.length === 1` case;mockup-spirit-aligned deviation per user-pick option 3 hybrid;220px thumbnail card with label + doc title + section path footer + click → modal
4. ✅ **File header comment amendment** — Remove「CitationPill」from misleading「abstractions not matching mockup component breakdown」list;加 6-line 解釋 BUG-020 restoration + double-pattern「W22 silent drop + gating misconfiguration」cite
5. ✅ **Test coverage** — 2 NEW BUG-020 tests:`renders "Single screenshot" mini-section for exactly 1 image citation` + `renders citation pills unconditionally after answer body`;5/5 chat-meta-row pass
6. ✅ **Verify gates green** — tsc exit 0 / next lint clean(no NEW warning vs BUG-019 baseline)/ `[oklch`=0 preserved / backend citation pytest 13/13 unchanged

## Preventive Actions(durable improvements)

1. **Anti-pattern catalog D11+D12 expansion**(future W26+ candidate) — `feedback_design_fidelity.md` add:
   - **D11**(候選 from BUG-019)「remove pre-W22 UI that IS in mockup through misjudgment」pure silent drop pattern
   - **D12**(候選 from BUG-020)「component exists in code but unreachable via gating misconfiguration」hybrid double-pattern;cite BUG-020 為 empirical evidence
   - Cross-ref both vs D7「preserve pre-W22 UI NOT in mockup」 reverse case
2. **H7 verification protocol amendment**(future CLAUDE.md §5.7 candidate) — 7-item amplify:
   - Item 5「interaction states」加 explicit sub-item「hover popover preserved with full structure(content fields + positioning + transition)」
   - 加 NEW Item 8「conditional-render + gate reachability inventory」:per-page rebuild MUST audit all render gates against default state machine — confirm reachability under default props/state
3. **Mockup component-tree depth-audit pattern**(future CLAUDE.md §1 Karpathy candidate) — Karpathy §1.1 think-before-coding extension:rebuild session 必須 grep mockup file `function [A-Z]` exhaustive enumeration + cross-check vs `frontend/.../page.tsx` 有對應 component + 確認 default state machine 不會 gate 唔到佢哋
4. **Effectively-dead-code regression detection**(future test infrastructure candidate) — Vitest 加 NEW assertion pattern:**「every defined function-component MUST be reachable under default state」**;automation 可以 via static analysis(unused-function ESLint rule 強化)+ conditional render gate audit
5. **User UX vs mockup-strict trade-off documentation**(future CLAUDE.md §13 candidate) — 加 NEW When-in-Doubt row:「Mockup gate skips user-typical data pattern → user-eye verify shows UX gap」→ trigger STOP+propose deviation options;mockup-strict + user-data-driven deviation 兩條 trade-off 都應該 surface user pick

## Lessons Learned

- **Cascade detection pattern reliability extends past 10-bug streak**:BUG-009-017 + 019 + 020 = 11 bugs all surfaced by end-to-end user-eye verify on prior fix's output。Pattern reliability confirmed beyond statistical fluke
- **Double-pattern「silent drop + gating misconfig」hybrid case** harder to detect than pure silent drop(BUG-019)— code still exists、grep can find it、tsc passes — but runtime path unreachable。Future audit needs gate reachability sub-protocol
- **Hover popover ≠ HTML title tooltip**:mockup「interaction state」要求係 absolute-positioned popover overlay with structured content,HTML `title` tooltip 係 W20 era simplification — non-mockup-faithful。H7 verify checklist 7-item Item 5 需要 explicit「popover preserved」sub-item
- **User UX expectation vs mockup-strict deviation documented per user pick**:`>= 2` gate mockup-strict 但 typical-data-pattern 1 image case skip → user UX「有 image 就見到 collective section」expectation gap surface;option 3 hybrid 屬 user-driven decision,合 §13 backend-wins-不 apply-to-visual-element-removal precedent 嘅 visual deviation 反方向 case(visual ADD per user UX)
- **Test multi-match disambiguation discipline**:`getByText('1')` 多 PanelSourceCard + CitationPill render `1` text → multi-match throws。`getAllByText('1').length >= 2` 同時 verify 兩處 render(stronger assertion semantic)。Future Vitest test write decision tree:unique strings 首選 → multi-match counting documented next → test-id 第三 fallback
- **R6 recursive grep verification continues to pay**:plan-text 引用 `InlineCitationPills line 1238` + `citationMode === 'inline' line 1163` 全部 against current frontend grep upfront verified;mockup line 515-578 + 470-498 + 354-357 cross-reference before code change start — zero post-implementation discovery
- **Karpathy §1.2 simplicity guides「stream-text marker parsing」vs「end-of-msg row」trade-off**:full mockup inline-marker placement 需要 stream-text post-processing(parse LLM verbose marker `(chunk kb=..., chunk=NNNN)` → 替換為 inline CitationPill component)。Simpler approach = end-of-msg row + per-pill hover popover satisfies user hover-popover goal without complex stream-text rewriting。User pick B+hover Recommended 確認此 trade-off acceptable

---

**End of postmortem**
