---
bug_id: BUG-033
report_ref: ./report.md
checklist_ref: ./checklist.md
status: in-progress     # in-progress | closed
---

# BUG-033 — Progress

> Investigation → fix → verify。每 commit 對應 Day-N(R2)。

---

## Day 1 — 2026-06-07

### Done
- (kickoff)report.md(Sev3,both findings root-caused)+ checklist + progress committed。
- Investigation 已完成(triage 時即 root-caused,見下)。
- (pending fix F-A/F-B + regression test + verify)

### Diagnosis update
- **Finding A**:`loadConversation()`(chat/page.tsx:292)只 `setMessages`,**缺 `setKbId(detail.kb_id)`**;`ConversationDetail.kb_id?: string|null` 存在(conversations.ts:62)→ selector 被 line 221 useEffect 鎖 `kbs[0]`。
- **Finding B**:LLM raw markdown **正確輸出** nested numbered list(`1.`/`   1.`/`      1.`…),但 `AnswerBodyMarkdown` `ol`/`ul` renderer(chat/page.tsx:1405-1410)缺 `list-style-type`;`@tailwind base`(globals.css:1)preflight reset `list-style:none` → markers 消失。**非 prompt 問題。**

### Decisions
- 用戶選 **`1. 2. 3.` CSS 方案**(非「Step N:」prompt 改)→ 純前端,唔郁 backend prompt。
- nested 全層用 `decimal`(minimal;逐層不同 marker 屬 polish,out-of-scope)。
- 兩 finding 合一 BUG instance(同 chat 頁 / 同 session / 皆 Sev3 / 皆 surgical)。

### Blockers
- 無。

### Effort
- Planned ~1-2h;Actual:_(填)_

### Commits
| Hash | Subject |
|---|---|
| _(待)_ | docs(bug): BUG-033 kickoff |

---

## Closeout（填於 status=closed）

_(待 fix + verify 完成填)_

---

**End of BUG-033 progress**
