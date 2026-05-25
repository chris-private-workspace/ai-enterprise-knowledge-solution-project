---
phase: W27-parent-doc-dispatch-experiment
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed_partial    # per ADR-0038 W27 F3 closeout 2026-05-25 D3 — Phase Gate PARTIAL per plan §3 policy
---

# Phase W27 — Progress

> Daily progress + 結尾 retro。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。

---

## Day 0 — 2026-05-25:Kickoff

**Action**:Phase W27 kickoff post W26 PARTIAL closeout
- Templates copied from `_templates/phase/` + W26 closed-phase conventions referenced(per CLAUDE.md §10.2「起草新 plan/checklist 必先讀『最近一個 closed phase』樣板」)
- `plan.md` drafted with 7-section structure + frontmatter `status: draft` + §2 F0-F3 deliverables + §3 G1-G6 + §4 R1-R5 + §5 D0-D3 + §6 W26 carry-overs + §7 Changelog
- `checklist.md` derived from plan §2 deliverables(atomic items;F0 kickoff partially ticked + F1-F3 pending)
- `progress.md` Day 0 entry(本 entry)
- Chris 3-question AskUserQuestion approval pick(2026-05-25):
  - Q1 phase 命名 = `W27-parent-doc-dispatch-experiment`(Recommended)
  - Q2 Setting 設計 = Enum `parent_doc_dispatch_mode` "replace"|"append"(Recommended)
  - Q3 G eval baseline = Both(F1 W26 D1 no-parent-doc + W26 F2 G replace mode)(Recommended)
- Trigger memo:W26 closeout retro `Next phase candidates` 候選 (a) Dispatch chain append-vs-replace 實驗 — R-W26-1 — 最直接解 RAGAs judge mismatch

**F0 R6 Pre-Active-Flip 5-Step Recursive Grep Verification**(per CLAUDE.md §10 R6):

執行重點:`prompt_builder.py` dispatch chain 同 ADR-0037 §229 wording 對齊 verified,W22 D9 plan-text-contamination 防範。

| R6 step | Action | Finding |
|---|---|---|
| Step 1 | Read plan literal acceptance criteria | F1 acceptance §A-§E + render strategy ambiguity surfaced |
| Step 2 | Grep code base for referenced files / functions / patterns | `backend/generation/prompt_builder.py:55-59` `or` chain — `chunk.fields.get("parent_section_text") or chunk.fields.get("expanded_text") or chunk.fields.get("chunk_text", "")` confirmed replace semantics(top-priority-wins);ADR-0037 §229 wording「dispatch chain `parent_section_text > expanded_text > chunk_text`」consistent |
| Step 3 | Surface mismatches via Karpathy §1.1 think-before-coding upfront | 2 NEW findings:(a) 規模 estimate ~50 LOC adjust upward ~80-120 LOC reflecting conditional rendering + ≥ 3 NEW unit tests + optional observability emit;(b) render strategy ambiguity F1 D1 R6 sub-verify before active flip(Option (i) single chunk header + delimiter sub-section vs Option (ii) 2 chunk entries)|
| Step 4 | Document deviations in plan §7 changelog at plan kickoff | `plan.md` §7 Plan Changelog Day 0 entry 2026-05-25 documented 2 findings + Option (i) Karpathy §1.2 simplicity defaulting |
| Step 5 | Adjust acceptance criteria per actual reality | F1 §B.2 acceptance 加 R6 sub-verify pre-active-flip + Option (i) defaulting;F1 §C.1-§C.4 ≥ 3 NEW unit tests + (optional) 4th citation invariant test(對應 規模 estimate) |

**R6 result**:0 historical surface contamination(per W22 D9 anti-pattern prevention);experiment-scoped wording grounded in W26 retro empirical finding;regime alignment confirmed。

**Carry-over from W26 retro**:
- R-W26-1 Dispatch chain append-vs-replace experiment(本 phase 直接 address)
- R-W26-2 RAGAs faithfulness judge orchestrator-aware tune(本 phase F2 G result FAIL → W28+ candidate (c) elevated)
- W26 F1 baseline `baseline-metrics-W26-D1.md` + W26 F2 G replace `parent-doc-metrics-W26-D5.md` 作 F2 G baseline references
- W26 F2 existing 7 dispatch tests `test_prompt_builder_dispatch.py`(F1 regression-guard)
- ADR-0037 §229 dispatch chain wording + `prompt_builder.py:55-59` 實作對齊(F0 R6 verified)

**Commit**:`5a6aab5` — `docs(planning): kickoff W27-parent-doc-dispatch-experiment`(4 files / +541 / -1 — plan.md + checklist.md + progress.md + session-start.md §10 timeline row append)

---

## Day 1 — 2026-05-25:F1 implementation landed

### Done

- F1 D1 R6 sub-verify locked Option (i) single chunk header + `Parent section context:` delimiter sub-section per Chris AskUserQuestion Recommended pick(plan §4 R4 mitigation closed before active flip)
- F1 A:`backend/storage/settings.py` NEW field `parent_doc_dispatch_mode: Literal["replace", "append"] = "replace"`(line 223;default preserves W26 F2 G semantics per Q4 measurement-experiment-fail-policy)
- F1 B:`backend/generation/prompt_builder.py` `_format_chunk` 函數 branch on `dispatch_mode` keyword-only parameter:
  - `"replace"` branch — preserve `or` chain top-priority-wins semantics(`parent_section_text > expanded_text > chunk_text`)— W26 F2 G behavioral parity preserved
  - `"append"` branch — render 2-segment format:anchor `chunk_text` 主段 + `Parent section context:` delimiter + parent_section_text 段;若 `parent_section_text` falsy → 退回 replace chain `expanded_text > chunk_text`
  - `build_prompt(...)` signature extended `*, dispatch_mode: str = "replace"`(backward-compat preserved by default for all 11 existing test sites)
- F1 B wire:`backend/generation/synthesizer.py` 2 call sites(`synthesize` + `synthesize_stream`)wire `dispatch_mode=get_settings().parent_doc_dispatch_mode` via lru_cached singleton(production code path picks Settings value at runtime;no Synthesizer constructor change per Karpathy §1.3 surgical)
- F1 C:4 NEW unit tests in `backend/tests/test_prompt_builder_dispatch.py`(7 existing W26 F2 tests preserved bit-identical;total 11):
  - `test_format_chunk_dispatch_replace_mode_preserves_w26_semantics` — regression-guard
  - `test_format_chunk_dispatch_append_mode_includes_both_segments` — core hypothesis test
  - `test_format_chunk_dispatch_append_mode_no_parent_section_falls_back_to_replace_chain` — falsy fallback
  - `test_format_chunk_dispatch_append_mode_citation_chunk_id_preserved` — citation invariant verification
- F1 D:**11/11 dispatch tests PASS + 14/14 synthesizer tests PASS**(25/25 touched-test-set);ruff check clean + ruff format auto-fix applied(3 files cosmetic reformat — `Text` block + `user_msg` f-string compaction);mypy 18 pre-existing W26 baseline errors per `CO_W25_mypy_strict_debt`(NOT W27 caused)
- Render strategy decision locked Option (i) per Chris AskUserQuestion Recommended pick;preview format example:
  ```
  [chunk-abc123] Title
    Section: Doc > §8 > Scenario A
    Text: <anchor chunk_text raw>
  
    Parent section context:
    <parent_section_text 1500 tokens aggregated>
  ```

### Decisions / OQ Resolved

- F1 D1 design decision:Approach B(`dispatch_mode` keyword-only parameter to `_format_chunk` + `build_prompt`)over Approach A(read Settings inside `_format_chunk`)per Karpathy §1.2 testable + decouples Settings IO;backward-compat 由 default `dispatch_mode="replace"` 保留 existing 11 callers(synthesizer 2 sites explicitly wire production Settings;tests + other call sites preserve W26 default behavior)
- No OQ resolved this Day

### Blockers

- 無 D1 blocker。R8 prerequisite check 屬於 F2 D2 scope(Azure OpenAI judge + Cohere v4.0-pro reranker key environment)— defer to F2 active flip

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| F1 A Setting addition | ~0.5 | ~0.5 | 0 |
| F1 B prompt_builder branching + synthesizer wire | ~2 | ~1.5 | -0.5(synthesizer wire 比預期 simpler — `get_settings()` lru_cached singleton 已存在)|
| F1 C 4 NEW unit tests | ~1.5 | ~1 | -0.5 |
| F1 D code quality gates | ~1 | ~1 | 0 |

**D1 actual**:~4h vs ~5h planned(per W22-W26 AI compression pattern ~25× real-calendar collapse)

### Commits

- Backend pytest full regression check **1060 passed + 25 skipped + 0 failed** in 3m42s(W26 baseline 1056 → +4 net IMPROVED matches 4 NEW W27 F1 dispatch tests;regression 0)
- (pending F1 commit `feat(generation): W27 F1 dispatch mode enum + append branch + 4 NEW unit tests per ADR-0037 amendment candidate`)

---

## Day 2 — 2026-05-25:F2 G RAGAs eval landed PARTIAL

### Done

- F2 A R8 prerequisite check — keys present + W26 D5 same-day environment continuity confirmed(per Chris AskUserQuestion Recommended pick W27 D2)
- F2 B active flip — `.env` append-only 3 lines(`# W27 F2 active flip` marker + `ENABLE_PARENT_DOC_RETRIEVAL=true` + `PARENT_DOC_DISPATCH_MODE=append`)+ kill 3 orphan uvicorn workers(per W22 D8 stale pattern)+ fresh restart via `python -m api.server`(SelectorEventLoop fix per `api/server.py:343` Windows-compatible entry — initial `python -m uvicorn` attempt fail with `psycopg.InterfaceError ProactorEventLoop` — corrected pattern per W22 D8 finding)
- F2 B initial POST `/eval/run` HTTP 401 unauthorized(missing Bearer)— diagnosed:`feature_auth_mock=true` already enabled per `.env` → Bearer `dev-token` 加入 → HTTP 200 + 544s runtime(~9 min,close to W26 D5 492s precedent)
- F2 C aggregated metrics(raw JSON `append-mode-metrics-W27-D2-raw.json`):
  - **recall_at_5 0.8936**(F1 baseline 0.8744 / W26 F2 G 0.8744 = **+1.92pp** both)
  - **faithfulness 0.9591**(F1 0.9851 = **-2.60pp** | W26 F2 G 0.9015 = **+5.76pp**)
  - **correctness 0.7594**(F1 0.7416 = **+1.78pp** ✅ | W26 F2 G 0.6804 = **+7.90pp** ✅)
  - **p95_latency 2897ms**(F1 1001ms = +189.4% | W26 F2 G 1188ms = +143.9% ⚠️ 2-segment LLM input cost)
- F2 D Phase Gate G1-G5 evaluation:
  - **G1 MARGINAL MISS**:faithfulness 0.9591 vs F1 ±2pp [0.9651, 1.0] = 0.6pp below tolerance
  - **G2 PASS** ✅:correctness 0.7594 within [0.7216, 0.7616] + above F1 baseline
  - **G3 PASS** ✅:Q-W25-I07 PASSED(out of failed_queries — D1.35 hypothesis citation invariant CRITICAL RECOVERY from W26 F2 G 0.00/0.00)
  - **G4 MARGINAL MISS**:Q-W25-I01 control answer_relevancy 0.64 vs F1 ≥ 0.65 effective = 0.01pp below tolerance(W26 F2 G 0.54 大幅 +10pp recovery)
  - **G5 PASS** ✅:pytest 1060 + ruff clean + dispatch tests 11/11 + W27 F1 commit `50b1db5`
- F2 E `append-mode-metrics-W27-D2.md` analysis report with 6 sections:集合指標 two-baseline delta + per-query 比較 + Phase Gate G1-G6 evaluation + D1.35 hypothesis 4-axis root cause re-evaluation + W28+ candidate prioritization + F3 closeout recommendation

### Decisions / OQ Resolved

- **Phase Gate verdict**:**PARTIAL** per plan §3 policy(G1 + G4 marginal MISS → ADR-0038 new + W28+ candidates (b) + (c) elevated)
- **D1.35 hypothesis 4-axis re-evaluation**:
  - H1 Citation invariant breakage:✅ **VALIDATED PARTIAL** by Q-W25-I07 critical recovery
  - H2 Parent section attention dilution:⚠️ **PARTIALLY CONFIRMED** by G4 control regression remains + 2 NEW context_precision fails + p95_latency +189% evidence
  - H3 Q-W25-I07 REFUSAL_PHRASE/chunk_id drift:✅ **REFUTED** — Q-W25-I07 完整 recovery proves chunk_id drift 唔係 root cause
  - H4 Dispatch replace-vs-append architectural variable:✅ **VALIDATED** — faith +5.76pp / correctness +7.90pp / Q-W25-I07 全 recovery vs W26 F2 G
- **W28+ candidate prioritization**(per F3 closeout decision tree):
  1. HIGHEST(b)`max_tokens_per_parent` 4000→2000/1500 sweep — H2 attention dilution direct intervention + latency reduction
  2. Second(c)RAGAs orchestrator-aware judge tune(R-W26-2)— H1+H2 from judge side
  3. Third(d)F3 query expansion standalone test — ADR-0034 orthogonal axis

### Blockers

- 無 D2 blocker。F3 closeout ready

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| F2 A R8 prerequisite check | ~0.5 | ~0.3 | -0.2 |
| F2 B `.env` flip + uvicorn restart + auth recovery | ~1 | ~1.2 | +0.2(uvicorn entry point + auth Bearer diagnose surcharge)|
| F2 C eval run 13 queries | ~8-10 min(eval runtime)| 9 min | 0 |
| F2 D Phase Gate G1-G5 evaluation | ~1 | ~0.5 | -0.5 |
| F2 E analysis report 6-section | ~2 | ~1.5 | -0.5 |

**D2 actual**:~3.5h(eval runtime included)vs ~4-6h planned

### Commits

- (pending F2 commit `docs(eval): W27 F2 G RAGAs append mode delta vs F1 + W26 F2 G baselines — G1+G4 marginal MISS / G2+G3+G5 PASS / Phase Gate PARTIAL`)

---

## Day 3 — 2026-05-25:F3 closeout PARTIAL + cross-doc sync

### Done

- **NEW ADR-0038 ship** — `docs/adr/0038-parent-doc-dispatch-append-mode-finding.md` Accepted documents:
  - Phase Gate G1-G6 verdict PARTIAL(G1 + G4 marginal MISS by <1pp / G2 + G3 + G5 PASS)
  - D1.35 hypothesis 4-axis re-evaluation:H1 + H4 validated / H2 partially confirmed(emerging primary residual)/ H3 refuted by Q-W25-I07 critical recovery
  - Settings default preserve `parent_doc_dispatch_mode="replace"` per Q4 measurement-experiment-fail-policy + Karpathy §1.3 surgical
  - W28+ candidate prioritization:(b) `max_tokens_per_parent` 4000→2000/1500 sweep [HIGHEST]+ (c) RAGAs orchestrator-aware tune per R-W26-2 [Second]+ (d) F3 query expansion standalone test [Third]
  - 3 Alternatives rejected:Option B ADR-0037 amendment ship default flip(marginal regression vs F1 + latency +189% trade-off)/ Option C revert W27 F1 changes(erases D1.35 H4 empirical evidence + W28+ enabler lost)/ Option D silent default flip(R5 governance violation)
- **`docs/adr/README.md` index sync** — ADR-0038 row append + footer next-NNNN 0038→0039 update
- **`.env` cleanup** — W27 F2 marker block(3 lines)removed per ADR-0038 §Decision #3;`.env` reconstructed after PowerShell `Out-File -NoNewline` corrupted single-line incident(110 lines proper structure restored,**.env仍 gitignored 不入 commit per H5**)
- **plan.md frontmatter** — `status: active → closed_partial` per Q4 measurement-experiment-fail-policy(W26 PARTIAL precedent)
- **plan.md §7 Plan Changelog** — Day 3 closeout entry append documenting Phase Gate verdict + D1.35 hypothesis re-evaluation + W28+ priority
- **checklist.md F3 + cross-cutting** — all `[x]` ticked / N/A items marked with reason
- session-start.md §10 + §11 update + RISK_REGISTER R-W26-1 + COMPONENT_CATALOG C05 — (pending,batched into closeout commit)

### Decisions / OQ Resolved

- **F3 closeout pathway**:Phase Gate PARTIAL → **NEW ADR-0038 ship documents finding**(Settings default preserve "replace" — non-revert path per Q4 measurement-experiment-fail-policy)
- **W28+ priority queue locked**:(b) `max_tokens_per_parent` sweep > (c) RAGAs orchestrator-aware tune > (d) F3 query expansion standalone test
- No OQ resolved this Day

### Blockers

- 無 D3 blocker。`.env` corruption incident recovered cleanly(110 lines restored + W27 marker cleanup confirmed via `grep -c`=0)

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| F3 A ADR-0038 ship + README index sync | ~1.5 | ~1 | -0.5 |
| F3 B plan/checklist/progress cross-doc sync | ~1 | ~0.7 | -0.3 |
| F3 C `.env` cleanup + reconstruction incident | ~0.2 | ~0.5 | +0.3(PowerShell `Out-File -NoNewline` corrupt incident + Write tool restoration 110 lines per W25 D2.4 newline-handling-on-Windows lesson)|

**D3 actual**:~2.2h vs ~2-3h planned

### Commits

- (pending F3 closeout commit `docs(planning): W27 closeout PARTIAL — F2 G append mode marginal MISS G1+G4 / critical recovery G3 (Q-W25-I07) / ADR-0038 ship + cross-doc sync`)

---

## Retro(填於 phase 結束)

### What worked

- **Same-day collapse pattern preserved**(~25-30× real-calendar collapse per W22-W26 pattern):~3 actual days condensed across 2026-05-25(F0 + F1 + F2 + F3 same-day)
- **R6 recursive verify Day 0 surfaced 2 findings upfront**:scale estimate adjust(~50→80-120 LOC)+ render strategy ambiguity(Option (i) vs (ii))= prevents W22 D9 plan-text-contamination + W23+ post-fact patching
- **Both-baseline comparison(F1 + W26 F2 G)**delivered cleanest signal:append mode +5.76pp faithfulness vs replace + Q-W25-I07 critical recovery = unambiguous D1.35 H4 validation
- **Karpathy §1.2 simplicity preserved**:single-variable experiment scope(只測 dispatch_mode `replace` vs `append`)+ Option (i) render strategy(single chunk header vs 2 entries)= clean isolated signal
- **W26 F2 G existing 7 dispatch tests preserved bit-identical**:`dispatch_mode="replace"` default 嘅 backward-compat assured;regression-guard 全 11 tests PASS post-W27 changes
- **`get_settings()` lru_cached singleton wire pattern**:synthesizer.py 2 sites surgical change(Karpathy §1.3 — no Synthesizer constructor signature change,no ripple to 11 callers)

### What didn't work / unexpected friction

- **uvicorn entry point confusion**:initial `python -m uvicorn api.server:app` failed with `psycopg.InterfaceError ProactorEventLoop` — Windows ProactorEventLoop × psycopg async incompatibility per W22 D8 stale pattern;correct entry per `api/server.py:343` comment = `python -m api.server`(bypasses uvicorn.Server.run() → uses asyncio.run + SelectorEventLoop)。Recovery <5min once read code comment but surfaces W22 D8 setup.md §8.6 limitation:operational workflow doc未 mention correct entry point(W23 §8.6 + §8.7 cover process kill + test infra but not entry)
- **HTTP 401 unauthorized on /eval/run**:initial POST failed without Authorization header;`FEATURE_AUTH_MOCK=true` already in `.env` so just need Bearer `dev-token` — recovery <2min but surfaces operational gap:dev-token Bearer pattern 未 documented 喺 evaluator API contract
- **`.env` PowerShell corruption incident**:`Out-File -NoNewline` 連 newline 都 strip 咗,將 `.env` 110 lines collapsed 到 1 line。Recovery via Write tool with Read-recovered content(W25 D2.4 PowerShell newline-handling lesson 重演 — `-NoNewline` flag 危險!)。Future:`.env` 修改用 Add-Content append-only OR Python `\n.join()` rebuild,**唔可以**用 `Out-File -NoNewline`

### Surprises / discoveries

- **Q-W25-I07 critical synthesizer recovery**(W26 F2 G 0.00/0.00 → W27 PASS):直接 empirical proof of D1.35 H1 citation invariant breakage hypothesis;append mode preserving anchor chunk_text 喺 LLM input = RAGAs faithfulness judge mismatch eliminated for this query class
- **recall_at_5 +1.92pp unexpected positive**:retrieval-side metric 應該不變(append 只改 LLM prompt rendering),但 W27 0.8936 vs F1+W26 F2 G 0.8744 — likely eval set 量度 嘅 query-class distribution shift(possibly Q-W25-I07 unblocks pass criteria that affects aggregate stat)— need W28+ Setting sweep cross-check
- **p95_latency +189% trade-off**:2-segment LLM input + 30-40% token growth per query → directly trade off latency vs faithfulness recovery;若 W28+ (b) `max_tokens_per_parent` 4000→1500 sweep close latency gap = potentially close G1 + G4 marginal MISS 同時
- **H3 chunk_id drift refuted**:Q-W25-I07 PASS in append mode proves W26 F2 G 嘅 0.00 source 係 citation invariant breakage(LLM cite parent siblings outside top-5),not chunk_id drift。Refined hypothesis ceiling clearer for W28+ design

### Carry-overs to W28+

- **(b) `max_tokens_per_parent` 4000→2000/1500 sweep [HIGHEST priority]** — H2 attention dilution direct intervention + latency reduction;~3-5 days plan estimate
- **(c) RAGAs orchestrator-aware judge tune per R-W26-2 [Second]** — H1+H2 address from judge side(judge consume parent_section_text reference);~5-7 days plan estimate
- **(d) F3 query expansion standalone test per ADR-0034 [Third]** — orthogonal axis;~3 days
- **W27 F1 infrastructure preserved as W28+ enabler**:Setting + branch + 4 NEW unit tests 全部 ship 保留;default OFF state means production behavior unchanged
- **W28+ NOT pre-created per rolling JIT(CLAUDE.md §10 R1)**;next session 由 user 揀 candidate
- **BUG-027 `/health._check_cohere` engine.reranker private attr drift** — W26 D1 cosmetic surfaced again at W27 D2;W28+ Sev3-4 BUG-fix candidate
- **W22 D8 setup.md §8.6 update candidate**:加 row 解釋 uvicorn correct entry point `python -m api.server`(NOT `python -m uvicorn`)on Windows per ADR-0023 psycopg async incompatibility — operational workflow doc completion

### ADR triggers

- ✅ **ADR-0038 ship**(2026-05-25 D3)— parent-doc dispatch append-mode finding;Settings default preserve "replace" per Q4 measurement-experiment-fail-policy;W28+ candidates (b) + (c) elevated
- N/A ADR-0037 amendment — not triggered(marginal MISS 唔達 measurable significant win threshold per ADR-0017 5-amendment precedent;append mode 可 W28+ (b) PASS 後再評估)

### Phase Gate result

- **G1**:⚠️ **MARGINAL MISS 0.6pp** — faithfulness 0.9591 vs F1 ±2pp [0.9651, 1.0]
- **G2**:✅ **PASS** — correctness 0.7594 within [0.7216, 0.7616] + above F1 baseline
- **G3**:✅ **PASS** — Q-W25-I07 out of failed_queries(critical synthesizer recovery from W26 F2 G 0.00/0.00)
- **G4**:⚠️ **MARGINAL MISS 0.01pp** — Q-W25-I01 control answer_relevancy 0.64 vs F1 ≥ 0.65 effective
- **G5**:✅ **PASS** — pytest 1060 + 25 skipped + 0 failed / ruff clean / dispatch tests 11/11 / mypy delta 0(18 pre-existing W26 baseline errors per CO_W25_mypy_strict_debt 維持)
- **G6**:✅ **PASS** — measurement-experiment-fail-policy applied(Settings default preserve "replace" 唔觸 revert per ADR-0038 §Decision #1)

**Aggregate verdict**:**Phase Gate PARTIAL** per plan §3 policy(G1 + G4 marginal MISS by <1pp each → ADR-0038 new ship + W28+ candidates (b) + (c) elevated)

### Phase status

- Closeout commit:(pending — F3 cascade pending session-start.md + RISK_REGISTER + COMPONENT_CATALOG sync)
- Frontmatter status flipped to:`closed_partial`(per Q4 measurement-experiment-fail-policy + W26 PARTIAL precedent)
- Phase W28+ kickoff trigger:next session user picks (b) `max_tokens_per_parent` sweep OR (c) RAGAs orchestrator-aware tune OR (d) F3 query expansion standalone test(rolling JIT per CLAUDE.md §10 R1)

---

## Retro(填於 phase 結束)

### What worked

- (pending)

### What didn't work / unexpected friction

- (pending)

### Surprises / discoveries

- (pending)

### Carry-overs to W28+

- (pending)

### ADR triggers

- (pending — ADR-0037 amendment OR ADR-0038 new ship per G result)

### Phase Gate result

- G1:(pending — append mode aggregate faithfulness vs F1 baseline ±2pp)
- G2:(pending — append mode aggregate correctness vs F1 baseline ±2pp)
- G3:(pending — Q-W25-I07 faithfulness > 0.5)
- G4:(pending — Q-W25-I01 控制組不再 regression)
- G5:(pending — pytest delta + code gates green)
- G6:(automatic — measurement-experiment-fail-policy applied per Q4)

### Phase status

- Closeout commit:(pending)
- Frontmatter status flipped to:(pending — `closed` 若 PASS / `closed_partial` 若 FAIL)
- Phase W28+ kickoff trigger:(pending — depends on G result + Chris pick on next candidate)

---

**End of W27 progress**
