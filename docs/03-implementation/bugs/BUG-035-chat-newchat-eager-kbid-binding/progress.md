---
bug_id: BUG-035
report_ref: ./report.md
checklist_ref: ./checklist.md
status: in-progress
---

# BUG-035 — Progress

## Day 1 — 2026-06-08

### Context
CH-009 V5 live 驗揭:用戶喺新 session 揀 DRIVE Manuals,reopen 變返 DCE Integration。查 code 確認 `handleNewChat` eager-create 用當刻 default kbId(`kbs[0]` = archived `dce-integration-images-1`),切 KB 唔即時 persist,只靠 submit re-bind(fire-and-forget)→ race 誤綁。Chris 揀 Option A(defer creation)+ 預設 KB skip archived。

### Done(F1-F4)
- **F1** 預設 KB skip archived:`kbId` sync useEffect → `kbs.find(k => !k.archived) ?? kbs[0]`。
- **F2** parent `handleStartNewChat` reset(activeConvId null + messages []),取代 `handleConversationCreate`(eager-create)。
- **F3** `ConversationHistoryPanel.handleNewChat` → `onNewChat()`;props `onCreate`→`onNewChat`,移除 unused `kbId` prop(+ render 對應移除)。
- **F4** `ensureConversation`(首 submit 建立)加 `invalidateQueries(['conversations'])`。

### Mechanism(fix 後)
新 chat → reset(無建立)→ 用戶切 KB → 首次 submit `ensureConversation` 用當刻 kbId 建立 → conv 綁正確 KB + 即現側欄。無 eager-create-with-default、無 race。BUG-034 Finding A reuse-update path 保留(切 KB 後再 submit 重用 conv 仍 re-bind)。

### Blockers / Carry-over
- 🚧 V2/V3 live 驗(用戶)+ closeout(report fixed + ff-merge)。

### Commits
| Hash | Subject |
|---|---|
| _(本次)_ | fix(chat): BUG-035 defer conversation creation + non-archived default KB |

### Verify
- **V1 PASS**:frontend tsc exit 0 + vitest chat-bug034 2 passed(BUG-034 reuse-update 無 regression)+ citation-images 21 passed。

---

**End of BUG-035 progress (Day 1 — F1-F4 done;live 驗 + closeout 待)**
