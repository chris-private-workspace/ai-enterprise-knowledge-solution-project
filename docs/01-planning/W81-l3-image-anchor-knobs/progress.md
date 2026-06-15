# W81 progress — L3 image-anchor knobs UI(缺口 A,ADR-0060)

## Day 1 — 2026-06-15(kickoff)

**Context**:W80 後做「層 A UI 可調性 gap 分析」,坐實兩缺口:**A** = L3 缺三圖錨旋鈕
(`enable_inline_image_markers` W70 / `enable_section_anchored_aux_images` + `section_anchor_max_per_anchor`
W75);**B** = Settings preset mapping 唯讀(獨立 phase)。用戶揀**先做缺口 A**。

**H7 STOP+ask**:ground 揭 inline marker 喺 mockup KB 層有 `KbTuneGroup` 設計(`ekp-page-kb.jsx:918`)+ KB
層 frontend 已落地;但 section 錨定兩旋鈕 **mockup + KB 層 frontend 都冇**(W75 比 mockup 晚)→ 觸 H7。
surface 三方案(A 復用既有模式延伸 / B 改 mockup / C 只做 inline marker)→ **用戶揀方案 A**。

**ADR-0060 Accepted**(本 session):L3 新增「Inline 圖文錨定」`DocTuneGroup`,復用既有 mockup-aligned
component(`DocTuneGroup`/`DocSwitchKnob`/`DocTuneKnob`)裝三旋鈕;backend 零改動(`DocConfig` + `PUT /config`
已支援)。性質 = design-stage expansion(mockup 之外 UI,視覺零發明,H7 deviation 用戶批准)。

**落點 ground(R6)**:`DOC_TUNE_KNOB_KEYS`(doc-config-tab:94)加 key → setKnob/buildDraftConfig/dirty/
saveMutation 自動納入(零新 plumbing);插入點 = 「Citation neighbour images」`DocTuneGroup`(442-470)後。

**設計決定**:inline marker 做 `DocTuneGroup` 主 toggle(對齊 mockup KB 層 inline marker)、section 錨定 +
cap 做進階 children(section 錨定依賴 inline marker 機制,W75 preset 兩者同 ON → 主/進階關係合理)。

**Scope 邊界**:只補 doc 層 L3;KB 層 section 錨定 UI 同樣缺(另議);Settings preset mapping(缺口 B)獨立
phase;mockup 暫不動(方案 A,將來補 mockup 走獨立 design sync)。

**紀律自檢**:H7 design-stage expansion 用戶批准(ADR-0060)/ H1 ✅ / H2 ✅ 零 dep / H4 ✅ 層 A /
Karpathy ✅ reuse 既有 component + KNOB_KEYS 機制 + backend 零改動。

**Plan 落地**:W81 folder + plan.md(active)+ checklist.md(F1-F3)+ progress.md + ADR-0060 + README index。

**Commits**:
- (kickoff)docs(planning): W81 kickoff + ADR-0060 — L3 image-anchor knobs UI
