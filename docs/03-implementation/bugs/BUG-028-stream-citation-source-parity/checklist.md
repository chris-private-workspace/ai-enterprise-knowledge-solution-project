---
bug_id: BUG-028
report_ref: ./report.md
last_updated: 2026-05-31
---

# BUG-028 — Checklist

## Triage + Diagnosis
- [x] Triage Sev3 + 寫 report.md
- [x] `/query` vs `/query/stream` payload diff(非 stream 7 cit / stream 1)
- [x] code-trace root cause(compose_query_stream 漏 expanded_neighbor_chunks + answer markers 沒重發)
- [x] user 選 ①+② 完整對齊

## Fix
- [x] ① `stream_composer.py` build_citations pool 加 expanded_neighbor_chunks
- [x] ② `stream_composer.py` done event 加 expanded answer
- [x] ② `query.ts` DoneEvent 加 `answer?: string`
- [x] ② `page.tsx` done handler 用 evt.answer 替換 content + finalContent
- [x] H1 邊界評估(internal stream composer + SSE,對齊非 stream → 無 H1 / 無 ADR / 無 .env)

## Test
- [x] 2 NEW backend test(① expanded chunks → citation / ② done 帶 answer)
- [x] pytest `test_stream_composer` 8 passed(6 + 2)
- [x] mypy stream_composer 0 new
- [x] frontend tsc 0 + chat-meta-row 7 passed(單獨;全 suite flaky 非本改動)

## Verify
- [x] Live Playwright:meta 6 citations(↑1)+ answer pills [1]–[6](↑全[1])+ figures 5 + answer↔source 對齊

## Closeout
- [x] Fix verified;pure code(無 enablement 決策);待 commit + push
