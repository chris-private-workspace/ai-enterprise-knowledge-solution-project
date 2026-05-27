---
phase: W40-deboost-refinement-batch
plan_ref: ./plan.md
status: closed   # F4 收尾 2026-05-27 — Phase Gate PASS outcome (a) per Chris pick
last_updated: 2026-05-27
---

# W40 — Checklist

> 原子化勾選項。雙目標 sequential ship — F1 anchor-prefix length-mismatch fix(W39 insight 2)→ F2 Cohere overfetch fix(W39 insight 1)→ F3 LIVE verify(optional via Free tier workaround)→ F4 closeout。

## F0 — 啟動

- [x] F0.1 建立 `docs/01-planning/W40-deboost-refinement-batch/` folder
- [x] F0.2 R6 Day 0 6 catches — (1) `retrieval_engine.py:172-176` anchor_prefix silent truncate confirmed;(2) `retrieval_engine.py:160-162` reranker.rerank top_k fixed-pass confirmed;(3) existing test gap anchor=['Doc','§8'] length 2 mismatch corpus;(4) F2 Setting naming distinction `reranker_overfetch_multiplier` vs `hybrid_overfetch_for_rerank`;(5) `server.py:156-163` wire path verified;(6) `.env` REVERTED 2026-05-27 production preserve invariant
- [x] F0.3 起草 `plan.md` 7 段
- [x] F0.4 起草 `checklist.md`(本文件)
- [x] F0.5 起草 `progress.md` Day 0
- [x] F0.6 啟動 commit `5d491cd`
- [x] F0.7 session-start.md §10 W40 row append active 2026-05-27 + W40+ → W41+ placeholder rename(commit `db1c305`)

## F1 — Anchor-prefix length-mismatch fix(~30min)— ✅ 完成

### F1.1 Code change `retrieval_engine.py` — ✅

- [x] F1.1.a 修改 line 176 `anchor_prefix = list(anchor_sp[:depth])` → 加 `effective_depth = min(depth, len(anchor_sp))` + `anchor_prefix = list(anchor_sp[:effective_depth])`
- [x] F1.1.b 修改 line 185 cand_prefix slice 用 effective_depth replace depth
- [x] F1.1.c 更新 observability log line 200-206 加 `effective_depth` field 對 anchor_prefix scope 顯式可追溯

### F1.2 NEW unit tests — ✅

- [x] F1.2.a NEW test `test_w40_f1_anchor_shorter_than_depth_hierarchical_zoom_preserved`:anchor 用 corpus shape `['8. Integration scenarios...']` length 1 + cand_a `['8. Integration scenarios...', '8.1 Scenario A...']` + cand_b `['7. Integration patterns...', '7.9 Docuware']` + depth=2 + deboost=0.85 → cand_a score preserved(zoom-in)+ cand_b deboosted(cross-chapter)
- [x] F1.2.b NEW test `test_w40_f1_anchor_empty_section_path_no_deboost_defensive`:anchor `[]` + cand any + depth=2 + deboost=0.85 → all candidates preserve(effective_depth=0,defensive no-op)

### F1.3 Verify — ✅

- [x] F1.3.a backend pytest **1101 PASS** + 0 failed(W40 F1 2 NEW + W39 F2 mock fix 6 reclaimed)
- [x] F1.3.b ruff PASS(W40 F1 specific edits — `retrieval_engine.py` + `test_retrieval.py` + 3 mock fix files)
- [x] F1.3.c mypy strict W40 F1 specific edits self-clean(13 pre-existing scope-out per Karpathy §1.3,W38 F2 precedent)

### F1.4 Commit — ✅

- [x] F1.4.a commit `bca7446` — `fix(retrieval): W40 F1 anchor-prefix length-mismatch — effective_depth = min(depth, len(anchor_sp)) preserve hierarchical zoom-in when anchor shorter than depth + 2 NEW unit tests + W39 F2 pre-existing test mock gap fix (mode kwarg propagation)`
- [x] F1.4.b BONUS — W39 F2 pre-existing test mock gap fix included (per W23 不希望累積債務 + Karpathy §1.3 surgical adjacent mess);6 previously failing tests reclaimed:test_observe_query_route.py 3 + test_e1_e5_e12_smoke.py 3

## F2 — Cohere overfetch fix(~1h)— ✅ 完成

### F2.1 Settings NEW knob — ✅

- [x] F2.1.a `storage/settings.py` 加 NEW field `reranker_overfetch_multiplier: int = 1` 位於 line 304 `reranker_section_path_prefix_depth` 之下(W38 block extension)
- [x] F2.1.b Comment block 解 distinction:multiplier on reranker output(W40 NEW)vs `hybrid_overfetch_for_rerank=50` absolute hybrid pre-rerank fetch(W3 baseline)+ default 1 disabled preserve W38 baseline + W41+ ramp guidance(multiplier=4 + deboost=0.85 combo recommended once Azure billing resolved)

### F2.2 RetrievalEngine init param — ✅

- [x] F2.2.a `retrieval_engine.py:__init__` add `reranker_overfetch_multiplier: int = 1` keyword param
- [x] F2.2.b store `self._reranker_overfetch_multiplier = reranker_overfetch_multiplier`

### F2.3 Rerank call site refinement — ✅

- [x] F2.3.a `retrieval_engine.py:158-167` rerank_top_k = top_k default + 若 deboost active + multiplier > 1 overwrite to top_k * multiplier + pass `top_k=rerank_top_k`
- [x] F2.3.b 注意 Cohere v4.0-pro `top_n=min(top_k, len(candidates))` 已 self-cap to fetch_k=50,無 overflow risk

### F2.4 Post-deboost truncate — ✅

- [x] F2.4.a `retrieval_engine.py:215-219` 加 truncate — 喺 `chunks = [RetrievedChunk(...) for r in reranked_chunks]` 之後 加 `chunks = chunks[:top_k]` 確保 final result top_k items invariant
- [x] F2.4.b `else` branch(no reranker case)line 222-225 維持 `hits[:top_k]` 不變
- [x] F2.4.c 更新 observability log line 232-238 加 `rerank_top_k` field

### F2.5 Server.py wire — ✅

- [x] F2.5.a `api/server.py:156-164` 加一行 `reranker_overfetch_multiplier=settings.reranker_overfetch_multiplier,`

### F2.6 NEW unit tests — ✅

- [x] F2.6.a NEW test `test_w40_f2_overfetch_multiplier_default_no_op`:multiplier=1 + deboost=0.85 → reranker.rerank call_args.kwargs["top_k"] == 5(spy)
- [x] F2.6.b NEW test `test_w40_f2_overfetch_multiplier_disabled_with_deboost_disabled`:multiplier=4 + deboost=1.0(disabled)→ reranker.rerank top_k=5(deboost gate inactive,multiplier dormant)
- [x] F2.6.c NEW test `test_w40_f2_overfetch_multiplier_with_deboost_swap_in_same_section`:multiplier=4 + deboost=0.85 + 6 candidates simulated overfetch return + top_k=3 → rerank call_args top_k=12 + xs scores deboosted
- [x] F2.6.d BONUS NEW test `test_w40_f2_overfetch_aggressive_deboost_swap_in_same_section_dominates`:aggressive deboost=0.5 → same-section overfetched candidates 從 positions 5-6 swap-in top-3 → `[anchor, same_pos5, same_pos6]` evidence ⭐
- [x] F2.6.e NEW test `test_w40_f2_overfetch_truncate_to_top_k_invariant`:multiplier=4 + reranker returns 12 RerankedChunk + top_k=3 → final chunks count exactly 3(truncate invariant)

### F2.7 Verify — ✅

- [x] F2.7.a backend pytest 1101 → **1106 PASS** + 0 failed(5 NEW tests:F2.6.a-e)
- [x] F2.7.b ruff PASS(W40 F2 specific edits — settings.py + retrieval_engine.py + test_retrieval.py;api/server.py 30 E402 pre-existing truststore pattern NOT W40 F2 regression)
- [x] F2.7.c mypy strict W40 F2 specific edits self-clean

### F2.8 Commit — ✅

- [x] F2.8.a commit `ca025cc` — `feat(retrieval): W40 F2 Cohere overfetch + truncate — reranker_overfetch_multiplier Settings knob + rerank with top_k * multiplier when deboost active + post-deboost truncate to top_k invariant + 5 NEW unit tests`

## F3 — LIVE verify — 🚧 SKIPPED per Chris pick(per W36 operational debt batch precedent + Karpathy §1.4 unit test sufficient verification for pure algorithmic refinement default disabled)

- [x] 🚧 F3 SKIPPED — preserved 為 W41+ HIGHEST candidate alongside hybrid mode billing-resolved re-verify(Free tier mode=vector workaround 可隨時 trigger,no production code change required)

## F4 — 收尾 + 跨文件同步 + commit + push

### A. 跨文件同步 — ✅ 完成

- [x] A.1 plan.md frontmatter status `active → closed` Phase Gate PASS outcome (a)
- [x] A.2 checklist.md cross-cutting tick(本文件)
- [x] A.3 progress.md retro 7 段(F4 closeout commit pending)
- [x] A.4 session-start.md §10 W40 row `🟡 active` → `✅ closed`(F4 closeout commit pending)
- [x] A.5 `.env` clean preserved(F3 NOT triggered,marker block 從未加 — per W36 operational batch precedent skip LIVE)
- [x] A.6 F1 + F2 production code preserved as W41+ enabler(對齊 W37 F1 + W38 F2 + W39 F2 production preserve pattern)
- [x] A.7 🚧 RISK_REGISTER R-W38-1 update DEFERRED W41+(Azure billing IT-side still environmental block;W40 F1+F2 production code preserved as enabler;W41+ HIGHEST hybrid mode billing-resolved re-verify candidate locked)
- [x] A.8 ADR README — 無 NEW ADR(F1+F2 純 algorithmic refinement per H1 non-architectural,延續 W38 commit cea024f H1 verdict + ADR-0035 W25 D2 reference)

### B. W41+ priority queue 評估 — ✅ 完成

- [x] B.1 W41+ HIGHEST preserved:**Hybrid mode billing-resolved re-verify**(isolate true W38 F2 + W40 F1+F2 deboost effect without mode=vector conflate — Azure billing IT-side action gate;唯一可分離 hybrid mode contribution vs vector mode conflate 嘅 path)
- [x] B.2 W41+ HIGHEST NEW promoted:**F3 LIVE Free tier workaround**(W40 SKIPPED,can re-trigger anytime via mode=vector .env temporary enable;~30-45min effort;provide swap-in mechanism evidence + 2 architectural insights closure验证)
- [x] B.3 W41+ MEDIUM preserved:`\b\d+\.\d+\b` regex relax for `_find_neighbour_chunks`
- [x] B.4 W41+ LOW preserved:Ghost-Python-3.12 restart investigate(W37+W38+W39 重現 3 次)
- [x] B.5 Long-term carry-over 維持:Q14 SME-validate reference_answer cascade + (c)/(e)/(f) BUG-026+027 cosmetic + W22 D8 setup.md §8.6 + W16 F1-F4 Track A IT cred 平行軌道
- [x] B.6 永久 OUT path (a) judge LLM 升級 per memory `feedback_judge_llm_cost_policy.md`

### C. commit + push

- [ ] C.1 F4 收尾 commit `docs(planning): W40 closeout — F1 anchor-prefix length-mismatch fix (insight 2) + F2 Cohere overfetch + truncate (insight 1) landed F3 LIVE SKIPPED per W36 precedent Phase Gate PASS outcome (a)`
- [ ] C.2 push origin/main confirmed

---

## Cross-Cutting

- [x] All deliverables committed to git(F4 closeout commit pending — A-F4.C.1)
- [x] All OQ status changes 反映於 decision-form.md — 無 OQ 變動
- [x] All architectural-adjacent decisions documented as ADR — N/A(F1+F2 純 algorithmic refinement,non-architectural per H1)
- [x] progress.md retro section 寫好 7 段 per F4 closeout
- [x] progress.md frontmatter status flipped per outcome(closed)
- [x] Phase W41+ kickoff trigger 標記於 retro(W41+ HIGHEST 2 candidates promoted)

---

**Lifecycle reminder**:本 checklist 隨 plan deliverables 衍生。
