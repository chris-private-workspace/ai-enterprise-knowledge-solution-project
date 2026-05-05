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

- [x] F3.1 Analyse W5 D2 + W6 D1 answer_relevancy distribution ✅ W6 D2 — systematic verbose pattern confirmed(11/17 BORDERLINE in W5 D2 Cohere baseline + 4 BAD in Azure run);output_tokens evidence 528-1103 per non-refused answer(2-4x verbose vs typical concise 100-300)
- [x] F3.2 Prompt tweak candidate identification ✅ W6 D2 — single surgical Rule 3 change `backend/generation/prompt_builder.py:25`:add "Lead with a direct one-sentence answer" + soft length cap "<= 150 words";preserve "ordered lists / steps when procedural";14/14 synthesizer tests pass non-regression
- [x] F3.3 A/B subset=10 RAGAs run ✅ W6 D2 — Tweaked Cohere subset=10 LIVE 8m 02s wall clock;`reports/ragas-cohere-tweaked-subset10.json`(10/10 evaluated 0 errored);mean output_tokens 515(reduced from indirect ~737 reference Azure baseline)
- [x] F3.4 Decision: LAND tweak ✅ W6 D2 — **rel 0.8719 ≥ 0.85 Tier 1 acceptance met**;faith Δ -2.20pp + prec Δ -1.97pp within-5pp tolerance(non-blocking);recall + errored tied;`backend/generation/prompt_builder.py` retains tweak(no rollback)。Caveat:first-10 ceiling area;subset=20 tweaked confirmation 屬 W6 D3+ optional carry-over,not blocking

## F4 — W4/W5 carry-overs LIVE smoke remainder(C5+C6)

- [ ] **DEFERRED Chris dev server** F4.1 PPT orchestrator E2E smoke on 3 PPT samples → `/kb/{id}/chunks` chunks visible
- [ ] **DEFERRED post F1.2** F4.2 Cohere lift summary log + decision-form Q5 follow-up note
- [ ] **DEFERRED Chris dev server** F4.3 GPT-5.5 latency baseline:p50 / p95 / per-query cost USD
- [ ] **DEFERRED Chris dev server browser** F4.4 Chat UI 1-2 screenshots in W6 progress backfill

## F5 — Demo prep + Beta plan(W7-W8 stakeholder cycle prep)

- [x] F5.1 Demo script narrative draft ✅ W6 D3 — `docs/01-planning/W06-final-eval-demo/artifacts/demo-prep.md` Part 1(15-min flow:Context+Problem 2min / Architecture 2min / Ingestion 3min / Query+Citation 4min / Eval+Quality 3min / Risk+Beta 1min);bundled with F5.2 per Karpathy §1.2 simplicity
- [x] F5.2 Stakeholder Q&A briefing pack ✅ W6 D3 — same file Part 2 — 14 pre-canned answers in 4 sections(Quality+Capability / Architecture+Tier Boundary / Operations+Cost+Beta / Risk Slides)
- [x] F5.3 Beta plan v1 draft ✅ W6 D3 — `docs/03-implementation/beta-plan-v1.md`(7 sections:Executive / Phase Breakdown W7-W12 / OQ Deps Q7+Q9+Q10+Q11+Q12 / Risk Register Beta-specific R-B1 to R-B8 / Day-2 Readiness / Stakeholder Approval Triggers / Changelog);Q11 Entra ID critical path identified
- [ ] **DEFERRED Chris dev server** F5.4 Demo screenshots / GIF artifacts(post F4.4 Chris dev server availability;若 W6 closeout still bound → carry W7 polish window)

## F6 — Phase Gate 2 closeout + W6 retro + W7 kickoff prep

- [x] F6.1 Gate 2 final verdict landed ✅ W6 D1 — PARTIAL PASS confirmed(NOT upgraded to STRONG PASS via W6 D1 Azure 2-way 互換 verify negative comparison;Cohere v4.0-pro reaffirmed final);architecture.md §6.3 amendment ticket reserved stakeholder approval cycle vNext increment
- [x] F6.2 W06 progress.md retro 7 sections **draft complete** ✅ W6 D4 — What worked / didn't work / Surprises / Carry-overs to W7-W8 (10 items C1-C10) / ADR triggers / Phase Gate result G1-G7 + Gate 2 final verdict / Phase status;**polish + finalize W6 D5**
- [x] F6.3 W07 phase folder kickoff ✅ W6 D4 — `docs/01-planning/W07-beta-deploy/{plan,checklist,progress}.md` draft net-new(scope = Microsoft Entra ID + rate limiting + audit logging + error handling polish + mobile responsive;6 deliverables F1-F6;Q11 W7 critical path identified)
- [ ] F6.4 W06 progress.md frontmatter status flipped to `closed`(pending W6 D5 closeout commit)
- [x] F6.5 OQ Q21 final + Q5 ✅ W6 D1 — Q21 `Tentatively Resolved → Resolved`(Cohere v4.0-pro production lock 2026-05-05);Q5 Decision paragraph + Date row appended W6 D1 LIVE Azure 2-way reaffirm outcome

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1
- [ ] OQ status sync to `decision-form.md`(R4)— Q21 final W6 D1 critical
- [ ] Gate 2 STRONG PASS verdict logged in `architecture.md §6.3` decision row(via stakeholder approval cycle)
- [ ] RISK_REGISTER.md update if R1/R6 amendment cycle persists OR Azure 2-way surfaces new risk

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
