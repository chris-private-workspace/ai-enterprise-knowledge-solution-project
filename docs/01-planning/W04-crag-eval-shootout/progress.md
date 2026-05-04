---
phase: W04-crag-eval-shootout
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: in-progress     # draft → in-progress → closed; flipped 2026-05-04 W4 D1 kickoff
---

# Phase W04 — Progress

> Daily progress + 結尾 retro。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。
> Status:`draft` 直到 W3 D5 closeout sign-off + W4 kickoff approval。

---

## Day 0 — 2026-05-04: Kickoff prep(W3 D5 末 closeout 同 session)

**Action**:Phase W04 kickoff prep(per PROCESS.md §2.3 rolling-JIT lifecycle + W3 D5 closeout 同 session per CLAUDE.md §10 R5)

- Folder `docs/01-planning/W04-crag-eval-shootout/` created
- `plan.md` filled with status=`draft`(10 deliverables F1-F10:CRAG L2 + RAGAs eval automation + 4-way reranker shootout + 20-query eval expansion + Cohere/GPT-5.5/SSE live verify + design note bumps + PPT orchestrator wire + Gate 2 verdict)
- `checklist.md` derived from plan deliverables(~70 atomic items)
- `progress.md` Day 0 entry initialized(this file)
- **Carry-over candidates from W03-chat-retrieval-citation**(per W3 retro § Carry-overs C1-C8):
  - C1 Cohere live verify → **F5**(Marketplace endpoint procurement Chris async)
  - C2 GPT-5.5 latency baseline → **F6**(Chris dev server smoke)
  - C3 SSE live verify → **F7**(Chris dev server smoke)
  - C4 Frontend dev server smoke(Chris responsibility — every-day implicit;non explicit deliverable)
  - C5 Reranker per-KB field reconsideration → post **F3** shootout outcome
  - C6 PPT orchestrator wire → **F9**
  - C7 F8 wizard polish → W7+ Beta polish window(unchanged from W3)
  - C8 plan estimates calibration → W4 plan applies 0.5x heuristic(每 deliverable 1.5-2h baseline,vs W3 plan 4-6h estimates)— see plan §2 effort
- **Gate 2 critical context**:Per architecture.md §6.3,Gate 2 4-metric within 5pp 互換 between Cohere baseline + winning shootout reranker = PASS。FAIL = drop L2 CRAG;W5 转 baseline-only scope。This is the most important quality gate of Tier 1
- **Procurement dependencies surfaced for W4 D1**:
  - Cohere Marketplace endpoint(7-14d turnaround from 2026-05-04)
  - Voyage rerank-2.5 API key(direct,non-Azure path)
  - ZeroEntropy zerank-1 API key(direct,non-Azure path)
  - Azure semantic ranker(built-in S1 SKU,no procurement)

**Status update will follow at W3 D5 closeout commit**(W3 frontmatter `active → closed` + Chris approve W4 kickoff → W4 status `draft → active`)。If W3 G2/G3 hard gates FAIL → W4 plan **does not flip active**;HALT POC per architecture.md §6.3,foundation iteration loop replaces W4。

---

## Day 1 — 2026-05-04 (Mon — same-day W3 D5 closeout per "啟動 W4 D1" signal)

> Per plan §5 D1 = F1 CRAG core + F8 component design notes + F9 PPT orchestrator wire。Same-day W3-W4 momentum continues。Procurement carry-overs(Voyage / ZeroEntropy keys + Cohere endpoint populate)remain async — F3 / F5 await keys per plan §4 R1+R2。

### Done

#### F1 — CRAG L2 correction loop(C05 generation)

- `backend/generation/crag.py` ✅ NEW(per architecture.md §3.5 + components/C05-generation.md §2):
  - `CragGrader` class wrapping `AsyncAzureOpenAI` chat.completions(deployment=`gpt-5-4-mini` per `Settings.azure_openai_deployment_llm_judge`)
    - `grade(query, chunks) → GradeResult` returns numeric confidence ∈ [0, 1] + raw text + token counts + latency。Empty chunks short-circuit → confidence 0.0 + no API call
    - `rewrite_query(query, chunks) → RewriteResult` generates reformulated query。Multi-line response defensively trimmed to first non-empty line
    - tenacity retry on `RateLimitError` + `APITimeoutError`(3 attempts exponential 1-8s)
  - `CragLoop` orchestrator:`refine(query, initial_result, initial_synth) → CragOutcome`
    - Threshold from `Settings.crag_confidence_threshold`(default 0.70 not 0.6 plan-draft — 0.6 too lenient triggers correction rarely;0.70 better surfaces low-confidence cases for tuning)
    - max_corrections from `Settings.crag_max_reformulations`(default 1 = L2 baseline;L3 routing W5 conditional)
    - `expanded_top_k=20` for re-retrieve(plan §F1 default)
    - 4 graceful fallback paths(grader failure → no-op outcome / rewrite failure / rewrite empty / re-retrieve failure / re-synth failure)— 全部 return initial synthesis with `fallback_used=True` + `error_messages` list for trace
    - Optional second-pass grade for `confidence_after`(non-fatal if fails;informs Gate 2 lift analysis)
  - `_parse_confidence(raw_text)` regex `^\s*([+-]?\d*\.?\d+)\s*$` + fallback any-float-in-text + clamp [0, 1] + 0.0 on parse fail
  - structlog `crag_loop` event:threshold / triggered / iterations / confidence_before / confidence_after / fallback_used / 4 token counts(grader / rewrite / extra synth)/ crag_latency_ms / errors
- `backend/api/server.py` lifespan:`CragGrader` init from same Azure OpenAI endpoint+key but `azure_openai_deployment_llm_judge`(GPT-5.4-mini);`CragLoop` constructed wrapping `app.state.retrieval_engine` + `synthesizer` + `crag_grader`;`app.state.crag_loop` populate when keys present。`__aexit__` cleanup added for grader before synthesizer
- `backend/api/routes/query.py` `/query` non-stream path:if `crag_loop` set AND `payload.enable_crag` → invoke `crag_loop.refine()` after initial synthesize → use outcome.synthesis + outcome.chunks for `QueryResponse.answer/citations`;`crag_triggered` + `crag_iterations` populated from CragOutcome。Stream path unchanged(L3-only per architecture.md §3.5 — token-by-token UX precludes mid-stream rewrite)
- `backend/tests/test_crag.py` ✅ NEW — 14 tests pass:
  - 7 `_parse_confidence` parser tests(simple decimal / leading whitespace+newline / clamps above 1.0 / clamps below 0.0 / first-float-in-text fallback / empty / no-number)
  - 2 `CragGrader.grade` tests(empty chunks short-circuit no API call / parses numeric)
  - 5 `CragLoop.refine` integration tests(above-threshold no-op / below-threshold full correction with grade2 / re-synth failure fallback / grader-outright-failure no-op / rewrite-empty fallback)

#### F8 — Component design note status bumps(W3 G4 close)

- `docs/02-architecture/components/C04-retrieval.md` ✅ `v1-active → v2-stable`:hybrid + Cohere wire + factory + 4-way shootout surface ready W4 D1
- `docs/02-architecture/components/C05-generation.md` ✅ `v0-draft → v1-active`:synthesizer(W3 D2 F2)+ citation enrichment(W3 D2 F3)+ SSE stream composer(W3 D3 F4)+ CRAG L2(W4 D1 F1)
- `docs/02-architecture/components/C08-api-gateway.md` ✅ `v2-stable` updated with W3-W4 deliverables narrative(/query full RAG + /query/stream SSE + CragLoop optional refinement)
- `docs/02-architecture/components/C09-admin-ui.md` ✅ `v0-draft → v1-active`:6 routes scaffold(W1)+ admin views W2 D5 + Pipeline wizard W3 D5 F8 + Settings confirm done。shadcn polish W7+ Beta deferred
- `docs/02-architecture/components/C10-chat-ui.md` ✅ `v0-draft → v1-active`:streaming chat W3 D4 F6 + citation card + screenshot modal W3 D4 F7 + native fetch SSE(non Vercel AI SDK useChat per Karpathy §1.2)
- `docs/02-architecture/COMPONENT_CATALOG.md` ✅ status table rows C04/C05/C08/C09/C10 synced with bump narrative

#### F9 — PPT parser orchestrator wire(W3 C6 close)

- `backend/ingestion/parsers/__init__.py` ✅ `select_parser(source: Path) → Parser` factory dispatches by extension:`.docx` → `DoclingDocxParser`,`.pdf` → `DoclingDocxParser`(reuse,Docling handles both via same converter),`.pptx` → `PptxParser`,unsupported → `ValueError`。Uppercase extension normalised(`.suffix.lower()`)
- `backend/ingestion/chunker/strategies.py` ✅ `slide_based` 不再 raise NotImplementedError — delegates to `LayoutAwareChunker`(per Karpathy §1.2 simplicity:`PptxParser` emits same heading-paragraph-table-image structure as Docling — synthetic level=1 "Slide N" heading + level=2 title + body paragraphs + tables + pictures。Dedicated `SlideBasedChunker` class redundant)。Module docstring documents the design choice
- `backend/tests/test_parser_factory.py` ✅ NEW — 8 tests pass:select_parser dispatches(pptx / docx / pdf / uppercase / unsupported ValueError)+ select_chunker(pptx, auto/slide_based) returns LayoutAwareChunker + heading_aware standalone still NotImplementedError
- `backend/tests/test_chunker.py` ✅ updated:`test_strategy_selector_pptx_auto_raises_for_w3_scope` renamed to `test_strategy_selector_pptx_auto_returns_layout_aware`(assertion flipped per W4 D1 F9)
- **DEFERRED W4 D2-D3** End-to-end smoke run on W3 D1 後段 3 PPT samples — needs `scripts/run_pptx_ingest_sanity.py` + Azure AI Search index ready;non-blocking F9 unit acceptance

#### Test suite

- **Full backend test suite 159/159 pass**(W3 D5 baseline 138 + 21 NEW:14 crag + 8 parser_factory − 1 chunker test renamed not added)
- ruff clean on all W4 D1 new files

### Decisions / OQ Resolved

- **Decision** — CRAG threshold 0.70 not 0.60 plan-draft。Rationale:0.60 too lenient — eval-set queries rarely score < 0.6 against well-aligned corpus,correction rarely fires;0.70 surfaces more low-confidence cases for empirical tuning。Final value to be calibrated post W4 D2 RAGAs run per plan §4 R6
- **Decision** — `slide_based` chunker delegates to `LayoutAwareChunker` not dedicated `SlideBasedChunker` class。Rationale:per Karpathy §1.2 simplicity-first — PptxParser emits same heading-paragraph-table-image structure as Docling,LayoutAwareChunker walks heading levels generically。If PPT-specific chunking emerges later(e.g. always 1 chunk per slide regardless of size)再 split — currently speculative。`KbConfig.chunk_strategy` Literal preserves "slide_based" for forward extensibility
- **Decision** — `select_parser` reuses `DoclingDocxParser` for `.pdf`(non rename to `DoclingParser` general)。Rationale:per CLAUDE.md §1.3 surgical changes — rename = touching unrelated W2 D1 file + cascade through tests + imports;trigger absent。Class docstring documented W2 D5 .pdf reuse;long-term rename as W7+ Beta polish
- **Decision** — CRAG wired non-stream path only(stream path L3-only per architecture.md §3.5)。Rationale:token-by-token SSE UX precludes mid-stream rewrite — CRAG correction would require buffering tokens + restart,breaking streaming contract。L3 routing(W5 conditional)addresses this differently via intent classification before retrieve
- **Decision** — Component design note status bump uses bullet-list format(W4 D1 deliverables enumerated under Status block)not single sentence。Rationale:each bump compounds 2-4 sprint deliverables;single-sentence status loses traceability。Pattern usable for future v2-stable → v3 cycles
- **No new OQ resolved**(F1 / F8 / F9 不 trigger OQ;Q21 reranker final pick remains W4 D5 critical)

### Blockers cleared / remaining

- ✅ F1 + F8 + F9 code complete + 159/159 backend tests + ruff clean
- ⏸ Cohere Marketplace endpoint+key populate(Chris async procurement)— gates F5 lift smoke;non blocking F1
- ⏸ Voyage + ZeroEntropy procurement keys(Chris)— gates F3 shootout;non blocking F1
- ⏸ F9 end-to-end PPT smoke run on real samples — deferred W4 D2-D3 + needs Azure AI Search index ready
- ⏸ CRAG threshold empirical calibration — post W4 D2 RAGAs run per plan §4 R6

### Actual vs Planned Effort

| Item | Planned (h) | Actual (h) | Variance | Note |
|---|---|---|---|---|
| F1 CRAG `crag.py`(grader + loop + parse_confidence + fallback paths)| 3.0 | 1.5 | -1.5h | tenacity + AsyncAzureOpenAI 已熟 pattern from W3 Synthesizer;CragOutcome dataclass single-pass design |
| F1 server lifespan + /query route wire | 0.5 | 0.3 | -0.2h | Surgical addition next to synthesizer |
| F1 14 unit tests(parser + grader + 4 fallback paths)| 1.0 | 0.7 | -0.3h | _MockCompletion helper + AsyncMock side_effect queue |
| F8 5 component design note bumps + COMPONENT_CATALOG sync | 1.0 | 0.5 | -0.5h | Frontmatter + Status block bullet expansion;pre-existing structure clean |
| F9 select_parser factory + chunker delegation + 8 unit tests + 1 W2 test update | 1.0 | 0.4 | -0.6h | Karpathy §1.2 LayoutAwareChunker reuse saved dedicated SlideBasedChunker class |
| W4 D1 progress entry | 0.5 | 0.5 | 0 | This entry |
| **Total D1** | **7.0** | **3.9** | **-3.1h** | W4 plan calibrated 0.5x heuristic per W3 C8 carry-over;variance now ±0.5-1h(was ±3-5h W3) |

### Commits

| Hash | Subject |
|---|---|
| `a7552dc` | `feat(c05): F1 CRAG L2 correction loop + grader + 14 tests (W4 D1)` |
| `f7e415b` | `feat(c01): F9 PPT orchestrator wire — select_parser factory + slide_based chunker delegation (W4 D1)` |
| `e6e1b61` | `docs(components): F8 design note status bumps + catalog sync (W4 D1)` |
| _pending_ | `docs(planning): W4 D1 progress + checklist tick (F1 + F8 + F9 + plan active flip)` |

---

## Day 2 — 2026-05-04 (Mon — same-day W4 D1 closeout per "啟動 W4 D2" signal)

> Per plan §5 D2 = F2 RAGAs eval automation + F4 eval-set v1 expansion(+20 placeholder queries awaiting Chris SME real-phrasing cascade)。Same-day W3 → W4 momentum continues per Chris signoff "W3 sequencing 確認可以"。Procurement carry-overs(Voyage / ZeroEntropy keys + Cohere endpoint populate)remain async — F3 / F5 pending。

### Done

#### F2 — RAGAs 4-metric eval automation(C06 eval framework)

- `backend/eval/ragas_runner.py` ✅ NEW(per architecture.md §3.6 + components/C06-eval.md §2):
  - `RagasQuerySample` dataclass:`query_id` / `question` / `contexts: list[str]` / `answer` / optional `reference` + `expected_keywords`(fallback for context_recall when reference missing per current eval-set-v1-draft state)
  - `RagasQueryResult` dataclass:per-row 4 metric scores(`faithfulness` / `answer_relevancy` / `context_precision` / `context_recall`)+ `input_tokens` / `output_tokens` / `latency_ms` / `error`
  - `RagasAggregate` dataclass:`mean` / `median` / `p95` / `n`(p95 nearest-rank method per architecture.md §3.6 latency baseline pattern)
  - `RagasReport` dataclass:metadata + aggregates + per-query + cumulative cost trace(total tokens / latency)
  - `RagasRunner` orchestration class:`evaluate(samples) → RagasReport`。**Injectable evaluator pattern**(constructor `evaluator=` parameter)— allows real `ragas.metrics.collections` judge OR test stub without code path divergence per Karpathy §1.4 goal-driven testability
  - `_evaluate_one(sample)` wraps per-row exceptions(`error` field populated;score zeros + excluded from aggregate)
  - `_clamp(v)` enforces score ∈ [0, 1] regardless of judge output drift
  - `load_samples_from_eval_set(eval_set_path, pipeline_outputs_path?)` loads YAML eval-set + skips OOS queries(refusal accuracy evaluated separately per architecture.md §3.6)+ optional pipeline-outputs JSON for cached re-runs
  - `report_to_json(report)` emits stable JSON schema:`metadata` / `aggregate.metrics{4-metrics}` / `aggregate.total_*` / `per_query[]`
  - structlog `ragas_eval_complete` event:per-metric mean + total token+latency cost
- `scripts/run_ragas_eval.py` ✅ NEW(W4 D2 F2 driver script):
  - CLI args:`--eval-set`(default `docs/eval-set-v1-draft.yaml`)/ `--output`(default `reports/ragas-results.json`)/ `--subset N`(cost containment per W4 plan §4 R4)/ `--pipeline-cache`(reuse cached pipeline outputs)/ `--skip-pipeline`(re-run judge against same RAG outputs)
  - `_make_real_evaluator(judge_deployment)` wraps `ragas.metrics.collections` 4 metric objects via `LangchainLLMWrapper`(judge LLM = `AzureChatOpenAI` pointing at `Settings.azure_openai_deployment_llm_judge`)+ `LangchainEmbeddingsWrapper`(embeddings for answer_relevancy + context_precision via `Settings.azure_openai_deployment_embedding`)
  - `_build_samples_via_pipeline()` runs full EKP RAG pipeline(retrieve via `RetrievalEngine` → synthesize via `Synthesizer`)against eval-set queries → assembles `RagasQuerySample` list with live contexts + answer
  - `_build_samples_via_cache()` reads cached pipeline outputs JSON(supports W4 D3 reranker shootout reuse pattern)
  - truststore + sys.path injection per W2 D5 `run_gate1_eval.py` pattern
  - Exit codes:0 = JSON written / 1 = env missing / pipeline failure
- `backend/pyproject.toml` ✅ added `[project.optional-dependencies] eval` group declaring `ragas>=0.4,<0.5` + `langchain-openai>=0.2`(per H2 stack lock — RAGAs already approved Tier 1 vendor;explicit declaration ensures reproducibility post-`pip install -e ".[eval]"`)
- `backend/tests/test_ragas_runner.py` ✅ NEW — 13 tests pass:
  - 5 `_aggregate` tests(empty / single / odd-length median / even-length pair-average / p95 nearest-rank index round)
  - 6 `RagasRunner.evaluate` tests(constant-stub aggregates / score clamp out-of-range / per-row error excluded from aggregate / no-evaluator RuntimeError / non-dict return surfaces error)
  - 2 `load_samples_from_eval_set` tests(skip OOS + populate keywords / pipeline cache wire)
  - 1 `report_to_json` round-trip(stable schema verification)

#### F4 — Eval set v1 expansion(+20 real-user query placeholders)

- `docs/eval-set-v1-draft.yaml` ✅ extended Q036-Q055(20 NEW queries appended;total 55 = 30 synthetic_main + 5 synthetic_oos + 20 user_collected):
  - **5 conversational rephrasings**(Q036-Q040):colloquial variants of Q001-Q005 corpus topics(AR Payment Collection / AP Reverse / Write-Off / FA Depreciation / CB Bank Reconciliation)— more frustrated / scenario-driven phrasings than synthetic
  - **5 multi-step troubleshooting**(Q041-Q045):workflow + error scenarios(FA depreciation + asset register / GL TB closing / AR aging + payment / GL period control / CB-GL integration)
  - **5 cross-document synthesis**(Q046-Q050):span 2+ corpus sections(AP+CB+GL invoice lifecycle / FA disposal+GL closing / AR aging+CB cash / BM+GL variance / GL allocation+BM cost center)
  - **5 table-data lookups**(Q051-Q055):R4 hallucination test bed per W4 plan §4 R3(form field requirements / depreciation methods enumeration / asset record dimensions / GL dimension types / AP voucher approval workflow)
- `metadata.composition` updated:`synthetic_main: 30` + `synthetic_oos: 5` + `user_collected: 20`(was 0)→ sums to 55 matching `len(queries)`
- `metadata.difficulty_distribution` + `query_type_distribution` re-tallied for 55 queries
- `scripts/validate_eval_set.py` runs cleanly:composition sum mismatch resolved;remaining 50 issues all `non-oos query must have ≥1 primary_chunk_id`(Q001-Q030 W2 baseline + Q036-Q055 W4 NEW — both pending Chris SME label cascade per Q14)
- **DEFERRED Chris async**:Real user phrasing replacement(20 placeholders → real customer support ticket phrasings per Q6 Open)+ chunk_id labeling per Q14 cascade。Promote `-draft.yaml` → `eval-set-v1.yaml` 觸發條件 = Chris validate ≥ 45/55 with real phrasings + chunk_ids + `validated: true` per plan §3 G6

#### Test suite

- **172/172 backend tests pass**(W4 D1 baseline 159 + 13 NEW ragas runner)
- ruff clean on `backend/eval/ragas_runner.py` + `backend/tests/test_ragas_runner.py`
- `scripts/run_ragas_eval.py` not unit-tested(driver script per CLAUDE.md §5.6 H6 — `backend/eval/` test coverage adequate;driver smoke test deferred to W4 D3 live run when Cohere endpoint populated)

### Decisions / OQ Resolved

- **Decision** — `RagasRunner` uses **injectable evaluator pattern** rather than direct ragas import in production module。Rationale:per Karpathy §1.4 goal-driven testability — unit tests can stub the judge LLM completely(deterministic CI + zero token cost)while production driver wires real `ragas.metrics.collections`。Avoids LLM mocking framework boilerplate and keeps `ragas_runner.py` independent of langchain / ragas / Azure OpenAI imports
- **Decision** — `ragas` 0.4.x pinned in `[eval]` optional-dependencies group not main `dependencies`。Rationale:per CLAUDE.md §5.2 H2 — ragas approved baseline vendor but ONLY runtime dependency for eval scripts(non production server hot path);pinning 0.4.x avoids 0.5 breaking-change(deprecation warnings already showing for ragas.metrics.collections move)。`pip install -e ".[eval]"` opt-in
- **Decision** — Token cost tracking deferred for ragas eval。Rationale:ragas v0.4 moved usage tracking to LangChain callbacks(non per-call return value);wiring callback collector adds complexity W4 D2 doesn't yet need。Production cost trace via Langfuse correlation per architecture.md §7 already exists for synthesizer + grader;ragas judge calls visible there as well。`RagasRunner` framework-side records `latency_ms` per-row sufficient for W4 D5 Gate 2 cost/latency analysis
- **Decision** — F4 20 NEW queries delivered as placeholders not 真實 phrasings。Rationale:per Q6 Open W3-W4 — real user phrasing source(customer support tickets / Drive Manual support requests)requires Chris async collection;blocking F4 on Q6 = serial dependency。Placeholder-mode allows W4 D2 land + W4 D3-D5 RAGAs run on synthetic queries(directionally informative)+ Chris async replace phrasings post-W4 for Beta evaluation
- **Decision** — F4 placeholder taxonomy cover 4 scenarios(conversational / troubleshooting / cross-doc / table-data)not single rephrasing pattern。Rationale:R4 hallucination guard per W4 plan §4 R3 specifically calls out table-heavy queries;cross-doc synthesis stresses retrieval recall across 2+ docs;troubleshooting scenarios test refusal-vs-attempt boundary。Coverage informs both Gate 2 4-metric distribution + W5+ targeted improvements
- **No new OQ resolved**(Q6 still Open W3-W4;Q14 SME label cascade still pending;Q21 reranker final pick remains W4 D5 critical)

### Blockers cleared / remaining

- ✅ F2 RagasRunner orchestration + 13 tests + driver script + pyproject declare
- ✅ F4 20 placeholder queries + composition fix + validator pass(structurally)
- ⏸ **Cohere Marketplace endpoint+key populate**(Chris async procurement)— gates F5 lift smoke + F3 reranker shootout against Cohere baseline
- ⏸ **Voyage + ZeroEntropy procurement keys**(Chris)— gates F3 4-way shootout completeness;3-way fallback(Cohere + Azure semantic + hybrid-only) acceptable per W4 plan §4 R2
- ⏸ **Chris SME label cascade**(per Q14)— blocks F4 promote `-draft.yaml` → `v1.yaml`;Q001-Q055 全部 placeholder pending
- ⏸ **Chris real-phrasing collection**(per Q6)— blocks F4 20 placeholder queries → real user phrasings
- ⏸ Live Azure OpenAI + AI Search verify of `scripts/run_ragas_eval.py`(post Chris dev server start + Cohere endpoint)— W4 D3 first run

### Actual vs Planned Effort

| Item | Planned (h) | Actual (h) | Variance | Note |
|---|---|---|---|---|
| F2 `ragas_runner.py`(injectable evaluator + dataclasses + aggregate)| 1.5 | 0.7 | -0.8h | Injectable pattern saved direct ragas import + LLM mocking complexity |
| F2 `run_ragas_eval.py` driver(pipeline build + cache + ragas wrapper)| 1.0 | 0.5 | -0.5h | Reused W2 D5 `run_gate1_eval.py` skeleton |
| F2 13 unit tests(aggregate edge cases + evaluator paths + load samples)| 0.5 | 0.4 | -0.1h | Stub evaluator pattern keeps tests trivially deterministic |
| F2 pyproject.toml [eval] optional-deps + ragas/langchain-openai pin | 0.1 | 0.1 | 0 | Surgical addition |
| F4 20 placeholder queries(Q036-Q055)+ metadata composition fix + 4-scenario taxonomy | 1.0 | 0.5 | -0.5h | Template-driven generation;corpus-aligned per Q1 |
| W4 D2 progress entry | 0.5 | 0.5 | 0 | This entry |
| **Total D2** | **4.6** | **2.7** | **-1.9h** | F2 injectable-evaluator design +placeholder-driven F4 saved ~2h vs estimate |

### Commits

| Hash | Subject |
|---|---|
| `8b89ccf` | `feat(c06): F2 RAGAs 4-metric eval automation + 13 tests + driver script (W4 D2)` |
| `fd17300` | `docs(eval): F4 eval-set v1 expansion +20 placeholder queries Q036-Q055 (W4 D2)` |
| _pending_ | `docs(planning): W4 D2 progress + checklist tick (F2 + F4)` |

---

## Day 3 — 2026-05-04 (Mon — same-day W4 D2 closeout per "啟動 W4 D3" signal)

> Per plan §5 D3 = F3 4-way reranker shootout(Voyage + ZeroEntropy + Azure semantic impl + factory switch + shootout script)。Procurement carry-overs(Voyage / ZeroEntropy keys + Cohere endpoint populate)remain async — F3 scaffolding lands without keys per W4 plan §4 R1+R2 partial-shootout fallback,live run gated on Chris procurement。

### Done

#### F3 — 4-way reranker shootout(C04 retrieval expansion)

3 NEW reranker implementations sharing W3 D1 `Reranker` Protocol from `backend/retrieval/reranker/base.py`:

- `backend/retrieval/reranker/voyage.py` ✅ NEW(per architecture.md §3.2):
  - `VoyageReranker` REST client — direct API endpoint `https://api.voyageai.com/v1/rerank`(non-Azure path per Q21 procurement)
  - Body uses `top_k` + `return_documents: false` + `data` container per Voyage convention(differs from Cohere `top_n` + `results`)— payload-shape divergence covered by dedicated test
  - tenacity retry on `httpx.HTTPStatusError` + `TransportError`(parity with Cohere W3 D1)
  - Header `Authorization: Bearer {api_key}` standard direct-API pattern
  - structlog `voyage_rerank` event(model / candidates_in / results_out)

- `backend/retrieval/reranker/zeroentropy.py` ✅ NEW:
  - `ZeroEntropyReranker` REST client — direct API endpoint `https://api.zeroentropy.dev/v1/rerank`
  - Body schema mirrors Cohere(`top_n` + `results` container)— deliberate match keeps Reranker Protocol surface uniform across 3 of 4 vendors;reduces cognitive load for W4 D5 Gate 2 comparison
  - tenacity retry pattern preserved

- `backend/retrieval/reranker/azure_semantic.py` ✅ NEW(behavioural divergence):
  - `AzureSemanticReranker` re-issues search with `queryType=semantic` + `semanticConfiguration: ekp-semantic-default` + `search.in(chunk_id, '...')` filter to constrain rerank to the candidate set hybrid surfaced(fair comparison vs Cohere/Voyage/ZeroEntropy)
  - `@search.rerankerScore` 0-4 scale normalised to [0, 1] via `_AZURE_SCORE_DIVISOR = 4.0` clamp — keeps cross-vendor `rerank_score` comparable for Gate 2 4-metric within-5pp analysis
  - **Trade-off acknowledged in module docstring**:incurs second AI Search call per query(vs other rerankers post-process hybrid result)。Tier 1 W4 D3 acceptable since Gate 2 focuses on relevance not latency;production-tier consolidation to single hybrid+semantic call deferred W5+ if Azure wins shootout
  - Reuses S1 SKU semantic ranker — **no extra procurement** beyond existing AI Search resource

- `backend/retrieval/reranker/factory.py` ✅ extended `make_reranker(settings)`:
  - Switch on `settings.reranker_kind` Literal["cohere", "voyage", "zeroentropy", "azure", "off"]
  - "off" → None(explicit hybrid-only fallback even when keys populated;test-mode override)
  - Each backend returns None when its required keys unset → graceful hybrid-only fallback preserved from W3 D1 baseline
  - Unknown kind → None(fail-safe;Pydantic Literal already prevents invalid values at config-load time)

- `backend/storage/settings.py` ✅ extended:
  - `reranker_kind` Literal default `"cohere"` (preserves W3 baseline)
  - `voyage_api_key` / `voyage_rerank_model` / `voyage_request_timeout_s`
  - `zeroentropy_api_key` / `zeroentropy_rerank_model` / `zeroentropy_request_timeout_s`
  - `azure_semantic_config_name` / `azure_semantic_request_timeout_s`

- `scripts/run_reranker_shootout.py` ✅ NEW(W4 D3 F3 driver):
  - CLI args:`--eval-set`(default `docs/eval-set-v1-draft.yaml`)/ `--output`(default `reports/reranker-shootout.json`)/ `--subset N`(cost containment per W4 plan §4 R4)
  - Iterates `("hybrid-only", "cohere", "voyage", "zeroentropy", "azure")` — skips when required keys unset(emits `SKIPPED — key/endpoint unset` row in stdout table + `skipped: true` in JSON);allows partial shootout per W4 plan §4 R1+R2
  - Per-kind:builds fresh `RetrievalEngine` via `Settings.model_copy(update={"reranker_kind": kind})` + `make_reranker(settings)` → runs `EvalRunner` from W2 D5 → records `RerankerRunSummary`
  - Stdout comparison table:`reranker / R@5 / search_ms / embed_ms / status`
  - JSON output:full `ShootoutReport`(eval_set / subset / started_at / finished_at / runs[])
  - Subset post-aggregation supports `--subset N` re-aggregation on first-N main-queries prefix(avoids re-running eval)
  - truststore + sys.path injection per W2 D5 `run_gate1_eval.py` + W4 D2 `run_ragas_eval.py` pattern

- `backend/tests/test_reranker_shootout.py` ✅ NEW — **21 NEW tests pass**:
  - 5 Voyage(empty short-circuit / desc by score+preserves original_index+hybrid_score / payload shape with `top_k` field name + Bearer auth / top-k clamped / invalid index skipped)
  - 4 ZeroEntropy(empty short-circuit / desc by score / payload shape with `top_n` field name / invalid index skipped)
  - 4 Azure semantic(empty short-circuit / 0-4 → 0-1 normalisation / payload shape with `queryType=semantic` + `semanticConfiguration` + `search.in(chunk_id, ...)` filter + `top` field + `select=chunk_id` / unknown chunk_id in response ignored)
  - 8 factory dispatch(off-returns-None-even-with-keys / cohere parity-W3-D1 / voyage None-when-key-unset / voyage returns Voyage when set / zeroentropy None-when-key-unset / zeroentropy returns ZeroEntropy when set / azure returns Azure when search keys set / azure None-when-search-admin-key-unset)

#### Test suite

- **193/193 backend tests pass**(W4 D2 baseline 172 + 21 NEW reranker;all incl test_parser_factory.py:8 → 193 → 193)
- ruff clean on all W4 D3 backend files(`voyage.py` / `zeroentropy.py` / `azure_semantic.py` / `factory.py` / `settings.py` / `test_reranker_shootout.py`)
- `scripts/run_reranker_shootout.py` E402 truststore-injection pattern preserved(intentional convention from `run_gate1_eval.py` + `run_ragas_eval.py`)— driver script not unit-tested per CLAUDE.md §5.6 H6

### Decisions / OQ Resolved

- **Decision** — Azure semantic ranker incurs second AI Search call per query。Rationale:fair comparison demands rerank operate on the same candidate set hybrid surfaced;Azure semantic ranker is invoked at search-time(non post-process)— closest fit for Reranker Protocol uniformity is the dual-call pattern with `search.in(chunk_id, ...)` filter。Tier 1 W4 acceptable;production consolidation deferred W5+ per module docstring trade-off block
- **Decision** — Score normalisation:Azure 0-4 → 0-1 via `/4.0` clamp。Rationale:Gate 2 4-metric within-5pp comparison requires `rerank_score` on comparable scale across vendors;Cohere/Voyage/ZeroEntropy emit ~[0, 1] natively。Pure constant divisor preserves order;clamp guards against future Azure scale drift
- **Decision** — Voyage uses `top_k` field name vs Cohere/ZeroEntropy `top_n`。Rationale:respects Voyage's published API spec(non rename to `top_n` for fake-uniformity);test_voyage_payload_shape pins the divergence so a future SDK migration won't silently drift
- **Decision** — Shootout driver iterates `("hybrid-only", "cohere", "voyage", "zeroentropy", "azure")` order。Rationale:hybrid-only first establishes baseline ROW for stdout table reading flow;Cohere second matches W3 baseline reading expectation;direct-API rerankers next;Azure last reflects "secondary AI Search call cost" mental ordering
- **Decision** — `reranker_kind="off"` returns None even when all keys populated。Rationale:explicit override useful for test-mode + production CB scenarios("disable rerank for this KB / time window");Pydantic Literal prevents typos
- **Decision** — F3 4-RAGAs metric overlay deferred from this commit to W4 D5 Gate 2 verdict batch。Rationale:`scripts/run_ragas_eval.py` (W4 D2 F2) already runs 4-metric on a single pipeline-cache JSON;shootout output JSON stores per-reranker pipeline state — Gate 2 verdict re-runs RAGAs against shootout winner output。Eliminates W4 D3 needing to know the winner upfront;keeps F3 narrowly scoped to "land 4 reranker scaffolds + comparison driver"
- **No new OQ resolved**(Q21 reranker final pick remains W4 D5 critical post-shootout;Q5 Cohere endpoint procurement remains Chris async per existing W3 D1 後段 commit `da0f47f`)

### Blockers cleared / remaining

- ✅ F3 reranker scaffolds(3 NEW + factory + settings)+ shootout driver + 21 tests
- ⏸ **Cohere Marketplace endpoint+key populate**(Chris async)— gates live shootout cohere row;structurally testable via `scripts/run_reranker_shootout.py` SKIPPED row emission
- ⏸ **Voyage + ZeroEntropy procurement keys**(Chris async per W4 plan §F3 owner row)— gates live shootout voyage+zeroentropy rows;same SKIPPED row pattern
- ⏸ Azure semantic ranker — **structurally ready**(no procurement),but requires `semanticConfiguration: ekp-semantic-default` to exist on the Azure AI Search index `ekp-kb-drive-v1`。W2 D5 index schema may not have it。Verify W4 D4 D5 prep
- ⏸ Live shootout run on real eval-set + winner determination → W4 D4 / D5 dependency chain

### Actual vs Planned Effort

| Item | Planned (h) | Actual (h) | Variance | Note |
|---|---|---|---|---|
| F3 Voyage reranker(REST + tenacity + structlog;mirrors Cohere structure)| 0.5 | 0.3 | -0.2h | W3 D1 cohere.py pattern reuse — VoyageReranker = ~110 lines |
| F3 ZeroEntropy reranker(deliberately mirrors Cohere shape for consistency) | 0.5 | 0.2 | -0.3h | Body schema match Cohere = trivial after Voyage learning |
| F3 Azure semantic reranker(divergent dual-call pattern + score normalisation)| 1.0 | 0.5 | -0.5h | Filter clause `search.in(chunk_id, ...)` was the design decision worth mileage;impl thin |
| F3 factory extension(Literal switch + per-backend None-fallback)| 0.3 | 0.2 | -0.1h | 5-branch switch;Pydantic Literal already validates input |
| F3 settings extension(8 NEW fields)| 0.2 | 0.1 | -0.1h | Surgical addition |
| F3 shootout driver script(per-kind RetrievalEngine + Settings.model_copy + EvalRunner reuse + skip-row emission)| 0.5 | 0.4 | -0.1h | EvalRunner reuse from W2 D5 saved write-from-scratch |
| F3 21 unit tests(per-reranker REST contract + factory dispatch)| 0.5 | 0.4 | -0.1h | W3 D1 cohere test pattern reuse via mock_response helper |
| W4 D3 progress entry | 0.5 | 0.5 | 0 | This entry |
| **Total D3** | **4.0** | **2.6** | **-1.4h** | W3 D1 cohere.py scaffold-pattern reuse + W2 D5 EvalRunner reuse + uniform test pattern dominated |

### Commits

| Hash | Subject |
|---|---|
| `e919e0a` | `feat(c04): F3 4-way reranker shootout — Voyage + ZeroEntropy + Azure semantic + factory switch + 21 tests (W4 D3)` |
| `9380190` | `feat(eval): F3 reranker shootout driver script — 5-way comparison with skip-row fallback (W4 D3)` |
| _pending_ | `docs(planning): W4 D3 progress + checklist tick (F3)` |

---

## Day 4 — 2026-05-04 (Mon — same-session continuation, AI-side static prep batch)

> Per plan §5 D4 = F5 Cohere live verify + F6 GPT-5.5 latency baseline + F7 SSE live verify。**全部 Chris-side dev-server / .env / browser smoke gated** per CLAUDE.md "if you can't test the UI, say so explicitly"。AI-side D4 路徑 = **prep + static audit only**:F5 lift smoke driver script ready-to-run + F6 cost-trace field surface verified + F7 SSE event-ordering static audit。Live verdict 等 Chris dev server smoke + Marketplace key populate(target W4 D5 / W5 / W6 sliding window per plan §4 R1)。

### Done (AI-side static prep)

#### F5.2 — `scripts/run_cohere_lift_smoke.py` driver(C04 retrieval + C06 eval — W3 carry-over C1 close)

- `scripts/run_cohere_lift_smoke.py` ✅ NEW — 2-pass driver(hybrid-only baseline → hybrid+Cohere comparison)using same `EvalRunner` infrastructure as Gate 1 (W2 D5) + reranker shootout (W4 D3):
  - **Procurement gate**:exits 1 with explicit `DEFERRED: Cohere procurement pending` when `cohere_endpoint` or `cohere_api_key` unset(per W4 plan §F5 fallback)— Chris re-runs after `.env` populate
  - **Per-query lift table**:`PerQueryLift` dataclass(query_id / hybrid_R@5 / cohere_R@5 / delta / verdict ∈ {helped / unchanged / hurt} / 2 latency_ms)
  - **Aggregate metrics**:`LiftSummary` exposes hybrid_aggregate_R@5 + cohere_aggregate_R@5 + lift + helped/unchanged/hurt counts + rerank_overhead_ms(avg search latency delta)
  - **Subset cap**:default `--subset 10`(cost containment per W4 plan §4 R4)— first 10 main(non-OOS)queries from eval-set-v1-draft;`--subset 0` = take all
  - **Reuses** `EvalRunner._evaluate_query` keyword-mode recall semantics(consistent with Gate 1 verdict)— no separate scoring logic
  - **Output**:`reports/cohere-lift-smoke.json` JSON + stdout markdown table + verdict line(`✅ Cohere PASS: aggregate lift > 0` / `⚠️ NEUTRAL` / `❌ REGRESSION → escalate to Q21 reranker re-pick`)
  - **Karpathy §1.2 simplicity**:reuses Settings + AzureOpenAIEmbedder + HybridSearcher + CohereReranker + EvalRunner — adds only diff/verdict aggregation,no new domain models
- `backend/tests/test_cohere_lift_smoke.py` ✅ NEW — **14 tests pass**:
  - 4 `_verdict` threshold tests(positive / negative / zero / micro-noise epsilon-clamped)
  - 6 `_build_lift` pairing tests(skips OOS / caps at subset / subset=0 takes all / drops queries with missing cohere result / preserves error_hybrid+error_cohere trace / marks "hurt" when cohere lower)
  - 4 `_aggregate` aggregate tests(empty zeros / all-helped positive lift / mixed verdicts counted correctly / negative lift on regression)
  - **Live driver flow intentionally unmocked** — F5 LIVE smoke is the explicit purpose;mocking would only test fakes against fakes
- ruff:**clean(scripts/ E402 baseline parity with W4 D3 shootout — same truststore.inject_into_ssl() early-init pattern accepted across reranker drivers)** + I001 import-block sort auto-fixed in test file

#### F6 audit — Langfuse cost-trace field surface(C05 generation + C07 observability)

> AI-side static audit only(per plan §F6 — live smoke needs Chris dev server + 5 real query × Langfuse instance running)。**Verdict**:5-field cost-trace surface ✅ **fully wired** for Gate 2 cost-per-query analysis(non-blocking Gate 2 PASS gate)。

- `backend/generation/synthesizer.py` ✅ verified:
  - `synthesizer_call` event(non-stream `synthesize()`,L123-132):**5 cost-trace fields all present** — `input_tokens` / `output_tokens` / `latency_ms` / `refused` / `citations_count` + `deployment` + `chunks_in`
  - `synthesizer_stream_complete` event(stream `synthesize_stream()`,L206-215):**same 5 cost-trace fields** + `deployment` + `chunks_in`
- `backend/generation/crag.py` ✅ verified:
  - `crag_loop` event(`_log_outcome` L463-480):**14 fields** — threshold + triggered + iterations + confidence_before+after + fallback_used + 6 token counts(grader/rewrite/extra_synth × in/out)+ crag_latency_ms + errors。Provides full L2 correction-loop cost trace for tuning + Gate 2 lift analysis
- `backend/observability/langfuse_tracer.py` ✅ verified:
  - W1 stub remains(structlog JSON renderer + Langfuse host + environment + feature_auth_enabled init log)
  - **Note**:Langfuse SDK actual init still pending W3 carry — structlog JSON output already feeds correlation pipeline correctly via `synthesizer_call` / `synthesizer_stream_complete` / `crag_loop` events
- **Minor gap (non-blocking)**:`/query` route lacks top-level structlog event for total trace correlation(only sub-events synthesizer_call + crag_loop emitted)。Live Langfuse SDK wire(W3 D2 deferred per W3 retro)would consume sub-events into spans;adding top-level event = future W5/W6 polish item

#### F7 audit — SSE event-ordering static review(C08 api-gateway + C10 chat-ui)

> AI-side static audit only(per plan §F7 — live smoke needs Chris dev server + browser interaction + 1-2 screenshots)。**Verdict**:SSE event ordering ✅ **matches Vercel AI SDK v1 protocol** + `asyncio.CancelledError` propagation **dual-layer safe**(ready for live smoke)。

- `backend/generation/stream_composer.py` ✅ verified event sequence:
  - `text-delta*` pass-through from synthesize_stream(L33-36)
  - `citation*` after stream complete(L43-44 — `build_citations()` from accumulated citation_ids vs retrieved chunks,hallucinated id silently skipped per F3 design)
  - `done` terminal(L46-56 — `model` / `input_tokens` / `output_tokens` / `latency_ms` / `refused` / `reranker_used`)
- OpenAI delta → Vercel text-delta translation correct:
  - `synthesizer.synthesize_stream` L187-193:`chunk.choices[0].delta.content` → `{"type": "text-delta", "content": str}` empty-content filter included
- **Cancellation propagation dual-layer safe**:
  - `query.py` event_serializer L174-181:try/except `asyncio.CancelledError` → log `query_stream_cancelled` → `raise`
  - `synthesizer.synthesize_stream` finally block L194-200:calls underlying OpenAI `stream.close()` (best-effort,exception-tolerant)→ guarantees no leaked OpenAI stream on client abort
- 5 W3 D3 F4 `test_stream_composer.py` tests already cover:
  - text-delta → citation → done order verification
  - reranker_used="cohere-v3.5" / "off" propagation
  - citation per unique cited chunk (dedup)
  - refused flag through done
  - hallucinated chunk_id silently skipped

### Deferred(Chris-side live smoke;remain 🚧 unchecked per CLAUDE.md sacred rule)

- 🚧 **F5.1** `.env` `cohere_endpoint` + `cohere_api_key` populate — Marketplace procurement Chris async
- 🚧 **F5.3-5.5** Live 10 queries × hybrid-only vs hybrid+Cohere R@5 lift run — gates on F5.1
- 🚧 **F6** Manual `/query` smoke against 5 real queries(Chris dev server)+ p50 / p95 latency / per-query cost USD baseline + Langfuse trace verify
- 🚧 **F7** End-to-end manual smoke Chat UI `/` → submit → token render + citation card + reranker label + stop button + 1-2 screenshots in W4 progress

### Surprises / Notes

- **F5 driver intentionally separate from W4 D3 reranker shootout** despite ~50% code overlap:lift driver focuses on **per-query delta + verdict per query**(diagnostic detail — which queries Cohere helps/hurts);shootout focuses on **5-way aggregate comparison**。Different output schemas + different intended audiences(F5 = Q5 follow-up,shootout = Q21 final pick)。Karpathy §1.2 considered:abstracting common base would force shootout to fit lift's per-query verbose schema = harder to read for 5-way comparison. Surgical separation wins
- **Gate 2 cost-per-query analysis is non-blocking for Gate 2 G2 PASS gate** but informs **architecture.md §6.3 Tier 1 economics** verdict — F6 baseline numbers feed Tier 1 economics row at W6 demo prep
- **F7 cancellation logic is robust at static analysis** — both `event_serializer` (HTTP layer) and `synthesize_stream` (SDK layer) honour CancelledError;the `finally` block in synthesize_stream wraps `stream.close()` in `try/except` per best-effort cleanup pattern。Live behaviour can only be smoked via browser (front-end Stop button → AbortController.abort() → fetch cancellation → uvicorn cancels request task → CancelledError propagates)— pure unit test cannot replicate this multi-layer dance

### Actual vs Planned Effort

| Item | Planned (h) | Actual (h) | Variance | Note |
|---|---|---|---|---|
| F5.2 lift smoke driver(2-pass + per-query verdict + aggregate)| 0.5 | 0.4 | -0.1h | EvalRunner reuse + shootout pattern reuse |
| F5 lift smoke unit tests(14 tests:_verdict + _build_lift + _aggregate)| 0.3 | 0.3 | 0 | Pure-aggregation tests — fast; live flow deferred to F5 LIVE smoke |
| F6 Langfuse cost-trace field audit(synthesizer + crag + tracer reads)| 0.3 | 0.2 | -0.1h | All 5 fields already wired W3 D2 + W4 D1;audit confirmed parity |
| F7 SSE event-ordering static audit(stream_composer + query stream + cancellation propagation review)| 0.3 | 0.2 | -0.1h | All static review;test_stream_composer.py W3 D3 already covers ordering |
| W4 D4 progress entry + checklist tick + commits | 0.5 | 0.5 | 0 | This entry + 3 commits |
| **Total D4 (AI-side)** | **1.9** | **1.6** | **-0.3h** | Static audit pattern + scaffold reuse dominated;all live verdict gated on Chris-side smoke |

### Commits

| Hash | Subject |
|---|---|
| `b9c2b10` | `feat(eval): F5.2 Cohere lift smoke driver — 2-pass hybrid-only vs hybrid+Cohere comparison + 14 tests (W4 D4)` |
| _pending_ | `docs(planning): W4 D4 progress + checklist tick (F5.2 + F6 audit + F7 audit)` |

---

## Day 5 — _(pending)_

---

## Retro(填於 W4 D5 末)

### What worked
_(W4 D5 末 fill)_

### What didn't work / unexpected friction
_(W4 D5 末)_

### Surprises / discoveries
_(W4 D5 末)_

### Carry-overs to W05-optimization
_(W4 D5 末)_

### ADR triggers
_(W4 D5 末 — ADR-0012 reserved for Gate 2 FAIL outcome OR per-KB reranker column decision per W3 C5 carry)_

### Phase Gate 2 verdict(per plan.md §3 + architecture.md §6.3)
- G1-G6:_(W4 D5 末)_
- **Gate 2 4-metric within 5pp**:_(W4 D5 末)_ → PASS continues Tier 1 W5+ optimization;FAIL drops L2 CRAG → baseline-only

### Phase status
- Closeout commit:_(W4 D5 末)_
- Frontmatter status flipped to `closed`:_(W4 D5 末)_
- Phase W05 kickoff trigger:_(W4 D5 末 — W5 plan scope contingent on Gate 2 verdict)_

---

**End of W04 progress**(Day 0 prep stage,daily entries to follow W4 D1 onwards pending W3 D5 closeout sign-off + Chris W4 kickoff approval)
