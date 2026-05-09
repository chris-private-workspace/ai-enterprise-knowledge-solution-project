---
phase: W16-beta-deploy
plan_ref: ./plan.md
status: draft
last_updated: 2026-06-10
---

# Phase W16 — Checklist(thin skeleton)

> Atomic checkbox(每 item ≤ 0.5–2 hour effort per W6 C10 calibration)。
> Status:`draft` — pending W16 D1 active flip post Track A IT cred populate event trigger + R-B1 closure。
> **Detailed checkboxes deferred to W16 D1 active flip** per CLAUDE.md §10 R1 rolling-JIT discipline + CO_W14_process_grep_verify FORMALIZED pre-active flip checklist(spec ref grep verification step required before checklist expansion)。

## F1 — Track A IT cred consumption + R-B1 closure verification

- [ ] F1.x Track A IT cred populate event verified received(blocking pre-condition;detail at W16 D1 active flip)
- [ ] F1.x `.env.production` + Azure subscription IDs + Cohere Marketplace billing wiring(detail at W16 D1)
- [ ] F1.x R-B1 closure verification + risk register live update(detail at W16 D1)

## F2 — 25% Beta cohort rollout activation

- [ ] F2.x Cohort definition validation per W6 demo-prep.md beta-plan-v1(internal RAPO + 1-2 friendly departments per Q7 Resolved;detail at W16 D1)
- [ ] F2.x Rollout activation cascade per W11 plan F2.1-F2.4(detail at W16 D1)
- [ ] F2.x Rollback flag-ready per beta-plan-v1(detail at W16 D1)

## F3 — Daily metric monitor + Q15 first weekly signal report

- [ ] F3.x Daily metric monitor — R@5 + Faithfulness + Correctness + Image Association threshold tracking(detail at W16 D1)
- [ ] F3.x Q15 first weekly signal report(manual update frequency baseline measurement;detail at W16 D1)

## F4 — User smoke first run(Playwright E2E baseline capture + browser binary install)

- [ ] F4.1 `npx playwright install chromium` browser binary install(R8 mitigation if needed via personal Azure dev tier per W11 retro CO17 OR ADR-0017 trigger if blocks)
- [ ] F4.2 `pnpm test:e2e:update-snapshots` captures 5 pixel diff baseline screenshots + commits to `tests/e2e/visual-baseline.spec.ts-snapshots/`
- [ ] F4.3 `pnpm test:e2e` 13 tests pass + 0 regression
- [ ] F4.4 W12+W13+W14+W15 manual smoke deferred backlog systematic subsume target actualized

## F5 — Backend stub closure cascade

- [ ] F5.1 CO_F3a backend `GET /kb/{id}/documents` + `GET /kb/{id}/documents/{id}/chunks` W2 listing implementation
- [ ] F5.2 CO_F3b backend KB name + description PATCH endpoint
- [ ] F5.3 CO_F3c backend `POST /kb/{id}/reindex` + `DELETE /kb/{id}` Danger zone implementation
- [ ] F5.4 CO_W15_F1_backend `POST /eval/run` + `POST /eval/shootout` W4 implementation per docs/eval-methodology.md
- [ ] F5.5 CO_W15_F2_backend `GET /debug/trace/{trace_id}` W3+ Langfuse correlation
- [ ] F5.x CO_W15_F1_eval_set_v1 `eval-set-v1`(W4+W5 +20 real-query 50 queries)file existence verify
- [ ] F5.x CO_W15_F2_langfuse_url `NEXT_PUBLIC_LANGFUSE_URL` Beta production endpoint env var configuration

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1(C12 / C03 / C09 / C10 / C11 / C06 / C07 / C02)
- [ ] OQ status sync to `decision-form.md`(R4)— Q15 first weekly signal report W16 F3 trigger
- [ ] Risk register update — R-B1 closure verification(F1 deliverable)+ ADR-0017 reservation candidate(R8 corp proxy mitigation pattern formalization)
- [ ] CLAUDE.md §5.1 H1 boundary check:no architectural change without ADR(W16 scope already covered by ADR-0014 + ADR-0015 + ADR-0016)
- [ ] CLAUDE.md §5.2 H2 boundary check:no new vendor / dependency without ADR(ADR-0017 trigger candidate if R8 mitigation requires personal Azure dev tier formalization)
- [ ] CLAUDE.md §3.2 frontend conventions check:no `any` / no @ts-ignore / **MAJOR MILESTONE entire frontend oklch=0 globally preserved**(W15 D3 F3.4 baseline);Playwright E2E baseline harness preserved
- [ ] CLAUDE.md §5.5 H5 security check:no secret commit;`.env.production` properly gitignored(per root .gitignore §4 secrets)
- [ ] **CO_W14_process_grep_verify FORMALIZED pre-active flip checklist applied** — (1)Read plan literal acceptance criteria;(2)Grep code base for referenced files / functions / patterns;(3)Surface mismatches via Karpathy §1.1 think-before-coding upfront;(4)Document deviations in plan §7 changelog at plan kickoff;(5)Adjust acceptance criteria per actual reality

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。**Detailed checkboxes deferred to W16 D1 active flip** per rolling JIT discipline。
