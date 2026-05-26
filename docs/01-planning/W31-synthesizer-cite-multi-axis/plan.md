---
phase: W31-synthesizer-cite-multi-axis
status: closed_partial   # per F4 closeout 2026-05-26 — Phase Gate FAIL + full revert per Karpathy §1.3 + W30 Rule 7 precedent (same closed_partial flag convention as W30)
last_updated: 2026-05-26
component_scope: C05 Generation Pipeline
adr_refs:
  - ADR-0034 (W25 F3 D4 query expansion + RAG-Fusion — W31 retains W29 .env tune `overfetch=8 + rrf_k=30`)
  - ADR-0037 (W26 F2 parent-doc — Settings preserved per W28 best combo + Q4 default OFF)
  - ADR-0038 (W27 dispatch_mode — preserved "replace" per W28 reaffirmation)
related_carry_overs:
  - W30 retro carry-over (B') HIGHEST NEW path (i) Option B cite-confidence threshold relax — 3 mechanism sub-options
  - W30 retro carry-over Rule 7 v2 wording refinement — target「§X.M numbering pattern」
  - W29 .env `QUERY_EXPANSION_PER_VARIANT_OVERFETCH=8 + QUERY_EXPANSION_RRF_K=30` env override PRESERVED baseline
---

# W31 — Synthesizer Cite Multi-Axis(B'.b + B'.c + Rule 7 v2)

## §1 Goal + Scope

**Single primary goal**:Close synthesizer cite-decision bottleneck surfaced W29 + W30 — walkthrough cite rate 5-run baseline 20%(1/5)+ W30 Rule 7 add → 0pp 改善 → REVERTED。**Target**:walkthrough cite rate 5-run ≥ 60%(3/5)— multi-axis attempt 增加 G1 marginal improvement 概率。

**3-axis scope**(per user pick 2026-05-26):

1. **Axis 1 — Rule 7 v2 wording refinement**(prompt layer,~1-2h)
   - 取代 W30 Rule 7 「PREFER citing specific subsection chunks over overview/intro chunk」abstract wording
   - NEW v2 wording target explicit pattern matching:「**§X.M numbering**」OR「**individual walkthrough section**」more concrete terminology
   - Goal:avoid「Coverage summary」mis-interpretation observed W30 Run 5(LLM cited §8.6 Coverage summary 當「specific subsection」)

2. **Axis 2 — B'.b Prompt instruction「cite ALL overlap」**(prompt layer,~1h,同 axis 1 同一 SYSTEM_PROMPT edit)
   - NEW instruction「cite ALL chunks that overlap with answer paragraph keywords (not just the most representative one)」
   - Goal:broaden cite behavior — LLM 主動 cite 多個 supporting chunks 而唔係只 cite「最 representative」嗰個 intro chunk

3. **Axis 3 — B'.c Post-hoc citation expansion**(backend layer,~2 days)
   - NEW module `backend/generation/citation_expansion.py`(parallel pattern to W25 `citation_image_neighbors.py`)
   - Synthesizer 出完 cite 之後 backend 自動 inspect ±N neighbor chunks(same doc,within score threshold)
   - 若 neighbor chunk_title contain「§X.M numbering」OR keyword overlap with cited answer paragraph → auto-add citation marker
   - Goal:即使 LLM cite-decision biased toward intro chunks,backend 自動 expand 補 specific walkthrough chunks

**Non-goals**(out of W31 scope):
- (B'.a) Settings parameter chunk-score threshold pre-pend to required-cite list in user message —— 風險高(改 user message structure 可能影響 citation invariant);若 B'.b+B'.c+Rule 7 v2 G1 marginal MISS → W32+ candidate
- (ii) CRAG threshold trial —— H1 boundary downgrade(STOP+ask + ADR),條件唔成熟 per W30 retro
- (k) wire reformulator into eval/orchestrator.py —— H4 systemic gap orthogonal axis,W32+ preserved
- ADR-0037 default flip / parent-doc enable —— preserved per Q4 measurement-experiment-fail-policy

**Component scope**:**C05 Generation Pipeline only**(prompt_builder.py + synthesizer.py + NEW citation_expansion.py + Settings.py knobs)。**No** C04 Retrieval Engine / C03 Indexing / C01 Ingestion / C06 Eval / C08 API Gateway / C09-C13 frontend / mockup changes(per Karpathy §1.3 surgical)。

---

## §2 Deliverables F0-F5

### F0 — Kickoff(this session 2026-05-26)

- F0.1 Create `docs/01-planning/W31-synthesizer-cite-multi-axis/` folder
- F0.2 R6 Day 0 recursive grep verify(plan-text + code base contamination check per CLAUDE.md §10 R6)
- F0.3 Draft `plan.md` 7-section per W30 closed-phase template
- F0.4 Draft `checklist.md` atomic items per plan deliverables
- F0.5 Draft `progress.md` Day 0 entry — kickoff action + R6 catch report + (B') subset user pick rationale
- F0.6 Commit kickoff `docs(planning): kickoff W31-synthesizer-cite-multi-axis + R6 Day 0 no-shipped-pattern confirm + (B'.b + B'.c + Rule 7 v2) multi-axis subset pick`
- F0.7 session-start.md §10 W31 row append + W32+ rolling JIT row defer + W30 row 維持 closed_partial

### F1 — Implementation(D1 estimate)

**F1.1 Prompt layer edit**(`backend/generation/prompt_builder.py:28` SYSTEM_PROMPT)
- F1.1.a Add NEW Rule 7 v2 「For queries asking about specific sub-procedures/walkthroughs/scenarios numbered with patterns like §X.M (e.g. §8.1, §8.2, §8.3), prefer citing those individually-numbered chunks over higher-level overview/coverage-summary chunks that aggregate them.」
- F1.1.b Add NEW Rule 8 「When multiple retrieved chunks each contain partial information relevant to the answer, cite ALL of them (not just the most representative one) — each fact in the answer should be backed by every chunk that supports it.」
- F1.1.c Preserve Rule 6 CH-005 unchanged(W25.5 BUG-025 amendment + W26 R14 mitigation context)

**F1.2 Backend layer NEW module**(`backend/generation/citation_expansion.py`)
- F1.2.a Function signature `expand_citations(answer_text: str, citation_ids: list[str], chunks: list[RetrievedChunk], *, settings: Settings) → tuple[str, list[str]]`
- F1.2.b Logic:for each existing `[chunk-{id}]` marker in answer_text,inspect ±N neighbor chunks within same doc(by `chunk_index`);if neighbor satisfies BOTH `(a)` `chunk_title` regex pattern `§\d+\.\d+` OR keyword overlap ≥ threshold with cited answer paragraph AND `(b)` rerank score ≥ `citation_expansion_score_threshold` → auto-insert `[chunk-{neighbor_id}]` marker after the existing one(preserve order + dedupe)
- F1.2.c Caps:`citation_expansion_max_aux` chunks per existing citation;`citation_expansion_window` chunk_index window size
- F1.2.d Test scenario fixture in `backend/tests/test_citation_expansion.py` — 5+ unit tests covering:happy path neighbor matches / no neighbor matches / window boundary / max_aux cap / dedupe against existing citation_ids

**F1.3 Settings NEW knobs**(`backend/storage/settings.py`)
- `enable_citation_post_hoc_expansion: bool = True`(W31 default ON for measurement — opposite to W26 parent-doc Q4 default OFF;rationale:Karpathy §1.4 goal-driven「make it pass」requires axis enabled to measure;若 G1 FAIL → revert default per Q4 measurement-experiment policy at F4)
- `citation_expansion_window: int = 3`(parallel to existing `citation_neighbour_window=3` per W25 F5 D1 — same chunk_index ±3 convention)
- `citation_expansion_score_threshold: float = 0.5`(empirical pick — Cohere v4.0-pro reranked scores typically [0.5, 1.0] per W26 F1 D1 evidence;0.5 = top half retain;tunable F4 if G1 MISS)
- `citation_expansion_max_aux: int = 2`(parallel to `citation_neighbour_max_aux_images=2` W25 convention)

**F1.4 Wire citation expansion into synthesizer pipeline**(`backend/generation/synthesizer.py` + `stream_composer.py` if needed)
- F1.4.a `synthesize` method — post `extract_citation_ids` call `expand_citations` when `settings.enable_citation_post_hoc_expansion=True`;return `SynthesisResult` with expanded `answer` + `citation_ids`
- F1.4.b `synthesize_stream` — apply expansion in `result` event payload only(stream已 yield text-delta partial,expansion applied to accumulated answer 之後 emit final result)
- F1.4.c Backward compat:`enable_citation_post_hoc_expansion=False` → behavior bit-identical to pre-W31 path

**F1.5 Unit tests + non-regression coverage**
- F1.5.a `test_prompt_builder_dispatch.py` — assert NEW Rule 7 v2 + Rule 8 phrases present + Rule 6 non-regression
- F1.5.b `test_citation_expansion.py` — 5+ tests F1.2.d
- F1.5.c `test_synthesizer_*.py` — extend with citation expansion enabled/disabled scenarios(2 NEW)
- F1.5.d backend pytest baseline 1060 → expected ~1070-1075 post-W31 F1(+~10 NEW tests across 3 files)
- F1.5.e ruff + mypy strict on touched files clean(pre-existing W26 module-path quirk preserved per CO_W25_mypy_strict_debt)

### F2 — 5-run reproducibility verify Q-W25-I07 + Q-W25-I01 control(D2 estimate)

- F2.1 Backend reload via `touch backend/generation/prompt_builder.py` + WatchFiles trigger + /health=ok verify
- F2.2 curl POST /query Q-W25-I07「show me all the Integration scenarios」5 runs back-to-back — per-run JSON in `backend/w31-f2-i07-multi-run-{1-5}.json`
- F2.3 curl POST /query Q-W25-I01「what is the high level architecture」5 runs back-to-back(control)— per-run JSON `backend/w31-f2-i01-multi-run-{1-5}.json`
- F2.4 Aggregate report `f2-5run-multi-axis-W31-D2-raw.txt` — Q-I07 walkthrough cite rate / Q-I07 citations count / Q-I01 no regression check / G1-G6 verdict

### F3 — Manual user-test 3-query cohort(D2 estimate;same-day as F2)

- F3.1 Q-W25-I07「show me all the Integration scenarios」— expected ≥ 2 distinct §8.x walkthrough cited(target G1)
- F3.2 Q-W25-I01「what is the high level architecture」— expected control no regression(faithfulness within F1 baseline 0.9851 ±2pp)
- F3.3 NEW Q-W31-I08(TBD pick by user OR Chris OR phase author)— enumeration / aggregate query variant to test multi-axis robustness beyond Q-W25-I07
- F3.4 Visual citation render check `<CitationPill>` no overflow / no truncation when citations 數量 > 5(F3 expects expansion 可能將 citation 從 1-2 → 4-6)

### F4 — Phase Gate G1-G6 evaluation + decision policy

(per §3 acceptance criteria below)

### F5 — Closeout retro + commit + push

- F5.1 plan.md frontmatter `status: active → closed` OR `closed_partial` per G1 verdict
- F5.2 checklist.md cross-cutting tick + N/A reason
- F5.3 progress.md retro 7-section(What worked / What didn't / Surprises / Carry-overs / ADR triggers / Phase Gate result / W32+ priority queue update)
- F5.4 session-start.md §10 W31 row `🟡 active` → `✅ closed` OR `closed_partial`
- F5.5 session-start.md §11 W31 CLOSED block prepend
- F5.6 RISK_REGISTER — NEW R16 candidate if multi-axis 引入新 risk dimension(e.g. over-citation noise)
- F5.7 ADR README — no NEW ADR expected(F1.1 Rule 7 v2 + Rule 8 prompt iteration within existing framework;F1.2 citation_expansion module pattern parallel to W25 F5 D1 framework,not architectural)
- F5.8 Commit F4+F5 closeout combined(per W30 closeout pattern — F1 + F2 + F3 + F4 + F5 evidence atomic)
- F5.9 Push origin/main(per explicit user instruction)

---

## §3 Acceptance Criteria(G1-G6)

### G1 PRIMARY — Walkthrough cite rate 5-run vs W29+W30 baseline 20%

| Gate level | Criterion | Verdict logic |
|---|---|---|
| **G1 strict** | ≥ 2 distinct §8.x walkthrough cited in ≥ 1 run | PASS / FAIL |
| **G1 relaxed** | ≥ 1 §8.x walkthrough cited per run for ≥ 3/5 | PASS / FAIL |
| **G1 marginal** | > 40% improvement vs W29+W30 baseline 20%(target 5-run ≥ 60% = 3/5)| PASS / FAIL |

**G1 decision matrix**:
- G1 strict + G1 relaxed + G1 marginal **3/3 PASS** → **Phase Gate PASS**(infrastructure preserve;W32+ priority queue 重排)
- G1 strict OR relaxed PASS,marginal FAIL → **Phase Gate PARTIAL**(infrastructure preserve;tune `citation_expansion_score_threshold` OR Rule 8 wording v2)
- G1 marginal PASS only(strict + relaxed FAIL)→ **Phase Gate PARTIAL**(behavior improvement detected but未達 target;preserve + W32+ axis tune)
- **G1 全 FAIL**(0pp 改善 vs baseline)→ **Phase Gate FAIL** + revert per Karpathy §1.3 surgical(同 W30 Rule 7 fallback pattern)

### G2 control Q-W25-I01 no regression

faithfulness within F1 baseline 0.9851 ±2pp(allow drift but no SEVERE regression)。If G2 FAIL → revert axis 3 B'.c first(post-hoc expansion can introduce spurious citations 損 faithfulness);F4 decision priority。

### G3 backend pytest baseline preserved

1060(W30 post-revert baseline)→ expected ~1070-1075 post-W31 F1。No existing test regression。

### G4 ruff PASS + mypy strict module-path quirk preserved

新 touch files clean;pre-existing 11 W26 baseline errors per CO_W25_mypy_strict_debt unchanged。

### G5 NEW unit tests PASS

F1.5.a + F1.5.b + F1.5.c all PASS(prompt phrases + citation_expansion + synthesizer enabled/disabled)。

### G6 Q4 measurement-experiment-fail-policy

Per ADR-0037 Q4 + W26+W27+W30 precedent:G1 fully FAIL → revert all 3 axes per Karpathy §1.3 surgical(don't accumulate prompt + module complexity for unproven side-effects);G1 partial PASS → preserve infrastructure + W32+ candidate axis tune。Settings `enable_citation_post_hoc_expansion` default treatment per F4 outcome:
- G1 strict + relaxed PASS → default ON ship(production candidate)
- G1 partial PASS → default OFF preserve infrastructure(measurement-experiment retained)
- G1 fully FAIL → REMOVE module(revert)

---

## §4 R1-R6 Sprint Rules(per CLAUDE.md §10 binding)

- **R1** plan.md committed before F1 code(F0.6 commit kickoff this session)
- **R2** daily commits correspond to progress.md Day-N entries(D1 F1 implementation commit + D2 F2+F3 evidence commit + F4+F5 closeout commit)
- **R3** plan deviation logged in §7 changelog(no silent drift)
- **R4** OQ resolved → decision-form.md + progress.md Day-N sync(none expected this phase — pure C05 prompt + backend module iteration)
- **R5** ADR if architectural decision(per H1)— F1.1 Rule 7 v2 + Rule 8 = prompt iteration within existing framework / F1.2 citation_expansion = parallel pattern to W25 F5 D1 = non-architectural per §1 scope decl
- **R6** Day 0 recursive grep verify(this session F0.2 ✅ — confirmed no shipped pattern conflict for B'.b/B'.c/Rule 7 v2)

---

## §5 D0-D2 Day Breakdown Estimate

| Day | Deliverables | Effort | Verify |
|---|---|---|---|
| **D0(this session 2026-05-26)** | F0.1-F0.7 kickoff | ~1-2h | plan/checklist/progress committed |
| **D1** | F1.1 prompt edit(~1-2h)+ F1.2 citation_expansion module(~3-4h)+ F1.3 Settings(~30min)+ F1.4 wire(~1h)+ F1.5 tests(~1-2h)= ~7-9h | full D1 | backend pytest ~1070-1075 + ruff + mypy clean |
| **D2** | F2 5-run reproducibility(~1h backend reload + 10 curl runs + aggregate)+ F3 manual user-test 3-query cohort(~1h)+ F4 phase Gate(~30min)+ F5 closeout(~1-2h)= ~3-5h | full D2 | G1-G6 verdict + commit + push |

**Total**:~10-14h actual work spread across 2-3 calendar days。Real-calendar collapse pattern continues W22-W30(typical 5-30× collapse,W31 likely 2-3× given multi-axis complexity)。

---

## §6 W30 Carry-overs + Dependencies

### Preserved baseline(W30 + W29 inheritance)

- **W29 `.env` env override**:`QUERY_EXPANSION_PER_VARIANT_OVERFETCH=8` + `QUERY_EXPANSION_RRF_K=30`(retrieval-side +40pp Path A tune,W30+ baseline,W31 inherits)
- **W28 `Settings.py` defaults**:`parent_doc_max_tokens_per_parent=2000` + `parent_doc_top_k=2` + `parent_doc_dispatch_mode="replace"`(W28 best combo,W31 inherits)
- **W26 `Settings.py` Q4**:`enable_parent_doc_retrieval=False`(measurement-experiment-fail-policy preserved,W31 NOT toggle)
- **W30 reverts**:Rule 7 NEW first-edit REVERTED(`prompt_builder.py:28` SYSTEM_PROMPT back to Rule 1-6),unit test `test_system_prompt_includes_rule_7_prefer_specific_over_overview` removed
- **W25 F5 D1 baseline**:`enable_citation_neighbour_images=True` + `citation_neighbour_window=3` + `citation_neighbour_max_aux_images=2`(image attach unchanged;W31 adds parallel citation_expansion knobs for chunk-level expansion)

### Dependencies on prior infrastructure

- **ADR-0034 query expansion + RRF**:retrieval-side §8.x top-5 surface rate W29 D0 post-tune 40%(2/5 runs)— F2 5-run sample needs 至少 2-3/5 runs §8.x top-5 surface 先有 ground 畀 axis 3 B'.c citation_expansion measure(若 retrieval 完全 0% surface 則 expansion 無 candidate chunk 可以 expand)
- **W25.5 BUG-025 symmetric deboost**:Q-W25-I07 silent-drop scope closed,3 citations baseline(citation_image_neighbors active)— W31 adds chunk-level expansion 喺 image-attach top
- **Existing test infrastructure**:11/11 dispatch tests + 14/14 synthesizer tests + ruff config + mypy module-path config quirk per W26 baseline

### Out of W31 scope(W32+ candidates)

- (B'.a) Settings parameter chunk-score threshold pre-pend to required-cite list in user message → W32+ if B'.b+B'.c+Rule 7 v2 marginal
- (ii) CRAG threshold trial → W32+ H1 boundary downgrade governance per STOP+ask + ADR
- (k) wire reformulator into eval/orchestrator.py → W32+ H4 systemic gap closure orthogonal axis
- (c) RAGAs orchestrator-aware judge tune — preserved low priority
- NEW (e) `make_ragas_evaluator` structlog stage(per W28 D2 silent-hung lesson)
- NEW (f) Settings-default-tests automated coverage
- BUG-026 + BUG-027 cosmetic — preserved
- W22 D8 setup.md §8.6 stale uvicorn workflow — preserved
- W16 F1-F4 Track A IT cred — parallel track Q11 operational early June 2026

---

## §7 Changelog

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-05-26 | initial | Plan drafted F0 D0 kickoff | W30 retro carry-over (B') HIGHEST + Rule 7 v2 combined ship per user pick AskUserQuestion 2026-05-26 |
| 2026-05-26 | §1 + §2 | (B') subset locked to B'.b + B'.c + Rule 7 v2 per user 2nd AskUserQuestion pick(B'.a deferred W32+;Karpathy §1.2 risk acknowledged for max G1 marginal improvement probability)| Multi-axis attempt 增加 G1 marginal improvement 概率 per W29+W30 single-axis PARTIAL trajectory |
| 2026-05-26 | §6 | W29 `.env` env override + W28 Settings defaults + W30 Rule 7 revert state baseline confirmed at kickoff | R6 Day 0 recursive grep verify against prompt_builder.py:28 SYSTEM_PROMPT current state(only Rule 1-6 present post-W30 revert)+ Settings.py L198-243 |
| 2026-05-26 | F2 v1→v2 amendment | regex `§\d+\.\d+` → `\b\d+\.\d+\b`(corpus-realistic pattern)+ prompt Rule 7 v2 wording 加 bare X.M examples | F2 v1 Run 1 LIVE eval empirical evidence — corpus chunk_title uses bare「8.4 Scenario D」not「§8.4」;§-prefix author bias refuted |
| 2026-05-26 | F2 v2→v3 amendment | `citation_expansion_score_threshold` default 0.5 → 0.03 | F2 v2 Run 1 LIVE eval evidence — Cohere v4.0-pro raw `/query` rerank scores observed 0.04-0.05 range(NOT [0.5, 1.0] as W26 F1 D1 post-softmax reference)|
| 2026-05-26 | F4 closeout policy | Phase Gate FAIL → full revert per Karpathy §1.3 + W30 Rule 7 precedent(user AskUserQuestion 4-pick Option α) | v1+v2+v3 3-iteration aggregate G1 strict 0/15 + G1 marginal +0pp net vs W29+W30 baseline 20% → 3 重 R6 catches surfaced(§-prefix author bias / threshold mis-calibration / window=3 constraint)+ reformulator stochasticity dominance — Karpathy §1.3 surgical change without measurable benefit → revert all 3 axes |
