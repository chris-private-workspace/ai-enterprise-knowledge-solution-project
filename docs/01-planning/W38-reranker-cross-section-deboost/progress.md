---
phase: W38-reranker-cross-section-deboost
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active   # F0 啟動 2026-05-27
last_updated: 2026-05-27
---

# W38 — Progress Log

## Day 0 — 2026-05-27 — F0 啟動

### 啟動行動

- ✅ F0.1 建立 `docs/01-planning/W38-reranker-cross-section-deboost/` folder
- ✅ F0.2 R6 Day 0 recursive grep 驗證 — 6 catches surfaced(per below)
- ✅ F0.3 起草 `plan.md` 7 段
- ✅ F0.4 起草 `checklist.md` 原子化勾選項
- ✅ F0.5 起草 `progress.md` Day 0(本 entry)
- ⏳ F0.6 啟動 commit pending
- ⏳ F0.7 session-start.md §10 W38 row append pending

### R6 Day 0 6 catches 報告

#### catch (1) — `retrieval_engine.py:151-166` post-rerank insertion point confirmed

**Evidence**:
```python
# backend/retrieval/retrieval_engine.py line 151-166
if do_rerank and hits:
    rerank_start = time.perf_counter()
    reranked_chunks = await self._reranker.rerank(
        query=query, candidates=hits, top_k=top_k,
    )
    rerank_latency_ms = int((time.perf_counter() - rerank_start) * 1000)
    chunks = [
        RetrievedChunk(score=r.rerank_score, fields=r.fields)
        for r in reranked_chunks
    ]
    reranked = True
```

**Implication**:
- ✅ Cohere v4.0-pro `reranked_chunks` 已 return `section_path` field(per W17 schema)— W38 implementation 純內部 score multiply,no API contract change
- W38 F2 insertion point clear:`rerank_start = time.perf_counter()` 之後 `rerank_latency_ms` 計算之前
- H1 non-architectural confirmed(post-rerank client-side score modification only)

#### catch (2) — W37 drift metric over-flagged hierarchical zoom-in as drift

**Evidence**(W37 F2 Run 4 raw data):
- chunk 1: sp=['8. Integration scenarios (end-to-end walkthroughs)']
- chunk 2: sp=['8. Integration scenarios (end-to-end walkthroughs)', '8.4 Scenario D — MPS device service alert ...']

W37 runner `_section_prefix(sp, depth=2)` 第二級唔同(`('8.', '8.4')` vs `('8.',)` ),raw count drift=1。**但實際係 valid hierarchical zoom-in,NOT cross-section drift**(都屬 §8 family)。

**Implication**:
- W38 F3 runner 需 **nuanced drift metric** distinguish:
  - `real_cross_section_drift_count` = top-level section[0] 唔同(e.g. §8 vs §11)— W38 真正要 reduce
  - `valid_hierarchical_zoom_count` = top-level section[0] 相同但 deeper level 唔同(e.g. §8 vs §8.4)— **不算 drift**
- W37 F2 真正 cross-section bug 只喺 Run 2(§8 + §11.x)= 1/4 valid runs,非 75% raw drift rate

#### catch (3) — I01 control 多 section drift 屬 query nature NOT bug

**Evidence**(W37 F2 Run 2 I01 raw data):
- chunk 1: sp=['1. Executive summary']
- chunk 2: sp=['4. High-level architecture', '4.1 Component overview']
- chunk 3: sp=['4. High-level architecture', '4.1 Component overview']
- chunk 4: sp=['3. Architectural principles', '3.1 Platform composition over platform construction']

**Implication**:
- 「what is high level architecture」query 本身需要 summary across §1 Executive + §3 Principles + §4 Architecture(non-bug multi-section)
- I01 高 drift count NOT actually cross-section drift — W38 deboost approach **唔可以** hard filter cross-section(否則 I01 break)
- 確認 symmetric deboost approach 正確(per W25 ADR-0035)NOT hard filter(per W37 F1 -63% precedent)

#### catch (4) — Ruff 13 issues(超 W37 estimate 8 by 5)

**Evidence**:
```
F401 [*] `os` imported but unused      w33-f2-runner.py:9          (1)
F841 Local variable `cit_ids` unused   w33-f2-runner.py:60         (1)
F541 [*] f-string no placeholders      w34-f1-ragas-runner.py:50   (1)
F541 [*]                               w34-f2-runner.py:96,97      (2)
F541 [*]                               w35-f1-ragas-runner.py:45   (1)
F541 [*]                               w35-f2-runner.py:111,112,116 (3)
F541 [*]                               w37-f2-runner.py:159,160,161,163 (4)
                                       ─────────────────────────── ───
                                       Total                       13
                                       Fixable                     12 + 1 hidden
```

**Implication**:
- W37 F2 runner 留底 4 個 NEW F541(寫 runner 時 print(f"...") template 但無 variable interpolation)
- W37 retro estimate「8 pre-existing ruff issues」 漏算 W37 自己留底嘅 4 個 = real total 13
- `ruff check --fix --unsafe-fixes` 可一次性 clean 12 + 1 hidden = 13 → 0

#### catch (5) — PC-W33-1 already resolved by W36 PC-W34-1 ship

**Evidence**(`CLAUDE.md §10.3 step 5b` line 533):
> `5b. **若本 session 預期會做 backend restart / eval run / RAGAs eval / Langfuse trace 操作 → 先 pre-flight endpoint health check**(**per PC-W33-1 + PC-W34-1**,W34 F2.3 audit_log 30s gap + W35 F1.3 Docker stuck 經驗驅動)`

**Implication**:
- W36 PC-W34-1 ship 已 cite PC-W33-1 作為 implicit predecessor — step 5b 命名「endpoint health check」covered Langfuse + Postgres
- **Azurite 提及 PC-W33-1 原始 surface 但 NOT in W36 ship** — image storage,non-eval-pipeline-critical(F1.4 status reconcile RESOLVED with optional Azurite extension deferred)
- W38 F1.4 純 status documentation,non-code change

#### catch (6) — `api/server.py:343-360` BUG-008 Windows ProactorEventLoop fix 同 reload=True 互動未測試

**Evidence**(`api/server.py:343-360`):
```python
# ── Server launcher (BUG-008) ──────────────────────────────────────────────
# Run with `python -m api.server` — NOT `python -m uvicorn api.server:app`.
# ...
# uvicorn's `Server.run()` builds its event loop with `loop_factory=
# asyncio.ProactorEventLoop` on Windows — psycopg's async mode rejects ProactorEventLoop.
# So on Windows we bypass `Server.run()` and drive `Server.serve()` through
# `asyncio.run` with an explicit SelectorEventLoop factory.
if __name__ == "__main__":
    _server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=8000))
    if sys.platform == "win32":
        asyncio.run(_server.serve(), loop_factory=asyncio.SelectorEventLoop)
```

**Implication**:
- 加 `reload=True` 入 `uvicorn.Config(...)` 可能 break SelectorEventLoop factory:
  - WatchFiles reload mode 由 uvicorn 內部管理 subprocess,可能不 honor asyncio.run loop_factory override
  - 風險 BUG-008 regression(psycopg async mode reject ProactorEventLoop)
- W38 F1.2 decision = **preserve current pattern**(no `reload=True`);comment block document W36 PC-W34-1 step 5b explicit kill+restart discipline alternative

### W37 evidence reframed(F0.2 catch (2)+(3) Karpathy §1.1 think-before-coding)

| W37 F2 raw metric | W38 真實判讀 | 推論 |
|---|---|---|
| I07 avg_drift 0.75 | Run 2 §11 real cross-section drift = 1/4 = 25%;Run 4 §8.4 valid hierarchical zoom-in 不算 drift | 真實問題 scope 比 W37 raw 估算嘅 75% 細好多 — 真正只 ~25% I07 runs 有 cross-section bug |
| I01 avg_drift 1.60 | Multi-section by query nature(§1 Executive + §3 Principles + §4 Architecture summary)— NOT bug | W38 deboost approach **必須** symmetric(deboost 0.85 = 15% penalty 保留 evidence)NOT hard filter |
| I07 avg_cit 1.8(-63%) | W37 hard filter `\b\d+\.\d+\b` regex + section_path prefix 雙重 over-filter 99% candidates | W38 nuanced approach — 只 deboost candidate 唔斬,保留 top-K 候選池 |
| I07 latency +101% | W37 Run 4 outlier 32s upstream Azure transient,排除後 avg ~21s(W35 baseline ~11.5s) | W38 deboost re-sort 應 <10ms overhead,latency 主要由 LLM emit dominant(W34 F2 evidence 92%)|

### F-phase pre-implementation surface

#### F1 housekeeping execution sequence(~30min total)

```
F1.1 ruff --fix --unsafe-fixes (5 min)
  ↓
F1.2 api/server.py PC-W32-1 comment block (5 min)
  ↓
F1.3 citation_expansion.py PC-W32-2 integration pattern note (5 min)
  ↓
F1.4 PC-W33-1 reconcile documentation (5 min)
  ↓
F1.5 pytest verify 1091 PASS + ruff 13 → 0 (5 min)
  ↓
F1.6 commit (5 min)
```

#### F2 reranker deboost implementation surface(~1.5h total)

```
F2.1 Settings 2 NEW knobs (10 min)
  ↓
F2.2 retrieval_engine.py:151-166 deboost loop (20 min)
  ↓
F2.3 5 NEW unit tests (40 min)
  ↓
F2.4 pytest 1091 → 1096 + ruff + mypy strict (10 min)
  ↓
F2.4 commit (10 min)
```

#### F3 LIVE verification surface(~1h total)

- F3.1 pre-flight per CLAUDE.md §10.3 step 5b — Langfuse 200 + Postgres SELECT 1
- F3.2 `.env` temporary override `RERANKER_CROSS_SECTION_DEBOOST=0.85` + `RERANKER_SECTION_PATH_PREFIX_DEPTH=2`
- F3.3 Backend explicit kill via WMI CommandLine filter + restart per ADR-0023(W37 ghost-Python-3.12 issue mitigation)
- F3.4 5+5 LIVE runs + nuanced drift metric per F0.2 catch (2)+(3)
- F3.5 decision tree intersect — outcome (a)/(b)/(c)

### Phase preconditions verify ✅

| Precondition | Status |
|---|---|
| W32 (h') `citation_expansion.py` shipped | ✅ commit `e9bd188` |
| W33 Rule 7 v2 + Rule 8 shipped | ✅ commit `149aebd` |
| W35 Option C `prompt_builder.py:30` shipped | ✅ commits `b2f4ca3..c590a86` |
| W36 PC-W34-1 `CLAUDE.md §10.3 step 5b` shipped | ✅ commit `3f65531` |
| W36 PC-W35-1 runner cp1252 fix shipped | ✅ commit `5520918` |
| W37 F1 `_find_neighbour_chunks` section_path filter infrastructure preserved | ✅ commit `da557ab`(W38+ enabler) |
| W37 F3 `.env` clean per PARTIAL revert ship | ✅ commit `31635b6` |
| ADR-0035 W25 F5 D2 symmetric deboost pattern reference | ✅ documented in `docs/adr/` |
| Working tree clean(0 ahead origin/main)| ✅ W37 closed pushed |
| Active phase = W38(rolling JIT)| ✅ W37 closed,W38 唯一 active |

### Cost containment policy reminder

Per `memory/feedback_judge_llm_cost_policy.md`(W36 saved 2026-05-26):
- ✅ W38 不涉及 LLM cost upgrade — F2 純 internal retrieval-side score multiply,F3 LIVE 用現有 backend(synthesizer `llm_primary=gpt-5.5` + judge `llm_judge=gpt-5.4-mini` 維持 H2 lock)
- ✅ W38 不觸 path (a) judge LLM 升級(永久 OUT per memory)

---

**End of W38 progress.md Day 0**
