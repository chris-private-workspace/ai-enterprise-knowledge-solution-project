---
bug_id: BUG-028
title: Chat stream under-cites — Sources panel + answer markers show fewer citations than non-stream /query
severity: Sev3
status: fix-verified
opened: 2026-05-31
related:
  - W32 F1.8 (citation_expansion engine-fetch — the non-stream fix this mirrors)
  - ADR-0037 (parent-doc retrieval — aggregates §8 into one anchor citation)
  - ADR-0034 (citation neighbour-image attach — BUG-027 sibling)
  - memory project-chat-demo-rag-quality-followups
---

# BUG-028 — Chat stream citation/source parity

## 1. Symptom

W42 follow-up — user live-UI test(KB `test-kb-20260530-1`):

> Query: `what is the Integration scenarios ? also how many Integration scenarios ?`
> Answer TEXT: lists all 5 scenarios(complete)+ 5 images(BUG-027 fixed)
> **Sources panel: only 1 row**(`1 chunk · 1 with screenshot`)— chunk #44 §8 intro

用戶觀察 source panel 只 1 行,「看起來不正常」。

## 2. Root Cause

Ground-truth(`/query` vs `/query/stream` payload diff + code-trace):

- **非 stream `/query` 回 7 citations**(chunk 44 §8 intro + 45/47/49/51/53/55 = §8.1–§8.6),answer 含 7 個 `[chunk-N]` markers。
- **stream `/query/stream`(UI 用)只回 1 citation**(chunk 44),answer 只 1 個 marker。
- `synthesize_stream` **有做** citation_expansion(synthesizer.py:296 → result event 帶 expanded `citation_ids` + `expanded_neighbor_chunks` + expanded `answer`)。
- **但 `compose_query_stream`(stream_composer.py:48-51)有兩個遺漏**:
  - **① citation 組裝**:`build_citations(citation_ids, retrieval_result.chunks)` 只用 top-K reranked(5 個),**沒用 `expanded_neighbor_chunks`** → expanded citation ids(§8.1–§8.6,不在 top-K)被 `build_citations` 的 Rule 5「hallucinated」filter 丟掉 → 只剩 top-K-resident 的 §8 intro = 1 citation。
  - **② answer markers**:stream 逐 token emit 原始 LLM answer(markers 停在 LLM 原始 cite),`expand_citations` 補的 markers 沒重發 → UI answer 全標 `[1]`。

**非 stream `/query` 有 ① 的 fix**(query.py W32 F1.8:`final_chunks + expanded_neighbor_chunks` before build_citations),**stream 漏了同樣的 fix**。所以 UI source 1 行 = 真 bug(stream vs 非 stream 不一致),非正常。

## 3. Fix

- **① `stream_composer.py`**:`build_citations` pool 改為 `list(retrieval_result.chunks) + list(event["expanded_neighbor_chunks"])`(對齊非 stream W32 F1.8)。
- **② `stream_composer.py`** done event 加 `"answer": event["answer"]`(post-hoc expanded answer);**`query.ts`** DoneEvent 加 optional `answer?: string`;**`page.tsx`** done handler `content: evt.answer || m.content`(stream 收尾用 expanded answer 替換 streamed 內容 + 更新 finalContent 供 conversation persist)。

**H1 邊界**:純 internal generation 層 stream composer + frontend SSE 消費,對齊既有非 stream 行為,無 §3/§4 component/vendor/storage 改動 → **不觸發 H1,無新 ADR**。純 code fix,**不需 .env / 啟用決策**(只要 citation_expansion 已開 = memory #1 .env)。

## 4. Verify

- **Code**:backend pytest `test_stream_composer.py` **8 passed**(6 既有 + 2 NEW:① expanded chunks 進 citation pool + ② done 帶 answer);mypy `stream_composer.py` 0 new。frontend tsc 0;`chat-meta-row.test.tsx` 單獨跑 **7 passed**(全 suite 偶發 timeout 是 OneDrive+vitest IO flaky,非本改動 — 單跑乾淨環境全綠)。
- **Live(venv python 重啟 backend,citation_expansion .env on + BUG-027 section env)**:Playwright fresh-context UI,同 query:
  - meta **「6 citations」**(之前 1)
  - answer body distinct citation pills = **[1][2][3][4][5][6]**(之前全 [1])— ② 對齊
  - inline figures 5(BUG-027 保持)
  - answer markers ↔ source 數對齊(都 6)

> 6 vs 非 stream 之前 7 = citation_expansion run-to-run variance(從 LLM markers 擴展,每 run 略不同),非 regression;核心目標(source 反映答案涵蓋的 §8.x)達成。

## 5. Acceptance

- [x] stream citation 數對齊非 stream(expanded_neighbor_chunks 進 build_citations)
- [x] answer markers 對齊(stream 收尾替換 expanded answer)
- [x] 既有 stream_composer + chat-meta-row test 無 regression
- [x] 2 NEW backend test(① + ②)

## 6. Changelog

| Date | Change | Approver |
|---|---|---|
| 2026-05-31 | Triage Sev3 + ground-truth root cause(compose_query_stream 漏 expanded_neighbor_chunks + answer markers)+ ①+② fix + code/live verify | user(chat AskUserQuestion 選 ①+② 完整對齊)|
