---
phase: W04-crag-eval-shootout
plan_ref: ./plan.md
status: closed
last_updated: 2026-05-04
---

# Phase W04 — Checklist

> Atomic checkbox(每 item ≤ 1–2 hour effort)。
> Status:`draft` 直到 W3 D5 closeout sign-off + W4 kickoff approval。
> 全 unchecked 至 W4 D1 implementation start。

## F1 — CRAG L2 correction loop

- [x] `backend/generation/crag.py` `CragLoop` class skeleton ✅ W4 D1
- [x] Grader via GPT-5.4-mini(`CragGrader.grade(query, chunks) → GradeResult` returning numeric confidence ∈ [0, 1])✅ W4 D1
- [x] Threshold check `confidence < threshold` triggers correction(threshold from `Settings.crag_confidence_threshold`,default 0.70 not 0.6 plan-draft)✅ W4 D1
- [x] Query rewrite(`CragGrader.rewrite_query`)+ re-fetch top_k=20(configurable `expanded_top_k`)+ re-synthesize path ✅ W4 D1
- [x] Max 1 correction iteration(L2 baseline,L3 deferred per §6.1 W5)✅ W4 D1
- [x] tenacity retry on grader RateLimitError + APITimeoutError(3 attempts exponential 1-8s)✅ W4 D1
- [x] structlog `crag_loop` cost log event(grader + rewrite + extra synth tokens + crag_latency_ms)✅ W4 D1
- [x] Wired into `/query` non-stream path(stream path L3-only per architecture.md §3.5;respects `payload.enable_crag` flag)✅ W4 D1
- [x] Unit tests:above-threshold skip / below-threshold trigger / 4 graceful fallback paths(grader failure / rewrite failure / rewrite empty / re-synth failure)✅ W4 D1(14 tests pass)

## F2 — RAGAs eval automation

- [x] `backend/eval/ragas_runner.py` ✅ W4 D2 — `RagasRunner` orchestration layer + `RagasQuerySample` / `RagasQueryResult` / `RagasReport` dataclasses + injectable evaluator pattern(allows real ragas + test stub without code path divergence)
- [x] Faithfulness metric impl(via real evaluator wrapper in `scripts/run_ragas_eval.py`)— uses `ragas.metrics.collections.faithfulness` ✅ W4 D2
- [x] Answer Relevancy metric impl ✅ W4 D2
- [x] Context Precision metric impl ✅ W4 D2
- [x] Context Recall metric impl ✅ W4 D2
- [x] Judge LLM = GPT-5.4-mini config wire(`Settings.azure_openai_deployment_llm_judge` → `AzureChatOpenAI` via `LangchainLLMWrapper`)✅ W4 D2
- [x] `scripts/run_ragas_eval.py --eval-set eval-set-v1.yaml --output ragas-results.json` ✅ W4 D2(also `--subset N` for cost containment per W4 plan §4 R4 + `--pipeline-cache` reuse path for re-runs)
- [x] Output JSON schema documented(metadata block + aggregate(metrics + token+latency totals)+ per-query(4 metric scores + token+latency+error))✅ W4 D2
- [x] tenacity retry on judge transient errors(inherited via Synthesizer/CragGrader pattern;ragas wraps judge LLM via langchain so per-row retry handled at LangchainLLMWrapper level)✅ W4 D2
- [x] Unit test:13 tests pass(5 `_aggregate` edge cases + 6 `RagasRunner.evaluate` paths + 2 `load_samples_from_eval_set` paths + report_to_json round-trip)✅ W4 D2
- [x] `backend/pyproject.toml` `[project.optional-dependencies] eval` group declares `ragas>=0.4,<0.5` + `langchain-openai>=0.2`(per H2 stack lock — RAGAs already approved Tier 1 vendor)✅ W4 D2

## F3 — 4-way reranker shootout

- [x] `backend/retrieval/reranker/voyage.py` ✅ W4 D3 — `VoyageReranker` REST `voyage-rerank-2.5`(direct API endpoint `https://api.voyageai.com/v1/rerank`;body uses `top_k` + `data` container per Voyage convention)
- [x] `backend/retrieval/reranker/zeroentropy.py` ✅ W4 D3 — `ZeroEntropyReranker` REST `zerank-1`(direct API endpoint `https://api.zeroentropy.dev/v1/rerank`;body uses `top_n` + `results` container mirroring Cohere shape)
- [x] `backend/retrieval/reranker/azure_semantic.py` ✅ W4 D3 — `AzureSemanticReranker` re-issues search with `queryType=semantic` + `semanticConfiguration` + `search.in(chunk_id, ...)` filter to constrain rerank to candidate set;`@search.rerankerScore` 0-4 scale normalised to [0, 1] for cross-vendor comparability(trade-off:second AI Search call per query — acceptable Tier 1 W4 shootout per module docstring)
- [x] `factory.py` extended ✅ W4 D3 — `make_reranker(settings)` switch on `settings.reranker_kind` Literal["cohere", "voyage", "zeroentropy", "azure", "off"];each backend returns None when its required keys unset(safe fallback to hybrid-only same as W3 D1 baseline)
- [x] `Settings` extended ✅ W4 D3 — `reranker_kind` + `voyage_api_key` / `voyage_rerank_model` / `voyage_request_timeout_s` + `zeroentropy_api_key` / `zeroentropy_rerank_model` / `zeroentropy_request_timeout_s` + `azure_semantic_config_name` / `azure_semantic_request_timeout_s`
- [ ] **DEFERRED Chris async** Vendor procurement Voyage key(non-Azure path per W4 plan §F3 owner row;corp card billing)— gates live shootout run only;scaffold + tests already pass
- [ ] **DEFERRED Chris async** Vendor procurement ZeroEntropy key(non-Azure path)— gates live shootout run only
- [x] `scripts/run_reranker_shootout.py` ✅ W4 D3 — runs `hybrid-only + cohere + voyage + zeroentropy + azure` × eval-set-v1;skips per-reranker when its required keys unset (`SKIPPED — key/endpoint unset` row);emits comparison table to stdout + JSON to `--output`(default `reports/reranker-shootout.json`);`--subset N` for cost containment per W4 plan §4 R4
- [x] Comparison table emit ✅ W4 D3 — R@5 + avg_search_latency_ms + avg_embed_latency_ms + queries_evaluated per reranker(W2 baseline R@5 metric;4-RAGAs metric overlay deferred to W4 D5 Gate 2 verdict via `scripts/run_ragas_eval.py` re-run on shootout winner)
- [x] Unit tests ✅ W4 D3 — 21 NEW tests pass(5 each Voyage/ZeroEntropy/Azure semantic + 6 factory dispatch);+ 8 W3 D1 cohere tests preserved(29 total reranker tests pass)
- [ ] **DEFERRED W4 D4-D5** Live shootout run on Cohere Marketplace endpoint(post Chris populate)→ R@5 lift baseline + Gate 2 4-metric overlay via RAGAs runner

## F4 — Eval set v1 expansion(+ 20 real queries)

- [x] 20 NEW query placeholders added(Q036-Q055)— template covers 5 conversational rephrasings + 5 multi-step troubleshooting + 5 cross-document synthesis + 5 table-data lookups(R4 hallucination test bed)✅ W4 D2
- [x] Coverage:financial-software workflow(AR/AP/FA/CB/GL/BM)+ table-data lookups + multi-doc synthesis ✅ W4 D2
- [ ] **DEFERRED Chris async** Real-phrasing replacement — current 20 queries are AI-synthesized placeholders mirroring Q001-Q030 corpus topics in colloquial / scenario-augmented form;Chris collect actual customer support tickets / Drive Manual support requests → replace `query_text`(per Q6 Open W3-W4)
- [ ] **DEFERRED Chris async** Ground truth chunk_ids labeled per query — placeholder `acceptable_chunk_ids: []` for all 55 queries(Q001-Q055)pending Chris SME label cascade via `scripts/discover_chunk_ids` per Q14
- [ ] **DEFERRED post Chris label** `docs/eval-set-v1.yaml` promoted from `-draft.yaml` — promote 觸發條件 = Chris validate ≥ 45/55 queries with real phrasings + chunk_ids + `validated: true` per W4 plan §3 G6 acceptance
- [x] `scripts/validate_eval_set.py` runs against expanded set:composition sum updated(`user_collected: 20`)+ exits with primary_chunk_id placeholder-detection only(50 issues = Q001-Q030 W2 baseline pending + Q036-Q055 W4 D2 NEW pending — non blocker per Q14 SME cascade)✅ W4 D2

## F5 — Cohere rerank live verify + lift baseline(W3 C1 close)

- [ ] **DEFERRED Chris async** `.env` `cohere_endpoint` + `cohere_api_key` populated — Marketplace procurement signoff post-deploy
- [x] `scripts/run_cohere_lift_smoke.py` impl ✅ W4 D4 — 2-pass driver(hybrid-only baseline → hybrid+Cohere)+ per-query lift verdict + DEFERRED procurement gate exits 1 with explicit message until `.env` populated
- [x] Driver covers 10 representative eval queries × hybrid-only vs hybrid+Cohere R@5 compare(default `--subset 10` cost containment per W4 plan §4 R4;`--subset 0` for full eval-set)✅ W4 D4(LIVE run gated on F5 procurement)
- [ ] **DEFERRED post F5.1** Lift summary logged in W4 progress.md + decision-form Q5 follow-up note(needs LIVE run output)
- [x] Unit tests:14 tests pass(`_verdict` 4 + `_build_lift` 6 + `_aggregate` 4) — live driver flow intentionally unmocked per F5 LIVE smoke purpose ✅ W4 D4
- [ ] **DEFERRED W5/W6 if procurement still pending** — Gate 2 verdict adjusts(per plan §3 G2 fallback row)

## F6 — GPT-5.5 live latency baseline + cost trace(W3 C2 close)

- [ ] **DEFERRED Chris async** Manual `/query` smoke against 5 real queries(Chris dev server)
- [x] AI-side audit:Langfuse cost trace surface verified per call ✅ W4 D4 — `synthesizer_call`(non-stream)+ `synthesizer_stream_complete`(stream)structlog event 兩條都 wire 5 fields(input_tokens / output_tokens / latency_ms / refused / citations_count)+ deployment + chunks_in;`crag_loop` event adds 14 fields(grader/rewrite/extra_synth × in/out + threshold + triggered + iterations + confidence + fallback + crag_latency_ms + errors)
- [ ] **DEFERRED post Chris smoke** Baseline numbers documented:p50 / p95 latency / per-query cost USD(needs LIVE run output)
- [ ] **DEFERRED post Chris smoke** Feed Gate 2 cost-per-query analysis(non-blocking — Tier 1 economics row W6 demo prep)

## F7 — SSE live verify(W3 C3 close)

- [ ] **DEFERRED Chris async** End-to-end manual smoke Chat UI `/` → submit → token render + citation card + reranker label + stop button + 1-2 screenshots
- [x] AI-side audit:text-delta event ordering matches Vercel AI SDK v1 protocol ✅ W4 D4 — `stream_composer.compose_query_stream` emits `text-delta* → citation* → done` sequence;`synthesizer.synthesize_stream` correctly translates OpenAI `chunk.choices[0].delta.content` → Vercel `{"type":"text-delta","content":str}` with empty-content filter;5 W3 D3 F4 `test_stream_composer.py` tests already cover order + reranker_used + refusal + dedup + hallucination skip
- [x] AI-side audit:Stop button → `asyncio.CancelledError` propagation dual-layer safe ✅ W4 D4 — `query.py event_serializer` L174-181 try/except CancelledError + log + re-raise;`synthesize_stream` finally block L194-200 calls underlying OpenAI `stream.close()` best-effort
- [ ] **DEFERRED post Chris smoke** Live cancellation verification(stop button → AbortController.abort() → fetch cancellation → uvicorn cancels request task → CancelledError chain — only smokeable via browser)+ `query_stream_cancelled` log presence in actual run

## F8 — Component design note status bumps(W3 G4 close)

- [x] `docs/02-architecture/components/C04-retrieval.md` v1-active → v2-stable(rerank wire + 4-way shootout surface ready)✅ W4 D1
- [x] `docs/02-architecture/components/C05-generation.md` v0-draft → v1-active(synthesizer + SSE + CRAG L2)✅ W4 D1
- [x] `docs/02-architecture/components/C08-api-gateway.md` v2-stable updated with W3-W4 deliverables(SSE wire + cancel + CragLoop)✅ W4 D1
- [x] `docs/02-architecture/components/C09-admin-ui.md` v0-draft → v1-active(wizard + admin views + Settings baseline)✅ W4 D1
- [x] `docs/02-architecture/components/C10-chat-ui.md` v0-draft → v1-active(streaming + citation + modal)✅ W4 D1
- [x] `docs/02-architecture/COMPONENT_CATALOG.md` status row updates synced ✅ W4 D1

## F9 — PPT parser orchestrator wire(W3 C6 close)

- [x] `backend/ingestion/parsers/__init__.py` `select_parser()` factory dispatches by file extension(.pptx → PptxParser / .docx → DoclingDocxParser / .pdf → DoclingDocxParser)✅ W4 D1
- [x] Format auto-detect via file extension(.pptx / .docx / .pdf;uppercase normalised;unsupported → ValueError)✅ W4 D1
- [x] `chunker/strategies.py` `slide_based` path no longer NotImplementedError — delegates to `LayoutAwareChunker`(per Karpathy §1.2 simplicity:PptxParser emits same heading-para-table-image structure as Docling so chunker reuse natural)✅ W4 D1
- [ ] **DEFERRED W4 D2-D3** Smoke run 1 of W3 D1 後段 3 PPT samples → end-to-end ingest → chunks visible via `/kb/{id}/chunks`(needs `scripts/run_pptx_ingest_sanity.py` + Azure AI Search index ready;non-blocking F9 unit acceptance)
- [x] Unit test:select_parser dispatches correctly(.pptx / .docx / .pdf / uppercase / unsupported)+ select_chunker(pptx, auto/slide_based) returns LayoutAwareChunker + heading_aware standalone still NotImplementedError ✅ W4 D1(8 tests pass + 1 W2 test updated)

## F10 — Gate 2 verdict + W4 retro + W5 kickoff prep

- [x] **Gate 2 verdict** ✅ W4 D5 — **DEFERRED per plan §F10 fallback path** "Cohere baseline pending — partial verdict on available rerankers";F3 shootout LIVE + F5 Cohere lift LIVE + F2 RAGAs LIVE 全部 procurement-gated;LIVE 4-metric within-5pp 數據 W4 D5 不可得 → W5 D1 carry-over C1 trigger
- [x] **L2 CRAG status** ✅ W4 D5 — **不 drop**(G2 LIVE FAIL 條件未觸發 — procurement-gated 不可得即非 FAIL);W5 plan optimization scope 維持 conditional 等 W5 D1 LIVE 數據
- [x] W5 plan = Gate 2 LIVE close (F1) + conditional optimization scope ✅ W4 D5 — F2-F6 conditional on F1 verdict;L3 routing conditional per architecture.md §6.1 W5 row
- [x] W04 progress.md retro section completed ✅ W4 D5 — 7 sections per W3 retro template(What worked / What didn't / Surprises / Carry-overs C1-C11 / ADR triggers / Phase Gate verdict / Phase status)
- [x] W05 phase folder kickoff:`docs/01-planning/W05-optimization/{plan,checklist,progress}.md` draft ✅ W4 D5(status=`draft` until Chris W5 D1 sign-off)
- [x] W04 carry-overs documented ✅ W4 D5 — 11 items C1-C11 in retro
- [x] W04 progress.md frontmatter status flipped to `closed` ✅ W4 D5

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1
- [ ] OQ status sync to `decision-form.md`(R4)— Q21 final pick W4 D5 critical
- [ ] Gate 2 verdict logged in `architecture.md §6.3` decision row(via ADR-0012 if FAIL → drop L2)
- [ ] RISK_REGISTER.md update if R1/R2 procurement persists OR Gate 2 FAIL surfaces as new risk

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
