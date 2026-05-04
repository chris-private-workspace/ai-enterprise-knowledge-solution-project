# ADR-0001: Build vs Buy — Self-build EKP based on D1/D2/D3 differentiators

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)+ Stakeholder + IPA Platform sponsor
**Promoted from**: `architecture.md` §13.0(v5 frozen 2026-04-27)

## Context

選擇自建 EKP 而非買 Glean / Gemini Enterprise / M365 Copilot 嘅決定點。**任何一條 differentiator invalidate → Tier 2 review 必須重新評估 vendor licensing 路線**。

5,000 user 規模年成本對比:
- Glean Enterprise:~$500K–2M
- Gemini Enterprise($30/user/月):~$1.8M
- M365 Copilot($30/user/月):~$1.8M(若未 bundled)
- **EKP 自建(Tier 1 production scale):~$10–15K**

但 ROI 唔係單睇 cost — Build 必須持續維護 + iteration(隱性 engineering cost);MIT NANDA 數字:purchased solution 成功率 67% vs internal build 33%(half rate)。所以 build 路線必須以明確 differentiation 為前提。

## Decision

EKP 自建,以 3 條 differentiator 為前提:

| # | Differentiator | 描述 | Invalidation Trigger |
|---|---|---|---|
| **D1** | **Domain specificity** | Ricoh product manuals + technical content,horizontal search vendor 對呢類 corpus 嘅 domain understanding 弱 | 若 generic vendor(Glean / Gemini Enterprise)喺 same eval set 達到 EKP 嘅 ≥ 90% retrieval quality,build 嘅 ROI 不成立 |
| **D2** | **APAC data sovereignty** | 日本 APPI、新加坡 PDPA、香港 PDPO 嘅 data residency 需求 | 若 use case 永遠停留 internal English manual,呢條 differentiator 弱化 |
| **D3** | **Deep IPA Platform integration** | 同 RICOH Intelligent Automation Platform 整合(natif.ai IDP、ValueTech workflow),變成 enterprise knowledge OS | 若 IPA Platform integration 始終冇 materialize,EKP 同 Glean 嘅功能差距收窄 |

**Decision Owner**:Stakeholder + IPA Platform sponsor,W12 production launch 後每 6 個月 review。

## Alternatives Considered

- **Glean Enterprise** — Reject:domain understanding for Ricoh internal manuals 弱;APAC residency 唔係 first-class;5000-user $500K–2M annual = 50-100× EKP cost
- **Gemini Enterprise**($30/user/月)— Reject:5000-user $1.8M = 100-180× EKP cost;Google Cloud lock-in
- **M365 Copilot**($30/user/月)— Reject:同 Gemini 同價;Microsoft ecosystem deep integration 反而 limits flexibility for IPA Platform integration

## Consequences

- **Positive**:
  - Cost 50-180× cheaper at production scale
  - Full architectural autonomy(可 evolve into IPA Platform integration node)
  - Domain-specific eval set + chunk strategy 可以 outperform horizontal vendors on Ricoh content
- **Negative**:
  - Persistent maintenance burden(隱性 engineering cost)
  - Reliance on Chris(技術 Lead)bandwidth — single-point-of-knowledge risk
  - MIT NANDA half-rate success risk
- **Neutral**:
  - W12 + 6-month review cycle commits team to periodic re-evaluation against vendor offerings(Glean / Gemini benchmark eval)

## References

- `architecture.md` §13.0 Build Justification(source)
- `architecture.md` §11 Tier 2 trigger matrix(when D1/D2/D3 invalidate triggers Tier 2 vendor review)
- RAPO Drive Knowledge Agent POC Strategy 文件 §2.4 + §5.2(Build vs Buy framing origin)
