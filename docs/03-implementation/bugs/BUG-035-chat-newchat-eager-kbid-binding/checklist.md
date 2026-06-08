---
bug_id: BUG-035
report_ref: ./report.md
---

# BUG-035 — Checklist

> done → `→[x]`,未做標 🚧 + 理由。Fix = Option A(defer creation)+ 預設 KB skip archived(Chris 2026-06-08)。

## Fix
- [x] F1 — 預設 KB skip archived:`kbId` sync useEffect 改 `kbs.find(k => !k.archived) ?? kbs[0]`
- [x] F2 — `handleStartNewChat`(parent)reset state(activeConvId null + messages []),取代 eager-create `handleConversationCreate`
- [x] F3 — `ConversationHistoryPanel.handleNewChat` → `onNewChat()`(唔再 eager-create);props `onCreate`→`onNewChat`,移除 unused `kbId` prop
- [x] F4 — `ensureConversation`(首 submit 建立)加 `invalidateQueries(['conversations'])` 令新 conv 即現側欄

## Tests / Verify
- [x] V1 — frontend tsc clean(exit 0)+ vitest chat-bug034 2 passed(BUG-034 行為無 regression)+ citation-images 21 passed
- [ ] 🚧 V2 — live 驗(用戶):新 chat → 揀 DRIVE → 提問 → conversation 綁 DRIVE;reopen selector = DRIVE;預設 KB 唔係 archived DCE
- [ ] 🚧 V3 — 無 regression:BUG-033 KB restore + BUG-034 Finding A reuse-update 仍正常;切 KB 提問 re-bind 仍 work

## Closeout
- [ ] 🚧 C1 — report status → fixed;postmortem(Sev3 非強制,可選 short note)
- [ ] 🚧 C2 — commit 對應;ff-merge（用戶確認）
