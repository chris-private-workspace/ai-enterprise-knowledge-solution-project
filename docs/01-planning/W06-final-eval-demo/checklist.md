---
phase: W06-final-eval-demo
plan_ref: ./plan.md
status: active
last_updated: 2026-05-05
---

# Phase W06 — Checklist

> Atomic checkbox(每 item ≤ 0.5–1.5 hour effort per W5 C9 calibration:LIVE-heavy days 1.5x;static-heavy 0.3-0.5x)。
> Status:`active` 自 2026-05-05 W6 D1 Chris kickoff sign-off。

## F1 — Azure 2-way 互換 verify + Gate 2 STRONG PASS upgrade(W5 C1+C2 close)

- [x] F1.1 `Settings.reranker_kind=azure` swap ✅ W6 D1 — `.env` append `RERANKER_KIND=azure` + comment block "this run only";Settings probe confirmed;post-F1.2 reverted clean(grep empty + cache reload `cohere` default)
- [x] F1.2 `scripts/run_ragas_eval.py --subset 20` LIVE Azure pipeline ✅ W6 D1 — `reports/ragas-azure-subset20.json` 20/20 evaluated;wall clock 11m 38s;`azure_semantic_rerank` LIVE log signature confirmed
- [x] F1.3 Cross-reference Cohere vs Azure ✅ W6 D1 — apples-to-apples n=17(exclude Q013/Q016 Cohere Bug I + Q014 OOS):faith Δ -11.76pp / rel Δ -9.81pp / prec Δ -2.05pp / recall 0pp;只 prec+recall within-5pp,faith+rel ≥ 5pp WORSE
- [x] F1.4 Verdict landed ✅ W6 D1 — **Cohere v4.0-pro reaffirmed final**(Azure ≥ 5pp WORSE on faith+rel → no swap rationale;ADR-0012 reservation released);**Gate 2 PARTIAL PASS confirmed**(NOT upgraded to STRONG PASS — within-5pp 互換 only on 2/4 metrics)
- [x] F1.5 Bug I LIVE re-verify ✅ PASS W6 D1 — Azure run 20/20 evaluated 0 errored(W5 D2 Cohere baseline 18/20 due to Q013+Q016 pre-floor max_completion_tokens limit);`min_max_completion_tokens=4096` floor structurally + behaviorally confirmed
- [x] F1.6 Q5 + Q21 follow-up note ✅ W6 D1 — Q21 `Tentatively Resolved → Resolved`(Cohere v4.0-pro production lock);Q5 Decision paragraph + Date row appended W6 D1 outcome;Status Dashboard Q21 row updated 2026-05-04 → 2026-05-05
- [x] F1.7 architecture.md §3.2 + §6.3 amendment narrative ✅ W6 D1 — both amendment tickets reserved for stakeholder approval cycle(per CLAUDE.md §4.4 content-lock);ADR-0012 reservation released(no architectural-adjacent trigger fired)

## F2 — Final eval full-corpus(post Chris SME labeling cascade strict-mode)

- [ ] **DEFERRED Chris SME** F2.1 chunk_id labeling Q001-Q030 + Q036-Q055 → ≥ 45/55 validated per W4 plan §3 G6
- [ ] F2.2 `eval-set-v1-draft.yaml` promoted → `eval-set-v1.yaml`(remove `-draft` suffix)
- [ ] F2.3 `scripts/run_ragas_eval.py --subset 55` against winning reranker(Cohere v4.0-pro per F1)→ `reports/ragas-final-v1.json`
- [ ] F2.4 Aggregate vs W5 D2 subset=20 baseline 比較;若 within ±5% per metric → Tier 1 quality baseline confirmed

## F3 — Synthesizer prompt tuning(answer_relevancy 0.841 borderline mitigation,W5 C4 close)

- [ ] F3.1 Analyse F1.7(W5 D2)+ F1(W6)answer_relevancy distribution per query → identify systematic verbose pattern source
- [ ] F3.2 Prompt tweak candidates:answer length cap / question-direct format / structure constraint
- [ ] F3.3 A/B subset=10 RAGAs run baseline vs tweaked prompt → delta evaluation
- [ ] F3.4 Decision land tweaked prompt(if rel ≥ 0.85)/ keep marginal(if 0.83-0.85 + faith/prec/recall hold)/ revert if regression

## F4 — W4/W5 carry-overs LIVE smoke remainder(C5+C6)

- [ ] **DEFERRED Chris dev server** F4.1 PPT orchestrator E2E smoke on 3 PPT samples → `/kb/{id}/chunks` chunks visible
- [ ] **DEFERRED post F1.2** F4.2 Cohere lift summary log + decision-form Q5 follow-up note
- [ ] **DEFERRED Chris dev server** F4.3 GPT-5.5 latency baseline:p50 / p95 / per-query cost USD
- [ ] **DEFERRED Chris dev server browser** F4.4 Chat UI 1-2 screenshots in W6 progress backfill

## F5 — Demo prep + Beta plan(W7-W8 stakeholder cycle prep)

- [ ] F5.1 Demo script narrative draft(15-min flow:use case 1 + ingestion E2E + query + citation + Pipeline wizard + retro)
- [ ] F5.2 Stakeholder Q&A briefing pack(common questions + risk slides)
- [ ] F5.3 Beta plan draft `docs/03-implementation/beta-plan-v1.md`(scope + timeline + Q7-Q12 dependencies + risk)
- [ ] F5.4 Demo screenshots / GIF artifacts(post F4.4)

## F6 — Phase Gate 2 closeout + W6 retro + W7 kickoff prep

- [ ] F6.1 Gate 2 final verdict landed(STRONG PASS upgrade OR PARTIAL PASS confirmed)+ architecture.md §6.3 amendment ticket
- [ ] F6.2 W06 progress.md retro 7 sections complete + Phase Gate verdict + carry-overs to W7-W8 + ADR triggers
- [ ] F6.3 W07 phase folder kickoff:`docs/01-planning/W07-beta-deploy/{plan,checklist,progress}.md` draft
- [ ] F6.4 W06 progress.md frontmatter status flipped to `closed`
- [ ] F6.5 OQ Q21 final + Q5 + relevant other Q resolution sync to `decision-form.md`

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1
- [ ] OQ status sync to `decision-form.md`(R4)— Q21 final W6 D1 critical
- [ ] Gate 2 STRONG PASS verdict logged in `architecture.md §6.3` decision row(via stakeholder approval cycle)
- [ ] RISK_REGISTER.md update if R1/R6 amendment cycle persists OR Azure 2-way surfaces new risk

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
