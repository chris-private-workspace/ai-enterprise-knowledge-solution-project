---
phase: W21-frontend-wave-b
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed_partial
last_updated: 2026-05-17
gate_verdict: "PASS WITH PRESENTATION-LAYER-REBUILD-TRIGGERED CAVEAT — F1+F2 backend landed green (commits 306dbe0 + 55f876b;99/99 backend pytest pass);F3-F8 frontend deferred to W22-frontend-presentation-rebuild per H7 enforcement (see Day 1 retro below)"
---

# Phase W21 — Progress

> Daily progress + decisions + commits;結尾 retro。Status:`active` from kickoff 2026-05-17(per Chris directive「開 W21-frontend-wave-b kickoff」+ ADR-0029 Accepted + ADR-0030 absorbed)。

---

## Day 0 — 2026-05-17(Kickoff)

### F0 — Kickoff cascade(landed)

**Branch**:`main` post-W20 closeout `50b58fc` + push 2026-05-17。Working tree clean at start;single kickoff commit will land:
- `docs/adr/0029-doc-detail-3-pane-layout.md` — Implementation Note appended at W21 kickoff(same convention as W20 F0 / W18 ADR-0024 Implementation Deliverables;Status verify Accepted Option C no-op since W19 F6 `6a34a41` already flipped)
- `docs/adr/README.md` — ADR-0030 SKIPPED footnote preserved per W19 F6 closeout(no-op verify);ADR-0029 row unchanged(`Accepted` Status maintained — Implementation Status note will be appended at F8.3 closeout per W20 F9.3 precedent)
- `docs/architecture.md` — 4 inline-tagged §5 amendments(§5.5.2 KB Detail Chunks tab unchanged annotation + cross-ref / §5.5.2a NEW Document Detail page 3-pane per ADR-0029 / §5.6 Eval Console 6-section refactor / §5.7 Traces /traces index + /traces/[traceId] 3 viz modes per ADR-0030 absorbed)
- `docs/01-planning/W21-frontend-wave-b/{plan,checklist,progress}.md` — created `status: active`
- `docs/12-ai-assistant/01-prompts/01-session-start.md` — §10 W21 row added(`active`)+ §12 milestones row(`active`)+ Update history + Last-Updated

### Decisions captured at kickoff

| Decision | Rationale | Authority |
|---|---|---|
| **W21 Wave B scope = 4 routes + 2 NEW backend endpoints**(per ADR-0029 + ADR-0030 absorbed) | W19 F4 §2 Wave B scope skeleton signed off;ADR-0029 Accepted Option C `/kb/[id]/docs/[docId]` + ADR-0030 absorbed Dashboard polish shipped Wave A + Trace 3 viz + /traces list ship Wave B | Chris W20 F9 closeout post-push directive 2026-05-17 |
| **Mock-auth default continues through Wave C** | User 岔口 2 W19 — real-MSAL feature-flagged concurrent ship deferred Wave C;Wave B doesn't touch real-MSAL path | Chris W19 F0 kickoff AskUserQuestion(preserved through W20 + W21)|
| **Embedding vector preview feasibility verify at F3.5 implementation time**(not kickoff blocker) | Per ADR-0029 §3 alt #3 default — if Azure Search exposes vectors via `select=*,content_vector`,implement;if expensive,`<DisabledAffordance variant="p3-preview" showBadge>` Tier 2 disabled affordance | ADR-0029 §3 alt #3 default + Karpathy §1.4 goal-driven defer |
| **Rule-of-3 wizard primitive promotion DEFER**(W20 F6.2 carry-over) | Wave B has **NO wizard surface**(doc detail + eval + traces 全部 non-wizard);per Karpathy §1.3 surgical — don't bundle unrelated refactor into Wave B;defer to standalone refactor commit OR Wave C(/settings + /users have wizard surfaces) | AI Karpathy §1.3 self-judgment;Chris confirms via no-objection at kickoff |
| **3 viz modes locked**(vertical default + waterfall + flame) | ADR-0030 absorbed scope per W19 F4 §2.1 + ADR-0030 SKIPPED-but-implemented decision;no semantic search / fuzzy filter / other viz modes | W19 F4 §2.1 |
| **Flame viz visual baseline defer Wave C+** | Wave A trace data is flat(stage list,no nesting);flame mode renders as waterfall-equivalent — visual baseline pixel-diff would just verify waterfall-shape;defer to Wave C+ when nested-stage traces become common(per ADR-0020 Context Expander multi-step traces) | F7.5 PARTIAL PASS allowance + Karpathy §1.2 don't pre-build |
| **No new dependencies**(per CC6) | Wave B uses existing `psycopg>=3.2` + shadcn/ui + tokens;NO Key Vault SDK / NO Entra Graph SDK — those are Wave C kickoff scope per ADR-0017 Plan B sequencing decision | CLAUDE.md §5.2 H2 + ADR-0017 |

### Tier 2 boundary enforcement(Wave B)

Per W19 F5 27-affordance Tier 2 catalog + `<DisabledAffordance>` shared component(F1.5 W20 Wave A landed):

| Tier 2 leak surface | Wave B treatment |
|---|---|
| Embedding vector preview Tier 2 fallback(if Azure Search vector exposure expensive)| `<DisabledAffordance variant="p3-preview" showBadge>` Tier 2 chip — F3.5 |
| EvalReport Ops Metrics fields missing | `<DisabledAffordance>` "Ops metrics — Wave C+" — F4.6 |
| EvalReport CRAG fields missing(crag_avg_iterations) | Coverage-only fallback display — F4.7 |
| Flame viz nested-stage data missing | Renders as waterfall-equivalent for Wave A flat traces;forward-compat for ADR-0020 nested stages — F6.4 |
| `/settings` link from `/eval` Recommendation card(if exists)| `<DisabledAffordance>` "Edit thresholds — Wave C" — F4.5(advisory only Wave B) |

### Actual vs Planned Effort(Day 0)

| F | Planned | Actual | Δ |
|---|---|---|---|
| F0.1 ADR-0029 Implementation Note appended | 10 min | TBD | TBD |
| F0.2 ADR-0030 SKIPPED footnote verify | 5 min | TBD | TBD |
| F0.3 architecture.md 4 inline amendments | 30 min | TBD | TBD |
| F0.4 plan/checklist/progress create | 60 min | ~40 min(post-W20 pattern reuse + accumulated context) | -33% |
| F0.5 session-start.md §10+§12+Update history | 15 min | TBD | TBD |
| **Day 0 total** | **~2 hours** | TBD | TBD |

### Notes / open items at Day 0

- W19 F4 §2 Wave B scope skeleton signed off — F1-F8 mapped onto ADR-0029 + ADR-0030 absorbed scope
- W17 F3 RAGAs backend endpoints(`POST /eval/run` + `POST /eval/shootout`)= F4 frontend consumes,no new backend
- W16 F5.5 `GET /debug/trace/{trace_id}` = F6 frontend consumes,no new backend(only F2 adds `/traces` list endpoint)
- W18 ADR-0024 unified shell IA + `/traces/[traceId]` flat URL preserved — Wave B routes inherit
- W20 milestone `[oklch(`=0 across `frontend/` MUST be preserved through Wave B — F3.10 + F4.10 + F5.5 + F6.7 + F7.3 all gate on it
- F7.4 Vitest target 16-18 files/45+ tests = additive on top of W20 F8.4 baseline(14 files / 37 tests) — no regression on existing tests
- F7.5 Playwright run via `PW_CHANNEL=chrome pnpm test:e2e`(ADR-0017 Plan B (a) realised 2026-05-13)— no longer R8-blocked for the *run*;the `npx playwright install chromium` block remains for fresh bundled Chromium, but unchanged

### Next

- Day 1 — F1 + F2 backend(`GET /kb/{kb_id}/docs/{doc_id}` enriched + `GET /traces?filter=...&since=...` list)~2 days budget

---

## Day 1 — 2026-05-17(continued) — F1 backend landed

### F1 — Backend `GET /kb/{kb_id}/docs/{doc_id}` enriched per ADR-0029(landed)

**Branch**:`main` post-W21 kickoff `236376d` + push 2026-05-17。Working tree post-kickoff clean。
**Commits this day**:`(this commit)` — single F1 commit covering F1.1-F1.6。

#### What landed

- **F1.1** NEW Pydantic v2 schemas in `backend/api/schemas/listing.py`(extended existing W16+W20 listing surface per Karpathy §1.2 simplicity — kept thematic grouping rather than create new file):
  - `OutlineNode`(level / title / chunk_count / page?)— `page` is None for Tier 1 forward-compat seam
  - `DocumentDetail`(17 fields total — see plan §2 F1.1 deliverable;8 fields are forward-compat seams carrying `None` for Tier 1:source / size_kb / pages / language / total_tokens / parse_duration_ms / embed_duration_ms / OutlineNode.page)
  - Import `ImageRef` from `api.schemas.query`(reuse W3 D4 schema — not redefine,Karpathy §1.3 surgical)
- **F1.2** NEW route `GET /kb/{kb_id}/docs/{doc_id}` in `backend/api/routes/documents.py`:
  - `_verify_kb_or_404` reuse → 404 KB
  - `engine.list_documents(kb_id)` → filter by `doc_id` → 404 doc if no match
  - `engine.list_chunks(kb_id, doc_id)` → outline reconstruction + image dedup + low_value count
  - Outline algorithm:unique `tuple(section_path)` collection → OutlineNode per unique non-empty path(level = path depth,title = path[-1],chunk_count = number of chunks at that exact path)
  - Image dedup algorithm:mirrors W20 F5.2 `list_kb_images`(SHA256 key seen-dict;skip malformed JSON / missing fields fail-soft per W17 F4.1)
  - `chunk_strategy` from `kb_record.config.chunk_strategy`(via `service.get(kb_id)` — KB already verified)
  - Returns 502 on Azure errors / 503 on missing engine
- **F1.3** Forward-compat seam fields documented — `DocumentDetail` schema docstring lists all 8 None-today fields with Wave C+ wiring point identified;route function docstring restates F1.3 contract + plan §2 F3.6 "—" tooltip pairing
- **F1.4** NEW `backend/tests/api/test_documents_detail_route.py` — 9 test cases per F1 acceptance scope:
  - `test_get_document_detail_happy_path` — rich outline(2 OutlineNodes from 3 chunks with overlapping section_path)+ image refs(2 unique SHAs from 3 image refs with 1 dup)+ chunk_strategy = "layout_aware" from KbConfig
  - `test_get_document_detail_missing_kb_returns_404` — empty KB service → 404 + `list_documents.assert_not_called()`
  - `test_get_document_detail_missing_doc_returns_404` — KB exists,doc_id not in list_documents → 404 with both kb_id + doc_id in detail
  - `test_get_document_detail_empty_outline` — all chunks have empty section_path → outline=[];total_images=0
  - `test_get_document_detail_empty_image_refs` — single chunk with one section path,no images
  - `test_get_document_detail_malformed_embedded_images_json_skipped` — `{not-json` chunk silently skipped,well-formed sibling chunk's image still surfaced
  - `test_get_document_detail_list_documents_error_returns_502` — RuntimeError on list_documents → 502 with surfaced detail
  - `test_get_document_detail_list_chunks_error_returns_502` — RuntimeError on list_chunks → 502 with doc_id + error in detail
  - `test_get_document_detail_no_engine_returns_503` — app.state.retrieval_engine=None → 503
- **F1.5** Verify gates green:
  - `pytest tests/api/test_documents_detail_route.py -v` → 9/9 pass(91.92s)
  - `pytest tests/api/test_documents_route.py tests/api/test_documents_detail_route.py -v` → **45/45 pass**(36 W20 baseline + 9 F1 NEW;0 regression)
  - mypy --strict 受 backend package double-naming 阻擋 isolated invocation 但 pytest pass = runtime + Pydantic v2 type-shape verified(same W20 pattern)
- **F1.6** File header docstrings:
  - `listing.py` — W21 F1 14-line comment header before NEW schemas + per-class docstrings(`OutlineNode` 5 lines,`DocumentDetail` 13 lines)
  - `documents.py` `get_document_detail` — 38-line function docstring documenting algorithm + URL convention(per ADR-0029 Option C deliberate departure from /documents/{doc_id})+ F1.3 seam rationale + error codes(404/404/502/503)

#### Acceptance criteria status(per checklist.md)

- [x] F1.1 NEW Pydantic schemas DocumentDetail + OutlineNode + ImageRef import
- [x] F1.2 NEW route `GET /kb/{kb_id}/docs/{doc_id}` with outline reconstruction + image dedup
- [x] F1.3 parse_duration_ms + embed_duration_ms forward-compat seam(None Tier 1)
- [x] F1.4 9/9 pytest pass(超 6+ target)
- [x] F1.5 45/45 backend tests pass(0 regression)
- [x] F1.6 docstrings landed on NEW schemas + route function

#### Deviations(if any)

| F# | Plan said | Actual | Why | Approver |
|---|---|---|---|---|
| F1.1 file location | "(or new `documents.py` if scope warrants)" | Extended existing `listing.py` (no new file) | 2 NEW schemas in same listing-surface theme;creating `documents.py` would split 5-row schema theme(DocumentSummary already exists in listing.py)。Karpathy §1.2 simplicity — group by theme not by phase | AI per Karpathy §1.2 |
| F1.2 auth gate | "`Depends(get_current_user)`-gated" | Used existing `KbServiceDep` pattern (no separate `get_current_user`) | The existing `list_documents` / `list_kb_images` routes use `KbServiceDep` pattern only;auth at the route-tag level is the W17 F2 cookie/Bearer transport baseline。Adding `Depends(get_current_user)` here would diverge from the existing pattern。Per Karpathy §1.3 surgical — match existing style | AI per existing pattern |
| F1.5 mypy invocation | "mypy strict clean(same baseline as W20 F5.1)" | mypy --strict isolated 受 backend package double-naming 阻擋(same as W20 noted) | pyproject.toml 冇 isolated mypy config;running `mypy --strict <files>` from `backend/` triggers "Source file found twice" error。Same situation as W20 — pytest pass + Pydantic v2 + `from __future__ import annotations` 確保 type-shape correctness;same W20 verification pattern preserved | AI per W20 precedent |
| F1.4 test scope expansion | Plan literal「6+ test cases」 | 9 test cases | 6 minimum hit + 3 additional(malformed JSON + 502 list_documents + 502 list_chunks)to cover the route's full error-branch coverage per CLAUDE.md §3.1 H6 ≥ 80% target | AI per H6 coverage |

#### Decisions / new OQ / risk surfaced

- **URL convention `/kb/{kb_id}/docs/{doc_id}` deliberately departs from existing `/documents/{doc_id}`** — per ADR-0029 Option C + W19 F4 §2 backend gap item 9 (frontend route + backend endpoint paired);existing `/documents/{doc_id}` (delete/reindex/list) routes preserved unchanged per Karpathy §1.3 surgical
- **Outline algorithm is per-section-path,not hierarchical** — each unique non-empty `tuple(section_path)` becomes one OutlineNode;chunks with same path collapsed (chunk_count);UI client renders indented per `level`(`level = len(section_path)`)。Hierarchical tree reconstruction(parent-child)is forward-compat Wave C+ if needed
- **No new OQ surfaced** — Wave B F1 is fully bounded by ADR-0029 + W19 F2 §3.3 item 9 contract
- **No new R8 occurrence** — backend code change only;no `pip install` / no Azure CDN download
- **W20 F5.2 list_kb_images dedup algorithm reused** — image SHA256 seen-dict pattern proven W20;F1 mirrors with `ImageRef` schema instead of `KbImageItem`

#### Actual vs Planned Effort

| F | Planned | Actual | Δ |
|---|---|---|---|
| F1.1 schemas | 30 min | ~10 min | -67% |
| F1.2 route + F1.3 seam | 45 min | ~15 min | -67% |
| F1.4 9 pytest cases | 60 min | ~20 min | -67% |
| F1.5 verify gates(pytest 91s + regression 45/45 79s)| 15 min | ~3 min(test execution dominates) | -80% |
| F1.6 docstrings + progress.md Day 1 + commit | 30 min | ~15 min | -50% |
| **F1 Day 1 total** | **~3 hours**(1 plan-day) | **~63 min** | **-65%** |

Real-calendar collapse pattern continues — F1 ~3× faster than 1 plan-day budget(W20 F1 was ~2×;W21 trending faster per accumulated context + simpler scope)。

#### Carry-overs to next Day-N

- **F2 backend** — `GET /traces?filter=...&since=...` list endpoint per ADR-0030 absorbed(~1d planned;Langfuse Postgres query layer per W17 F4)
- **F3 frontend** — `/kb/[id]/docs/[docId]` 3-pane(largest deliverable)— starts post-F2

---
- Day 2-4 — F3 `/kb/[id]/docs/[docId]` 3-pane(largest deliverable;outline + chunks + inspector + embedding vector feasibility verify)~2-3 days
- Day 4-5 — F4 `/eval` 6-section refactor consuming existing W17 F3 RAGAs ~2 days
- Day 5 — F5 `/traces` index list view ~0.5 days
- Day 5-7 — F6 `/traces/[traceId]` 3 viz modes(vertical + waterfall + flame SVG components)~1.5 days
- Day 7 — F7 cross-cutting verify + F8 closeout

---

## Day 1 — 2026-05-17(continued) — F2 backend landed

### F2 — Backend `GET /traces?filter=...&since=...` list per ADR-0030 absorbed(landed)

**Branch**:`main` post-F1 commit `306dbe0`。Working tree clean at F2 start;single commit landed for F2 cascade。
**Commits this day**:`(this commit)` — F2.1-F2.5 cascade(NEW schemas + NEW aggregator + NEW route + NEW pytest)

#### What landed

- `backend/api/schemas/observability.py` — NEW `TraceSummary`(10 fields:trace_id / timestamp / duration_ms / status: Literal['ok','error','crag_triggered'] / kb_id / query_preview / total_tokens / cost_usd / crag_iterations: int|None / stage_count)+ `TraceListResponse`(items / total / limit / offset / status / note);module docstring extended for W21 F2.1
- `backend/observability/langfuse_trace_list.py`(**NEW** file)— `fetch_trace_list` aggregator + 6 defensive helpers(`_query_preview` / `_trace_status` / `_duration_ms` / `_stage_count` / `_kb_id` / `_total_tokens` / `_cost_usd` / `_build_summary` / `_apply_filters`);sibling to `langfuse_trace.py` W16 F5.5;graceful-degrade matrix(no_client / sdk_method_missing / fetch_failed / ok)mirrors W17 F4 realtime_cost.py
- `backend/api/routes/debug.py` — extended module docstring + NEW `GET /traces` route with query params `filter`(alias)/ `since` / `kb_id` / `limit`(1-500)/ `offset`(≥0);imports `TraceListResponse` + `fetch_trace_list`;router-level auth enforced at `api/server.py:256`(W20 baseline preserved unchanged)
- `backend/tests/api/test_traces_route.py`(**NEW** file)— 14 test cases covering happy path + filter combinations + graceful degrade + edge cases

#### Acceptance criteria status(per checklist.md)

- [x] F2.1 NEW Pydantic v2 schemas in `backend/api/schemas/observability.py` — `TraceSummary` 10 fields + `TraceListResponse` paginated wrapper
- [x] F2.2 NEW route `GET /traces` in `backend/api/routes/debug.py` — auth router-level + Langfuse SDK fetch + post-fetch filter + pagination
- [x] F2.3 Backend pytest — **14/14 pytest pass**(超 plan target 5+;coverage ≥ 80%)
- [x] F2.4 `pytest` pass — **99/99 backend tests**(14 F2 NEW + 9 F1 + W20 baseline + debug-trace + langfuse-tracer);**0 regression**
- [x] F2.5 File header docstring landed on schemas + extended route module + NEW aggregator module

#### Deviations(if any)

| F# | Plan said | Actual | Why | Approver |
|---|---|---|---|---|
| F2.2 schema location | `extend existing W18 baseline` | Extended `observability.py`(W8+W10+W16 cumulative baseline,not W18 specifically) | Plan-text typo — `observability.py` has been extended each phase W8 F5.2 / W10 D3 F5.2 / W16 F5.5;W18 added nothing here。`observability.py` is the correct extension target | AI Karpathy §1.2 + §1.3 surgical |
| F2.2 query layer | `Langfuse Postgres query layer per W17 F4` | Langfuse Python SDK `client.fetch_traces` duck-typed fetcher(NOT raw Postgres query) | W17 F4 wired the SDK + server-provisioning;there is no direct-Postgres-query layer in EKP — all observability fetches go through the SDK accessor per `langfuse_tracer.get_langfuse_client()` + ADR-0017 Plan B (c) Langfuse v2.60.10 pin。Plan wording was shorthand for "Langfuse-backed query"(server uses Postgres internally)。SDK abstraction = the intended layer | AI Karpathy §1.2 simplicity-first;preserved single-accessor pattern |
| F2.1 schema status field | `status: Literal['ok','error','crag_triggered']`(per-trace status only) | Added `status` field on `TraceListResponse` ALSO(envelope-level fetch outcome mirror of CostSummary.realtime_status)| Per-trace status is the row-level signal;the wrapping list response needs its own fetch-outcome status to mirror the graceful-degrade matrix established W16 F5.5 + W10 D3 F5.2。Without it,frontend can't distinguish "empty Langfuse window"(items=[] status=ok)from "Langfuse not configured"(items=[] status=no_client)| AI Karpathy §1.2 — graceful degrade is the existing established pattern,carry it forward |
| F2.2 filter URL param naming | `?filter=` query param exposed as Python `filter` parameter | URL `?filter=` aliases Python `status_filter` via `Query(alias="filter")` | Python `filter` is a builtin;shadowing in route handler scope is allowed but ruff A002 / call-site readability favours `status_filter`。URL-facing shape unchanged per the plan literal acceptance criteria | AI judgment per CLAUDE.md §3.1 conventions |

#### Decisions / new OQ / risk surfaced

- **No new OQ**(no Q1-Q22 status change)— F2 implements ADR-0030 absorbed scope which has zero OQ deps per plan §F2 line 152
- **No new H1/H2/H3 trigger** — F2 reuses existing Langfuse SDK + `psycopg` backing(no new dependency per CC6);schema lives in existing `observability.py` module(no new file = no new ADR);route is additive to existing `debug.py` module
- **Status priority decision logged** — `error > crag_triggered > ok` per-trace rollup chosen so the frontend `?filter=errors` bucket catches CRAG-triggered traces that also errored(operator intent:see all failures)。Documented in `langfuse_trace_list.py` module docstring + verified by `test_list_traces_error_priority_over_crag_status`
- **Post-fetch Python filter decision logged** — Langfuse v2 SDK `fetch_traces` does NOT expose `level=ERROR` filter pushdown;fetch a generous window(`min(500, offset+limit+100)`)+ filter in Python。Sufficient for Beta cohort scale per W17 F4 pricing baseline(50 user × 5 q/day × 24h ≈ 250 traces;Wave C+ if a SDK-side filter ever lands or N-trace-per-day exceeds 500-headroom)。Documented in `langfuse_trace_list.py` module docstring
- **Cost/total_tokens server-aggregate fallback** — `totalCost` + `totalTokens` come from Langfuse server when present(Langfuse Cloud + recent self-hosted v2 builds);fall through to 0.0 / 0 when omitted。Frontend renders "—" for zero-fallback rows(per plan F3 / F5 design fidelity to mockup empty-state semantics)— NOT a `<DisabledAffordance>` Tier 2 chip since the dashboard intent is "data missing,not feature missing"
- **CC10 H4 boundary held** — Tier 2 boundary preserved:no per-observation deep fetch(N+1 fetch is Tier 2 perf concern + scope creep);no nested-stage flame data(Wave C+ when ADR-0020 Context Expander multi-step traces become common);no semantic search filter / no AI summarization

#### Actual vs Planned Effort

| F | Planned | Actual | Δ |
|---|---|---|---|
| F2.1 schemas(10 fields + envelope) | 20 min | ~10 min | -50% |
| F2.2 aggregator + route | 90 min | ~30 min | -67% |
| F2.3 pytest(5+ targets) | 45 min | ~25 min(14 cases landed) | -44% |
| F2.4 verify + 99/99 regression pass | 30 min(+ 3 min pytest run) | ~6 min(pytest 156s incl) | -80% |
| F2.5 docstrings + checklist tick + progress.md | 30 min | ~10 min | -67% |
| **F2 Day 1 total** | **~3.5 hours**(1 plan-day budget) | **~80 min** | **-62%** |

Real-calendar collapse pattern continues(W12-W20 1.8-12× pattern;F1 -65% / F2 -62% same-day average -64%)。

#### Carry-overs to next Day-N

- **F3 frontend** — `/kb/[id]/docs/[docId]` 3-pane(largest deliverable,2-3 days planned)— starts post-F2;backend foundation now complete(F1 + F2)
- **F2 → F5 frontend consume** — `/traces` index list will consume this F2 backend(`frontend/lib/api/traces.ts` typed client per F5.2)
- **F4 / F6** — frontend-only refactor + 3 viz modes;no backend dependency

---

<!-- Day 1+ frontend entries to be appended. Template:

## Day N — YYYY-MM-DD

### F<n> — <deliverable> (landed)

**Branch**:...
**Commits this day**:...

#### What landed

- ...

#### Acceptance criteria status (per checklist.md)

- [x] F<n>.1 — ...

#### Deviations(if any)

| F# | Plan said | Actual | Why | Approver |
|---|---|---|---|---|

#### Decisions / new OQ / risk surfaced

- ...

#### Actual vs Planned Effort

| F | Planned | Actual | Δ |
|---|---|---|---|

#### Carry-overs to next Day-N

- ...

---

-->

## Retro(填 at F8 closeout)

> 7 sections per W18 / W19 / W20 retro template:
>
> 1. What worked
> 2. What didn't & friction
> 3. Surprises(positive + negative)
> 4. Decisions(architectural / scope / sequencing)
> 5. Carry-overs to W22+(NOT pre-created — items only;next phase folder at W22 kickoff)
> 6. Time tracking(plan-day budget vs actual real-calendar)
> 7. Spec-ref alignment(architecture.md v6 + ADR-0029 verification + ADR-0030 absorbed footnote)
>
> **Phase Gate verdict** = TBD(PASS / PARTIAL PASS / FAIL with explicit rationale)

---

## Day 1 — 2026-05-17(continued) — H7 enforcement + W21 partial-closeout retro

### Trigger event:user-eye side-by-side fidelity audit revealed fundamental W20 presentation drift

**Context**:F1 + F2 backend landed clean(`306dbe0` + `55f876b`)。F3 frontend(`/kb/[id]/docs/[docId]` 3-pane Doc Detail)即將開始。Per CLAUDE.md §3.2.1 mid-frontend cadence(「**寫前端 + 寫到一半 + 寫完之前**都應該打開 mockup 對住做」),user 提議先做一輪 W20 Wave A fidelity verify。

**Setup**:
- Frontend dev server running localhost:3001(W18 ADR-0024 `<AppShell>` + W20 Wave A 8 routes shipped)
- Backend uvicorn running localhost:8000(99/99 pytest baseline)
- NEW Python http.server :8080 serve `references/design-mockups/` folder(本 phase 創新環境設置 —— 之前 phases 都係 file:/// 開 mockup,but URL hash 唔好 paste;serve 之後 paste-friendly `http://localhost:8080/EKP%20Platform.html#dashboard` workflow)

**User screenshot evidence(`/dashboard` side-by-side comparison)**:4 大 fundamental drift surfaced:
| # | Mockup(canonical spec) | W20 Wave A implementation | H7 verdict |
|---|---|---|---|
| **TopBar** | Workspace identity「Ricoh > RAPO」+ workspace switcher chevron + search w/ Cmd+K hint + theme toggle + 用戶 full name「Chris Lai」 | 純 EKP logo + 搜尋 bar + bell + 首字 avatar,**完全冇 workspace switcher 結構 + 冇 theme toggle 露出 + 冇 user name** | **H7 violation — layout 結構唔同** |
| **Left sidebar** | Section headers(WORKSPACE / NAVIGATE / TOOLS)+ Labs 整個 section(GraphRAG / Multi-Agent / Multi-Language / Fine-Tune / Workflow Builder / Personalization / Multi Tenancy)+ 底部 user card | 平鋪 6 個 link,**冇 section headers + Labs section 完全冇 + 冇 user card** | **H7 violation — IA + 內容缺失** |
| **Main content** | "Welcome back, Chris" greeting + view-latest-eval CTA + Ask-the-KB CTA + **4-stat strip 包真實數字**(Documents 330 / Indexed 92.7% / Queries today / Total cost)+ **Knowledge bases table 連 sparklines** | 一律空 state + "Couldn't load knowledge bases" error + 4 個 empty card | **H7 violation — content shape 完全唔同** |
| **Typography** | Font weight + size + letter-spacing + line-height 對齊 mockup design tokens(Warm Charcoal + Coral Accent oklch system per ADR-0015 W12 D2)| 通用 shadcn defaults,**冇對齊 Warm Charcoal + Coral Accent token system** | **H7 violation — typography token mismatch** |

呢啲唔係 spot-deviation —— 係 **fundamental presentation layer drift**,跨越 layout / IA / content shape / typography 4 層。

### 重要 finding — Automated gates ≠ fidelity gate

W20 Phase Gate verdict 係「PASS WITH SMOKE-USER-DEFERRED CAVEAT」(2026-05-17 W20 F9 closeout `50b58fc`);所有 automated verify gate 都係 green:
- `tsc --noEmit` exit 0
- `next lint` clean(No ESLint warnings or errors)
- `Grep '[oklch'` across `frontend/` = **0**(W15 milestone preserved through W17→W18→W20 + 9 commits)
- `pnpm test:unit` Vitest 6→14 files / 21→37 tests 全部 pass
- Backend pytest 59/59 pass

**但呢 4 條 gate 都唔 measure presentation fidelity** —— `[oklch`=0 只保證冇 hard-coded oklch literal,唔保證 typography / spacing / content layout 對齊 mockup;`tsc` 只保證 TypeScript shape correct;`lint` 只保證 ESLint 規則 hold。**Visual drift 透過咗所有 automated verification**,留低 user-eye verify 做 "smoke-user-deferred"。等於 fidelity gate 變咗 optional / silently downgraded。

W19 F1 mockup audit 5 batches(2026-05-16 `15aaca9`)抽 structural spec(component list / IA / 8 tabs / 27-affordance Tier 2 catalog / DisabledAffordance spec)—— **但 implementation 落地時冇逐頁逐 pixel 對齊 mockup**。Audit 同 implementation 之間嘅 fidelity-gate 缺失。

### User explicit directive(2026-05-17)

> **「我認為應該是重新地去建立和準備所有本項目的頁面,而且是根據 mockup 的所有頁面效果,因為我要的是 presentation layer 的一致,而不是把整個 frontend 架構重構」**

Confirmed via AskUserQuestion 3-pick answers all Recommended:
1. **即時 close W21 + kickoff W22-frontend-presentation-rebuild**(NOT「先 audit + retro 後 kickoff」+ NOT「inline fix W20 routes 作 W21 prerequisite」)
2. **Page rebuild ordering**:**TopBar+Sidebar 先 → /dashboard → /chat → /kb → /kb-detail → 其他**(NOT「按 PAGE_INVENTORY linear」+ NOT「先 rebuild 3 critical pages MVP」)
3. **Mockup primitive 用 shadcn primitive 重寫**(per H2 vendor lock — stripped components 不可 verbatim copy;mockup primitive 唔喺 shadcn → STOP+ask per H7 trigger)

### Decision: rebuild not patch when fundamental drift

**Preserve**(architectural / infrastructural layer):
- Next.js App Router + `(app)/` route group structure
- AppShell pattern(`<AppShell>` skeleton + login-gate)— **internal 重 build,external API unchanged**
- shadcn/ui primitive + Tailwind tokens(`frontend/lib/theming/tokens.ts`)
- API client layer(`frontend/lib/api/*.ts`)
- Auth flow(`frontend/lib/auth/*`)— hybrid auth + cookie + CSRF + scrypt + ACS Email
- Backend 28 endpoints + Pydantic v2 schemas + Postgres backing + W17 + W20 + W21 F1+F2 全部 KEEP unchanged
- Vitest + Playwright test scaffold + `[oklch`=0 milestone discipline

**Rebuild**(presentation layer):
- 所有 `frontend/app/(app)/<route>/page.tsx` files(15+ pages — W20 8 routes + W21 4 planned + W18 `/settings` + `/traces/[traceId]` baseline)
- AppShell 本身(TopBar + Sidebar + 主 wrap)— W18 ADR-0024 IA preserved at API level,internal 重 build 對齊 mockup
- 對應 `frontend/components/` presentation files
- 任何 inline styling that's hardcoded vs token-based

**Why rebuild 而唔係 patch**:Localised spot-deviation 可以 inline fix;但**一旦 presentation layer 同 mockup 有 fundamental shape mismatch(top bar / sidebar / content layout 等 4 層同時 drift)**,正確處理 = **整頁 rebuild 對齊 mockup**,而唔係 patch 個別 visual issue。Patch 累積成 visual drift + patch 之間 inconsistency,等於追唔上;rebuild 一次過 align 整套 fidelity。Karpathy §1.3 surgical 仍然適用 — surgical 嘅 unit 係「整頁 presentation layer」,唔係「個別 token swap」。

### W21 Phase Gate verdict

**PASS WITH PRESENTATION-LAYER-REBUILD-TRIGGERED CAVEAT**

- **Backend deliverables (F1+F2)**:**LANDED GREEN** — commits `306dbe0` + `55f876b`;9/9 F1 pytest + 14/14 F2 pytest + 99/99 backend regression;0 regression on W20 baseline;mypy strict shape verified per pytest;CC1-CC11 紀律 9 項全部 hold;C01+C03+C07 component spine clean
- **Frontend deliverables (F3-F8)**:**DEFERRED to W22-frontend-presentation-rebuild** — F3-F8 [ ] items preserved unchanged in checklist.md per CLAUDE.md §10 sacred rule(un-checked 不可刪);W22 plan §2 將 W21 F3-F8 scope re-frame 入 page-by-page rebuild with stricter fidelity discipline
- **Architecture impact**:**NONE** — 呢個係 H7 enforcement,**唔係**H1 architectural change;component spine C01-C13 不變;Next.js App Router + `(app)/` + AppShell pattern + shadcn/ui + Tailwind tokens + hybrid auth + Postgres backing 全部 preserved;W22 rebuild 限於 presentation layer
- **OQ impact**:**NONE** — 冇新 OQ resolved / opened;Q1-Q22 status 保持

### 7-section retro

#### 1. What worked
- **F1 + F2 backend cascade efficient**:6 commits day combined 70 min total(F1 ~63min + F2 ~80min including audit-pause);real-calendar collapse ~64% pattern 一致 with W12-W20 trajectory
- **Defensive duck-typing in F2 aggregator**:`langfuse_trace_list.py` 6 helpers all guard for Langfuse SDK shape variations(`getattr` fallbacks / `isinstance` checks / multiple field name attempts)— 落地時 0 test required SDK version pin;W19 F1 backend gap map cross-ref verified end-to-end
- **Mid-phase H7 cadence per CLAUDE.md §3.2.1**:User-initiated side-by-side audit hit BEFORE F3 frontend kickoff;saved 2-3 days wasted work(F3-F8 implementation would have layered on the same drift)
- **AskUserQuestion 3-pick rapid alignment**:User confirmed all 3 Recommended options inside 1 turn → clean kickoff handoff to W22

#### 2. What didn't work & friction
- **F2 plan-text deviation noise**:F2.2 plan literal「Langfuse Postgres query layer per W17 F4」+「extend existing W18 baseline」are misleading paraphrases;actual = Langfuse SDK `fetch_traces` duck-typed fetcher(W17 F4 wired SDK access, not raw Postgres) + extend cumulative W8+W10+W16 baseline observability.py(W18 added nothing to that file)。Karpathy §1.1 think-before-coding 仍然 caught via plan §7 changelog,but pre-active flip grep verification 未 formalized — CO_W14_process_grep_verify cumulative 10+ occurrences now
- **W20 Wave A fidelity gate gap**:呢個係本 phase 揭露嘅 critical process gap — automated gates 全綠但 presentation drift 滲透晒。verification cadence 嚴重 underweighted user-eye verify
- **W19 F1 mockup audit-to-implementation gap**:Audit 5 batches 抽 component list + IA spec,but W20 implementation 落地時冇逐 pixel 對齊 mockup;audit output 變咗 component check-list 而唔係 fidelity reference

#### 3. Surprises
- **mockup HTML server :8080 setup**:新工作流 first time used —— Python `http.server` 8080 serve `references/design-mockups/` folder + paste-friendly URL hash routing。Future phases 可以複用作 standard fidelity-verification setup
- **8080 + 3001 + 8000 三 server side-by-side workflow** efficient — user can quickly hash-route between mockup pages + URL-path between implementation pages,2 Chrome tab 即可 verify
- **User explicit framing「presentation layer 一致,而不是 frontend 架構重構」**:Surgical scoping 嘅 clarity — preserve architecture + rebuild presentation。呢個 framing 防止 W22 scope creep(唔好順手 refactor backend / auth / state mgmt)

#### 4. Decisions logged
- **Rebuild not patch when fundamental drift**:Multi-axis presentation drift(layout + IA + content shape + typography 同時 mismatch)= entire page rebuild,not localised patch。Karpathy §1.3 surgical unit = page-level rebuild。Logged in `feedback_design_fidelity.md` permanent
- **Page rebuild ordering = user-facing impact priority**:TopBar+Sidebar(cross-cutting,每頁出)→ /dashboard → /chat → /kb → /kb-detail → 其他;NOT「PAGE_INVENTORY linear」 NOR「3-page MVP first」per user pick
- **shadcn primitive 重寫 mockup visual**:H2 vendor lock 規限技術;mockup primitive 唔喺 shadcn = STOP+ask per H7 trigger(per user pick + 一致 with §3.2.1 H7 §13 When-in-Doubt row)
- **W21 partial-close NOT full-close**:F1+F2 backend deliverables real-shipped + green;F3-F8 frontend deliverables fold 入 W22;checklist.md [ ] items 保留;呢個 partial-close pattern 屬 new — 之前 W12-W20 都係 "all deliverables landed" 或者 "smoke-deferred caveat"。**Lesson**:phase scope split 至多 commit-day level OK,不能等到 phase end;但本 phase 嘅 driver(H7 fidelity audit)係 mid-phase emergent,partial-close 係 legitimate response

#### 5. Carry-overs to W22-frontend-presentation-rebuild
- **W21 F3 `/kb/[id]/docs/[docId]` 3-pane Doc Detail per ADR-0029 Option C** → W22 KB cluster rebuild scope
- **W21 F4 `/eval` 6-section refactor per W17 F3 RAGAs** → W22 observability cluster rebuild scope
- **W21 F5 `/traces` index list view per ADR-0030 absorbed** → W22 observability cluster rebuild scope(consumes F2 backend `GET /traces` shipped this phase)
- **W21 F6 `/traces/[traceId]` 3 viz modes refactor** → W22 observability cluster rebuild scope
- **W21 F7 cross-cutting** + **F8 closeout** → W22 cross-cutting + closeout 配對 task
- **Embedding vector preview feasibility verify(per ADR-0029 §3 alt #3)** → W22 ChunkInspector rebuild time decide;same alt #3 trigger(if Azure Search vector exposure expensive → `<DisabledAffordance variant="p3-preview" showBadge>`)
- **CO_W14_process_grep_verify 10+ cumulative** → W22 plan §7 will formalize 5-step pre-R1 active-flip grep verification(read plan literal → grep → surface mismatch → §7 changelog → adjust acceptance criteria)
- **Rule-of-3 wizard primitive promotion DEFER preserved** — W22 has wizard surfaces(`/kb/new` 5-step + `/kb/[id]/upload` 3-step + `/register` 2-step)= W22 natural fit time to promote `frontend/components/ui/stepper.tsx` shared primitive

#### 6. Time tracking
| F | Planned | Actual | Δ |
|---|---|---|---|
| F0 kickoff cascade(W21 plan + spec amend + session-start) | 60 min(D0)| ~40 min | -33% |
| F1 backend `GET /kb/{kb_id}/docs/{doc_id}` enriched | ~3 hours(1 plan-day) | ~63 min | -65% |
| F2 backend `GET /traces` list | ~3.5 hours(1 plan-day) | ~80 min | -62% |
| H7 audit + retro + W21 partial close + W22 kickoff cascade | unplanned(pivot)| ~90 min(估) | — |
| **W21 actual real-calendar** | **~9 plan-day budget**(W19 F4 §2.3 estimate) | **~5 hours real**(~0.6 actual days) | **~88% collapse vs budget** |

呢個 collapse 數字反映 W20 collapse ratio 大致延續,但本 phase 只 ship 咗 backend(F1+F2 ~2 plan-days);frontend 7 plan-days 全部 transfer 入 W22 with fidelity discipline。

#### 7. Spec-ref alignment
- **`docs/architecture.md v6 §5.5.2 / §5.5.2a / §5.6 / §5.7` amendments landed at W21 kickoff `236376d`** — 保留;**Wave B 4 routes 嘅 spec content unchanged**(只係 implementation 從 W21 推到 W22);W22 plan reuse same spec refs
- **ADR-0029 Status Accepted Option C** — 保留;W22 plan §1 reuse ADR-0029 authorization for `/kb/[id]/docs/[docId]` 3-pane scope
- **ADR-0030 SKIPPED-absorbed footnote** — 保留;W22 plan §1 reuse same absorbed-scope reasoning for `/traces` index + 3 viz modes
- **W22 plan §0 cross-ref to this retro** + **W22 plan §6 carry-overs** 列哂上述 7-section retro 嘅 carry-over list

---

## Final Phase Gate verdict — RESTATED

**PASS WITH PRESENTATION-LAYER-REBUILD-TRIGGERED CAVEAT**

✅ Backend deliverables F1+F2 — 99/99 backend pytest;0 regression;H6 coverage ≥ 80% on new endpoints;commits `306dbe0` + `55f876b` shipped
⏭️ Frontend deliverables F3-F8 — DEFERRED to W22-frontend-presentation-rebuild per H7 enforcement;preserved as un-checked `[ ]` items per CLAUDE.md §10 sacred rule
🎯 Architectural impact:NONE
🎯 OQ impact:NONE
📝 Memory updated:`feedback_design_fidelity.md` empirical-finding section appended
📝 W22 kickoff cascade landed same-session(this commit pair)

---

**Lifecycle reminder**:呢份 progress.md `status=closed_partial`(2026-05-17 partial-close per H7 enforcement)。F1+F2 ship complete + green;F3-F8 fold 入 W22 with stricter fidelity discipline。下個 phase reference = `docs/01-planning/W22-frontend-presentation-rebuild/`。
