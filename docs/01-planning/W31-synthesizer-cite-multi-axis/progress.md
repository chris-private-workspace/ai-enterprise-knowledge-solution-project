---
phase: W31-synthesizer-cite-multi-axis
status: active
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
- **F0.6** Commit kickoff `docs(planning): kickoff W31-synthesizer-cite-multi-axis + R6 Day 0 no-shipped-pattern confirm + (B'.b + B'.c + Rule 7 v2) multi-axis subset pick`(next action)
- **F0.7** session-start.md §10 W31 row append + W32+ rolling JIT row defer + W30 row 維持 closed_partial(post-F0.6 commit)
- **D1** start:F1 implementation cascade(prompt + module + Settings + wire + tests)

### Day 0 Actual vs Planned Effort table

| Deliverable | Planned | Actual | Variance |
|---|---|---|---|
| F0.1 folder create | 5min | ~2min | -3min (Write tool fast) |
| F0.2 R6 grep verify | 15-30min | ~10min(3 parallel Read + git status)| -10min ✅ |
| F0.3 plan.md draft | 45-60min | ~20min | -25-40min(Write tool one-shot vs incremental edit)|
| F0.4 checklist.md draft | 20-30min | ~10min | -10-20min ✅ |
| F0.5 progress.md Day 0 | 20-30min | ~15min | -5-15min ✅ |
| F0.6 commit kickoff | 5min | pending | — |
| F0.7 session-start.md sync | 10min | pending | — |

**Cumulative F0 actual**:~1h pre-commit + ~10min post-commit cross-doc sync expected;同 W30 F0 ~1.2h pattern parallel,~10% efficiency 提升 due to 4th-iteration template re-use(W27 → W28 → W29 → W30 → W31 5-phase compounding)。

---
