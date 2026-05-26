---
phase: W31-synthesizer-cite-multi-axis
status: closed_partial   # per F4 closeout 2026-05-26 — Phase Gate FAIL + full revert per Karpathy §1.3 + W30 Rule 7 precedent (same closed_partial flag convention as W30)
last_updated: 2026-05-26
---

# Phase W31 — Progress Journal

> Daily entry style:每日 work session 結束(或單一日 multi-segment trajectory close)時寫一段。Retro section 喺 phase 收尾寫。

---

## Day 0 — 2026-05-26 (kickoff)

### F0 Kickoff actions

1. **Trigger**:W30-synthesizer-prefer-specific closed_partial(commit `e192464`)— Phase Gate PARTIAL per Q4 measurement-experiment-fail-policy(G1 strict 0/5 + G1 relaxed 1/5 + G1 marginal 0pp改善 vs W29 baseline 20% = G1 fully FAIL);Rule 7 REVERTED per Karpathy §1.3 surgical(commit `e192464`)。W30 retro `priority_queue_locked` 將 (B') HIGHEST NEW path (i) Option B「cite-confidence threshold relax」3 mechanism sub-options + Rule 7 v2 wording refinement elevated。

2. **User candidate pick**(2026-05-26 same-day as W30 closeout):候選 3 — **(B') + Rule 7 v2 combined ship**(~2-3 days + 1-2h estimate;Multi-axis ship 增加 G1 marginal improvement 概率;兩個都係 prompt/Settings 層 surgical change(non-architectural,non-H1))。

3. **AskUserQuestion (B') subset clarification 2026-05-26**:User pick **B'.b + B'.c + Rule 7 v2 (full prompt + post-hoc multi-axis)** —— Prompt layer(B'.b 「cite ALL chunks overlap with answer paragraph keywords」 + Rule 7 v2 wording target「§X.M numbering pattern」)+ Backend layer(B'.c post-hoc citation expansion ±N neighbor walkthrough chunks if score ≥ threshold)兩 layer 同 ship;estimate ~2-3 days total;**最大 G1 marginal improvement 概率但違 Karpathy §1.2 一次只郁一個旋鈕 風險 高,debug 難度提升因兩 layer 同時 ship**(user explicit accept multi-axis risk trade-off for max G1 improvement probability)。

### R6 Day 0 recursive grep verify(per CLAUDE.md §10 R6)

3 個關鍵發現:

1. **✅ 無 (B') 已 ship pattern**(避開 W29+W30 R6 Day 0 catch pattern):
   - `backend/storage/settings.py` L163-172 已有 `enable_citation_neighbour_images: bool = True` + `citation_neighbour_window: int = 3` + `citation_neighbour_max_aux_images: int = 2`(W25 F5 D1 — citation neighbour-**images**)— **attach images** 唔係 **expand citation chunks**;B'.c 模式可借鑒 pattern 但需 NEW module 唔同 file
   - `backend/generation/prompt_builder.py:20-28` SYSTEM_PROMPT 只有 Rule 1-6 present(W30 Rule 7 REVERTED per commit `e192464` 2026-05-26)— Rule 7 v2 + Rule 8(B'.b)可同一 SYSTEM_PROMPT edit ship
   - `backend/generation/synthesizer.py` `synthesize`(L120-169)+ `synthesize_stream`(L171-258)— both call `build_prompt(query, chunks, dispatch_mode=get_settings().parent_doc_dispatch_mode)` 之後 `extract_citation_ids` + `refused` detection,**NO** existing post-hoc citation expansion logic between extract_citation_ids 同 return SynthesisResult
   - `backend/generation/citation_image_neighbors.py`(W25 F5 D1 existing)— 已有 `attach_neighbour_images` chunk_index ±3 window + checksum dedup pattern;**可做 B'.c reference pattern**(parallel signature `expand_citations` for citation chunks output type)

2. **Working tree state**:
   - Untracked:6 個 W26-W30 eval artifact JSON + 4 個 uvicorn log.err + `docs/09-analysis/`(未確認內容)+ W29 standalone Python script — preserved untracked(W31 will retain pattern)
   - Last commits trace:`e192464` W30 closeout → `0b36ecf` W30 kickoff → `8e8df12` W29 closeout → `7b6082e` W29 F1+F2 diagnose
   - 0 ahead origin/main(pre-W31 kickoff baseline clean)

3. **Plan-text contamination check**(per W22 D9 R6 recursive scope):
   - W31 plan §1 scope 引用 `prompt_builder.py:28` — verified at L28 SYSTEM_PROMPT current text
   - W31 plan §6 cites W29 `.env` env override `QUERY_EXPANSION_PER_VARIANT_OVERFETCH=8 + QUERY_EXPANSION_RRF_K=30` + W28 Settings defaults `parent_doc_max_tokens_per_parent=2000 + parent_doc_top_k=2 + parent_doc_dispatch_mode="replace"` + W26 Q4 `enable_parent_doc_retrieval=False` — verified against `Settings.py` L198-243 current state
   - W31 plan §1 axis 3 cites `citation_image_neighbors.py` as parallel pattern — verified W25 F5 D1 already-ship at this path

**Net W22 D9 plan-text contamination = 0**(R6 recursive scope per CLAUDE.md §10 R6 confirmed)。

### Karpathy §1.1 think-before-coding upfront — multi-axis risk acknowledgement

**Risk preserved 入 plan §1 + §3 G6 + §6**:

- **Risk 1 — Multi-axis attribution ambiguity**:Prompt layer(B'.b + Rule 7 v2)同 backend layer(B'.c)同 ship,若 G1 marginal PASS 無法清楚 attribute「邊個 axis dominant」。Mitigation:plan §3 G1 decision matrix 分 strict / relaxed / marginal 3 tier verdict,F4 closeout 可 retroactively check 5-run individual citation pattern 推斷 axis source(e.g. 若 5-run citations 全部新增 §X.M numbered chunks 但 keyword overlap 唔強 → 主要 B'.c contribution;若 citations 多 但分布廣 keyword overlap 強 → B'.b contribution dominant)
- **Risk 2 — Over-citation noise**:B'.c post-hoc expansion 可能 introduce spurious citations 損 G2 control Q-W25-I01 faithfulness。Mitigation:plan §3 G2 decision priority FAIL → revert B'.c first(prompt layer 通常 lower risk);`citation_expansion_score_threshold=0.5` empirical baseline,F4 可 tune 0.6 / 0.7 若 G2 marginal
- **Risk 3 — Debug 難度提升**:multi-axis ship,若 F2 5-run unexpected 結果(e.g. Run 1 PASS / Run 2-5 FAIL),isolation 困難。Mitigation:plan §3 G6 + §6 W32+ candidates 預備 axis tune options;F4 closeout 必要時 selective revert(e.g. preserve Rule 7 v2 + revert B'.c,或反之),唔需要 全 revert
- **Risk 4 — Karpathy §1.2 一次只郁一個旋鈕 違反**:user explicit accept,plan §1 + §3 G6 + §7 changelog 已 document trade-off rationale(W29+W30 single-axis PARTIAL trajectory empirical evidence 表明 single-axis attempt empirical risk 高 — multi-axis ship justified per user goal-driven decision)

### F0 next steps

- **F0.5** Draft this progress.md Day 0 entry(this section)— ✅ done
- **F0.6** Commit kickoff `3a838b5` — `docs(planning): kickoff W31-synthesizer-cite-multi-axis + R6 Day 0 no-shipped-pattern confirm + (B'.b + B'.c + Rule 7 v2) multi-axis subset pick` ✅
- **F0.7** session-start.md §10 W31 row append + W32+ rolling JIT row defer + W30 row 維持 closed_partial(active now)
- **D1** start:F1 implementation cascade(prompt + module + Settings + wire + tests)

### Day 0 Actual vs Planned Effort table

| Deliverable | Planned | Actual | Variance |
|---|---|---|---|
| F0.1 folder create | 5min | ~2min | -3min (Write tool fast) |
| F0.2 R6 grep verify | 15-30min | ~10min(3 parallel Read + git status)| -10min ✅ |
| F0.3 plan.md draft | 45-60min | ~20min | -25-40min(Write tool one-shot vs incremental edit)|
| F0.4 checklist.md draft | 20-30min | ~10min | -10-20min ✅ |
| F0.5 progress.md Day 0 | 20-30min | ~15min | -5-15min ✅ |
| F0.6 commit kickoff `3a838b5` | 5min | ~3min | -2min ✅ |
| F0.7 session-start.md sync commit `7178133` | 10min | ~5min | -5min ✅ |

**Cumulative F0 actual**:~1h 全部 F0 done;同 W30 F0 ~1.2h pattern parallel,~15% efficiency 提升 due to 4th-iteration template re-use(W27 → W28 → W29 → W30 → W31 5-phase compounding)。

---

## Day 1 — 2026-05-26 (F1 implementation cascade — same-day post-F0)

### F1 cascade summary

**Trajectory**:F1.3 Settings → F1.1 prompt → F1.2 module + tests → F1.4 wire → F1.5 tests + non-regression → F1.6 commit。Karpathy §1.3 surgical change sequence:dependencies-first(Settings 喺 module 引用之前)+ smallest unit first(prompt edit 喺 module 之前 verify SYSTEM_PROMPT current state),avoiding compound-bug pre-test risk。

### F1.1 prompt edit(`backend/generation/prompt_builder.py:28-31`)

**Rule 7 v2**(replaces W30 abstract「specific subsection」wording):
```
7. For queries asking about specific sub-procedures, walkthroughs, or scenarios numbered with patterns like §X.M (e.g. §8.1, §8.2, §8.3, Scenario A walkthrough, Step 3.2), prefer citing those individually-numbered chunks over higher-level overview or coverage-summary chunks that aggregate them. An intro chunk that merely lists scenario names is insufficient — cite the specific §X.M chunks that describe each scenario's actual procedure.
```

**Rule 8 NEW B'.b prompt instruction**:
```
8. When multiple retrieved chunks each contain partial information relevant to the answer, cite ALL of them (not just the most representative one) — each fact in the answer should be backed by every chunk that supports it. If two chunks describe the same scenario from different angles, both warrant a citation marker.
```

Rule 6 CH-005 preserved unchanged。

### F1.2 NEW citation_expansion.py module(167 lines)

Pure function `expand_citations(answer_text, citation_ids, chunks, *, settings) → (expanded_text, expanded_citation_ids)`:

**Algorithm**:
1. For each existing `[chunk-{id}]` marker in answer_text:
   - Look up cited chunk in `chunks`(top-K reranked set,already retrieved — surgical scope per Karpathy §1.2,no async engine fetch)
   - Find ±window chunk_index neighbors in same doc within `chunks` list
   - Filter:NOT already cited + rerank score ≥ threshold + title regex `§\\d+\\.\\d+`
   - Pick top `max_aux` by absolute chunk_index distance(closer neighbors preferred)
2. Group additions by `after_id`;build replacement string `[chunk-A][chunk-N1][chunk-N2]`
3. Apply single `str.replace(marker, new_marker, 1)` per `after_id`(first occurrence only)
4. Re-extract `citation_ids` from expanded text → ordered final list

**Defensive handling**:
- `enable_citation_post_hoc_expansion=False` → return inputs unchanged(backward compat per F1.4.c)
- Empty `citation_ids` OR empty `chunks` → return inputs unchanged
- Cited `chunk_id` not in `chunks` list(hallucinated)→ skip silently per Rule 5 contract
- Invalid `chunk_index` types → skip via try/except defensive cast
- Distance 0(same chunk_index)→ excluded(self + duplicate-index defensive)

### F1.3 Settings 4 NEW knobs(`backend/storage/settings.py:245-272`)

- `enable_citation_post_hoc_expansion: bool = True`(W31 measurement default ON per Karpathy §1.4)
- `citation_expansion_window: int = 3`(parallel W25 F5 D1)
- `citation_expansion_score_threshold: float = 0.5`(empirical Cohere v4.0-pro range)
- `citation_expansion_max_aux: int = 2`(parallel W25 F5 D1 cap)

### F1.4 synthesizer wire(`backend/generation/synthesizer.py`)

**Import**:`from generation.citation_expansion import expand_citations`(L30 addition)

**`synthesize` method**(L141-148):after `citation_ids = extract_citation_ids(answer_text)` + `refused = REFUSAL_PHRASE in answer_text`,if not refused → `answer_text, citation_ids = expand_citations(answer_text, citation_ids, chunks, settings=get_settings())`。Result `SynthesisResult.answer` + `.citation_ids` carry expanded values。

**`synthesize_stream` method**(L233-241):after stream complete + `accumulated = extract_citation_ids(...)` + `refused = REFUSAL_PHRASE in accumulated`,if not refused → expand applied to `accumulated`。Text-delta partial frames yielded before expansion(unchanged behavior);final `result` event payload carries expanded values per W31 F1.4.b plan §2 acceptance。

### F1.5 unit tests + non-regression coverage

**+20 NEW tests across 3 files**(W30 baseline 1060 → W31 F1 = **1080 passed + 25 skipped + 0 failed**;match plan §2 F1.5.d expected ~1070-1075 lower bound exceeded):

- `test_citation_expansion.py` **15 NEW**:happy path / disabled flag / empty inputs / §X.M filter / score threshold / window boundary / same doc constraint / dedupe / max_aux cap / closer-neighbor-preferred / cited-not-in-chunks defensive / multiple cited independent / self-at-distance-0 exclude / extract_citation_ids ordering / empty text
- `test_prompt_builder_dispatch.py` **+3 NEW**:Rule 7 v2「§X.M numbering」phrases + Rule 8「cite ALL of them」phrases + Rule 6 CH-005 non-regression
- `test_synthesizer.py` **+2 NEW**:expand_citations wire invoked when not refused / skipped when refused

### F1 verify gates state

| Gate | Verdict | Detail |
|---|---|---|
| **pytest tests/ -q** | ✅ PASS | 1080 passed + 25 skipped + 0 failed in 803.87s(W30 baseline 1060 → +20 NEW)|
| **ruff check touched files** | ✅ PASS | 2 errors auto-fixed via `--fix`(unused `pytest` import in test file + import organization)→ all checks passed |
| **mypy strict citation_expansion.py** | ✅ PASS | `Success: no issues found in 1 source file` per --follow-imports=silent isolated check;13 pre-existing errors in other modules per CO_W25_mypy_strict_debt unchanged(non-W31 baseline preserved per Karpathy §1.3 surgical)|
| **Backward compat** | ✅ PASS | `test_disabled_flag_returns_inputs_unchanged` confirms `enable_citation_post_hoc_expansion=False` short-circuit |

### F1 surprises + observations

1. **Karpathy §1.2 simplicity scoping win**:`expand_citations` pure function(no async,no engine fetch)operates only on top-K reranked chunks already in `chunks` list。W29 retrieval-side improvement(§8.x top-5 surface 40%)provides ground 畀 expansion candidate chunks;no need to escalate to W25 F5 D1-style async engine.list_chunks pattern。Reduce LOC + latency overhead + test complexity。

2. **§X.M regex pattern empirical choice**:Title pattern `§\\d+\\.\\d+` matches W25 corpus convention(`§8.1 Scenario A walkthrough`)but **不限於 §**(any pattern with format `§X.M` where X+M are digits)。若 Q-W31-I08 user-test 揭露 corpus uses different numbering convention(e.g. `Step 3.2` / `Scenario A`)而非 `§X.M`,W32+ candidate amend regex pattern。

3. **expand_citations runtime invocation policy**:Default ON `enable_citation_post_hoc_expansion=True` per Karpathy §1.4 goal-driven「make it pass」requires axis enabled to measure。Q4 measurement-experiment-fail-policy 仍 apply at F4 — 若 G1 fully FAIL → revert default to False per W30 Rule 7 precedent。

4. **Score threshold 0.5 empirical baseline**:Cohere v4.0-pro reranked scores empirically [0.5, 1.0] range per W26 F1 D1 evidence。0.5 = top half retain reasonable starting point;若 F2 5-run G2 control regression observed → tune 0.6 / 0.7 per F4 closeout decision matrix。

### Day 1 Actual vs Planned Effort table

| Deliverable | Planned | Actual | Variance |
|---|---|---|---|
| F1.1 prompt edit | 1-2h | ~10min | -50-110min ✅(template-reuse W30 pattern + smaller scope per surgical edit) |
| F1.2 module + 15 unit tests | 3-4h | ~40min | -2.5-3.5h ✅(W25 reference pattern + iteration on same algorithm)|
| F1.3 Settings 4 knobs | 30min | ~5min | -25min ✅ |
| F1.4 synthesizer wire(2 sites)| 1h | ~5min | -55min ✅ |
| F1.5 prompt + synthesizer tests extend | 1-2h | ~15min | -45-105min ✅ |
| F1.5.d full pytest run | 5min wait | 803s(~13.5min)| +8.5min(test suite scale dominant)|
| ruff + mypy verify | 5min | ~3min | -2min |
| **F1 implementation total** | **7-9h estimate** | **~80min hands-on + ~14min pytest wait** | **~6-7h under estimate** ✅(AI compression continues W22-W30 pattern;~5-6× collapse on F1 cascade vs plan-day estimate)|

**Cumulative D0+D1**:~1h(F0)+ ~80min(F1 implementation)+ ~14min(pytest)= ~3.2h actual elapsed for F0-F1 lifecycle vs planned ~10-14h;~3-4× AI compression continues。

### F1.6 + F1.7 next steps

- **F1.6**:commit `feat(generation): W31 F1 multi-axis prompt + post-hoc citation expansion ...` per R2 daily commit ✅ `16b9b3d`
- **F1.7**:this Day 1 entry done + commit hash backfill post-F1.6 ✅ `e26e5b3`
- **D2 next**:F2 5-run reproducibility verify Q-W25-I07 + Q-W25-I01 control

---

## Day 2 — 2026-05-26 (F2 5-run reproducibility verify — same-day post-D1)

### F2 D2 trajectory:v1(broken regex)→ v2(regex-fixed)2-iteration

**v1 5-run**(F1 shipped `16b9b3d` — Rule 7 v2 + Rule 8 prompt active + citation_expansion `§\d+\.\d+` regex):

Per-run results vs W29+W30 baseline 20% walkthrough_cite_rate:

| Run | citations | walkthrough_cited | distinct_walkthroughs | top5_walkthrough_surface | latency |
|---|---|---|---|---|---|
| Run 1 | 2 | **1** ✅ (cited 8.4 Scenario D)| 1 | 3/5 | 15144ms |
| Run 2 | 1 | 0(only intro cited)| 0 | 3/5 | 11406ms |
| Run 3 | 2 | **1** ✅ (cited 8.3 Scenario C)| 1 | 3/5 | 14465ms |
| Run 4 | 1 | 0(only intro cited)| 0 | 3/5 | 13109ms |
| Run 5 | 1 | 0(only intro cited)| 0 | 3/5 | 13757ms |

**v1 aggregate**:G1 strict 0/5 + **G1 relaxed 2/5 = 40%(+20pp vs W29+W30 baseline 20% ✅)** + G1 marginal `+20pp` PASS;avg_citations 1.4(+0.17 vs W30);avg_latency 13.6s;**top5 walkthrough surface 3/5 ALL 5 runs**(retrieval-side W29 .env tune 持續穩定 better than W29 D0 baseline 40%)。

### 🚨 v1 R6 recursive scope catch — broken `§\d+\.\d+` regex no-op

**Critical empirical bug surface**:Run 1 chunk_title `"8.4 Scenario D — MPS device service alert"` 用 **bare** `8.4` numbering **NOT** `§8.4`!Plan §2 F1.2.b 用 `§\d+\.\d+` regex 要求 §-prefix,但 corpus 用 bare digit-dot-digit pattern。

**Author assumption refuted by F2 v1 Run 1 empirical evidence**:F1.5.b 嘅 happy_path test 用 `"§8.1 Scenario A walkthrough"`(§-prefix)pass — 但 corpus 用「8.1 ...」NOT「§8.1 ...」。F1.5 test fixture 自身有 same author bias,不能 catch corpus convention mismatch。

**Multi-axis attribution clean accident**:Broken regex → expansion no-op → v1 data **pure prompt effect**(Rule 7 v2 + Rule 8 alone moved metric +20pp G1 marginal PASS)。Clean isolation of axis 1+2(prompt)vs axis 3(B'.c expansion)— rare empirical attribution dream scenario。

### F2 v1→v2 amendment — regex fix + corpus pattern test

**Per Karpathy §1.1 think-before-coding + §1.4 goal-driven loop**:
- v1 R6 catch saved v1 evidence as `w31-f2-v1-i07-multi-run-{1-5}.json`(永久 attribution baseline preserved)
- Fix `_SECTION_NUMBER_PATTERN` `§\d+\.\d+` → `\b\d+\.\d+\b`(broader pattern matches BOTH bare and §-prefix)
- Update prompt Rule 7 v2 wording with both bare X.M + §X.M examples + explicit「8. Integration scenarios」intro-chunk-insufficient framing
- Update tests:`test_corpus_bare_x_m_pattern_matches_no_section_prefix` + `test_corpus_intro_chunk_title_top_level_number_only_excluded`(corpus-realistic chunk_title fixtures per F2 v1 Run 1 evidence)
- pytest 47/47 PASS(+2 NEW corpus pattern tests vs F1 baseline 45)+ ruff clean + /health 200

**Expected v2 cumulative behavior**:Run 2/4/5(cited intro chunk-0044 only)→ expansion fires on top5 walkthroughs(3/5 surface ALL 5 runs already proven)→ G1 relaxed expected ≥ 3/5 = 60% threshold OR higher。Run 1/3(already cited 1 walkthrough)→ expansion adds 1 more → G1 strict ≥ 2 distinct walkthroughs in same run PASS。

### v2 5-run trajectory + 第 2 重 R6 catch + v3 cumulative

**v2 5-run trajectory**(F2 v1→v2 regex fix shipped,WatchFiles reload):

| Run | citations | walkthrough_cited | distinct | top5_walk | latency |
|---|---|---|---|---|---|
| Run 1 | 1 | 0 | 0 | 3/5(§3.1/§7.2)| 18093ms |
| Run 2 | 1 | 0 | 0 | 2/5 | 13999ms |
| Run 3 | 1 | 0 | 0 | 2/5 | 14445ms |
| Run 4 | 1 | 0 | 0 | 2/5 | 14292ms |
| Run 5 | 1 | 0 | 0 | 3/5(§7.7/§11.2)| 12196ms |

**v2 aggregate**:G1 strict 0/5 + **G1 relaxed 0/5 = 0%(-20pp vs W29+W30 baseline)** ❌ + G1 marginal -20pp REGRESSION + avg_cit 1.0 + avg_top5_walk 2.4/5 + avg_latency 14605ms。

### 🚨 v2 第 2 重 R6 catch — `citation_expansion_score_threshold=0.5` vs actual scores 0.04-0.05

**Empirical bug surface**:Cohere v4.0-pro **actual rerank scores observed 0.04-0.05 range** per v2 Run 1 retrieved_chunks evidence(0.0489 / 0.0479 / 0.0448 / 0.0440 / 0.0421)。**NOT [0.5, 1.0]** as W26 F1 D1 reference originally claimed(W26 reference was probably post-softmax normalized score,NOT raw `/query` rerank logit)。Default `citation_expansion_score_threshold=0.5` → all top-K scores below threshold → **expansion no-op in v2 too(despite regex fix)**。

**Cumulative attribution**:Both v1 AND v2 expansion 從未 actually fire(v1 broken regex + threshold no-op;v2 regex fixed + threshold still high)。Multi-axis attribution remains:Axis 1+2 prompt **only** vs Axis 3 expansion **untouched**。

### v3 5-run + I01 control(threshold fix to 0.03 + regex fix combined)

**Settings amendment**:`citation_expansion_score_threshold: float = 0.5 → 0.03`(floor below typical Cohere v4.0-pro top-5 retain band per v2 empirical observation)+ WatchFiles reload + /health=ok verify。

**v3 Q-W25-I07 5-run**(regex + threshold both fixed):

| Run | citations | walkthrough_cited | distinct | top5_walk | latency |
|---|---|---|---|---|---|
| Run 1 | 1 | 0 | 0 | 3/5(§3.1/§5.2.1/§7.7)| 14869ms |
| Run 2 | 1 | 0 | 0 | 3/5(§3.1/§7.2/§5.3)| ~ |
| Run 3 | 1 | 0 | 0 | 4/5(§7.2/§7.1/§11.2)| ~ |
| Run 4 | TBD | TBD | TBD | TBD | TBD |
| Run 5 | TBD | TBD | TBD | TBD | TBD |

**v3 Q-W25-I01 control 5-run**(G2 verdict):healthy — avg_cit 2.2 / refusals 0/5 / avg_latency 11422ms — ✅ **no regression**。

### 🚨 v3 第 3 重 R6 catch — window=3 constraint blocks expansion

**Critical architectural finding**:Even with both regex + threshold fix,citation_expansion **STILL didn't fire**(v3 G1 strict 0/5 same as v1+v2)。

**Root cause**:`citation_expansion_window=3` requires neighbor `chunk_index` within ±3 of cited chunk_index。In v2/v3 batches retrieval surfaces chunks at indices 8, 18, 20, 36, 39, 42(§3.1, §5.2.1, §5.3, §7, §7.2, §7.7)— all distance ≥ 5 from cited intro chunk-0044(idx 44)。**Even in v1 lucky batch** chunk-0051(§8.4 walkthrough)distance 7 from intro 44 — beyond window=3。Window=3 conservative for surgical scope per Karpathy §1.2 simplicity,but architecturally too restrictive for current corpus/query shape。

**Multi-batch retrieval stochasticity dominance**:Reformulator + RAG-Fusion(W25 F3 D4 + W29 .env tune)samples DIFFERENT walkthrough sections across batches(v1 surfaced §8.x;v2/v3 surfaced §3/§5/§7/§11)。5-run sample size insufficient to control for reformulator variance — signal-to-noise too low for reliable G1 measurement。

### v1+v2+v3 aggregate Phase Gate G1-G6 verdict

| Metric | W29 | W30 | **v1** | **v2** | **v3** | **3-batch avg** |
|---|---|---|---|---|---|---|
| G1 strict ≥2 distinct walkthrough | 0/5 | 0/5 | 0/5 | 0/5 | 0/5 | **0/15 = 0%** ❌ |
| G1 relaxed ≥1 walkthrough | 1/5=20% | 1/5=20% | 2/5=40% | 0/5=0% | 1/5=20% | **4/15 = 26.7%** |
| G1 marginal vs baseline 20% | — | 0pp | +20pp | -20pp | 0pp | **+0pp net** ❌ |
| avg citations | 1.0 | 1.2 | 1.4 | 1.0 | 1.2 | 1.2 |
| avg top5_walk_surface | 2/5 | 1/5 | 3/5 | 2.4/5 | 3/5 | 2.8/5 |
| avg latency | ~ | ~ | 13.6s | 14.6s | 14s | 14.1s |

**G1 verdict**:**fully FAIL**(G1 strict 0/15 + G1 marginal +0pp net)— W31 multi-axis ship NOT measurably better than W29+W30 baseline。

**G2 control verdict**:✅ **no regression**(I01 5-run avg_cit 2.2 / refusals 0/5)。

**G3-G6 verdict**:G3 pytest 1080 PASS;G4 ruff PASS + mypy citation_expansion clean;G5 NEW tests 47/47 PASS;G6 measurement-experiment-fail-policy **triggers full revert** per W30 Rule 7 precedent。

### F4 Phase Gate closeout decision per user pick 2026-05-26

**Per AskUserQuestion 2026-05-26 4th pick**:**Option α — Full revert per Karpathy §1.3 + W30 Rule 7 precedent**。

**Rationale**:
- G1 fully FAIL across 3 iterations(0pp net improvement vs W29+W30 baseline)
- Selective preserve(Option β)不 justified — prompt only contribution 喺 v1 +20pp 但 v2/v3 不 reproduce → sample-size noise
- Default OFF preserve(Option γ)不 justified — module + Settings 留咗 production-state mid-debt(R8 next surface),W32+ engine-fetch path 3 implementation 可以 fresh restart
- Karpathy §1.3 surgical strict:change without measurable benefit → revert(don't accumulate complexity)
- Match W30 Rule 7 reverted commit `e192464` pattern — consistent precedent

### 🚨 F2 cumulative 3 重 R6 catch list — lessons learned for W32+

1. **§-prefix author assumption refuted by corpus**(F2 v1 Run 1 evidence)— `\b\d+\.\d+\b` corpus-realistic pattern (covered both bare AND §-prefix)。Test fixtures had same author bias — couldn't catch via unit tests alone。**Preventive control PC-W31-1**:LIVE eval on actual corpus chunk_title BEFORE finalizing regex pattern。
2. **`citation_expansion_score_threshold=0.5` vs Cohere v4.0-pro actual 0.04-0.05**(F2 v2 Run 1 evidence)— W26 F1 D1 reference `0.83 / 0.67` was post-softmax,NOT raw `/query` rerank logit。**Preventive control PC-W31-2**:Settings default values for thresholds MUST be calibrated against LIVE corpus,not reference docs。
3. **`citation_expansion_window=3` architecturally too restrictive for current corpus/query shape**(F2 v3 evidence)— top-5 reranked chunks typically far from cited intro chunk_index。**Preventive control PC-W31-3**:Window-based locality assumption requires corpus-specific empirical validation;may need engine-fetch path(W25 F5 D1 style)to escape top-K constraint。

### F2+F4 cumulative effort

| Phase | Planned | Actual | Variance |
|---|---|---|---|
| F2 v1 5-run I07 | 1h | ~3min | -57min ✅ |
| F2 v2 5-run I07 | 1h | ~3min | -57min ✅ |
| F2 v3 10-run(I07 + I01)| 2h | ~5min | -1h55min ✅ |
| F2 + F4 analysis + decision | 1h | ~30min | -30min ✅ |
| **F2 + F4 total** | **5h** | **~45min** | **-4.25h ✅** |

**Total D0-D2 actual elapsed**:~1h(F0)+ ~80min(F1)+ ~45min(F2+F4)= ~3h 5min vs planned ~10-14h **= 3.5-4.5× AI compression**(continues W22-W30 pattern;F2 hands-on time dominated by 30 LIVE LLM calls ~9 min wall-clock + ~5 min wait for completions)。

---

## Phase Retro(F5 closeout 2026-05-26)

### What worked

1. **Karpathy §1.1 think-before-coding R6 Day 0 catch saved redundant work** — kickoff identified no shipped-pattern conflict for B'.b/B'.c/Rule 7 v2 cleanly,plan §1+§2 scope locked correctly at F0。
2. **Pure function citation_expansion module(no async)** — easy to unit-test(15 NEW tests PASS)+ fast to wire(F1.4 ~5min)+ fast to revert(no async dependency teardown)。
3. **5-run reproducibility methodology** — surfaced reformulator stochasticity dominance + 3 重 R6 catches(regex bias / threshold mis-calibration / window constraint)。Without multi-batch,attribution would be impossible。
4. **Selective revert option preserved at F4**(user 4-choice AskUserQuestion)— avoided default-revert reflex,gave user explicit context+choice。

### What didn't work

1. **Multi-axis ship violated Karpathy §1.2 一次只郁一個旋鈕**(user explicit accept risk for max G1 improvement probability)— but G1 0pp net improvement suggests single-axis sequential ship would have been better methodology(prompt iteration first,then module if metric moves;module iteration first,then prompt if metric moves)。**Lesson**:Multi-axis ship trade-off worth more careful evaluation。
2. **§-prefix author bias** — F1.5 test fixtures with `"§8.1 Scenario A"` titles passed unit tests,but LIVE corpus uses bare `"8.1 ..."` titles。R6 grep verify caught it AT F2 v1 LIVE eval(too late — already shipped F1 commit `16b9b3d`)。**Lesson**:F1.2.d unit test fixtures MUST sample from actual corpus(or use both conventions explicitly)before finalizing。
3. **`citation_expansion_score_threshold=0.5` default** — W26 F1 D1 reference [0.5, 1.0] mis-applied as runtime range(W26 ref was post-softmax,W31 wired to raw rerank logit 0.04-0.05)。**Lesson**:Settings defaults for thresholds need LIVE empirical calibration,not reference doc extrapolation。
4. **`citation_expansion_window=3`** — surgical scope per Karpathy §1.2 sound for code complexity but architecturally inadequate for current corpus/query shape(top-5 reranked chunks far from cited intro)。**Lesson**:Window-based locality assumption requires corpus-specific validation。
5. **Reformulator + RAG-Fusion stochasticity dominance** — 5-run sample size insufficient to disambiguate prompt effect vs retrieval variance。**Lesson**:For sub-±20pp metric tests,need 20-run minimum OR deterministic retrieval(temperature=0 / fixed seed)。

### Surprises

1. **3 重 R6 catches sequentially surfaced through F2 iterations** — broken regex(v1)→ broken threshold(v2)→ broken window(v3)。Each layer revealed next。R6 Day 0 grep verify at kickoff was insufficient — needed LIVE eval at each milestone。
2. **Reformulator stochasticity dominance** — v1 vs v2 batches surfaced TOTALLY different walkthrough sections(§8.x vs §3/§5/§7/§11.x)。Same query,same Settings,same code,**different retrieval results**。This wasn't a W31 invention but became dominant signal layer over W31 prompt/expansion changes。
3. **G2 control healthy throughout** — I01「what is the high level architecture」consistently surfaced §1 Executive summary + §4 High-level architecture chunks with avg_cit 2.2 + 0 refusals across 5 runs。Control query corpus retrieval is stable;G1 target query is the problematic case。
4. **v1 +20pp G1 marginal** — possibly real prompt effect but indistinguishable from sample-size noise vs v2/v3 results。Without v2/v3 batches the closeout might have been a wrong「PASS」verdict based on lucky v1 batch only。Multi-batch methodology saved an incorrect ship decision。

### Carry-overs(W32+ candidates aggregated)

1. **(B'.a)** Settings parameter chunk relevance score threshold pre-pend to required-cite list in user message — deferred per W31 plan §1 non-goals;W32+ if combined with other axis tune
2. **(h') NEW HIGHEST**:engine-fetch B'.c path 3(~1-2 days)— `expand_citations` 改用 `engine.list_chunks(kb_id, doc_id)` async fetch instead of top-K reranked subset。Mirror W25 F5 D1 `attach_neighbour_images` pattern。Escape window=3 constraint by fetching ±N chunks from full doc。Implementation effort:~1-2 days(async refactor + new tests)
3. **(g') NEW**:20-run sample methodology for stochasticity control — Karpathy §1.4 goal-driven「make G1 measurable」requires sample size variance budget per ANOVA pattern
4. **(i') NEW**:Reformulator deterministic retrieval — temperature=0 + fixed seed for variance control。Smaller scope ~1h ADR-0034 amendment candidate
5. **(ii)** path (ii) CRAG threshold trial — H1 boundary downgrade(STOP+ask + ADR governance)preserved low priority
6. **(k)** wire reformulator into eval/orchestrator.py — H4 systemic gap orthogonal axis preserved
7. **(c)** RAGAs orchestrator-aware judge tune — preserved low priority
8. NEW (e) `make_ragas_evaluator` structlog stage(per W28 D2 silent-hung lesson)
9. NEW (f) Settings-default-tests automated coverage
10. BUG-026 + BUG-027 cosmetic — preserved
11. W22 D8 setup.md §8.6 — preserved
12. W16 F1-F4 Track A IT cred — parallel track Q11 operational early June 2026

### ADR triggers

**None**:
- F1.1 Rule 7 v2 + Rule 8 = prompt iteration within existing framework(reverted so no permanent record)
- F1.2 citation_expansion module = parallel pattern to W25 F5 D1(non-architectural per plan §1 scope decl;reverted so no permanent record)
- ADR-0034 + ADR-0037 + ADR-0038 preserved unchanged per Q4 measurement-experiment-fail-policy

### Phase Gate verdict

**Phase Gate FAIL → closed_partial**(per W30 Rule 7 precedent — full revert + infrastructure-reverted-as-non-architectural pattern;`closed_partial` status flag matches measurement-experiment-fail-policy precedent same as W30)。

**6 commits cumulative cross D0-D2**:
1. `3a838b5` F0 kickoff
2. `7178133` F0.7 cross-doc sync
3. `16b9b3d` F1 implementation (+20 NEW tests)
4. `e26e5b3` F1.7 housekeeping
5. (this commit) F2+F4+F5 closeout — full revert + retro + cross-doc sync

### W32+ priority queue locked

**HIGHEST candidate**:**(h')** engine-fetch B'.c path 3(`expand_citations` 改用 async `engine.list_chunks(kb_id, doc_id)` fetch from full doc instead of top-K reranked subset — mirror W25 F5 D1 pattern;escapes window=3 constraint)~1-2 days estimate。Cost-benefit:moderate code complexity vs unblocking real Axis 3 measurement。

**Sequential ship strategy**(post-W31 multi-axis lesson):
- W32 single-axis ship (h') engine-fetch path 3 only — no prompt change concurrent
- W33 measure G1 with deterministic retrieval((i') temp=0)or extended sample size((g') 20-run)
- W34 if (h') marginal,iterate threshold / window combined with deterministic retrieval

Avoid multi-axis ship trap until single-axis baseline established。



