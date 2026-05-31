---
bug_id: BUG-028
report_ref: ./report.md
checklist_ref: ./checklist.md
status: fix-verified
---

# BUG-028 — Progress

## Day 1 — 2026-05-31

### Triage + Diagnosis(ground-truth)
- W42 follow-up:user live-UI 觀察 source panel 只 1 行(`1 chunk`),覺得不正常。
- `/query` vs `/query/stream` payload diff:非 stream 7 citations(§8 intro + §8.1–§8.6),stream 1(§8 intro)。
- code-trace:`synthesize_stream` 有做 citation_expansion(result event 帶 expanded citation_ids + expanded_neighbor_chunks + expanded answer),**但 `compose_query_stream` build_citations 只用 top-K reranked,沒用 expanded_neighbor_chunks** → expanded ids 被 Rule 5 hallucinated filter 丟掉 → 1 citation。非 stream 有 W32 F1.8 fix,stream 漏了。
- 第二層:stream 逐 token emit 原始 answer,expand_citations 補的 markers 沒重發 → answer 全 [1]。

### Decision
- user chat AskUserQuestion 選 **①+② 完整對齊**(citation 組裝 + answer markers)。
- H1 評估:internal stream composer + frontend SSE,對齊既有非 stream → 不觸發 H1,無 ADR,純 code(不需 .env)。

### Done(fix)
- `stream_composer.py`:① build_citations pool 加 `expanded_neighbor_chunks`;② done event 加 `answer`(expanded)。
- `query.ts`:DoneEvent 加 `answer?: string`。
- `page.tsx`:done handler `content: evt.answer || m.content` + 更新 finalContent(persist)。
- `test_stream_composer.py`:+2 NEW(① expanded chunks 解析為 citation / ② done 帶 expanded answer)。

### Verify(全綠)
- backend pytest `test_stream_composer` **8 passed**(6 + 2)/ mypy 0 new。
- frontend tsc 0 / `chat-meta-row` 單獨 7 passed(全 suite flaky timeout = OneDrive+vitest IO,非本改動)。
- Live Playwright(venv python 重啟 backend):meta **6 citations**(↑ from 1)、answer pills **[1]–[6]**(↑ from all [1])、figures 5、answer↔source 對齊。

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | fix(generation): BUG-028 stream citation/source parity with /query |

### Effort
- Planned:1.5h(cross-layer stream + frontend);Actual:~1.5h;Variance:0

### Lessons
- stream 與非 stream 是**兩條 citation-build 路徑**(compose_query_stream vs query.py build_citations)— 非 stream 的 W32 F1.8 fix 沒同步到 stream,潛伏到 UI demo 才暴露。改 citation pipeline 要兩條路徑一起 check。
- citation_expansion / parent_doc / neighbour-image attach 是**三個獨立 post-process**(文字 markers / section 聚合 / 圖) — 同一個列舉型 query 暴露三者各自的 stream-path gap(BUG-026 dedup / BUG-027 image completeness / BUG-028 citation parity)。
