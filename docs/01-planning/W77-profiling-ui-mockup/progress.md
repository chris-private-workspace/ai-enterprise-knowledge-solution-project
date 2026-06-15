# W77 progress — profiling UI mockup(ADR-0056 層 A 段③ + OQ-B)

## Day 1 — 2026-06-15(kickoff)

**Context**:W76 開咗 profile 讀取介面(persist + API expose),段③ data 接駁點齊。用戶 review
三層 UI fit 後揀「設計 mockup(H7 正路)」+ AskUserQuestion 揀「Claude Code 直接喺 prototype 手寫」。
本 phase = author ADR-0056 D4 profiling UI mockup 入 `references/design-mockups/`。

**Grounding(plan kickoff)**:
- 現有 prototype = code-based HTML/JSX(`EKP Platform.html` + `ekp-page-*.jsx` + `styles.css` 30KB +
  `ekp-data.jsx` + `DESIGN_SYSTEM.md`)。**唔係 Figma**;新 mockup reuse 現有 13 primitives。
- DESIGN_SYSTEM.md §0-§2 grounding:badge family(success/info/muted/accent/**warning**=amber「re-index
  needed」/error)+ `badge-dot`;tokens 全 `oklch(var(--token))`;--warning 語義 = 需人手介入。
- **4 落點 R6 grep 核實**:L2 = `ekp-page-kb.jsx` Documents table(line 266-307,badge pattern)/
  L3 = `ekp-page-doc-detail.jsx` `DocConfigTab`(line 410,tab strip inspector/config line 66-67)/
  Settings = `ekp-page-settings-tabs.jsx` `tabs` array(line 9-15,6 tabs 加第 7)/ L1 =
  `ekp-page-misc.jsx` `PageUploadWizard` StepExecute(line 63)。

**H7 定位**:author mockup(ADR-0056 OQ-B 既定)= D4 H7 warning 講嘅「實作前先設計 mockup」步驟,
本身唔 trigger H7;但新 mockup 必須 reuse 現有 design system(prototype 內部一致)。

**紀律自檢**:H1 ✅(唔改 IA;現有 page 加 section/欄/tab)/ H2 ✅(prototype stripped components)/
H4 ✅(層 A)/ H7 ✅(author mockup,reuse design system)/ Karpathy ✅(reuse primitives 不發明)。

**Plan 落地**:W77 folder + plan.md(active)+ checklist.md(F1-F6)+ progress.md。

**Commits**:
- (本 entry)docs(planning): W77 kickoff
