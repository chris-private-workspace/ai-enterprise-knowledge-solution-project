---
phase: W05-optimization
plan_ref: ./plan.md
status: draft
last_updated: 2026-05-04
---

# Phase W05 — Checklist

> Atomic checkbox(每 item ≤ 0.5–1 hour effort per W4 carry-over C11 calibration)。
> Status:`draft` 直到 W4 D5 closeout sign-off + W5 kickoff approval + procurement landing trigger。
> 全 unchecked 至 W5 D1 implementation start。

## F1 — Gate 2 LIVE verdict close(blocking gate)

- [ ] **DEFERRED Chris async** F1.1 Cohere Marketplace endpoint+key `.env` populate(post Marketplace deploy)
- [ ] **DEFERRED Chris async** F1.2 Voyage api_key `.env` populate(non-Azure path)
- [ ] **DEFERRED Chris async** F1.2 ZeroEntropy api_key `.env` populate(non-Azure path)
- [ ] **DEFERRED Chris index ops** F1.3 Azure semantic config `ekp-semantic-default` verify on `ekp-kb-drive-v1` index(create if missing)
- [ ] **DEFERRED Chris SME** F1.4 chunk_id labeling cascade Q001-Q030 + Q036-Q055(target ≥ 45/55 validated)
- [ ] F1.5 `scripts/run_cohere_lift_smoke.py` LIVE run on 10 representative queries → hybrid-only vs hybrid+Cohere R@5 lift output
- [ ] F1.6 `scripts/run_reranker_shootout.py` LIVE run on full 55-query eval-set → 5-way comparison + R@5 + 4-RAGAs metric overlay
- [ ] F1.7 `scripts/run_ragas_eval.py` LIVE run on winning reranker + Cohere baseline → 4-metric within-5pp 互換 verdict
- [ ] F1.8 Gate 2 verdict landed:**PASS** = continue F2-F4 / **FAIL** = trigger ADR-0012 + drop L2 CRAG decision
- [ ] F1.9 Q5 + Q21 + relevant OQ follow-up note in `decision-form.md`

## F2 — CRAG threshold empirical fine-tune(W4 R6 close)

- [ ] **CONDITIONAL F1 PASS** F2.1 Analyse W4 D1 baseline 0.70 vs F1.7 LIVE confidence distribution
- [ ] **CONDITIONAL F1 PASS** F2.2 Calibrate threshold ∈ {0.65 / 0.70 / 0.75} maximising 4-metric average without false-correction spike
- [ ] **CONDITIONAL F1 PASS** F2.3 Update `Settings.crag_confidence_threshold` if calibrated value ≠ 0.70
- [ ] **CONDITIONAL F1 PASS** F2.4 W5 progress entry document threshold rationale + LIVE distribution stats

## F3 — L3 routing conditional implementation(if Gate 2 全 PASS)

- [ ] **CONDITIONAL F1 全 PASS** F3.1 `Settings.feature_l3_routing_enabled` flag toggle(default False → True)
- [ ] **CONDITIONAL F1 全 PASS** F3.2 `CragLoop` extended:max_corrections 1 → 2-3 with knowledge-base routing
- [ ] **CONDITIONAL F1 全 PASS** F3.3 Stream path `/query/stream` 仍 L2-only(architecture.md §3.5 constraint);non-stream `/query` gains L3
- [ ] **CONDITIONAL F1 全 PASS** F3.4 Unit test:max-correction-iteration honoured + routing decision trace logged
- [ ] **CONDITIONAL F1 全 PASS** F3.5 `architecture.md §6.1 W5 row "L3 conditional"` verdict landed

## F4 — Reranker per-KB field reconsideration(W3 C5 + W4 C9 close)

- [ ] **CONDITIONAL F1 PASS** F4.1 Analyse F1.6 shootout per-KB-type breakdown(Drive Manual technical / table-data / synthesis sub-corpora)
- [ ] **CONDITIONAL F1 PASS** F4.2 Decision:NON-STICKY(same reranker wins across) → defer Tier 2 / STICKY(divergent winners) → ADR-0012 trigger
- [ ] **CONDITIONAL STICKY** F4.3 ADR-0012 written + `KbConfig.reranker_kind` field added + factory wire + UI Settings exposure
- [ ] **CONDITIONAL STICKY** F4.4 Tier 1 boundary verify per H4(per-KB ≠ multi-tenancy)+ ADR-0012 approval
- [ ] **CONDITIONAL NON-STICKY** F4.3-alt Document defer rationale in W5 progress + close W3 C5 / W4 C9

## F5 — W4 carry-overs LIVE smoke remainder closure(C7 + C8)

- [ ] **DEFERRED Chris dev server** F5.1 PPT orchestrator E2E smoke on 3 W3 D1 後段 PPT samples → `/kb/{id}/chunks` chunks visible
- [ ] **DEFERRED post F1.5** F5.2 Cohere lift summary log + decision-form Q5 follow-up note
- [ ] **DEFERRED Chris dev server** F5.3 GPT-5.5 latency baseline:p50 / p95 / per-query cost USD documented
- [ ] **DEFERRED Chris dev server browser** F5.4 Chat UI 1-2 screenshots in W4 progress backfill

## F6 — Gate 2 closeout + W5 retro + W6 kickoff prep

- [ ] F6.1 Gate 2 LIVE verdict landed + documented in `architecture.md §6.3` decision row
- [ ] F6.2 W05 progress.md retro section completed(7 sub-sections)
- [ ] F6.3 W06 phase folder kickoff:`docs/01-planning/W06-final-eval-demo/{plan,checklist,progress}.md` draft
- [ ] F6.4 W05 progress.md frontmatter status flipped to `closed`
- [ ] F6.5 OQ Q21 + Q5 + relevant OQ status sync to `decision-form.md`

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1
- [ ] OQ status sync to `decision-form.md`(R4)— Q21 final pick W5 D1-D2 critical
- [ ] Gate 2 verdict logged in `architecture.md §6.3` decision row(via ADR-0012 if FAIL → drop L2)
- [ ] RISK_REGISTER.md update if R1/R2 procurement persists OR Gate 2 FAIL surfaces as new risk

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
