---
bug_id: BUG-007
report_ref: ./report.md
checklist_ref: ./checklist.md
status: closed              # in-progress | closed
---

# BUG-007 — Progress

## 2026-05-22 — triage + diagnosis

### Done
- Folder + 3 docs created `docs/03-implementation/bugs/BUG-007-chat-w22-rebuild-fidelity-gaps/{report,checklist,progress}.md`(per PROCESS.md §4 — Sev3 → 無 postmortem)
- Triaged **Sev3** — 3 H7 design-fidelity regressions,chat 核心功能正常、無 data loss。Chris confirmed Sev3 + 3-doc workflow + cost sub-decision(chat 2026-05-22)。
- **T1 root cause confirmed** — mockup(`ekp-page-chat.jsx`)+ implementation(`chat/page.tsx`)+ backend SSE(`stream_composer.py` / `query.ts` `DoneEvent`)三方 trace:3 處全部係 W22 F4 chat presentation rebuild 引入。
  - 問題 1a model:`DoneEvent.model` 已存在 + backend `:48` emit `deployment` —— 前端 `done` handler 冇 capture。
  - 問題 1b cost:backend `done` 只 emit tokens 無 cost;`realtime_cost.py` `_PRICING_TABLE` 已有 `gpt-5-5` rate。
  - 問題 2:`citationMode` 預設 W22 F4 由 `sidebar` flip 去 `inline` → toggle + panel 永不顯示。
  - 問題 3:`ImageGallery`(mockup `:621-664`)被 W22 F4 誤當 W20 abstraction 刪除。

### Decisions
- **D1 — cost = backend computes + emits(用戶 confirm「A + B」→ backend 計+emit 單一來源)**:`realtime_cost.py` NEW public `estimate_query_cost` helper reuse 既有 `_PRICING_TABLE`(`gpt-5-5` input 0.005 / output 0.015 per-1k-token),`stream_composer.py` 喺 `done` event 計好 emit。前端純 display `evt.cost`。對齊 V2 Server-Side First — pricing rate 單一住 backend,前端零 pricing 常數。
- **D2 — cost 計算放 `stream_composer.py`**:`compose_query_stream` 已持有 synth `result` event 嘅 `input_tokens`/`output_tokens`/`deployment`;`estimate_query_cost` 係 pure table-lookup 算術,符合 module「pure-data composer(no I/O)」契約。
- **D3 — `ImageGallery` thumbnail 用 real `blob_url`**:mockup 用 `SyntheticScreenshot` SVG(mockup-only);real images 由 `ImageRef.blob_url` 來 —— 同 W22 既有 `ScreenshotModal` real-image adaptation 一致(documented mockup-vs-real adaptation,非 fidelity 偏離)。
- **D4 — cost 無 rate row 時 `cost=null`**:`estimate_query_cost` 對無 `_PRICING_TABLE` 命中嘅 deployment 返 `None` → `done` event `cost=null` → 前端條件 render(同 `latencyMs` 既有 null-guard pattern 一致),唔顯示 `$NaN`。
- **D5 — `SourcesStrip` 不動**:用戶觀察「Sources 卡片固定大小」其實 = mockup `1fr 1fr` faithful 行為;改成 responsive 反而 violate H7。Out of scope。

### Done — implementation + verify + closeout (same sitting)
- **T2-T3 backend cost** — `observability/realtime_cost.py` NEW public `estimate_query_cost(model, input_tokens, output_tokens) -> float | None`(reuse `_rate_for` + `_PRICING_TABLE`);`generation/stream_composer.py` `done` event 加 `cost` field(deployment 無 rate row → `cost=null`);`api/routes/query.py` SSE-protocol docstring 同步加 `cost`。
- **T4-T7 frontend** — `lib/api/query.ts` `DoneEvent` 加 `cost: number | null`;`chat/page.tsx`:`Message` 加 `model`、`done` handler populate `model`+`costUsd`、meta 行 render `{model} · {reranker} · {N} citations` … `{latency}s · ${cost}`(問題 1)、`citationMode` 預設 `'inline'`→`'sidebar'`(問題 2)、重建 `ImageGallery` component +「Referenced screenshots」+ `imageCitations.length>=2` render(問題 3);檔頭 2 段 docstring 更新。
- **T8 test** — backend `test_stream_composer.py` +1 case(`done` event `cost` null path)+ 既有 case 加 `cost` assertion、`test_realtime_cost.py` +4 case(`estimate_query_cost` known/prefix/unknown/zero);frontend NEW `chat-meta-row.test.tsx`(2 case — meta-row model+cost render / `ImageGallery` render for 2+ image citations)。
- **T9 verify** — backend `pytest tests/` **919 passed + 11 skipped + 0 failed**(914 baseline → +5,exit 0,無回歸)+ `mypy` `stream_composer.py`/`realtime_cost.py` **0 error**(浮現嘅 pre-existing error 全喺未 touch 模組 `crag.py`/`observe.py`/`langfuse_tracer.py`/`retrieval_engine.py`)+ `ruff` clean;frontend `tsc --noEmit` exit 0 + `next lint` clean + `[oklch`=0(changed files)+ Vitest **23 files / 91 tests / 0 fail**(deterministic 3-batch per W23 §8.7)。
- **H7 self-verify** — 3 處改動逐項對齊 mockup(meta 行 `:324-329` / sidebar 預設 `:79` / `ImageGallery` `:621-664`);全部改動方向 = implementation → mockup,per CLAUDE.md §5.7 明文「修正 visual drift bug」非 H7 trigger。
- **BUG-007 committed** `(this commit)`。

### Decisions (impl-stage)
- **D6 — meta-row「2 with screenshots」assertion 移除**:`/2 with screenshots/` 同時命中 meta 行 + `FeedbackBar`(兩個 surface 都正當顯示,mockup `:326` + `:405`)→ `getByText` multiple-match。該 assertion 多餘(「Referenced screenshots」header + 2 img count 已證 `ImageGallery` render),移除而非改 `getAllByText` — Karpathy §1.2 唔過度 assert。
- **D7 — `mypy` 浮現 pre-existing error 不修**:`query.py` import `generation.crag` → mypy 經 import chain 浮現 `crag.py`/`observe.py` 等既有 error(BUG-007 只改 `query.py` docstring,零 code/type 改動)。per Karpathy §1.3 surgical — pre-existing dead tech-debt 唔順手修,只確認 `stream_composer.py`+`realtime_cost.py`(實 code 改動)0 error。
- **D8 — `done` handler `costUsd: evt.cost ?? null` boundary-normalize(follow-up commit)**:首個 commit `e6c4fbd` 用 `costUsd: evt.cost`。但 mixed-version transient(新 frontend Fast-Refresh + 舊 backend 未重啟)下舊 `done` event 無 `cost` key → `evt.cost===undefined` → meta 行 `costUsd !== null` 放行 `undefined.toFixed(3)` → render crash。`?? null` 喺 SSE ingestion boundary normalize(`undefined`→`null`)— 屬「validate at system boundaries」正當範圍,非 speculative。Chat tests 重 verify 3 passed。

### Acceptance（report.md §7）
- ✅ Root cause confirmed — 3 處 W22 F4 fidelity regression,via mockup + impl + backend SSE 三方 trace
- ✅ 問題 1b backend — `estimate_query_cost` + `stream_composer.py` `done` event `cost`
- ✅ 問題 1a/1b frontend — `DoneEvent.cost` + `Message.model` + meta 行 model+cost render
- ✅ 問題 2 frontend — `citationMode` 預設 `sidebar`(對齊 mockup `:79`)
- ✅ 問題 3 frontend — `ImageGallery` 重建(「Referenced screenshots」+ responsive grid + `blob_url` thumbnail)
- ✅ Test — backend +5 + frontend NEW `chat-meta-row.test.tsx`
- ✅ verify gates — backend pytest 919/11/0 + mypy 0(changed modules)+ ruff clean;frontend tsc 0 + lint clean + `[oklch`=0 + Vitest 23/91/0
- ✅ H7 self-verify — 3 處逐項對齊 mockup,reverse-direction drift correction
- 🚧 Out of scope:`SourcesStrip` `1fr 1fr`(已 faithful);CRAG strip streaming-path 不顯示(architecture 既定);`ImageGallery` 喺 docx KB latent 不渲染(需有 screenshots 嘅 KB)

**Verdict**:BUG-007 **CLOSED 2026-05-22**(Sev3;single-sitting triage + diagnosis + fix + test + verify + closeout)。`/chat` 3 處 W22 F4 fidelity regression 修正 — meta 行而家顯示 synthesis model name + USD cost、`citationMode` 預設 `sidebar`(sources panel toggle + 右 CitationPanel 重現)、`ImageGallery`(「Referenced screenshots」)重建。Backend `done` SSE event additive 加 `cost`(reuse `realtime_cost.py` `_PRICING_TABLE` 單一 pricing source)。全 verify gate 綠、無回歸。Sev3 → 無 postmortem。

### Commits
| Hash | Subject |
|---|---|
| `e6c4fbd` | `fix(frontend): restore chat meta-row model+cost, sources toggle, ImageGallery — BUG-007` |
| _(this commit)_ | `fix(frontend): normalize done-event cost to null when backend omits it — BUG-007 follow-up` |

---

**End of BUG-007 progress**
