---
phase: W41-w40-f3-live-evidence-free-tier-workaround
plan_ref: ./plan.md
status: active
last_updated: 2026-05-28
---

# W41 — Checklist

> 原子化勾選項。LIVE evidence collection via Free tier mode=vector workaround — F1 LIVE Path A workflow + F2 closeout per Q4 measurement-experiment-fail-policy。

## F0 — 啟動

- [x] F0.1 建立 `docs/01-planning/W41-w40-f3-live-evidence-free-tier-workaround/` folder
- [x] F0.2 R6 Day 0 6 catches — (1) `.env` clean state confirmed;(2) w39-f2-patha-runner.py reusable template + utf-8 + queries + body mode field;(3) W40 F2 `rerank_top_k` + W40 F1 `effective_depth` NEW log fields;(4) 3 knobs combo gate requirement;(5) Ghost-Python restart pattern preserved;(6) Free tier mode=vector caveat preserved
- [x] F0.3 起草 `plan.md` 6 段
- [x] F0.4 起草 `checklist.md`(本文件)
- [x] F0.5 起草 `progress.md` Day 0
- [ ] F0.6 啟動 commit `docs(planning): kickoff W41-w40-f3-live-evidence-free-tier-workaround + R6 Day 0 6 catches surface W40 F3 LIVE SKIPPED 兌現 via reuse W39 Path A pattern + W40 F1+F2 log inspection helper`
- [ ] F0.7 session-start.md §10 W41 row append active 2026-05-28 + W41+ → W42+ placeholder rename(commit pending)

## F1 — LIVE Path A workflow(~30-45min)

### F1.1 Pre-flight per CLAUDE.md §10.3 step 5b

- [ ] F1.1.a Langfuse `/api/public/health` 200 OK
- [ ] F1.1.b Postgres `SELECT 1` ready_for_query

### F1.2 `.env` temporary override

- [ ] F1.2.a `.env` 加 marker block W41 F1 TEMPORARY
- [ ] F1.2.b `RERANKER_CROSS_SECTION_DEBOOST=0.85`
- [ ] F1.2.c `RERANKER_SECTION_PATH_PREFIX_DEPTH=2`
- [ ] F1.2.d `RERANKER_OVERFETCH_MULTIPLIER=4`

### F1.3 Backend kill + restart per W37/W38/W39/W40 ghost-Python pattern

- [ ] F1.3.a Kill api.server PID via WMI CommandLine filter
- [ ] F1.3.b Restart `python -m api.server` via bash & background spawn pattern recovery
- [ ] F1.3.c `/health` 200 within ~25s warmup

### F1.4 Sanity check

- [ ] F1.4.a Direct curl `POST /query` with `{"mode":"vector"}` body → HTTP 200 valid citation answer
- [ ] F1.4.b Backend log tail `reranker_cross_section_deboost_applied` event 確認 firing + `effective_depth` field present(W40 F1 verify)+ `rerank_top_k=20` in `retrieval_complete`(W40 F2 verify)

### F1.5 NEW runner ship

- [ ] F1.5.a `backend/w41-f1-runner.py` ship — copy w39-f2-patha-runner.py template + 加 log inspection helper(extract `effective_depth` + `rerank_top_k` + `deboost_count` from latest log.out)

### F1.6 LIVE 5+5

- [ ] F1.6.a 5 runs Q-W25-I07(walkthrough cite)mode=vector
- [ ] F1.6.b 5 runs Q-W25-I01(high-level architecture control)mode=vector
- [ ] F1.6.c Per-run JSON dump `backend/w41-f1-i07-run-{N}.json` + `backend/w41-f1-i01-run-{N}.json`

### F1.7 Aggregate

- [ ] F1.7.a `backend/w41-f1-aggregate.json` — I07 avg_lat + avg_cit + real_drift + refusals + I01 same metrics + vs W35 baseline + vs W39 F2 Path A baseline diff

### F1.8 Log inspection

- [ ] F1.8.a `effective_depth` field distribution(expected: 1 for chapter intro / 2 for sub-section)
- [ ] F1.8.b `rerank_top_k` field distribution(expected: 20 = 5 * 4 when active)
- [ ] F1.8.c `deboost_count` distribution per run(W40 F2 swap-in quantification)

### F1.9 Decision tree intersect per plan §2

- [ ] F1.9.a **G1 W40 F1 mechanism verify** — deboost event 10/10 firing + effective_depth field present + value reasonable
- [ ] F1.9.b **G2 W40 F2 mechanism verify** — rerank_top_k = 20 in 10/10 runs(top_k * multiplier active)
- [ ] F1.9.c **G3a cit count improve** — I07 avg_cit ≥ 4.5 marginal(or W35 baseline 4.8 full)or +25% vs W39 F2 Path A baseline 3.6
- [ ] F1.9.d **G3b cross-section drift preserve** — I07 avg drift ≤ W39 F2 Path A baseline 1.0
- [ ] F1.9.e **G4 control non-regression** — I01 refusals 0/5 + avg_cit ≥ 3.5

## F2 — 收尾 + 跨文件同步 + commit + push

### A. 跨文件同步

- [ ] A.1 plan.md frontmatter status `active → closed / closed_partial / closed_strong / inconclusive` 視 G1-G4 outcome
- [ ] A.2 checklist.md cross-cutting tick(本文件)
- [ ] A.3 progress.md retro 7 段
- [ ] A.4 session-start.md §10 W41 row `🟡 active` → `✅ closed*`
- [ ] A.5 `.env` REVERT W41 F1 marker block(per W37/W38/W39/W40 precedent — production preserve default 1.0/1 disabled)
- [ ] A.6 W40 F1+F2 production code preserved as W42+ enabler unchanged
- [ ] A.7 RISK_REGISTER R-W38-1 update — note W41 mode=vector conflate caveat still preserved;真正 hybrid mode evidence 仍 W42+ billing-resolved gate
- [ ] A.8 ADR README — 無 NEW ADR(F1 0-code-change measurement);若 G1+G2+G3 STRONG PASS outcome (a) → W42+ production default flip ADR-route candidate

### B. W42+ priority queue 評估

- [ ] B.1 W42+ HIGHEST preserved:Hybrid mode billing-resolved re-verify(Azure billing IT-side gate)
- [ ] B.2 W42+ NEW potential(若 G1+G2+G3 STRONG PASS):Production default flip ADR for W40 F1+F2 knobs(sequential per W26 PC1)
- [ ] B.3 W42+ MEDIUM preserved:`\b\d+\.\d+\b` regex relax for `_find_neighbour_chunks`
- [ ] B.4 W42+ LOW preserved:Ghost-Python-3.12 restart investigate(W37+W38+W39+W40+W41 重現 5 次累計)
- [ ] B.5 Long-term carry-over 維持
- [ ] B.6 永久 OUT path (a) judge LLM 升級 per memory

### C. commit + push

- [ ] C.1 F2 收尾 commit
- [ ] C.2 push origin/main confirmed

---

## Cross-Cutting

- [ ] All deliverables committed to git(F2 closeout commit pending)
- [ ] All OQ status changes 反映於 decision-form.md — 無 OQ 變動
- [ ] All architectural-adjacent decisions documented as ADR — N/A(F1 0-code-change measurement,non-architectural per H1;若 outcome (a) STRONG PASS trigger production flip → W42+ ADR-route at that time)
- [ ] progress.md retro section 寫好 7 段 per F2 closeout(pending)
- [ ] progress.md frontmatter status flipped per outcome
- [ ] Phase W42+ kickoff trigger 標記於 retro

---

**Lifecycle reminder**:本 checklist 隨 plan deliverables 衍生。
