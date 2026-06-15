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

**F1-F2 implement(Day 1)**:
- **F1 mock data**(`ekp-data.jsx`):8 個 indexed doc 加 `profile` object(mirror W76 `DocProfileInfo`:
  profile / confidence / fallback_applied / 13-signal)。signals 同 profiler rule 一致(P1_imgdense
  img_density 0.169-0.188 ≥ 0.15;PDF img_density 0;P3 pptx img_density 0.904)。cover P1_imgdense×3 /
  P1_text×2 / P2_prose / P3_slide_imgdense / 低信心黃旗(security 0.56 + fallback_applied)。indexing /
  failed / queued docs 自然無 profile(L2「未分析」demo)。
- **F2 L2 badge**(`ekp-page-kb.jsx` Documents table):Chunker 欄後加「Profile」欄 + `ProfileBadge` helper
  (PROFILE_LABELS 6 類縮短中文 label + 信心度 %)。低信心 → `badge-warning` 黃旗 + title「建議人手確認」;
  unprofiled → `badge-muted`「未分析」opacity 0.65。reuse 現有 badge/badge-dot/mono/muted primitives,
  零 hardcode 顏色。

**Checkpoint(Day 1)**:F1-F2 完成後 browser 驗 L2(早 feedback design 方向),再繼續 F3-F5。

**Commits**:
- `8432219` docs(planning): W77 kickoff
- (本次)feat(design): W77 F1-F2 mock profile data + L2 文件列表 badge
