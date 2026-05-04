# ADR-0002: Project rename to EKP (Enterprise Knowledge Platform)

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.1(v5 frozen 2026-04-27)

## Context

原項目名「RAPO Drive Project Knowledge Agent」過於 narrow:
- 暗示 Drive Project = 唯一 use case(實際 Drive Project 只係 first use case)
- 「Knowledge Agent」唔反映 platform 性質
- 缺乏企業層面 visibility,難以爭取 Tier 2 投資

## Decision

項目改名為 **Enterprise Knowledge Platform(EKP)**。Drive Project 變成 Tier 1 嘅 first use case。

## Alternatives Considered

- **保留「RAPO Drive Project Knowledge Agent」** — Reject:platform thinking 缺失;將來加 KB(non-Drive)需要再改名 / re-architecture
- **「RAPO Knowledge Hub」/「Ricoh Internal Search」** — Reject:仍然 product-name centric,non platform-name;少咗 enterprise-level positioning

## Consequences

- **Positive**:
  - Platform thinking from Day 1 → multi-KB code architecture 從一開始 align(see ADR-0005)
  - Reduce future re-architecture cost(`kb_id` propagation 已 day-1 design)
  - 企業層面 visibility 提升,有助 Tier 2 投資 case
- **Negative**:
  - 部分 stakeholder 仍習慣舊名,溝通需要 transition period
  - 中文項目資料 / Slack channel 名 / Confluence space 需要 rename(已 absorbed)
- **Neutral**:
  - First use case 仍係 Drive Project — operational scope 無變

## References

- `architecture.md` §13.1 為何 Project 改名做 EKP(source)
- `architecture.md` §1 Vision Statement(EKP positioning)
- ADR-0005 Multi-KB architecture from Day 1(directly enabled by this rename)
