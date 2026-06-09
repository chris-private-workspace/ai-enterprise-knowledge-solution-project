---
phase: W58
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed     # active | closed
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

### F1 mockup review + F2-F4 build(Day 1 cont)
- **F1.5 H7 gate PASS**:用戶 2026-06-09 approve mockup → ADR-0051 Accepted → F2-F4 解鎖。
- **F2**:`lib/api/doc-config.ts`(get/put/delete/list,`DocConfig` 鏡 backend)+ `ApiClient.put`(additive)+ `config-test.ts` 加 `enable_chapter_overview_pin` + `doc_id`。
- **F3**:self-contained `doc-config-tab.tsx`(deviation from R2:唔抽 KB 頁元件,§1.3;建 `DocTuneKnob`/`DocTuneGroup`/`DocSwitchKnob`/`DocConfigResultCard` mirror KB pattern + 「繼承 KB」framing)+ doc-detail `page.tsx` 加 tab strip(inspector wrap 視覺不變 + config tab)。
- **F4**:`doc-config-tab.test.tsx` **4 passed**;KB regression(kb-detail-tabs/kb-settings-reindex/kb-detail)**全綠**;tsc/eslint/prettier clean。
- **H7 fidelity 偏差 + 解決**:config-test 用 `draft_config` 預覽(非 mockup 暗示 `doc_id` scope)→ answer_detail 不在預覽(經儲存 real-query 生效);**mockup 2 句文字已對齊 frontend** = single source of truth。

### Decisions(cont)
- F3 self-contained over extract(R2 deviation,§1.3 零 KB-page touch)。
- config-test draft_config 機制 over doc_id scope(免 backend 改動 + 更清晰 A/B;answer_detail 預覽列 documented limitation)。

### Blockers
- 無(待 V 可選 live 視覺驗 + 用戶 closeout 決策)。

### Commits
| Hash | Subject |
|---|---|
| `bf7769d` | docs(planning): W58 kickoff — per-doc config UI + doc-detail mockup |
| `aa1f826` | feat(frontend): W58 per-doc config UI(F2-F4) |
| _(closeout)_ | docs(planning): W58 closeout + platform design Gap A done |

---

## Closeout — 2026-06-09

**判決**:✅ DONE(用戶揀「ff-merge 落 main + 收尾」)

- **交付**:doc-detail 頁 per-document 配置 UI —— 先擴 mockup(H7 gate user-review PASS)→ frontend 逐元素對齊(tab strip + DocConfigTab:answer_detail seg + citation/image tuning groups + retrieval-entry explainer + per-doc config-test)→ 消費 W57 CRUD API,零後端改動。
- **驗證鏈**:F1 mockup user-review PASS(H7)→ F4 4 unit test 綠 + KB regression 全綠 + tsc/eslint/prettier clean。
- **commit**:`bf7769d`(kickoff + mockup)+ `aa1f826`(F2-F4)+ closeout;ff-merge → main。
- **Gap A 完整完成**:P2a 後端(W57)+ P2b UI(W58)= 用戶 vision「per 文件 UI 操作配置管理」端到端打通。platform design §7 P2b done、§0 Gap A 標完整完成。

### Retro(教訓)
- **H7 路徑 A 行得通**:先擴 mockup(design-stage expansion + ADR-route)+ user-review gate + frontend 逐元素對齊 —— 避免「大概模仿」一個未確認設計,守 binding H7。
- **self-contained over extract(§1.3)**:3174 行 KB 頁唔掂,複製 Doc* helpers(framing 不同)= 零回歸;mockup 本身分開 Doc*/Kb* 佐證此 split。
- **fidelity self-check 抓到機制偏差**:config-test draft_config vs mockup 暗示 doc_id → 即時 align mockup 文字(reverse-drift fix 方向),保 single source of truth;answer_detail 預覽缺口明確記 documented limitation 而非靜默。
- **deviation 全部記 changelog(R3)**:R2 self-contained + config-test 機制 —— 無 silent drift。

### Next(platform 後續)
- **Gap B / P3**(query 意圖 gate)必要性未證實(§1.2 證偽 Fork B),最低優先 / 可能 drop。
- 可選:answer_detail 試跑 in-harness 預覽(細 follow-up)+ live 視覺驗證。

**Spec status → closed。**

---

**End of W58 progress**
