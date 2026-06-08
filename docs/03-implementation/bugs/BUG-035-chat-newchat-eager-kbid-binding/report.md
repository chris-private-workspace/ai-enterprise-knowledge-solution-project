---
bug_id: BUG-035
title: "Chat new-chat eager kb_id binding — conversation sticks to default KB despite KB switch"
severity: Sev3          # Sev1 | Sev2 | Sev3 | Sev4
status: open            # open | in-progress | fixed | closed
component: C10          # Chat Interface UI (+ conversations API binding)
reported: 2026-06-08
reporter: Chris (live chat test)
related: BUG-033 (chat KB restore) · BUG-034 Finding A (conv kb_id update-on-reuse)
---

# BUG-035 — Chat new-chat eager kb_id binding

## Symptom(用戶 2026-06-08）
喺新 session 揀咗 `DRIVE Manuals (images)`,但再次點開個 session 時 KB selector 又顯示返 `DCE Integration (images)`。Conversation 側欄見到同一句問題既有 `drive-images-1` 又有 `dce-integration-images-1` 標籤(間歇性綁錯)。

## Repro(推定)
1. Chat 頁面載入 → KB selector 預設 `kbs[0]` = `dce-integration-images-1`(KB list 第一個,且係 archived)。
2. 撳 **New chat** → `handleNewChat`(`chat/page.tsx:607`)即刻 `conversationsApi.create({ kb_id: kbId })`,此刻 `kbId` = DCE 預設 → conversation 綁 DCE。
3. 切 selector 去 DRIVE → `onKbChange={setKbId}`(line 524)**只改 local state,唔 persist**。
4. 提問 submit → `handleSubmit` 經 BUG-034 Finding A `update(convId, { kb_id })` re-bind(但係 **fire-and-forget `.then`**,且只喺 `reusedConversation` 時)。
5. 若用戶切咗 KB 但**未重新 submit**(或 race / update 未完成就 reopen)→ conversation stored kb_id 仍係 DCE → `loadConversation`(line 295-303)`setKbId(detail.conversation.kb_id)` → selector 顯示返 DCE。

## Root Cause
**Eager conversation creation 用「當刻 default kbId」綁定**,真正 KB 選擇(用戶切 dropdown)冇即時 persist。BUG-034 Finding A 只覆蓋「reuse 既有 conv 時 submit re-bind」,冇覆蓋:
- (a) New chat eager-create 用 default KB;
- (b) 切 KB 但未 submit 嘅 window;
- (c) `onKbChange` 唔 persist。
加上 `kbs[0]` = archived `dce-integration-images-1` 做預設,令誤綁機率高。

## Impact
- 用戶以為喺 KB X 開咗對話,reopen 變 KB Y → 混淆 + 影響信任。
- 若用戶信 selector 顯示而唔重新 submit,可能對住錯 KB 理解答案(但實際 query 用嘅係 submit 當刻 kbId,所以**答案內容係啱當刻 KB**,錯嘅係 conversation 標籤 + reopen selector)。
- Workaround:新 chat 後**先切 KB 再提問**(submit 會 re-bind);或提問後 selector 即正確。

## Proposed Fix(待確認 approach)
- **Option A(建議)— defer conversation creation 到首次 submit**:`handleNewChat` 只 reset state(`setActiveConvId(null)` + `setMessages([])`),**唔 eager-create**;conversation 喺首條 message 經 `ensureConversation` 建立,kb_id = submit 當刻 kbId(= 用戶最終選擇)。消除 eager-create-with-default + race。副作用:空白新 chat 唔即刻喺側欄出現(標準 chat UX,可接受)。
- **Option B — `onKbChange` 即時 re-bind**:切 KB 時若 active conv 仲未有 message,即刻 `update(convId, { kb_id })` persist。保留 eager-create 但補 persist gap。
- **附加**:預設 KB 唔應揀 archived KB(`kbs[0]` 應 skip archived,或揀第一個 active)。

## Acceptance Criteria(待 finalize）
- AC1 — 新 chat 揀 KB X 提問 → conversation stored kb_id = X;reopen selector = X。
- AC2 — 切 KB 後(submit 前 / 後)reopen 都對齊實際 query 嘅 KB。
- AC3 — 預設 KB 唔係 archived。
- AC4 — frontend lint / tsc / vitest pass;唔影響 BUG-033 / BUG-034 既有行為。

## Notes
- 屬 C10 chat UI(+ conversations API binding),非 CH-009 image scope(CH-009 V5 揭發呢個 bug)。
- 同 BUG-033(KB restore)+ BUG-034 Finding A(conv kb_id update)同一 lineage —— 第三次掂 conversation↔KB 綁定,提示需要一個 robust 統一處理(Option A defer-create 最徹底)。
