---
phase: W29-reformulator-diagnose
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed_partial   # per W29 F4 closeout 2026-05-26 — Phase Gate PARTIAL per Q4 measurement-experiment-fail-policy
start_date: 2026-05-26
end_date: 2026-05-26
last_updated: 2026-05-26
---

# Phase W29 — Progress Journal

> Daily progress per CLAUDE.md §10 R2 binding;commit hash ↔ Day-N entry mapping mandatory(except `docs(planning):` housekeeping commits)。

---

## Day 0 — 2026-05-26 (Kickoff + R6 Day 0 catch)

### Action

- W28 closed PASS post-`42c699f` + `c20530b` housekeeping ship。User 提名 W29+ candidate (g) NEW Synthesizer enumeration-refuse fix via path (iii) F3 reformulator strengthening
- AskUserQuestion 第 1 round 4 questions Recommended picks:Phase classification / Surgical scope / User-test only primary gate / PARTIAL fallback
- **R6 Day 0 pre-active-flip recursive grep verify** triggered before any code change(per CLAUDE.md §10 R6 + Karpathy §1.1 think-before-coding)— catch surfaced

### R6 catch detail

讀完 `backend/generation/query_reformulator.py` line 47-89 `REFORMULATOR_SYSTEM_PROMPT` 現狀,**發現 W29 plan-text 同 actual code reality 嚴重唔對齊**:

| Plan-text 假設(用戶提名「path (iii) reformulator strengthening」)| Code Reality(現有 prompt 已 ship per W25 F3 D4 ADR-0034)|
|---|---|
| 加 enumeration query shape detection | ✅ Bullet (2) literal:「When the original uses words like "all", "every", "each", "list", or "show me the X" — decompose into variants that target SPECIFIC INSTANCES or categories rather than just rephrasing "all" → "every"」 |
| 加 scenario-specific few-shot example | ✅ **EXAMPLE 3 line 78-84 直接 cover Q-W25-I07**:`Original: "show me all the integration scenarios" / Good variants: ["customer service request submission API integration", "Saga-style multi-system orchestration pattern", "inbound event-driven flow Service Bus"]` |
| 教 LLM 避免「all → every」rephrase | ✅ Bad variants 已示範:`["all integration scenarios", "every integration pattern", "list integration use cases"]` |

連帶 verify:
- `.env` 現狀:`ENABLE_QUERY_EXPANSION=true`(W25 D3 enabled 2026-05-24);W26-W28 phase eval 都行緊 reformulator path
- W25 D4 daily log Q-W25-I07 refuse 當時:`.env` 仲未 enable → chat retry 行嘅 single-query baseline path,**未行過呢個 strengthened reformulator path**
- W26-W28 eval ENABLE_QUERY_EXPANSION=true confirmed but Q-W25-I07 G3 仍 marginal MISS(W28 context_recall 0.40 borderline judge noise per 8-run flip 3 PASS / 5 FAIL)

### R6 catch consequence

「Path (iii) strengthening」**事實已經 ship 咗** 喺 W25 F3 D4(EXAMPLE 3 cover Q-W25-I07 specific decomposition)。真正未驗證係:**Strengthened reformulator + W28 best combo Settings + ENABLE_QUERY_EXPANSION=true config 下,actual reformulator behavior + RAG-fusion fan-out + RRF top-5 surface 點解仍未 close G3**。

### AskUserQuestion 第 2 round (scope redirect)

User Recommended pick:**W29-reformulator-diagnose — H1+H2+H3 audit 先**(option 1)。

3 hypotheses:
- **H1 RRF surface**:Reformulator 生對咗 variants 但 RRF k=60 仍 surface intro chunks 而非 §8.1-§8.5 individual walkthrough
- **H2 vocab-corpus mismatch**:EXAMPLE 3 hypothetical variants(「customer service request submission」/「Saga」/「Batch ETL」)同 actual corpus §8.1-§8.5 chunk vocab 唔啱
- **H3 fallback gap**:Reformulator 偶然 fallback to `[original]` → 同 W25 D4 default-off path 一樣

### Deliverables Day 0

- ✅ `docs/01-planning/W29-reformulator-diagnose/` folder created
- ✅ `plan.md` v1.0 drafted per W28 closed-phase 7-section template
- ✅ `checklist.md` v1.0 drafted per W28 atomic items pattern
- ✅ `progress.md` Day 0 entry written(this entry)
- ✅ Commit `docs(planning): kickoff W29-reformulator-diagnose + R6 path (iii) already-shipped catch + scope redirect to audit-first`(commit `51ee31e` 2026-05-26)
- ✅ session-start.md §10 timeline row W29 active append + W30+ rolling JIT row + W28 closed row preserved(landed in `51ee31e`)

### Commits

- `51ee31e` docs(planning): kickoff W29-reformulator-diagnose + R6 path (iii) already-shipped catch + scope redirect to audit-first(4 files changed,+471 / -1)

### Blockers / 🚧 deferred

- 🚧 D0 R8 prerequisite check defer to F1.1 active flip(W28 same-session continuity 預期 valid;will explicit verify before live curl)

### Carry-overs from W28 closeout retro

- **(c) RAGAs orchestrator-aware judge tune per R-W26-2** 大幅降低 priority(W29 嘗試 close G3 from retrieval-side rather than judge-side)
- **(d) F3 query expansion standalone test** 部分 subsumed by W29 F1.1+F1.2 audit
- NEW (e) `make_ragas_evaluator` structlog stage emit / NEW (f) Settings-default-tests / BUG-026 / BUG-027 / W22 D8 setup.md / W16 Track A IT cred — preserved untouched

### Decisions logged

- **D29.0.1**:W29 phase classification = **Phase** per user pick(multi-deliverable + eval gate + user-test verify analogous to W26/W27/W28 軌跡)
- **D29.0.2**:W29 scope = **Surgical path (iii) reformulator** ONLY per user pick(path (i) synthesizer prompt + path (ii) CRAG threshold deferred W30+ if F3 surgical insufficient)
- **D29.0.3**:W29 acceptance gate = **G1 user-test ≥ 2 A-E walkthrough citations** ONLY per user pick(no RAGAs delta eval + no enumeration corpus expansion in scope)
- **D29.0.4**:W29 G1 FAIL fallback = **PARTIAL closeout + path (ii) elevate W30+ candidate** per user pick(per W26+W27 PARTIAL closeout precedent + Karpathy §1.2 一次只郁一個旋鈕)
- **D29.0.5 R6 SCOPE REDIRECT**:**path (iii) prompt strengthening ALREADY shipped W25 F3 D4** — W29 scope redirect from「strengthen」to「diagnose-first H1+H2+H3 audit before any code change」per Karpathy §1.1 think-before-coding + user 2nd AskUserQuestion Recommended pick

---

## Day 0 cont — 2026-05-26 (F1 audit + F2 root cause)

### F1 H1+H2+H3 diagnose 5 sub-deliverables completed (same-day collapse per W22-W28 AI pattern)

**F1.0 R8 prerequisite gate**:
- ✅ /health returns 5-component status:azure_search/azure_openai/langfuse/postgres all OK;cohere "not_configured" cosmetic per BUG-027 W26+W27 surfacing
- ✅ .env confirmed ENABLE_QUERY_EXPANSION=true (W25 D3 enabled)
- ✅ R8 unblocked — proceed F1.1-F1.5

**F1.1 Reformulator variants standalone test**:
- 3/3 runs APIConnectionError fallback to [original] — standalone Python process blocked by corp proxy (per ADR-0017 R8 pattern;not representative of backend behavior)
- backend `/query` call to Q-W25-I07 succeeded with citations(per F1.3 + F1.5 evidence)

**F1.2 Corpus §8 chunk inventory**:
- 12 chunks under §8 hierarchy(chunk-0044 intro + chunk-0045/0047/0049/0051/0053 = §8.1-§8.5 individual walkthroughs each img=1 + chunk-0046/0048/0050/0052/0054 pattern characteristics + chunk-0055 §8.6 coverage summary)
- Each §8.x individual walkthrough chunk has low_value_flag=False + embedded_image_count=1(UML diagram per §3.5)

**F1.3 RRF top-5 surface for Q-W25-I07 W29 D0**:
- top-5 = chunk-0044 intro / chunk-0008(§3.1)/ chunk-0036(§7)/ chunk-0020(§5.3)/ chunk-0018(§5.2.1)
- **ZERO §8.1-§8.5 individual walkthrough chunks** despite reformulator working

**F1.4 EXAMPLE 3 vocab vs corpus actual diff**:
- EXAMPLE 3 variant 1「customer service request submission API integration」**exact match** §8.1 chunk_title 4-word literal「Customer service request submission (async transaction)」
- EXAMPLE 3 variant 2「Saga-style multi-system orchestration」**high overlap** §8.3「Order placement with payment (saga orchestration)」
- EXAMPLE 3 variant 3「inbound event-driven flow Service Bus」**high overlap** §8.4「MPS device service alert (inbound event-driven fan-out)」
- → **H2 REFUTED** (EXAMPLE 3 vocab aligns with corpus 60-80% token overlap for 3 of 5 scenarios)

**F1.5 Langfuse reformulator obs aggregate**:
- 15 obs total spanning **ONLY** W25 D4 14:00-14:34 UTC (13) + W29 D0 01:44-01:46 UTC (2)
- 93.3% success rate (14/15 fallback=False) + 6.7% fallback (1/15 W25 D4 first attempt)
- **ZERO obs during W26 + W27 + W28 eval batches** (~104 expected if eval wired reformulator)
- Verify via `grep "reformulator|fused_retrieve|query_expansion" backend/eval/*.py backend/api/routes/eval.py` = zero matches
- → **H4 NEW eval coverage gap CONFIRMED** — `backend/eval/orchestrator.py:93` direct `engine.retrieve()` bypassing reformulator path entirely

### F2 root cause classification

| Hypothesis | Status | Evidence | Implication |
|---|---|---|---|
| **H1 RRF surface** | **CONFIRMED DOMINANT for backend `/query`** | F1.3 + F1.5 | Even with reformulator working + EXAMPLE 3 aligned variants,top-5 dominated by intro chunk-0044 + §3/§5/§7 chunks。 §8.1-§8.5 individual chunks never surface |
| **H2 vocab-corpus mismatch** | **REFUTED** | F1.4 | EXAMPLE 3 hypothetical variants align with corpus actual vocab |
| **H3 fallback gap** | standalone-only;NOT backend-dominant | F1.1 + F1.5 | Standalone fails corp proxy;backend 93% success rate |
| **H4 NEW eval coverage gap** | **CONFIRMED DOMINANT for /eval/run** | F1.5 + grep | eval/orchestrator.py bypasses reformulator entirely |

**Combined dominant**:H1 + H4 NEW(H1 explains backend `/query` G1 fail;H4 explains W26-W28 eval G3 marginal MISS not reflecting reformulator path)

### Critical synthesizer-refuse observation

**W25 D4 (2026-05-24) Q-W25-I07**:`refused: True` + "I cannot find this in the available documentation" + 0 citations
**W29 D0 (2026-05-26) Q-W25-I07**:`refused: False` + 5-scenario enumerate paraphrased from chunk-0044 intro + 1 citation

→ **Synthesizer-refuse pattern naturally disappeared** between W25 D4 and W29 D0 — W25.5 BUG-025 symmetric deboost + W26-W28 retrieval improvements cumulative effect closed refuse pattern entirely without explicit synthesizer prompt tune。

→ G1 PRIMARY acceptance criteria ≥ 2 distinct A-E walkthrough citations is **stricter than user-facing experience needs**(backend already returns useful enumerate-from-intro answer)。 Whether to relax G1 acceptance or push for strict §8.x walkthrough citations = user decision needed for F3 direction。

### Commits Day 0 cont

- ⏳ F1 + F2 evidence commit pending(includes 5 raw outputs + F2 markdown + checklist + progress backfill)

### Carry-overs to F3 decision

F3 surgical fix candidate paths(per f2-root-cause-W29-D1.md):
- **Path A**(Setting tune `per_variant_overfetch` + `rrf_k`)— ~1h work,zero code change,medium G1 PASS probability
- **Path B**(Cohere rerank tweak)— OUT of W29 scope per user Surgical pick(potential H1 boundary)
- **Path C**(Wire reformulator into eval/orchestrator)— ~4-6h work,closes H4 systemic gap,but does NOT solve G1
- **Path D**(No-op + PARTIAL closeout)— accept reality;reasonable enumerate-from-intro answer + PARTIAL closeout per Q4
- **Path E**(A + C combined)— ~8-10h work,thorough close

---

## Day 0 cont — 2026-05-26 (F3 Path A + F4 closeout)

### F3 Path A execution

**Iteration 1**(v1)— `QUERY_EXPANSION_PER_VARIANT_OVERFETCH=4→8` + `QUERY_EXPANSION_RRF_K=60→30` via `.env` env override + backend reload via `touch backend/storage/settings.py` WatchFiles auto-reload。Single curl test:**citations=2 with §8.4 chunk-0051 cited**(first-ever post-W25 D4)。

**Iteration 2**(v2)— more aggressive `4→12` + `60→15`。Single curl test:**regression**(citations=1 only intro-chunk;top-5 still had §8.4 but synthesizer didn't cite)。`k=15` too aggressive — top-rank-in-each-variant 過重 → intro-chunk RRF dominance restored。

**v1 reverted + 5-run reproducibility test**:

| Run | Citations | Walkthrough cited | §8.x in top-5 | Cited IDs |
|----:|----------:|------------------:|--------------:|-----------|
| 1   | 1         | 0                 | 0             | 0044 |
| 2   | 2         | **1 (§8.4)** ✅  | 1             | 0044/**0051** |
| 3   | 1         | 0                 | 0             | 0044 |
| 4   | 1         | 0                 | 0             | 0044 |
| 5   | 1         | 0(但 top-5 有 §8.4) | 1            | 0044 |

**Aggregate**:
- Walkthrough chunk surfaced top-5:**2/5 = 40%**(+40pp vs pre-tune baseline 0%)retrieval-side improvement ✅
- Walkthrough chunk cited:**1/5 = 20%**(+20pp vs pre-tune 0%)synthesizer-side marginal improvement
- Run 5 critical:§8.4 chunk-0051 surfaced top-5 但 synthesizer 只 cite chunk-0044 intro → **synthesizer-side cite-decision bottleneck**

### G1 PRIMARY gate evaluation

- G1 strict (≥ 2 distinct §8.x walkthrough citations):**0/5 = 0% STRICT FAIL** ❌
- G1 relaxed (≥ 1 §8.x walkthrough cited):1/5 = 20% marginal
- G1 relaxed^2 (any §8.x surfaced top-5):2/5 = 40% confirmed retrieval improvement

### F4 closeout — PARTIAL per Q4 measurement-experiment-fail-policy

User F4 AskUserQuestion Recommended pick:**F4 PARTIAL closeout per Q4 + path (i) synthesizer prompt elevate W30+**(redirected from original (ii) CRAG threshold per Run 5 synthesizer-cite-bottleneck evidence)。

### Decisions logged

- **D29.F3.1**:Path A v1(overfetch=8 + rrf_k=30)final tune values — `.env` env override **PRESERVED**(net positive +40pp retrieval improvement;NEW W30+ baseline)
- **D29.F3.2**:Settings.py defaults **UNCHANGED**(per Q4 measurement-experiment-fail-policy — G1 strict 0/5 FAIL ≠ clear measurable production win)
- **D29.F3.3**:Path v2(overfetch=12 + rrf_k=15)**rejected** — too aggressive regression evidence
- **D29.F4.1**:Phase Gate G1-G5 verdict = **PARTIAL** per Q4
- **D29.F4.2**:**NEW W30+ candidate (i')** synthesizer prompt tune elevated HIGHEST priority(per Run 5 evidence — synthesizer cite-layer surgical bottleneck identified;原 path (ii) CRAG threshold降至 second priority — H1 boundary higher risk)
- **D29.F4.3**:**NEW W30+ candidate (k)** wire reformulator into `backend/eval/orchestrator.py` — close H4 systemic gap(per F2 evidence;separate axis from G1)

---

## Retrospective

### 1. Phase status

**PARTIAL closeout** per Q4 measurement-experiment-fail-policy:
- G1 strict (≥ 2 §8.x walkthrough citations) — 0/5 FAIL
- G2 pytest regression — N/A no code change
- G3 ruff/mypy — N/A no code touched
- G4 audit evidence committed ✅(F1 5 outputs + F2 root cause + F3 multi-run report)
- G5 fail-policy applied ✅(PARTIAL closeout + W30+ (i') elevate)

### 2. What worked

- **R6 Day 0 recursive grep verify caught path (iii) already-shipped** before any code change → saved 2-3 days of redundant reformulator prompt strengthening work(W25 F3 D4 EXAMPLE 3 line 78-84 already covers Q-W25-I07 specific decomposition)
- **F1 5 audit sub-deliverables completed same-day** per W22-W28 AI compression pattern — Langfuse API + Azure Search corpus listing + Backend `/query` direct call all unblocked
- **F2 root cause classification disambiguated W26-W28 G3 marginal MISS** — H4 NEW eval coverage gap finding(eval/orchestrator.py bypasses reformulator entirely;W26-W28 eval verdict reflect single-query baseline NOT reformulator-path performance)
- **F3 Path A iterative tuning**(v1 → v2 → v1 reverted)demonstrated **+40pp retrieval-side improvement** confirmed — first-ever §8.x walkthrough top-5 surface post-W25 D4

### 3. What didn't work

- **Standalone reformulator test 3/3 APIConnectionError** — corp proxy intercepts new Python httpx processes;Langfuse API + backend `/query` curl 路徑成功 confirmed backend reformulator IS working(93% success rate per 14/15 obs)。Standalone test artifact 反而 misleading — should have invested earlier in Langfuse API audit instead of standalone
- **v2 Setting tune regression**(overfetch=12 + rrf_k=15)— RRF k=15 too aggressive restored intro-chunk dominance;v1 (overfetch=8 + rrf_k=30) remains best
- **G1 strict (≥ 2 walkthrough) acceptance criteria 過高** — synthesizer-side cite-decision layer is the remaining cap;path (i) synthesizer prompt elevation needed

### 4. Surprises

- **Synthesizer refuse pattern naturally disappeared**(W25 D4「refused: True」→ W29 D0「refused: False」)— W25.5 BUG-025 symmetric deboost + W26-W28 retrieval cumulative improvement closed refuse without explicit synthesizer prompt tune。 W19+ candidate (g) original framing as「Synthesizer enumeration-refuse fix」 已 self-closed since W25.5
- **Reformulator EXAMPLE 3 EXACT match §8.1 corpus chunk_title 4-word literal**(「Customer service request submission」)— eval-set-v0-w25-supplement.yaml comment line literally describes this vocab so reformulator prompt author was aware of corpus structure;but RRF + Cohere rerank pipeline still 不夠 friendly to specific-vocab variants 對 token-dense intro chunks
- **Run 5 chunk-0051 surfaced top-5 但 synthesizer 未 cite** — synthesizer prompt 唔 reliably 用 surface chunks for citations even when retrieval succeeds;cite-confidence layer係 unmitigated bottleneck

### 5. Carry-overs to W30+(rolling JIT NOT pre-created)

- **(i')** NEW HIGHEST priority — Synthesizer system prompt tune(option A「synthesize from collective context」instruction / option B cite-confidence threshold relax / option C「prefer §X.Y specific chunks over §X overview chunks」directive)— 估 ~2-3 days
- (ii)** Path (ii) CRAG threshold trial — H1 boundary route — STOP+ask + ADR-route — downgrade to second priority per W29 evidence
- **(k)** NEW Wire reformulator + fused_retrieve into `backend/eval/orchestrator.py` — close H4 systemic gap — eval-side measurement infrastructure improvement(~4-6h)— separate axis from G1
- (c) RAGAs orchestrator-aware judge tune per R-W26-2 — 大幅降低 priority(W28 already closed G1+G2+G4+G5;只 trigger 若 W30+ (i') 完 producing G3 full PASS evidence)
- (d) F3 query expansion standalone test — subsumed by W29 F1.1+F1.2 audit
- NEW (e) `make_ragas_evaluator` structlog stage emit — operability axis retained
- NEW (f) `tests/test_settings_defaults.py` — quick win retained
- BUG-026 UI count + BUG-027 cosmetic / W22 D8 setup.md §8.6 / W16 F1-F4 Track A IT cred — parallel track

### 6. ADR triggers

- **No NEW ADR ship** per W29 PARTIAL closeout — Settings.py defaults unchanged(per Q4 measurement-experiment-fail-policy);`.env` env override preserved as local-dev baseline
- **ADR-0034 NOT amended** — reformulator prompt + framework unchanged;Settings defaults `query_expansion_per_variant_overfetch=2` + `query_expansion_rrf_k=60` preserved

### 7. Process improvements / preventive controls

- **PC-W29-1**:R6 Day 0 grep verify saved ~2-3 days redundant work — formalize 「check existing implementation BEFORE proposing strengthening」pattern in PROCESS.md(W30+ candidate)
- **PC-W29-2**:Langfuse API audit + backend `/query` direct call > standalone Python script for backend behavior verification — standalone vulnerable to corp proxy intercept(ADR-0017 R8 pattern);prefer backend already-running process direct probe
- **PC-W29-3**:eval pipeline coverage gap detection — when phase plan involves「ADR-NNNN framework should affect G3」,verify framework IS wired into eval orchestrator BEFORE relying on eval G3 verdict(W29 H4 catch:W26-W28 eval verdict 系 reflective of single-query baseline NOT reformulator-path performance)

---
