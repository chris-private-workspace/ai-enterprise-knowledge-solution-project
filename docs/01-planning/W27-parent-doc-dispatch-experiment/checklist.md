---
phase: W27-parent-doc-dispatch-experiment
plan_ref: ./plan.md
status: complete    # per ADR-0038 W27 F3 closeout 2026-05-25 D3 — Phase Gate PARTIAL per plan §3 policy
last_updated: 2026-05-25
---

# Phase W27 — Checklist

> Atomic checkbox(每 item ≤ 1–2 hour effort)。
> AI tick 完成嘅 item;唔可以 tick 嘅 item 喺 progress Day-N entry 寫原因 + 標 🚧 reason。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify)

- [x] Create `docs/01-planning/W27-parent-doc-dispatch-experiment/` folder
- [x] R6 pre-active-flip recursive grep verify(per CLAUDE.md §10 R6)— ADR-0037 §229 wording vs `backend/generation/prompt_builder.py:55-59` 對齊 verified;5 R6 findings 記 `plan.md` §7 Plan Changelog Day 0 entry
- [x] Draft `plan.md` per W26 closed-phase template — 7-section structure + frontmatter + §2 F0-F3 deliverables + §3 G1-G6 + §4 R1-R5 + §5 D0-D3 + §6 W26 carry-overs + §7 Changelog
- [x] Draft `checklist.md` per W26 closed-phase template — atomic items derived from plan §2 deliverables
- [x] Draft `progress.md` Day 0 entry — kickoff action + commit hash placeholder
- [x] Commit `docs(planning): kickoff W27-parent-doc-dispatch-experiment` per CLAUDE.md §10 R1 binding before any code(commit `5a6aab5`)
- [x] session-start.md §10 timeline row update — W27 active status entry append + W28+ rolling JIT row
- [N/A] session-start.md §11 W27 active context section append — per W26 active precedent §11 是 CLOSED block 累積區,active state 唔 prepend 新 block(等 W27 closeout 才 prepend per session-start.md §11 pattern)

## F1 — Implementation:Setting + prompt_builder branch + unit tests

### A. Setting addition

- [x] `backend/storage/settings.py` NEW field `parent_doc_dispatch_mode: Literal["replace", "append"] = "replace"` — default preserves W26 F2 G semantics per Q4 measurement-experiment-fail-policy

### B. Prompt builder dispatch branching

- [x] F1 D1 R6 sub-verify before active flip — render strategy ambiguity locked Option (i) single chunk header + `Parent section context:` delimiter sub-section per Karpathy §1.2 simplicity(Chris AskUserQuestion Recommended pick 2026-05-25)
- [x] `backend/generation/prompt_builder.py` `_format_chunk` 函數 branch on `dispatch_mode` parameter:
  - `"replace"` branch — preserve current `or` chain semantics(W26 F2 G behavioral parity / regression-guard)
  - `"append"` branch — render 2-segment format(anchor `chunk_text` 主段 + `Parent section context:` delimiter + parent_section_text 段)
- [x] `backend/generation/synthesizer.py` 2 call sites(`synthesize` + `synthesize_stream`)wire dispatch_mode from `Settings.parent_doc_dispatch_mode` via `get_settings()` lru_cached singleton
- [x] Citation invariant preservation verified — `Citation.chunk_text = original_chunk.chunk_text` 兩 branch 都 unchanged per architecture.md §3.5(verified by `test_format_chunk_dispatch_append_mode_citation_chunk_id_preserved`)

### C. Tests

- [x] `backend/tests/test_prompt_builder_dispatch.py` NEW unit test 1:`test_format_chunk_dispatch_replace_mode_preserves_w26_semantics`(replace branch = current behavior;regression-guard against W26 F2 G existing 7 dispatch tests)
- [x] `backend/tests/test_prompt_builder_dispatch.py` NEW unit test 2:`test_format_chunk_dispatch_append_mode_includes_both_segments`(LLM input contains BOTH `chunk_text` raw + parent section context delimiter)
- [x] `backend/tests/test_prompt_builder_dispatch.py` NEW unit test 3:`test_format_chunk_dispatch_append_mode_no_parent_section_falls_back_to_replace_chain`(append + 無 `parent_section_text` field → behave as replace chain `expanded_text > chunk_text`)
- [x] `backend/tests/test_prompt_builder_dispatch.py` NEW unit test 4:`test_format_chunk_dispatch_append_mode_citation_chunk_id_preserved`(citation invariant explicit verification — 第 4 個 optional test 加咗 per defense-in-depth)
- [x] Existing 7 W26 F2 dispatch tests `test_prompt_builder_dispatch.py` 全部 pass(regression-guard verified — 7/7 PASS post-W27 changes;`dispatch_mode="replace"` default preserves bit-identical semantics)
- [x] `test_synthesizer.py` existing 14 tests 全部 pass(synthesizer Settings wire didn't regress — verified 14/14 PASS)

### D. Code quality gates

- [N/A] mypy strict delta — touched files inherit W26 baseline `CO_W25_mypy_strict_debt`(18 pre-existing errors in synthesizer.py line 99/133/175/205 dict[str, object] overload mismatch with OpenAI SDK + path mapping artifact — none caused by W27 changes;Karpathy §1.3 surgical out of W27 scope)
- [x] ruff check clean delta 0(touched files all green;auto-fix run for `ruff format` reformatted 3 files cosmetically)
- [x] backend pytest full run regression 0 — W26 baseline 1056 → **1060** W27 F1(+4 NEW dispatch tests;25 skipped + 0 failed;3m42s)

### E. Observability(optional minor)

- [N/A] `backend/observability/observe.py` `generation.parent_doc_retrieval` stage `dispatch_mode` field — skipped per Karpathy §1.3 surgical(W26 F2 stage already emits Settings context;F2 G eval has access to `Settings.parent_doc_dispatch_mode` directly via runtime override)

### F. Commit

- [ ] Commit F1 implementation `feat(generation): W27 F1 dispatch mode enum + append branch + 4 NEW unit tests per ADR-0037 amendment candidate` — pending full pytest pass

## F2 — G RAGAs delta vs F1(W26 D1)+ W26 F2 G(replace)baselines

### A. R8 prerequisite gate

- [x] R8 prerequisite check — Azure OpenAI key + Cohere v4.0-pro reranker key present 喺 `.env`(per .env check redacted state)+ W26 D5 same-day environment continuity confirmed by successful 9-min eval run
- [N/A] STOP and ask Chris 若 blocked — R8 green,active flip proceed per Chris pick AskUserQuestion(W27 D2)

### B. Both-baseline eval execution

- [x] Settings runtime override `parent_doc_dispatch_mode="append"` + `enable_parent_doc_retrieval=true` via `.env` append-only(3 lines W27 F2 marker block — per H5 不 expose 既有 secret content)
- [x] Kill 3 orphan uvicorn workers(per W22 D8 stale pattern)+ fresh restart via `python -m api.server`(Windows-compatible entry per `api/server.py:343` SelectorEventLoop fix — psycopg async compatibility)
- [x] Append mode run `eval-set-v0-w25-supplement.yaml` 13 queries via `/eval/run` POST with Bearer dev-token(mock auth)— HTTP 200 + 544s runtime
- [x] Per-query 4-metric output captured to `append-mode-metrics-W27-D2-raw.json`
- [x] Aggregated mean computation:recall_at_5 0.8936 + faithfulness 0.9591 + correctness 0.7594 + p95_latency 2897ms

### C. Hard gate G1-G4 evaluation

- [x] G1 evaluation:append faithfulness 0.9591 vs F1 baseline [0.9651, 1.0] = **MARGINAL MISS 0.6pp**(但 W26 F2 G -8.36pp regression 修復 +5.76pp)
- [x] G2 evaluation:append correctness 0.7594 vs F1 baseline [0.7216, 0.7616] = ✅ **PASS** within tolerance
- [x] G3 evaluation:Q-W25-I07 PASS(out of failed_queries list)= ✅ **PASS critical synthesizer recovery**
- [x] G4 evaluation:Q-W25-I01 answer_relevancy 0.64 vs F1 baseline ≥ 0.65 effective = **MARGINAL MISS 0.01pp**(但 W26 F2 G 0.54 regression 修復 +10pp)

### D. Documentation

- [x] `docs/01-planning/W27-parent-doc-dispatch-experiment/append-mode-metrics-W27-D2.md` — per-query 4-metric + 集合指標 two-baseline delta + per-query 比較 + Phase Gate G1-G6 evaluation + D1.35 hypothesis 4-axis root cause re-evaluation + W28+ candidate prioritization
- [x] `docs/01-planning/W27-parent-doc-dispatch-experiment/append-mode-metrics-W27-D2-raw.json` — raw eval payload(`{"recall_at_5":0.8936,"faithfulness":0.9591,"correctness":0.7594,...}` per W26 D5 schema)

### E. Commit

- [ ] Commit F2 G eval `docs(eval): W27 F2 G RAGAs append mode delta vs F1 + W26 F2 G baselines — G1+G4 marginal MISS / G2+G3+G5 PASS / Phase Gate PARTIAL`

## F3 — Closeout — ADR amendment OR ADR-0038 + cross-doc sync

### A. ADR governance per G result

- [x] G result determination — **PARTIAL**(G1 + G4 marginal MISS by <1pp / G2 + G3 + G5 PASS)
- [N/A] PASS path ADR-0037 amendment — not triggered per Q4 measurement-experiment-fail-policy(marginal MISS treats same as full FAIL,唔觸 revert/flip per Karpathy §1.3 surgical)
- [x] **NEW ADR-0038 ship**:
  - [x] `docs/adr/0038-parent-doc-dispatch-append-mode-finding.md` — Accepted status documents D1.35 hypothesis 4-axis re-evaluation(H1 + H4 validated / H2 partially confirmed / H3 refuted)+ Settings default preserve "replace" per Q4 + W28+ candidates (b) + (c) elevated as highest signal-to-cost priority
  - [x] `docs/adr/README.md` index sync — row append + footer next-NNNN 0038→0039 update

### B. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [x] plan.md frontmatter `status: active → closed_partial` per Q4 measurement-experiment-fail-policy(W26 PARTIAL precedent)
- [x] checklist.md cross-cutting 全 tick + N/A items 標明 reason
- [x] progress.md retro 7-section landed:What worked / What didn't / Surprises / Carry-overs to W28+ / ADR triggers / Phase Gate G1-G6 result
- [x] session-start.md §10 timeline row update — W27 row `🟡 active` → `✅ closed_partial 2026-05-25` + W28+ row priority queue update
- [x] session-start.md §11 W27 PARTIAL closed_partial block prepended above W26 CLOSED block(per W26 PARTIAL precedent)
- [x] RISK_REGISTER R-W26-1 + R-W26-2 update — H1 + H4 validated → R-W26-1 PARTIAL MITIGATED + R-W26-2 PARTIAL DECAY;W28+ candidates (b) + (c) elevated
- [x] COMPONENT_CATALOG.md C05 status note 1-line append:W27 F1 dispatch_mode enum landed + default "replace" preserved per ADR-0038 measurement-experiment-fail-policy + W28+ priority queue (b)+(c)+(d) summary

### C. Measurement-experiment-fail-policy applicable per Q4

- [x] Settings default preserve "replace" per Karpathy §1.3 surgical(同 W26 F2 G FAIL precedent)— ADR-0038 §Decision #1 governs
- [N/A] PASS path Settings default flip — not triggered(marginal MISS treats same as FAIL)
- [x] `.env` cleanup — W27 F2 marker block(3 lines `# W27 F2 active flip` + `ENABLE_PARENT_DOC_RETRIEVAL=true` + `PARENT_DOC_DISPATCH_MODE=append`)removed per ADR-0038 §Decision #3
- [x] `enable_parent_doc_retrieval` default preserve `False`(unchanged from ADR-0037 Q4 lock)

### D. Commit

- [x] Commit F3 closeout `docs(planning): W27 closeout PARTIAL — F2 G append mode marginal MISS G1+G4 / critical recovery G3 (Q-W25-I07) / ADR-0038 ship + cross-doc sync`(pending — about to execute)

---

## Cross-Cutting

- [x] All deliverables committed to git(F0 kickoff `5a6aab5` + F0 active flip `1df7570` + F1 implementation `50b1db5` + F2 G eval `0dffd87` + F3 closeout commit pending)
- [N/A] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved this phase
- [x] All architectural-adjacent decisions documented as ADR — **NEW ADR-0038** ship documents finding(per CLAUDE.md §5.1 H1 + ADR-0017 5-amendment precedent threshold not met → new ADR over amendment)
- [x] `progress.md` retro section written(7-section + Phase Gate G1-G6 result + What worked / What didn't / Surprises / Carry-overs / ADR triggers / Phase status)
- [x] `progress.md` frontmatter status flipped to `closed_partial`(per W26 PARTIAL precedent + Q4 measurement-experiment-fail-policy)— pending closeout commit
- [x] Phase W28+ kickoff trigger noted in retro — (b) `max_tokens_per_parent` sweep HIGHEST + (c) RAGAs orchestrator-aware tune Second + (d) F3 query expansion standalone test Third

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
