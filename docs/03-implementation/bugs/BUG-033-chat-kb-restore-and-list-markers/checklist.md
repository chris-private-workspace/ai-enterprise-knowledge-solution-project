---
bug_id: BUG-033
report_ref: ./report.md
status: in-progress     # in-progress | done
last_updated: 2026-06-07
---

# BUG-033 — Checklist

> Atomic checkbox per investigation / fix / regression / verify。AI tick 完成 item;唔可以 tick 嘅喺 progress 寫原因。

## Investigation

- [x] Reproduce both findings(用戶 chat 頁實測 + AI raw-markdown 抽取確認)
- [x] Root cause A:`loadConversation` 缺 `setKbId(detail.kb_id)`(`ConversationDetail.kb_id` 存在 conversations.ts:62)
- [x] Root cause B:`ol`/`ul` renderer 缺 `list-style-type` vs Tailwind preflight `@tailwind base` reset(globals.css:1);LLM raw markdown 已證正確輸出 numbered list
- [x] report.md §6 已記 confirmed root cause(both)

## Fix

- [ ] F-A:`chat/page.tsx` `loadConversation` 加 `if (detail.kb_id) setKbId(detail.kb_id)`
- [ ] F-B:`AnswerBodyMarkdown` `ol` 加 `listStyleType:'decimal'`、`ul` 加 `listStyleType:'disc'`(minimal,inline style;nested 全層 decimal)
- [ ] surgical:只改呢兩處,唔郁無關 code

## Regression Test

- [ ] T-A:vitest — load 一個有 kb_id 嘅 conversation → KB selector value == conversation.kb_id(fail before / pass after)
- [ ] T-B:vitest — AnswerBodyMarkdown render 一個 numbered list → `ol` 有 `list-style-type: decimal`(或 render 出可見序號)
- [ ] frontend tsc + lint + 相關 vitest 0 regression

## Verification

- [ ] Re-run report §2 repro:切對話 → KB selector 還原成該對話 KB
- [ ] Re-run:detailed 答案顯示 `1. 2. 3.`(live UI 或 component test)
- [ ] 相關 chat 功能無 regression(發訊息 / citation pill / images）

## Closeout

- [ ] progress.md closeout summary(root cause + lessons)
- [ ] (Sev3 → **無** mandatory postmortem per PROCESS.md §4.5)
- [ ] RISK_REGISTER 更新(若 pattern 新;預期不需 — 屬一般 UI state/CSS bug)
- [ ] report.md status → done
- [ ] progress.md status → closed

## Cross-Cutting

- [ ] X1 commits 對應 progress Day-N(R2)+ component tag `fix(frontend): ... (C10)`
- [ ] X2 非 architectural → 無 ADR(純前端 state + CSS 修正)
- [ ] X3 doc-sync(若需;BUG fix 一般不改 spec)
