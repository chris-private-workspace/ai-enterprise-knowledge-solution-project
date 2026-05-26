---
phase: W32-engine-fetch-citation-expansion
status: active
last_updated: 2026-05-26
---

# Phase W32 — Progress Journal

> Daily entry style:每日 work session 結束(或單一日 multi-segment trajectory close)時寫一段。Retro section 喺 phase 收尾寫。

---

## Day 0 — 2026-05-26 (kickoff)

### F0 Kickoff actions

1. **Trigger**:W31-synthesizer-cite-multi-axis closed_partial(commit `09805d6`)— Phase Gate FAIL per Q4(G1 strict 0/15 + G1 marginal +0pp net vs W29+W30 baseline 20% across 3 iterations);full revert all 3 axes per Karpathy §1.3 + W30 Rule 7 precedent。**W31 F2 v3 R6 catch (3) architectural finding**:`citation_expansion_window=3` 對 top-K reranked subset 太 restrictive — top-5 reranked chunks distance ≥ 5 from cited intro chunk_index across reformulator stochasticity-dominated batches → **expansion 從未 actually fire across W31 3-iteration**。W31 retro W32+ priority queue locked HIGHEST = **(h') engine-fetch B'.c path 3** — async `engine.list_chunks` from full doc not top-K reranked subset → escapes window=3 constraint。

2. **User pick 2026-05-26 same-day post-W31 closeout**:**繼續執行 (h') engine-fetch B'.c path 3 — async engine.list_chunks from full doc(mirror W25 F5 D1 pattern,escapes window=3 constraint)**。Sequential ship strategy locked — W32 ship (h') ONLY,no concurrent prompt change(W31 multi-axis trap lesson)。

### R6 Day 0 recursive grep verify(per CLAUDE.md §10 R6)

**Net 0 plan-text contamination + post-W31-revert clean state confirmed**:

1. **`prompt_builder.py`**:SYSTEM_PROMPT Rule 1-6 only(W31 Rule 7 v2 + Rule 8 REVERTED per commit `09805d6` F4 closeout)。No author bias residue from W31 §-prefix examples。

2. **`synthesizer.py`**:NO `from generation.citation_expansion import expand_citations`(W31 removed);NO `expand_citations(...)` call sites in `synthesize` or `synthesize_stream`(W31 removed)。Clean baseline for W32 wire signature change(add `*, engine=None, kb_id=None` keyword-only params)。

3. **`storage/settings.py`**:NO `enable_citation_post_hoc_expansion` / `citation_expansion_window` / `citation_expansion_score_threshold` / `citation_expansion_max_aux` fields(W31 4 NEW knobs REMOVED per F4 revert)。W32 will re-add 3 NEW knobs(drop score_threshold per PC-W31-2 lesson — `list_chunks` no score)。

4. **`backend/generation/citation_image_neighbors.py`**(W25 F5 D1 reference pattern):
   - Line 41-48:`async def attach_neighbour_images(citations, kb_id, engine, *, max_aux_per_citation, neighbour_window)` — direct parallel signature for W32 `expand_citations`
   - Line 61-62:`if not citations: return citations` defensive empty-input pattern
   - Line 65-66:`doc_ids: list[str] = sorted({c.doc_id for c in citations if c.doc_id})` batch-by-doc pattern for parallel fetch
   - Line 71-74:`fetched_chunks = await asyncio.gather(*(engine.list_chunks(kb_id, did) for did in doc_ids), return_exceptions=True)` parallel fetch with graceful per-doc failure
   - Line 86-92:fetch_errors graceful degradation pattern(log + skip that doc's expansion)
   - Line 135-186:`_find_neighbour_images` pure private helper — testable without engine,parallel structure for W32 `_find_neighbour_chunks` pure helper

5. **`backend/retrieval/retrieval_engine.py:258`**:`async def list_chunks(self, kb_id: str, doc_id: str, top: int = 1000) → list[dict]` API verified — returns full doc chunks with chunk_index + chunk_title + section_path fields per Azure Search index schema。No change needed to RetrievalEngine。

6. **Plan-text contamination check**(per W22 D9 R6 recursive scope):
   - W32 plan §1 scope cites W25 F5 D1 `citation_image_neighbors.py` line 41-132 — verified at this path
   - W32 plan §2 F1.2 cites `engine.list_chunks(kb_id, doc_id, top=1000)` API — verified at `retrieval_engine.py:258`
   - W32 plan §3 G1 baseline cites W31 v3 walkthrough cite rate 20% — verified at session-start.md §11 W31 CLOSED_PARTIAL block
   - W32 plan §6 cites W29 `.env` env override + W28 Settings defaults + W26 Q4 OFF — verified at `Settings.py` L185-243 current state

**Net W22 D9 plan-text contamination = 0**(R6 recursive scope per CLAUDE.md §10 R6 confirmed)。

### Karpathy §1.1 think-before-coding — W31 lessons applied as preventive controls

**PC-W31-1**(LIVE eval on actual corpus chunk_title BEFORE finalizing regex):
- W32 uses `\b\d+\.\d+\b` validated by W31 F2 v2 corpus-realistic evidence(corpus uses bare「8.4」not「§8.4」)
- W32 F1.5 unit test fixtures include corpus-realistic bare X.M titles(carry forward W31 F1.5 `test_corpus_bare_x_m_pattern_matches_no_section_prefix` pattern)

**PC-W31-2**(Settings default values calibrated against LIVE corpus):
- W32 DROPS `citation_expansion_score_threshold` field entirely — `engine.list_chunks` returns raw chunks without rerank score
- W32 `citation_expansion_window=10` corpus-empirical(W31 F2 evidence:§8.1-§8.5 walkthroughs at idx 46/48/50/51/53 within ±10 of intro idx 44)

**PC-W31-3**(window-based locality assumption requires escape mechanism):
- W32 escapes top-K constraint via `engine.list_chunks` async fetch from FULL doc(no longer bound by reranker stochasticity which chunks surface top-5)
- Even when reformulator surfaces §3/§5/§7/§11 walkthroughs in top-5(W31 v2/v3 batches),W32 can still fetch §8.x neighbors of cited intro chunk_index 44 from full doc

**Sequential ship strategy locked**(W31 multi-axis trap lesson):
- W32 ships **(h') ONLY** — engine-fetch async expansion module + 3 NEW Settings + wire
- NO concurrent prompt change(Rule 7 v2 + Rule 8 remain reverted per W31 F4)
- Single-axis attribution clean — any G1 marginal improvement directly attributable to (h')
- If W32 G1 marginal:W33 candidate (g') 20-run methodology OR (i') reformulator deterministic;W33 separate ship per Karpathy §1.2 一次只郁一個旋鈕

### F0 next steps

- **F0.5** Draft this progress.md Day 0 entry(this section)— ✅ done
- **F0.6** Commit kickoff `docs(planning): kickoff W32-engine-fetch-citation-expansion + (h') single-axis ship per W31 multi-axis lesson + R6 Day 0 net 0 contamination`(next action)
- **F0.7** session-start.md §10 W32 row append + W33+ rolling JIT row defer + W31 row 維持 closed_partial(post-F0.6 commit)
- **D1** start:F1 implementation cascade(wire signature change + async module + Settings + tests)

### Day 0 Actual vs Planned Effort table

| Deliverable | Planned | Actual | Variance |
|---|---|---|---|
| F0.1 folder create | 5min | ~2min | -3min ✅ |
| F0.2 R6 grep verify | 15-30min | ~5min(post-W31-revert clean state quick verify)| -10-25min ✅ |
| F0.3 plan.md draft | 45-60min | ~20min(5th-phase template re-use compounding)| -25-40min ✅ |
| F0.4 checklist.md draft | 20-30min | ~10min | -10-20min ✅ |
| F0.5 progress.md Day 0 | 20-30min | ~15min | -5-15min ✅ |
| F0.6 commit kickoff | 5min | pending | — |
| F0.7 session-start.md sync | 10min | pending | — |

**Cumulative F0 actual**:~55min pre-commit + ~5min post-commit cross-doc sync expected;同 W31 F0 ~1h pattern parallel,~5-10% efficiency 提升 due to 5th-iteration template re-use(W27 → W28 → W29 → W30 → W31 → W32 compounding)。

---
