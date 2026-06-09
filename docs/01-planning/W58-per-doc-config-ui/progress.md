---
phase: W58
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active     # active | closed
---

# W58 — Progress

> Day-N entries + closeout retro。

---

## Day 1 — 2026-06-09

### Done
- W57 / P2a(per-doc 配置後端)merged 落 main(`0bed3b7`)後,用戶揀 kickoff P2b(per-doc 配置 UI)。
- **H7 決策(AskUserQuestion)**:doc-detail mockup 無 config 面 → 用戶揀**路徑 A —— 先擴 mockup**(最守 H7)。
- Ground 現況:doc-detail 頁(913 行)= 3-pane chunk inspector 無 config 面;`KbTuneGroup`/`KbTuneKnob`/
  `ConfigTestPanel` inline 喺 `kb/[id]/page.tsx`(未抽出);無 per-doc config API client。
- 讀 KB SettingsTab mockup pattern(`ekp-page-kb.jsx` L744-1177):`TabKbSettings` + `KbTuneGroup`×3 +
  config-test panel + `KbTuneKnob`/`KbTuneGroup`/`KbTestResultCard`/`KbTestMetric` helper → mirror source。

### Decisions
- Phase W58 = P2b UI;**F2-F4 gated on F1 mockup user-review**(守 H7,唔 approximate)。
- doc-detail 加 tab strip(Chunk inspector + Per-doc 配置)= design-stage expansion → ADR-0051。
- 只暴露 post-retrieval 旋鈕(per ADR-0050);繼承語意 = 繼承 KB(非全域)。

### Blockers
- F2-F4 待 F1 mockup user-review approve(H7 gate)。

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | docs(planning): W58 kickoff — per-doc config UI plan + ADR-0051 + mockup |

---

**End of W58 progress(Day 1 — F1 mockup 待 review)**
