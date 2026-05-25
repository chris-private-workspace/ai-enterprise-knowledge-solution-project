---
phase: W27-parent-doc-dispatch-experiment
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: in-progress
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

## Day 3 — 2026-05-25(planned)

### Done

- (pending — F3 closeout + ADR amendment OR ADR-0038 + cross-doc sync)

### Decisions / OQ Resolved

- (pending)

### Blockers

- (pending)

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|

### Commits

- (pending)

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
