---
phase: W29-reformulator-diagnose
plan_ref: ./plan.md
status: closed_partial   # per W29 F4 closeout 2026-05-26 — Phase Gate PARTIAL per Q4 measurement-experiment-fail-policy
last_updated: 2026-05-26
---

# Phase W29 — Checklist

> Atomic checkbox(每 item ≤ 1–2 hour effort)。
> AI tick 完成嘅 item;唔可以 tick 嘅 item 喺 progress Day-N entry 寫原因 + 標 🚧 reason。

## F0 — Kickoff(plan + checklist + progress + R6 grep verify)

- [x] Create `docs/01-planning/W29-reformulator-diagnose/` folder
- [x] **R6 Day 0 catch surfaced** — `backend/generation/query_reformulator.py` line 47-89 REFORMULATOR_SYSTEM_PROMPT 已包含 (a) enumeration query shape detection bullet (2) + (b) EXAMPLE 3 直接 cover Q-W25-I07 + `.env` ENABLE_QUERY_EXPANSION=true → path (iii) ALREADY shipped W25 F3 D4 → W29 scope redirect from「strengthen」to「diagnose H1+H2+H3 audit-first」
- [x] User AskUserQuestion 2nd round Recommended pick confirmed scope redirect — `W29-reformulator-diagnose` audit-first 2026-05-26
- [x] Draft `plan.md` per W28 closed-phase template — 7-section structure + frontmatter + §2 F0-F4 deliverables + §3 G1-G5 + §4 R1-R6 + §5 D0-D2 + §6 W28+W25 carry-overs + §7 Changelog
- [x] Draft `checklist.md` per W28 closed-phase template — atomic items derived from plan §2 deliverables
- [x] Draft `progress.md` Day 0 entry — kickoff action + R6 catch detail + commit hash placeholder
- [x] Commit `docs(planning): kickoff W29-reformulator-diagnose + R6 path (iii) already-shipped catch + scope redirect to audit-first` per CLAUDE.md §10 R1 binding(commit `51ee31e`)
- [x] session-start.md §10 timeline row update — W29 active status entry append + W30+ rolling JIT row 更新 + W28 row 維持 closed(landed in `51ee31e`)

## F1 — H1+H2+H3 Diagnose(audit-only,no code change)

### A. R8 prerequisite gate

- [x] R8 prerequisite check — Azure OpenAI judge key present + ENABLE_QUERY_EXPANSION=true confirmed via .env earlier read + /health returns 5-component ok(BUG-027 cohere cosmetic — known not blocking)
- [N/A] STOP and ask Chris 若 blocked — R8 green per W28 same-week continuity

### B. F1 5 audit sub-deliverables

- [x] **F1.1 Capture actual reformulator variants on Q-W25-I07**:Standalone test 3 runs all APIConnectionError fallback(corp proxy intercepts new Python httpx);backend `/query` path Langfuse evidence shows 93.3% success rate → `f1-1-reformulator-variants-W29-D0-raw.txt`(via tee from standalone)+ `backend/w29-f1-q-i07-response.json`(curl response)
- [x] **F1.2 Grep corpus §8.1-§8.5 chunk text**:GET /kb/{id}/documents/{id}/chunks → 12 chunks under §8(chunk-0044 to 0055)including §8.1 Customer service request submission / §8.2 Real-time inventory check / §8.3 Order placement saga / §8.4 MPS event-driven / §8.5 Snowflake ETL → `f1-2-corpus-vocab-W29-D0-raw.txt`
- [x] **F1.3 Inspect RRF fusion top-5 surface**:W29 D0 top-5 = chunk-0044/0008/0036/0020/0018 — ZERO §8.1-§8.5 individual walkthrough chunks despite reformulator confirmed working → `f1-3-rrf-top5-W29-D0-raw.txt`
- [x] **F1.4 對比 EXAMPLE 3 hypothetical variants vs corpus actual vocab**:Manual diff revealed EXAMPLE 3 aligns 60-80% token overlap with §8.1 + §8.3 + §8.4 corpus chunk_title vocab → H2 REFUTED → `f1-4-vocab-mismatch-analysis-W29-D0.md`
- [x] **F1.5 Check Langfuse `query_reformulator.reformulate` fallback rate**:Langfuse API 15 obs total spanning ONLY W25 D4 (13) + W29 D0 (2) — ZERO obs during W26-W28 eval batches → **H4 NEW eval coverage gap CONFIRMED** + verify via grep `backend/eval/orchestrator.py:93` direct `engine.retrieve()` bypassing reformulator → `f1-5-reformulator-fallback-rate-W29-D0-raw.txt`

### C. F1 commit

- [x] Commit F1 + F2 combined `docs(analysis): W29 F1+F2 diagnose + root cause — H1+H4 NEW combined dominant + path (iii) refuted`(commit `7b6082e`)

## F2 — Root cause confirm + markdown report

### A. F2 report

- [x] Draft `f2-root-cause-W29-D1.md` — 6 sections:F1.1-F1.5 evidence summary / H1 RRF surface verdict CONFIRMED dominant / H2 REFUTED / H3 standalone-only(not backend-dominant)/ **H4 NEW eval coverage gap CONFIRMED dominant** / F3 surgical fix path A/B/C/D/E proposal
- [x] Root cause classification — **H1 + H4 NEW combined dominant**(H1 explains backend `/query` G1 fail;H4 explains W26-W28 eval G3 marginal MISS not reflecting reformulator-path performance)

### B. F2 commit

- [x] Commit F2 root cause combined with F1(commit `7b6082e` includes both F1 5 raw outputs + F2 markdown report)

## F3 — Surgical fix based on confirmed root cause(scope-conditional)

### A. Scope-conditional fix — Path A applied per F2 H1 dominant + user pick (Recommended)

- [x] **F2 = H1 RRF dominant** → Candidate (a) `QUERY_EXPANSION_PER_VARIANT_OVERFETCH` 4→8 + (b) `QUERY_EXPANSION_RRF_K` default 60 → 30 env override applied
- [N/A] H2 / H3 / None branch — not triggered per F2 verdict
- [x] **Iteration v2 tested**(overfetch=12 + rrf_k=15)→ regression confirmed too aggressive → reverted v1
- [x] **5-run reproducibility test**:retrieval +40pp(2/5 §8.x top-5)/ synthesizer cite +20pp(1/5 §8.x cited)— bottleneck shifted to synthesizer

### B. F3 tests

- [N/A] F3 unit test 2+ NEW — no code change(Setting env override only,zero touch backend modules);unit test approval not applicable per scope
- [x] Backend pytest 1060 baseline preserved(regression 0)— no code change to break
- [x] ruff + mypy strict on touched code clean — no code touched per Path A surgical scope

### C. F3 commit

- [x] Commit F3 evidence will be batched with F4 closeout commit per W29 closeout pattern

## F4 — User-test verify + closeout

### A. Q-W25-I07 user-test verify (PRIMARY G1)

- [x] Backend reload via `touch backend/storage/settings.py` + WatchFiles auto-reload(代替 full restart per ADR-0023 lifespan client-pool preserve)
- [x] curl POST `/query` 「Show me all the Integration scenarios」+ Bearer dev-token 5-run reproducibility → 0/5 ≥ 2 distinct §8.x walkthrough cited(strict G1 FAIL)/ 1/5 ≥ 1 walkthrough cited / 2/5 §8.x in top-5
- [N/A] Chat UI retry verify(curl evidence already sufficient — synthesizer randomness same path)

### B. Phase Gate G1-G5 evaluation

- [x] G1 user-test ≥ 2 distinct A-E walkthrough citations — **0/5 STRICT FAIL** (5-run reproducibility test 2026-05-26)
- [x] G2 backend pytest 1060 baseline preserved — no code change per Path A surgical scope
- [x] G3 ruff + mypy strict on touched code clean — no code touched
- [x] G4 F1 5 audit outputs + F2 root cause + F3 multi-run report committed (commits `7b6082e` + closeout)
- [x] G5 measurement-experiment-fail-policy applied — G1 strict FAIL → **PARTIAL closeout** + path (i) synthesizer prompt elevate W30+ per user F4 pick(redirected from original path (ii) CRAG threshold per Run 5 synthesizer-cite-bottleneck evidence)

### C. Cross-doc sync per CLAUDE.md §10 R3 + R5 + R6

- [x] plan.md frontmatter `status: active → closed_partial` — done
- [x] checklist.md cross-cutting 全 tick + N/A items 標明 reason — this commit
- [x] progress.md retro 7-section + Phase Gate G1-G5 result — this commit
- [x] session-start.md §10 timeline row update — W29 row `🟡 active` → `✅ closed_partial 2026-05-26`
- [x] session-start.md §11 W29 CLOSED_PARTIAL block prepend (per W26+W27 PARTIAL precedent)
- [N/A] RISK_REGISTER R15 — preserve current state (W25.5 BUG-025 closure unaffected by W29 finding;NEW R-W29-1「Synthesizer §8.x walkthrough cite inconsistency」eligible for W30+ scope)
- [N/A] COMPONENT_CATALOG.md C05 — no F3 code change touched reformulator / result_fusion;Settings.py defaults unchanged
- [N/A] ADR README index sync — no NEW ADR ship + no ADR-0034 amendment(Settings.py defaults preserved per Q4)

### D. `.env` cleanup + W30+ priority queue evaluation

- [x] `.env` Setting tune env override PRESERVED `per_variant_overfetch=8 + rrf_k=30`(per user F4 pick — net positive +40pp retrieval improvement;Settings.py defaults unchanged per Q4)
- [x] W30+ candidate prioritization update — **path (i) synthesizer prompt elevated HIGHEST priority** per F3 Run 5 evidence(redirected from original (ii) CRAG threshold)/ (ii) CRAG threshold trial H1 boundary downgrade / (c) RAGAs orchestrator-aware tune retained / (d) F3 query expansion standalone subsumed / NEW (e) make_ragas_evaluator structlog stage / NEW (f) Settings-default-tests / **NEW (k) wire reformulator into eval/orchestrator.py(close H4 systemic gap — separate axis from G1)** / BUG-026 / BUG-027 / W22 D8 setup.md / W16 Track A IT cred parallel track

### E. Commit

- [x] Commit F4 closeout `docs(planning): W29 closeout PARTIAL — F3 Path A Setting tune +40pp retrieval improvement / G1 strict 0/5 FAIL / synthesizer-side bottleneck identified Run 5 / path (i) synthesizer prompt elevate W30+`

---

## Cross-Cutting

- [x] All deliverables committed to git(F0 `51ee31e` + F1+F2 `7b6082e` + F4 closeout commit pending)
- [N/A] All OQ status changes reflected in `docs/decision-form.md` — no OQ resolved this phase
- [N/A] All architectural-adjacent decisions documented as ADR — Settings env override only,no ADR-0034 amendment(per Q4 measurement-experiment policy — Settings.py defaults unchanged)
- [x] `progress.md` retro section written — 7-section per closeout commit
- [x] `progress.md` frontmatter status flipped to `closed_partial`
- [x] Phase W30+ kickoff trigger noted in retro — (i') synthesizer prompt elevated HIGHEST priority + W29 path-i evidence base

---

**Lifecycle reminder**:呢份 checklist 隨 plan deliverables 衍生。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
