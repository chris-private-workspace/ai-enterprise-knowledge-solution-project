---
title: "EKP Tier 1 Beta Plan v1"
status: draft                          # flipped to active when stakeholder approves W7-W8 kickoff
sprint_weeks: W7-W12
start_date: 2026-05-12                 # tentative — assumes W6 closeout 2026-05-09
end_date: 2026-07-19                   # tentative — full Tier 1 production launch
authors: [AI Drafter, Chris Lai (Tech Lead)]
spec_refs:
  - architecture.md §6.1 W7-W12 timeline
  - architecture.md §6.2 Beta + Rollout Phase
  - architecture.md §7.4 Day-2 Readiness Checklist
  - architecture.md §8 Risk Register
oq_dependencies:
  - Q7 (Beta user source)
  - Q9 (Sensitivity / CMK)
  - Q10 (Visual identity)
  - Q11 (Entra ID tenant)
  - Q12 (Tier 2 owner)
related_artifacts:
  - docs/01-planning/W06-final-eval-demo/artifacts/demo-prep.md
last_updated: 2026-05-05
---

# EKP Tier 1 — Beta Plan v1(W7-W12)

> **Purpose**:Tier 1 12-week sprint POC closeout(W6)後 transition 到 Beta deploy + staged rollout 嘅 plan。Beta 階段嘅 scope / timeline / 5 個 OQ resolution dependency / risk register live update。
> **Approval cycle**:Chris W6 D5 closeout sign-off + stakeholder review approve W7-W8 kickoff。
> **Lifecycle**:`draft` 直到 W7 D1 implementation start trigger。

---

## 1. Executive Summary

W6 closes Tier 1 12-week sprint POC phase。**Gate 2 PARTIAL PASS confirmed**(W5 D2 verdict + W6 D1 Azure 2-way reaffirm)— Cohere v4.0-pro production lock + W6 D2 prompt tuning A/B landed answer_relevancy +1.92pp lift。Beta phase(W7-W8 hardening + W8 deploy)+ Internal testing(W9-W10)+ Staged rollout(W11-W12 25% → 100%)收尾 Tier 1。

**Beta scope drivers**:
1. **Auth + ops hardening**(W7):Microsoft Entra ID auth + rate limiting + audit logging + mobile responsive
2. **Deploy infrastructure**(W8):Azure Container Apps backend + Static Web Apps frontend + user feedback dashboard + cost monitoring
3. **Real user validation**(W9-W10):50 internal users + real query log collection + 4-metric daily review + UX iteration
4. **Production readiness**(W11-W12):Staged rollout 25% → 50% → 100%(250-500 users)+ Day-2 ops handover

**Out of scope**(per CLAUDE.md §5.4 H4 Tier 1 boundary):
- GraphRAG / Knowledge Graph
- Multi-agent L4+ orchestration
- Multi-tenancy
- Multi-modal(B 類純圖片搜索)
- Multi-language(JP / ZH)
- Auto-sync from external source
- Custom LLM fine-tuning
- Workflow / plugin builder

呢啲 Tier 2 features 由 Beta phase trigger metric collection signal 將來再 staff up。

---

## 2. Phase Breakdown

### W7 — Beta Hardening Sprint 1(2026-05-12 → 2026-05-16)

| Deliverable | Component(s) | Owner | Notes |
|---|---|---|---|
| W7.F1 Microsoft Entra ID auth integration | C11 Identity | Chris + IT | Q11 OQ resolve dependency |
| W7.F2 Rate limiting middleware(per-user concurrency cap)| C08 API + C11 | AI + Chris | Per architecture.md §8.1 R5 mitigation |
| W7.F3 Audit logging(per-query audit trail)| C07 Observability | AI | Langfuse trace already exists;add audit-specific tags |
| W7.F4 Error handling polish(graceful messages,no raw stack)| C08 + C09 + C10 | AI | architecture.md §7.3 E1-E14 edge cases |
| W7.F5 Mobile responsive baseline complete | C09 + C10 | AI | architecture.md §6.1 W7 row |
| W7.F6 Phase plan / checklist / progress folder kickoff | governance | AI | Per CLAUDE.md §10 R1 |

**OQ deps resolved by W7 D1**:Q11 Entra ID tenant — IT 配合 critical path

### W8 — Beta Hardening Sprint 2 + Deploy(2026-05-19 → 2026-05-23)

| Deliverable | Component(s) | Owner | Notes |
|---|---|---|---|
| W8.F1 Azure Container Apps deploy(backend) | C12 DevOps | Chris + IT | Production-grade infrastructure |
| W8.F2 Static Web Apps deploy(frontend) | C12 DevOps | Chris + IT | CDN + edge cache |
| W8.F3 Cost monitoring dashboard | C12 + C07 | AI | Daily Azure OpenAI + Cohere + Blob + Search spend |
| W8.F4 User feedback loop(thumbs + comment 入 Langfuse) | C07 + C10 | AI | architecture.md §7.4 Day-2 |
| W8.F5 Documentation handoff(Day-2 runbook) | governance | AI | architecture.md §7.4 |
| W8.F6 Beta deploy smoke test | full stack | Chris | Pre W9 onboard |

**OQ deps resolved by W8 D1**:Q9 Sensitivity / CMK(若 enable Customer Managed Key on Azure resources)

### W9 — Beta Internal Testing(2026-05-26 → 2026-05-30)

| Deliverable | Owner | Notes |
|---|---|---|
| W9.F1 50 internal users onboarded | Chris + Stakeholder | Q7 OQ resolve dependency |
| W9.F2 Real query log collection scaffold | AI + C07 | Drives Tier 2 trigger metric data |
| W9.F3 4-metric daily review automation | AI + C06 | RAGAs run daily on real query subset |
| W9.F4 UX iteration based on user feedback | AI | Iteration cadence weekly retro |
| W9.F5 Pulse survey W9.5(Shadow AI displacement measurement)| Chris + Stakeholder | architecture.md §1.7 + §8.1 R1 mitigation |

**OQ deps resolved by W9 D1**:Q7 Beta user source(50 internal user identification)

### W10 — Beta Refinement(2026-06-02 → 2026-06-06)

| Deliverable | Owner | Notes |
|---|---|---|
| W10.F1 Address Beta feedback | AI + Chris | Iteration based on W9 user retro |
| W10.F2 Edge case fixes(per `architecture.md §7.3` E1-E14)| AI | Targeted edge case mitigation |
| W10.F3 Performance optimization(p95 latency long-tail) | AI | Per Q-C2 demo Q&A — long-tail W7 polish |
| W10.F4 Production readiness review | Chris + Stakeholder | Sign-off W11 staged rollout trigger |
| W10.F5 Tier 2 trigger metric review | governance | Q12 OQ resolve dependency |

**OQ deps resolved by W10 D1**:Q12 Tier 2 owner(若 trigger metric signals Tier 2 demand)

### W11 — Staged Rollout 25% → 50%(2026-06-09 → 2026-06-13)

| Deliverable | Owner | Notes |
|---|---|---|
| W11.F1 25% rollout(~62-125 users)| Chris + IT | Random sampling from full 250-500 user base |
| W11.F2 Daily metric monitor | AI + C07 | 4 metric + cost + p95 latency + user satisfaction |
| W11.F3 50% rollout end of week trigger(125-250 users) | Chris | Conditional pass gate |
| W11.F4 Incident response runbook drill | Chris | Day-2 ops readiness |

### W12 — Staged Rollout 100% + Production Launch(2026-06-16 → 2026-07-19)

| Deliverable | Owner | Notes |
|---|---|---|
| W12.F1 100% rollout(250-500 users)| Chris + IT | Full Tier 1 launch |
| W12.F2 Day-2 ops handover | Chris + Stakeholder | Runbook + on-call rotation + incident response |
| W12.F3 Tier 2 roadmap kickoff prep | governance | If Q12 owner identified + trigger metric strong signal |
| W12.F4 W12 retro + production sign-off | Chris + Stakeholder | Tier 1 closeout |

---

## 3. OQ Dependencies(W7 critical path)

5 個 OQ 需要 stakeholder cycle resolution before / during Beta。Default behavior:用 spec default value 繼續,but 各個 trigger window 唔同。

| OQ | Question | Default if unresolved | Trigger window | Block W7?|
|---|---|---|---|---|
| **Q7** | Beta user source(50 user identification)| Chris pre-identify from EKP-target user pool | W7 D5 | No(Chris 自行 cascade) |
| **Q9** | Sensitivity / CMK(Customer Managed Key on Azure)| Default Azure-managed key(no CMK)| W8 D1 | No(default acceptable) |
| **Q10** | Visual identity / brand | Default neutral tokens(per W2 D5 baseline) | W7 D5 polish | No |
| **Q11** | Entra ID tenant | IT 配合 set up Ricoh tenant | W7 D1 | **Yes**(blocks W7.F1) |
| **Q12** | Tier 2 owner | Chris(per CLAUDE.md decision form §3 default) | W10 D5 | No(Tier 2 scope) |

**Critical path**:Q11 必須 W7 D1 前 IT confirm,否則 W7.F1 Entra ID auth integration blocked。

---

## 4. Risk Register Update(Beta Phase Specific)

呢部分係 `docs/01-planning/RISK_REGISTER.md` living doc 嘅 Beta phase increment。Tier 1 architecture.md §8 frozen baseline 不動。

### Beta phase active risks(W7-W12)

| # | Risk | Likelihood | Impact | Status | Mitigation |
|---|---|---|---|---|---|
| **R-B1** | Entra ID tenant access delay | Medium | High | 🟡 active | W6 D5 IT pre-engage;fallback = mock auth for W7-W8 dev,Beta-blocking |
| **R-B2** | 50 internal user onboarding slow uptake | High | Medium | 🟡 active | Stakeholder communication + onboarding session;measure adoption W9 daily |
| **R-B3** | Real query distribution diverges from synthetic eval set | High | Medium | ⚫ accepted | W9-W10 4-metric daily review on real query subset;adapt eval-set v2 if needed |
| **R-B4** | Cost spike during 100% rollout(W12) | Medium | High | 🟢 mitigated | Cost monitoring dashboard W8.F3;rate limiting per W7.F2;quota pre-negotiated |
| **R-B5** | Shadow AI displacement(R1 from §8 inherited) | High | High | 🟡 active | Pulse survey W9.5;onboarding differentiation messaging |
| **R-B6** | Edge case parser fails on production manuals 唔 in W2 sample | Medium | Medium | 🟡 active | Parser fail-graceful + Admin flagged list;manual fallback workflow |
| **R-B7** | Day-2 ops runbook gaps surface during incident | Medium | High | 🟡 active | W10.F4 production readiness review + W11.F4 incident drill |
| **R-B8** | R8 Ricoh corp proxy / VPN issue blocks Beta deploy | High | Medium | 🟡 active | Same W2-W6 mitigation:home network for cloud-bound deploy work;**W6 D1 calibration**:Python httpx probe ground truth(curl schannel CRL revocation failure ≠ Python httpx failure)|

---

## 5. Day-2 Readiness Pre-Beta Checklist(architecture.md §7.4 living)

- [ ] All query / retrieval / LLM call logged to Langfuse(W1+ existing,W7-W8 audit tag enrichment)
- [ ] Cost dashboard:Azure OpenAI + Cohere + Blob + AI Search daily spend(W8.F3)
- [ ] Alerts:p95 latency > 30s、API error > 5%、cost spike、CRAG trigger rate > 50%(W8.F3)
- [ ] Runbook:document parse 失敗、API quota 爆、index corruption、reranker outage、CRAG loop bug(W8.F5)
- [ ] Index alias 切換可 rollback(W8.F1 deployment scripts)
- [ ] User feedback loop(thumbs + comment 入 Langfuse)(W8.F4)
- [ ] Re-index SOP per KB(W8.F5)
- [ ] Security:Azure AI Search Private Endpoint、Managed Identity、Cohere API key in Key Vault、Blob SAS-only(W7+ Beta hardening)
- [ ] Tier 2 trigger metric collected(query type distribution、failed query patterns)(W9.F2)

---

## 6. Stakeholder Approval Triggers(Beta gating)

Beta plan + W7-W8 kickoff signoff requires stakeholder review on:

- ✅ W6 closeout demo + Q&A briefing pack(`docs/01-planning/W06-final-eval-demo/artifacts/demo-prep.md`)
- ✅ W6 D2 prompt tuning A/B verdict(W5 retro carry-over C4 closed)
- ✅ W6 D1 Cohere v4.0-pro reaffirmed(W5 retro carry-over C1 closed)
- ⏸ architecture.md §3.2 + §6.3 amendment ticket(F1.7 narrative ready;**stakeholder approval cycle for content-lock vNext increment**)
- ⏸ Q7 Beta user source resolution
- ⏸ Q9 Sensitivity / CMK decision
- ⏸ Q10 Visual identity / brand confirmation
- ⏸ Q11 Entra ID tenant access(IT 配合)
- ⏸ Q12 Tier 2 owner identification(if signal strong)

---

## 7. Beta Plan Changelog

| Date | Change | Reason | Approver |
|---|---|---|---|
| 2026-05-05 | Initial draft(W6 D3 F5.3)| Per W6 plan F5.3;status=draft pending Chris W6 D5 closeout sign-off + stakeholder W7-W8 kickoff approve | _(pending)_ |

---

**Lifecycle reminder**:呢份 plan `status=draft`(等 Chris W6 D5 sign-off + stakeholder approve W7-W8 kickoff flip `active`)。重大 deviation 入第 7 節 changelog。
