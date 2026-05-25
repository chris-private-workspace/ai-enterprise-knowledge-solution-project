---
phase: W26-eval-driven-retrieval-tuning
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
last_updated: 2026-05-25
---

# W26 — Progress

> Daily progress + closeout retro per PROCESS.md §3.4。
> Every commit must correspond to a Day-N entry mention(R2 binding rule)。

---

## Day 0 — 2026-05-25:Kickoff + R6 grep verify

### Trigger sequence

1. **BUG-025 closeout 2026-05-25**(commit `4365edb` pushed origin/main)— Sev2 silent-drop regression closed(0 citations → 3 citations measurable for Q-W25-I07);Sev2 postmortem 6 preventive controls PC1-PC6 published。
2. **Mid V6 user-eye verify cycle 2026-05-25** — Chris surfaced `docs/09-analysis/rag_retrieval_quality_investigation_20260525.md` user-authored investigation brief(2026-05-25)→ reframed remaining quality gap as **enumeration query × factoid-tuned pipeline architectural mismatch**(Dify same query also fails — NOT EKP-unique bug)。
3. **Chris 3-step refinement chat 2026-05-25** — narrower than brief §6 full list:**Step 0** RAGAs baseline → **Step 1** rerank score threshold(prerequisite — gates noise for Step 2)→ **Step 2** query expansion(gated on Step 1 + eval delta)。Image relevance / UI count BUG-026 / parent-doc ADR Tier 1 ceiling 留 W26 step 2 後 sprint scope。
4. **Chris explicit kickoff instruction 2026-05-25** —「kickoff W26+ phase plan」→ rolling JIT phase folder kickoff per CLAUDE.md §10 R1。

### Done

**1. Plan + checklist + progress kickoff**:
- `docs/01-planning/W26-eval-driven-retrieval-tuning/plan.md` v1.0(§1-§9 — Scope + Deliverables F0-F4 + Acceptance Criteria G1-G7 + 8 Risks R1-R8 + Day-by-Day + Dependencies + Plan Changelog + 5 Locked Design Decisions + Component Impact Map)
- `docs/01-planning/W26-eval-driven-retrieval-tuning/checklist.md`(F0.1-F0.10 + F1.1-F1.8 + F2.1-F2.16 + F3.1-F3.7 + F4.1-F4.10 + G1-G7 verification gates)
- `docs/01-planning/W26-eval-driven-retrieval-tuning/progress.md`(this file — Day 0 entry)

**2. R6 pre-active-flip recursive grep verification**(per CLAUDE.md §10 R6 + W23 F3 amendment + W25 D0 precedent)— **executed Day 0 — net zero contaminations**:

| Grep target | Result | Plan correction needed? |
|---|---|---|
| `backend/retrieval/reranker/cohere.py` rerank signature | `async def rerank` at line 84(brief §7 navigation table 84-130 + §2 narrative 96-130 ranges consistent — body cutoff vs full method)| ❌ No — plan §2 F2 reference within brief-cited range |
| `backend/storage/settings.py` existing `rerank_*` knobs | 5 existing(`cohere_rerank_model` / `voyage_rerank_model` / `zeroentropy_rerank_model` / `cohere_request_timeout_s` / `rerank_top_k: int = 5`)| ❌ No — NEW `rerank_score_threshold` adds clean(no naming collision)|
| `docs/eval-set-v0.yaml` + `eval-set-v0-w25-supplement.yaml` file existence | Both exist at `docs/` root | ❌ No — Q1 locked decision references correct |
| `/eval/run` + `make_ragas_evaluator` reuse-path | 8 files contain reference(`api/routes/eval.py` + `eval/ragas_evaluator.py` + `eval/orchestrator.py` + 5 test files)— reuse confirmed | ❌ No — F1.4 reuse-path correct |
| ADR registry — last used number | `0033-` / `0034-` / `0035-` / `0036-react-markdown-chat-answer-rendering.md` ✅ ADR-0037 is next available | ❌ No — F2.1 ADR-0037 naming correct |

**Net findings = zero contaminations + 5 confirmations**;plan-text clean,Day 0 kickoff governance complete(per W25 D0 R6 precedent — surface findings upfront avoid F1+ active-flip discovery)。

**3. Tasks created for W26 lifecycle**:
- BUG-025 tasks (#204-#209) all completed in prior session
- NEW W26 tasks pending creation via TaskCreate(F1-F4 phase milestones)

### Decisions(Day 0)

- **D0.1** — Phase folder name `W26-eval-driven-retrieval-tuning` adopted(per Chris explicit「kickoff W26+ phase plan」+ 「eval-driven」嘅 methodology focus + 「retrieval tuning」scope description)
- **D0.2** — Chris 3-step refinement narrower than brief §6 full list(per Chris explicit ordering insight:rerank threshold IS prerequisite for query expansion — uncovered methodological clarity > brief §6)。**F0-F4** 5 deliverables;**out of scope** explicitly enumerated in plan §1.3
- **D0.3** — F2 屬 🟡 H1 trigger ADR-0037(brief §3 標 🟢 Tier-1-safe 但 W25 cumulative governance precedent ADR-0033 + 0034 + 0035 + 0036 = retrieval scoring change 都寫 ADR — symmetric pattern over brief recommendation lean)
- **D0.4** — F1 R8 prerequisite gate explicit STOP-and-ask point(per BUG-025 postmortem PC1 + W25 F4 deferred precedent — Azure OpenAI judge key + Cohere production reranker key 兩者必要,fallback 唔 acceptable)
- **D0.5** — F3 W26 內 **NOT** default flip(measurement experiment via env var override only;若 measurable improvement → 後續 NEW Change considers default flip — separate scope per Karpathy §1.2 simplicity 唔 bundle 2 decisions)
- **D0.6** — F2 → F3 gate criteria TBD per F2 D6 RAGAs delta(AskUserQuestion Chris pick at transition — eval-driven discipline 唔 hand-wave initial values per brief §4 critical insight)
- **D0.7** — Single phase W26 covers F0-F4(NOT split W26a + W26b)— eval-driven iteration tight feedback loop;若 F3 closeout direction = PARTIAL/skip → W27+ candidate(parent-doc ADR)separate phase per rolling JIT

### Blockers

- ⚠️ **R8 potential prerequisite**(R1 plan risk)— Azure OpenAI judge key + Cohere v4.0-pro production reranker key availability。F1 R8 prerequisite gate(F1.1-F1.3)** must resolve before F1 active flip**;若 blocked → Plan B (c) Chris personal Azure dev tier credentials 必要(per W25 F4 deferred precedent + ADR-0017 amended)

### Carry-overs

無 — Day 0 kickoff scope clean。

### Commits

- `docs(planning): kickoff W26-eval-driven-retrieval-tuning + Chris 3-step refinement scope`(本 commit pending — plan + checklist + progress + session-start.md sync per F0.10 may bundle OR separate)

---

**End of Day 0 entry** — Kickoff done;F0.4-F0.8 R6 grep verify deferred to D1;F1 R8 prerequisite resolve 緊接 next。

---

## Day 1 — 2026-05-25:F1 baseline measurement + empirical pivot to parent-doc retrieval

### Trigger sequence

1. Chris explicit「kickoff W26+ phase plan」(post-W25 BUG-025 push)+「同意繼續 (a)」per session continuation
2. F1 R8 prerequisite gate diagnostic:`/health` reported `cohere: not_configured` but `make_reranker(get_settings())` confirmed CohereReranker created with aenter SUCCESS。Root cause = `/health._check_cohere:103` 用 `getattr(engine, "reranker", None)` 而 RetrievalEngine 內部係 `self._reranker`(private)— attribute access drift。**Actual Cohere v4.0-pro 一直 operational**;`/health` cohere status 屬 cosmetic observability misreport(post-W20 F2.1 extraction)— Chris pick (a) **proceed F1 immediately + open BUG-027 candidate W27+**(per Karpathy §1.3 surgical envelope)
3. F1 measurement scope refined per supplement file header reading:`eval-set-v0.yaml` 35 queries 對 current dev KB `sample-document-with-image-1`(DCE Integration Platform doc)corpus-mismatch — F1 cohort = **`eval-set-v0-w25-supplement.yaml` 13 queries**(consume W25 CO_W25_F4 deferred work)

### Done

**1. R6 pre-active-flip grep verification**(F0.4-F0.8)— **net zero contaminations**:
- `cohere.py` `async def rerank` at line 84(brief §7 84-130 + §2 96-130 ranges consistent)
- 5 existing `rerank_*` Settings;NEW `rerank_score_threshold` no naming collision
- `docs/eval-set-v0.yaml` + `docs/eval-set-v0-w25-supplement.yaml` both exist
- `/eval/run` + `make_ragas_evaluator` reuse-path confirmed across 8 files
- ADR-0036 last used → ADR-0037 next available ✓

**2. F1 RAGAs baseline measurement**(`POST /eval/run` eval_set_id=`eval-set-v0-w25-supplement` + cohere-v4.0-pro + CRAG enabled,runtime 558s ~9.3min):
- `recall_at_5=0.8744`(above Gate 1 floor 0.80,dropped ~10pp from W2 baseline 0.9722)
- `faithfulness=0.9851`(very high — LLM 唔 hallucinate)
- `correctness=0.7416`(moderate,approx via answer_relevancy per CO_W15_F1_eval_set_v1)
- `p95_latency_ms=1001`(5x under budget)
- **8/13 queries** with at least 1 metric fail;**5 queries context_recall=0.00**(I02 + I03 + I04 + I05 + T04)— **recall-dominant failure mode**
- Raw output:`baseline-metrics-W26-D1-raw.json`(2130 bytes EvalReport)
- Analysis:`baseline-metrics-W26-D1.md`(§1-§6 metrics + failure distribution + interpretation + critical reframing surfaced)

**3. F1 augmentation per Q2 locked decision** — per-chunk reranker score probe via `backend/scripts/w26_threshold_probe.py`(reuses retrieval_engine.retrieve() directly with truststore inject + sys.path bootstrap;runtime ~10s):
- 5 priority queries × 5 chunks = 25 Cohere v4.0-pro relevance scores
- Distribution:**min 0.67 / P25 0.83 / P50 0.90 / P75 0.91 / max 0.97 / mean 0.85**
- **Critical finding**:per-query score patterns refute brief §3 方向 A premise — **Cohere score CANNOT differentiate failed vs passed queries**:
  - Q-W25-I01(PASSED control)min score 0.67 vs Q-W25-I02(FAILED context_recall=0)min 0.88
  - Q-W25-I07(PASSED post-BUG-025)min 0.90 vs Q-W25-T04(FAILED both=0)min 0.67
  - Score range overlap highly between pass / fail cohorts
- Raw output:`threshold-probe-W26-D1.json`

**4. Strategic pivot per F1 empirical refutation** — Chris AskUserQuestion pick (C):
- F2 deliverable scope **PIVOTED** from「Step 1 rerank score threshold」(brief §3 方向 A + Chris 3-step initial framing)to「**Step 1 parent-document retrieval ADR-0037**」(brief §6 step 4 escalation,🟡 H1 Tier 1 ceiling)
- Reason:Cohere score distribution refutes threshold approach;parent-doc directly解 enumeration completeness(brief §1 「NOT EKP-unique bug — Dify same query fails」)
- Plan §7 Changelog 2026-05-25 D1 entry landed;Plan §2 F2 section header marked ⚠️ PIVOTED + ORIGINAL spec preserved as superseded reference

**5. F2 full rewrite deferred next session** — architectural design scope warrants fresh attention per Karpathy §1.2 simplicity-first(token budget consideration + ADR-0037 parent-doc design is non-trivial:section_path traversal pattern / aggregation strategy / token budget implications / pre-existing context_expander.py interaction analysis)

### Decisions(Day 1)

- **D1.1** — `/health` `cohere: not_configured` 屬 cosmetic observability misreport — Cohere actually operational(per get_settings() + make_reranker() + aenter diagnostic chain)— root cause `engine.reranker` public name vs `engine._reranker` private attr mismatch;BUG-027 candidate W27+ per Chris pick (a) Karpathy §1.3 surgical
- **D1.2** — F1 cohort = `eval-set-v0-w25-supplement.yaml` 13 queries only(NOT eval-set-v0 35 placeholder queries — corpus-mismatch confirmed via supplement file header reading)— consumes CO_W25_F4 deferred work
- **D1.3** — F1 augmentation via standalone script `w26_threshold_probe.py`(NOT orchestrator extension)— truststore inject + sys.path bootstrap + direct retrieval_engine.retrieve() — Karpathy §1.3 surgical(no production code touch);probe 5 priority queries × 5 chunks
- **D1.4** — F1 empirical finding **invalidates Chris 3-step Step 1 threshold approach** — Cohere score distribution(P25=0.83 / min=0.67 / max=0.97)cannot differentiate failed vs passed queries;threshold cutoff at any value would either gate nothing(< 0.67)or harm passed queries(I01 min 0.67 dropped)
- **D1.5** — Chris pivot pick (C) parent-document retrieval ADR-0037(brief §6 step 4 escalation)— root-cause solve for enumeration completeness;F2 ORIGINAL rerank-threshold scope superseded
- **D1.6** — F2 full design + ADR-0037 draft + code + tests + re-eval **deferred next session** per architectural scope + token budget consideration;preserved per W23 / W25 D0 cumulative AI compression pattern(non-trivial scope warrants fresh session attention)

### Blockers

無 — F1 deliverable complete,F2 pivot scope clarified;next-session ADR-0037 parent-doc draft 緊接。

### Verify gates results(F1)

| Gate | Result |
|---|---|
| F1.1-F1.3 R8 prerequisite gate | ✅ MET(diagnostic confirmed Cohere operational)|
| F1.4-F1.6 RAGAs run on 13 queries | ✅ done(`/eval/run` HTTP 200,558s runtime)|
| F1.7 baseline-metrics-W26-D1.md report | ✅ written |
| Per-chunk threshold probe | ✅ done(25 scores,distribution captured)|
| F1.8 F2 direction surface to Chris | ✅ AskUserQuestion 2-step:(1) recall-dominant strategy direction → (A) initial → (2) F1 empirical refutation → Chris pivot (C) parent-doc ADR |

### Carry-overs

- 🚧 **F2 PIVOTED scope full rewrite** next session — ADR-0037 parent-document retrieval draft + code + tests + re-eval
- 🚧 **F3 conditional gate** — depends on F2 parent-doc result(may not need query expansion if parent-doc解 enumeration completeness)
- 🚧 **BUG-027 candidate** —`/health._check_cohere` `engine.reranker` 應該係 `engine._reranker`(or `RetrievalEngine` expose `.reranker` @property)— Sev3/Sev4 cosmetic;W27+ separate BUG-fix scope per Chris pick (a) 2026-05-25
- 🚧 **CO_W26_threshold_probe_script** — `backend/scripts/w26_threshold_probe.py` 屬 dev script;若需 production audit / CI integration → 後續 promote;暫保留 backend/scripts/ 作為 measurement artifact

### Commits

- `feat(eval): W26 F1 RAGAs baseline + threshold probe + empirical pivot to parent-doc retrieval`(本 commit pending — baseline-raw + report + probe-script + probe-json + plan amendment + checklist update + progress Day 1 entry)

---

**End of Day 1 entry** — F1 baseline complete + critical empirical refutation surfaced → pivot to parent-doc ADR-0037;F2 architectural design deferred next session per Karpathy §1.2 + token budget。
