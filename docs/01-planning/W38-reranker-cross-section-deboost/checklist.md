---
phase: W38-reranker-cross-section-deboost
plan_ref: ./plan.md
status: active   # F0 啟動 2026-05-27
last_updated: 2026-05-27
---

# W38 — Checklist

> 原子化勾選項(每項 ≤ 1-2 小時工時)。W38 雙目標 atomic batch:F1 LOW housekeeping(procedural) + F2 Reranker cross-section deboost(C04 internal algorithm)— Karpathy §1.3 surgical separation,housekeeping 先做 clean baseline 後 LIVE eval attribution clean。

## F0 — 啟動(plan + checklist + progress + R6 grep 驗證 + session-start sync)

- [x] F0.1 建立 `docs/01-planning/W38-reranker-cross-section-deboost/` folder
- [x] F0.2 R6 Day 0 recursive grep 驗證 — **6 catches surfaced**:(1) `retrieval_engine.py:151-166` post-rerank insertion point confirmed Cohere v4.0-pro `reranked_chunks` shape preserves section_path field;(2) W37 drift metric over-flagged hierarchical zoom-in as drift(Run 4「8.4 Scenario D」屬 §8 family valid zoom NOT cross-section);(3) I01 control 多 section drift 屬 query nature(「what is high level architecture」覆蓋 §1+§3+§4)NOT bug;(4) Ruff 13 issues(9 W33-W35 + 4 W37 = exceeded W37 estimate 8 by 5);(5) PC-W33-1 already resolved by W36 PC-W34-1 ship per `CLAUDE.md §10.3 line 533` cite;(6) `api/server.py:343-360` BUG-008 Windows ProactorEventLoop fix 同 reload=True 互動未測試 → preserve current pattern
- [x] F0.3 起草 `plan.md` 7 段
- [x] F0.4 起草 `checklist.md`(本文件)
- [x] F0.5 起草 `progress.md` Day 0
- [ ] F0.6 啟動 commit `docs(planning): kickoff W38-reranker-cross-section-deboost + R6 Day 0 6 catches surface reranker filter insertion point + W37 drift metric over-flag + nuanced design`
- [ ] F0.7 session-start.md §10 W38 row append `🟡 active 2026-05-27` + W38+ → W39+ placeholder rename + W37 closed_partial 維持

## F1 — LOW housekeeping batch(~30min)

### F1.1 Ruff `--fix` apply

- [ ] F1.1.a Run `ruff check --fix --unsafe-fixes` on `backend/w*-f*-runner.py backend/w*_*.py`
- [ ] F1.1.b Verify 13 errors → 0(`ruff check` clean post-fix)
- [ ] F1.1.c `git diff` review — F541 cosmetic strip + F401 unused import remove + F841 unused variable remove(無 logic change)

### F1.2 PC-W32-1 documentation

- [ ] F1.2.a 讀 `backend/api/server.py:343-360` Server.serve() pattern + BUG-008 Windows ProactorEventLoop fix
- [ ] F1.2.b Comment block 加 W38 amendment note — no `reload=True` preserved rationale(WatchFiles auto-reload vs explicit kill+restart discipline tradeoff;W36 PC-W34-1 step 5b protocol covers explicit kill verification path)
- [ ] F1.2.c PC-W32-1 status flip pending → documented(non-fix decision per H1-adjacent risk)

### F1.3 PC-W32-2 documentation

- [ ] F1.3.a 讀 `backend/generation/citation_expansion.py` module docstring
- [ ] F1.3.b 加「integration pattern note」section(W32 F1.8 lesson — module-level changes affecting citation pipeline must explicitly propagate via SynthesisResult fields,build_citations Rule 5 contract preservation)
- [ ] F1.3.c PC-W32-2 status flip pending → documented

### F1.4 PC-W33-1 status reconcile

- [ ] F1.4.a `CLAUDE.md §10.3` line 533 cite confirmed「per PC-W33-1 + PC-W34-1」— W36 ship implicit resolution
- [ ] F1.4.b W38 retro 記錄 PC-W33-1 RESOLVED via W36 PC-W34-1;Azurite extension OPTIONAL deferred(non-eval-pipeline-critical)
- [ ] F1.4.c session-start.md / RISK_REGISTER PC-W33-1 status update(若有)

### F1.5 驗證 + commit

- [ ] F1.5.a backend pytest 1091 PASS preserve(F1 唔改 production code,純 runner + doc edits)
- [ ] F1.5.b `ruff check backend/w*-f*-runner.py backend/w*_*.py` 13 → 0 clean
- [ ] F1.5.c commit `chore(tooling): W38 F1 LOW housekeeping batch — ruff 13 fix + PC-W32-1 reload=True rationale doc + PC-W32-2 citation integration pattern note + PC-W33-1 reconcile resolved-via-W36`

## F2 — Reranker cross-section deboost implementation(~1.5h)

### F2.1 Settings NEW knobs

- [ ] F2.1.a `backend/storage/settings.py` 加 NEW field `reranker_cross_section_deboost: float = 1.0` + comment block(per ADR-0035 W25 symmetric pattern reference;0.85 typical 15% penalty;default disabled)
- [ ] F2.1.b 加 NEW field `reranker_section_path_prefix_depth: int = 2` + comment block(top + sub-level required;1 = single-doc no-op,3 = strict subsection)
- [ ] F2.1.c Naming convention 對齊 `reranker_*` family(`reranker_kind` 已存 W3 baseline)

### F2.2 `retrieval/retrieval_engine.py:151-166` post-rerank loop

- [ ] F2.2.a 讀 `retrieval_engine.py:130-192` 確認 insertion point(post-rerank,pre-RetrievedChunk transformation)
- [ ] F2.2.b 加 deboost loop(per plan §2 F2.2 code spec)— anchor = `reranked_chunks[0].fields.section_path[:depth]`,逐個 candidate match,mismatch 則 `rerank_score *= deboost_factor`
- [ ] F2.2.c Re-sort `reranked_chunks` by `rerank_score` descending post-deboost
- [ ] F2.2.d Defensive — anchor_sp 不是 list / cand_sp 不是 list → fall back skip(preserve rank)
- [ ] F2.2.e Observability — `reranker_cross_section_deboost_applied` log event(anchor_prefix + depth + deboost_factor + deboost_count + total_candidates)

### F2.3 NEW unit tests(~5 個)

- [ ] F2.3.a `test_w38_reranker_deboost_disabled_default_no_op`(deboost=1.0 → unchanged)
- [ ] F2.3.b `test_w38_reranker_deboost_cross_section_score_reduced`(anchor §8 + 候選 §11 → score × 0.85)
- [ ] F2.3.c `test_w38_reranker_deboost_same_section_preserved`(anchor §8 + 候選 §8.4 hierarchical zoom-in → score 不變)
- [ ] F2.3.d `test_w38_reranker_deboost_re_sort_invariant`(deboost 後 sort 確認 rank_score descending)
- [ ] F2.3.e `test_w38_reranker_deboost_malformed_section_path_defensive`(候選 `section_path` 不是 list → 跳過 preserve rank)

### F2.4 驗證 + commit

- [ ] F2.4.a backend pytest 1091 → 1096+(+5 NEW W38 tests minimum)
- [ ] F2.4.b ruff PASS(W38 specific edits + F1.1 housekeeping clean)
- [ ] F2.4.c mypy strict W38 files self-clean(retrieval_engine.py + settings.py)
- [ ] F2.4.d commit `feat(retrieval): W38 F2 reranker post-rerank cross-section deboost — symmetric pattern per ADR-0035 + Settings 2 NEW knobs + 5 NEW unit tests + observability log`

## F3 — LIVE 5+5 verification(~1h)

### F3.1 Pre-flight per CLAUDE.md §10.3 step 5b

- [ ] F3.1.a Langfuse `/api/public/health` 200
- [ ] F3.1.b Postgres `SELECT 1` 1 row ready_for_query

### F3.2 `.env` temporary override

- [ ] F3.2.a `.env` 加 marker block `# --- W38 F3 TEMPORARY override 2026-05-27 — reranker cross-section deboost LIVE test ---`
- [ ] F3.2.b `RERANKER_CROSS_SECTION_DEBOOST=0.85`
- [ ] F3.2.c `RERANKER_SECTION_PATH_PREFIX_DEPTH=2`

### F3.3 Backend explicit kill + restart

- [ ] F3.3.a Kill existing uvicorn process(Stop-Process via `Get-WmiObject Win32_Process` CommandLine filter)
- [ ] F3.3.b Restart `python -m api.server`(per ADR-0023 + `api/server.py:343` SelectorEventLoop fix)
- [ ] F3.3.c Verify `/health` 200 + Settings override loaded post-first-query(Langfuse trace `reranker_cross_section_deboost_applied` event firing)

### F3.4 5+5 LIVE runs + nuanced drift metric

- [ ] F3.4.a 寫 `backend/w38-f3-runner.py`(複用 W37 F2 pattern + NEW `real_cross_section_drift_count` + `valid_hierarchical_zoom_count` metrics)
- [ ] F3.4.b Run `python w38-f3-runner.py` — 5 runs Q-W25-I07 + 5 runs Q-W25-I01 control
- [ ] F3.4.c Aggregate metrics — citation_count + real_cross_section_drift + hierarchical_zoom + latency + refusals
- [ ] F3.4.d W37 vs W38 cross-comparison summary

### F3.5 Decision tree intersect

- [ ] F3.5.a **G1a strict** refusals 0/5 + I07 avg_cit ≥ 4.8(W35 maintain)— PASS/FAIL
- [ ] F3.5.b **G1b real drift reduce** I07 `real_cross_section_drift_count` ≤ 1(goal)OR = 0(stretch)
- [ ] F3.5.c **G2 control** I01 refusals 0/5 + avg_cit ≥ 3.5
- [ ] F3.5.d **G3 latency** F3 5-run avg within W35 +20% budget
- [ ] F3.5.e **G4 R6 6 catches verified** + Day 1 active flip
- [ ] F3.5.f **G5 pytest 1096+ + ruff PASS + mypy strict** preserve
- [ ] F3.5.g Decide outcome — (a) PASS / (b) PARTIAL / (c) FAIL

## F4 — 收尾 + 跨文件同步 + commit + push

### A. 跨文件同步 per CLAUDE.md §10 R3 + R5 + R6

- [ ] plan.md frontmatter `status: active → closed OR closed_partial`(per F3 outcome)
- [ ] checklist.md cross-cutting tick + N/A reason(本文件)
- [ ] progress.md retro 7 段(What Worked / What Didn't / Carry-overs / ADR Triggers / Phase Gate Result / W39+ Priority Queue Locked / Actual vs Planned Effort)
- [ ] session-start.md §10 W38 row `🟡 active` → `✅ closed`(F4 commit time)
- [ ] `.env` 移除 W38 F3 marker block(per W27/W29 pattern;production preserve default 1.0)
- [ ] 🚧 RISK_REGISTER NEW R 候選 — DEFERRED W39+ OR N/A per F3 outcome
- [ ] ADR README — 無 NEW ADR(F1+F2 純 internal logic / procedural,non-architectural per H1)

### B. W39+ priority queue 評估

- [ ] B.1 W39+ 候選 promotion per F3 outcome
- [ ] B.2 W37 F1 infrastructure `_find_neighbour_chunks` section_path filter preserved enabler(W37 F2 G1b goal PASS evidence)
- [ ] B.3 `\b\d+\.\d+\b` regex relax preserved MEDIUM
- [ ] B.4 W38 F2 reranker deboost infrastructure preserved enabler if F3 outcome (b) PARTIAL
- [ ] B.5 8 個 pre-existing ruff issues NOW RESOLVED via F1.1(removed W39+ queue)
- [ ] B.6 PC-W32-1 + PC-W32-2 + PC-W33-1 status reconciled F1.2-F1.4(removed W39+ queue)
- [ ] B.7 Q14 SME-validate reference_answer cascade — LONG-TERM
- [ ] B.8 永久 OUT path (a) judge LLM 升級 per memory feedback_judge_llm_cost_policy.md
- [ ] B.9 長期 carry-over(c)(e)(f)/BUG-026+027/W22 D8/W16 F1-F4 Track A IT cred 維持

### C. commit + push

- [ ] F4 收尾 commit `docs(planning): W38 closeout — reranker cross-section deboost <outcome verdict> + F1 housekeeping batch ship`
- [ ] push origin/main confirmed

---

## Cross-Cutting

- [ ] All deliverables committed to git
- [ ] All OQ status changes 反映於 `docs/decision-form.md` — 預期無 OQ 變動
- [ ] All architectural-adjacent decisions documented as ADR — N/A(F1+F2 非 architectural per H1)
- [ ] `progress.md` retro section 寫好 — 7 段 per F4 closeout
- [ ] `progress.md` frontmatter status flipped per outcome
- [ ] Phase W39+ kickoff trigger 標記於 retro — candidates list update per F3 outcome

---

**Lifecycle reminder**:本 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog 然後再加 checklist item。
