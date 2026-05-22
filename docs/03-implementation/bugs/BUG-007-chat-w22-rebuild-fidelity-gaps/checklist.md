---
bug_id: BUG-007
report_ref: ./report.md
status: done            # in-progress | done
last_updated: 2026-05-22
---

# BUG-007 — Checklist

> Derived from `report.md §7 Acceptance for Fix`。延後項標 🚧 + reason(per CLAUDE.md sacred rule — 唔可以刪未勾 `[ ]`)。

## Fix

- [x] **T1** — Root cause confirmed via mockup + implementation + backend SSE 三方 trace:3 處 W22 F4 chat presentation rebuild fidelity regression(meta-row model+cost wiring gap / `citationMode` 預設 flip `sidebar`→`inline` / `ImageGallery` 誤刪)
- [x] **T2** — backend `observability/realtime_cost.py`:NEW public `estimate_query_cost(model, input_tokens, output_tokens) -> float | None` — reuse `_rate_for` + `_PRICING_TABLE`(單一 pricing source);無 rate row 嘅 deployment 返 `None`
- [x] **T3** — backend `generation/stream_composer.py`:`done` event 加 `cost` field — `compose_query_stream` 用 `estimate_query_cost(deployment, input_tokens, output_tokens)` 計(pure-data,無 I/O,符合 module docstring)
- [x] **T4** — frontend `lib/api/query.ts`:`DoneEvent` 加 `cost: number | null`
- [x] **T5** — frontend `app/(app)/chat/page.tsx` 問題 1:`Message` interface 加 `model: string`;`done` handler populate `model: evt.model` + `costUsd: evt.cost`;meta 行(`MessageRow` assistant 分支)render `{model} · {reranker} · {N} citations[ · {N} with screenshots]` … 右側 `{latency}s · ${cost}`;更新檔頭 `:26-29` docstring(移除「default flipped sidebar → inline」描述)
- [x] **T6** — frontend `chat/page.tsx` 問題 2:`citationMode` 預設 `useState<CitationMode>('inline')` → `'sidebar'`(對齊 mockup `ekp-page-chat.jsx:79`)
- [x] **T7** — frontend `chat/page.tsx` 問題 3:重建 `ImageGallery` component(mockup `:621-664` — 「Referenced screenshots」uppercase header + count badge +「View all in Image Library →」inert 掣 + responsive grid `repeat(auto-fill, minmax(180px,1fr))`;thumbnail 用 real `blob_url` per 既有 `ScreenshotModal` adaptation);`MessageRow` assistant 分支 `imageCitations.length >= 2` 時 render(mockup `:355`);更新檔頭 `:42-44` docstring(`ImageGallery` 由「deleted」列表移除)
- [x] **T8** — Test:backend `tests/test_realtime_cost.py` 加 `estimate_query_cost` case(known + unknown deployment)+ `tests/test_stream_composer.py` 加 `done` event `cost` field case;frontend Vitest 加 chat case(meta 行 render model+cost;`imageCitations>=2` 時 `ImageGallery` render)
- [x] **T9** — verify gates — backend `pytest tests/` no regression + `mypy` on changed modules clean + `ruff` clean;frontend `tsc --noEmit` exit 0 + `next lint` clean + `[oklch`=0(changed files)+ Vitest no regression(deterministic batched per W23 §8.7)

## Cross-Cutting

- [x] **H7 self-verify** — 3 處改動逐項對齊 mockup(meta 行 `:324-329` / sidebar 預設 `:79` / `ImageGallery` `:621-664`);全部改動方向 = implementation → mockup(per CLAUDE.md §5.7「修正 visual drift bug,把 implementation 更貼近 mockup」明文非 H7 trigger)
- [x] No ADR — H1(`done` event 加 additive field,無 vendor/storage/component 改動,同 W20 F2.1 `/health` payload 擴充先例一致)+ H2(無新 dependency)均不觸發
- [x] Commit references `progress.md` entry;component tag 對應 C10/C05/C07
- [x] `report.md` status `triaged → done`;此 `checklist.md` status `in-progress → done`;`progress.md` written
- [x] No CLAUDE.md / session-start.md update needed(Sev3 bug-fix,無 standing-instruction 影響)

## 🚧 Out of scope（不修,per report.md §7）

- 🚧 `SourcesStrip` `1fr 1fr` grid — 已 faithful(mockup `:687` 同 `page.tsx:1304` 一致),改成 responsive 反而 violate H7(反方向偏離)
- 🚧 CRAG strip 喺 streaming chat 不顯示 — streaming path 無 CRAG(`query.py:134-136`「CRAG L2 ... non-stream path only」)— architecture.md 既定設計,非 bug
- 🚧 `ImageGallery` 喺真實 docx KB(無 embedded screenshots)latent 不渲染 — 需 query 一個有 embedded images 嘅 KB 先見到;組件本身重建後即合規
- 🚧 `backend/observability` Langfuse-based realtime cost 聚合(`aggregate_generations` / `fetch_realtime_usage`)— 無關,不動

---

**Lifecycle reminder**:新加 acceptance item 必先入 `report.md §7`,然後再加 checklist。延後項標 🚧 + reason,唔可以刪。
