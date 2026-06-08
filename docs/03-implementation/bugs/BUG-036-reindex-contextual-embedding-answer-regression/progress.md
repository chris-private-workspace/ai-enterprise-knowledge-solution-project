---
bug_id: BUG-036
report_ref: ./report.md
checklist_ref: ./checklist.md
status: investigating     # investigating | closed
---

# BUG-036 — Progress

> Day-N entries + closeout。Sev2 → postmortem mandatory。

---

## Day 1 — 2026-06-08

### Done
- 用戶 chat 測試揭文字答案 regression（CH-011 re-index 後）→ triage Sev2 → 開 BUG-036
- 診斷捕捉（report §6）：唯一變數 = re-index 首次套 CH-008 contextual embedding；13 cites = 4 reranked + 9 expansion；detailed synthesizer 列整段 → synthetic 重編號 + 重複行
- repro 確認（API 2 run 穩定 CAR×2）

### Decisions
- 用戶揀「開 Bug-fix 正式診斷+修」（over 即時 config 緩解 / contextual toggle+re-index）
- Sev2（核心 chat surface 品質 regression + 明確 defect + 用戶 flag 嚴重）→ postmortem mandatory
- branch `fix/chat-reindex-text-answer-regression`（off main）

### Blockers
- I4（重複行來源 = source-inherent vs synthesis）+ I5（最小還原 lever）待調查 → fix 方向未定

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | docs(bug): BUG-036 triage — re-index contextual-embedding text regression |

---

## Closeout（填於 status=closed）
_(待)_

---

**End of BUG-036 progress**
