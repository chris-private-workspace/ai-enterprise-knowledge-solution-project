# W48 — Config-Test Quality Axis (faithfulness) · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應 Day-N entry(R2)。

---

## Day 1 — 2026-06-05

### Context / kickoff
W47 closed + pushed(`ecd9156`)。用戶揀 W48 = **config-test 加 ingestion 質素軸**。

### R6 grep 驗證(plan kickoff)— Explore agent map 揭架構張力
- config-test(ADR-0040)= **query-pipeline-only**:`DraftRetrievalConfig` 12 個 runtime 旋鈕,**零** ingestion 旋鈕;`config_test.py` 注入 `PerQueryOverrides` 試跑同一 query pipeline。
- **config-test 架構上試唔到 ingestion config**(`chunk_strategy`/`chunker_max_images_per_chunk` ingest-time,要 reindex)→ option label「ingestion 質素軸」**自相矛盾**。
- RAGAs faithfulness reference-free 現成(`ragas_evaluator.py:149`,無 ground truth);config-test 每 run 後 `resp.answer` + `resp.retrieved_chunks` 齊 → 質素軸技術上乾淨。

### 決策
- **AskUserQuestion(scope)**:Chris 揀 **Option A** = faithfulness 質素軸加入 **runtime** config-test(收 AUDIT-D / ADR-0040 雙軸);ingestion-config 質素(reindex→eval)out-of-scope 留未來。
- **Key design lock**(plan §2):每 config 只算一次 faithfulness(last-run,非 N-run band,cost-conscious)+ graceful degradation(error→None 唔 fail)+ `asyncio.to_thread`(sync evaluator off event loop)+ `eval_faithfulness: bool=True` flag + judge 維 gpt-5.4-mini + **無新 ADR**(fulfill ADR-0040 雙軸)。

### Done
- F0 R1 phase 三件套建立(plan/checklist/progress);Phase Gate G1-G5 定義

### F1 backend(同日)
- **R3 deviation**(plan §7 已記):plan 原寫 reuse `make_ragas_evaluator` 不改,但佢算全 4-metric → 改加 **additive** `make_faithfulness_evaluator(settings)`(eval/ragas_evaluator.py;faithfulness-only,復用 `patch_for_gpt5`+`Faithfulness`+threadpool bridge;現有 `make_ragas_evaluator` 0 改動 = 0 regression)。返 None 若無 judge credential;per-call try/except → None graceful。
- `schemas/config_test.py`:`ConfigTestRequest.eval_faithfulness: bool=True` + `ConfigRunSummary.faithfulness: float|None=None`
- `routes/config_test.py`:`config_test()` build evaluator 一次(`make_faithfulness_evaluator` if eval_faithfulness else None;draft+saved 共用)→ `_run_n` capture last-run answer + `[c.chunk_text for c in resp.retrieved_chunks]` → `await asyncio.to_thread(faithfulness_fn, query, answer, contexts)`(sync evaluator off event loop)→ summary.faithfulness
- 驗:ruff check+format clean;mypy --strict 我新 helper + config_test.py 零 error(6 pre-existing error 喺舊 function `patch_for_gpt5`/`make_ragas_evaluator`/`_ascore_*`/`_sync_eval` 與改動無關)

### F2 frontend(同日,H7 design-first)
- mockup `ekp-page-kb.jsx` `KbTestResultCard` 加 `faith` prop + **全寬 headline cell**「忠實度(faithfulness · 反幻覺 · 0–1)」置 grid 頂(質素軸 headline;success 色 / null「—未評」)+ 2 call site faith="0.97"/"0.94"
- `config-test.ts`:types 加 `faithfulness` + `eval_faithfulness`
- `page.tsx` `ConfigResultCard`:加 faithfulness headline cell `.toFixed(2)` 100% match 更新後 mockup

### F3 tests(同日)
- backend `test_config_test_route.py`:autouse `_no_judge` fixture(保護既有 4 test 唔觸真 Azure judge — eval_faithfulness 預設 true + 真 settings)+ 3 新 test(computed 0.95 + 核 answer/contexts / disabled None / graceful None A/B);`test_eval_ragas.py` +1(helper no-key→None H6)
- frontend `kb-settings-tuning.test.tsx`:FAKE_RESULT draft/saved 補 faithfulness + 試跑 test assert 忠實度 ≥2 + 0.97 + 0.94
- 驗:backend **pytest 14 passed**(config_test 7 + eval_ragas 7)0 regression;frontend **vitest 6 passed**(kb-settings)+ tsc clean + lint clean + `[oklch`=0

### F4 doc-sync(同日)
- architecture.md §5.5.5 加 **W48 amendment**(config-test faithfulness 質素軸,ADR-0040 dual-axis fulfilled;runtime-only + ingestion 質素 future note)
- roadmap:「NEW 並行」table row → ✅ W48 shipped;逐期重點「config-test 補質素軸」(i) → ✅ 交付(成本決策修正記:每 config 算一次 vs plan 原 opt-in toggle);決策 6 → ✅ RESOLVED
- session-start §10 W48 closed row + W49+ rolling JIT(local-only,gitignored)

### Phase Gate G1-G5 — **PASS**

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| G1 | config-test 返 faithfulness 質素軸 | ✅ PASS | `test_config_test_faithfulness_computed` draft.faithfulness=0.95 + 核 answer/contexts |
| G2 | graceful degradation | ✅ PASS | disabled→None + evaluator-returns-None→None(A/B)+ 200,config-test 唔 fail |
| G3 | frontend render 100% match mockup | ✅ PASS | design-first mockup KbTestResultCard headline → page.tsx ConfigResultCard match;vitest 忠實度+0.97+0.94 |
| G4 | pytest+ruff+mypy+tsc/lint/build clean | ✅ PASS | backend 14 pass + ruff + mypy(my code);frontend vitest 6 + tsc + lint + **next build** clean |
| G5 | judge gpt-5.4-mini + 無新 ADR/vendor | ✅ PASS | reuse `azure_openai_deployment_llm_judge`;additive helper;fulfill ADR-0040(無新 ADR) |

**判決:Phase Gate 通過(PASS)**。AUDIT-D / ADR-0040 雙軸 gap 收;config-test 試跑面而家有 presentation + quality 雙軸。

### Retro
- **架構張力早 catch(R6 / Karpathy §1.1)**:option label「config-test 加 ingestion 質素軸」自相矛盾(config-test query-pipeline-only,試唔到 ingestion 旋鈕)→ kickoff 前 Explore map + AskUserQuestion 釐清 scope(Option A),避免做咗先發現試唔到。
- **成本意識決策修正(R3)**:(a) plan 原寫 reuse `make_ragas_evaluator` 不改,但佢算全 4-metric → 改加 additive faithfulness-only helper(現有 0 動);(b) plan 原 design「每 run + opt-in toggle」→ 改「每 config 算一次,無 toggle」(judge 內部多次調用,單次更省更穩 + keep H7 surface 細)。兩者皆喺實作時 catch 並記 changelog。
- **graceful degradation 落地驗證**:無 judge / per-call error → None,config-test 仍返 presentation 軸(test 證);autouse `_no_judge` fixture 保護既有 test 唔誤觸真 Azure(新 default eval_faithfulness=true 嘅副作用早察覺)。
- **design-first(H7)順暢**:mockup KbTestResultCard 先加 headline cell 再令 page.tsx match;質素軸作 headline(prominence)而非塞入 6-metric grid 製造 odd cell。
- **Watch(carry W49+)**:ingestion config 質素(reindex→eval)= AUDIT-D (ii) 未做;faithfulness 數值對配置敏感度分析屬後評。

### Carry-overs → W49+(rolling JIT)
- config-test ingestion 質素(reindex→eval;W48 out-of-scope 延伸)
- AUDIT-D (ii):correctness / context_recall(需 per-KB 標註集 or synthetic-QA)
- (前期 carry 不變)W47 F5 frontend reindex UI live / per-document scope / production v1→v2 / heading_aware footgun

### Commits
- `e4fcffd` F0 kickoff + `06fcc77` F1-F3 code+tests + F4 closeout commit(pending)

### Blockers / carry-over
- 無 blocker。
