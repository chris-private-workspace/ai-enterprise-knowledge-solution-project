# ADR-0008: GraphRAG via Trigger Matrix (not "Plan B added on")

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.7(v5 frozen 2026-04-27)

## Context

GraphRAG / Knowledge Graph 係 well-known Tier 2 advanced RAG capability。「If needed」嘅模糊講法 = 永遠喺 backlog 飄,或者 W4 突然加入打亂 plan,團隊 nobody-owns-it。

Tier 2 governance 需要明確 entry condition,而非 ad-hoc decision。

## Decision

GraphRAG / KG 採用 **5-trigger matrix**:5 條 trigger 任 1 條 fire + Chris approve = enter Tier 2 evaluation。Tier 1 唔做 GraphRAG。

Trigger matrix(per `architecture.md §11.2`):
1. Cross-document multi-hop reasoning failure rate ≥ 20% on eval set(R@5 fail mode 集中喺 multi-hop)
2. Sub-100-chunk corpus per KB 但 retrieval still poor(suggests 結構化 metadata gap)
3. Stakeholder-driven KG requirement(business case 明確 entity graph)
4. Cross-KB synthesis 變成 recurring requirement(L4+ trigger overlap, see ADR-0007)
5. Domain expert validation 需要 traceable entity provenance

**Decision Owner**:Chris approve gates entry(non team consensus / non bottom-up vote)。

## Alternatives Considered

- **「If needed」「Plan B」模糊條款** — Reject:nobody-owns-it,W4 突然加入打亂 plan;trigger ambiguity = scope creep risk
- **Day 1 GraphRAG**(把 KG 建落 Tier 1)— Reject:explicit Tier 2 boundary per `§11`(H4 hard constraint per CLAUDE.md §5.4);over-engineered for 2K chunks
- **GraphRAG only on retrieval-fail metric**(single trigger)— Reject:metric trigger alone misses business-driven cases(stakeholder ask, expert validation)
- **GraphRAG every Beta phase review**(time-based)— Reject:固定 cadence 唔反映 actual need;wasted review cycles

## Consequences

- **Positive**:
  - 明確 governance:team 知道 GraphRAG 唔係 Tier 1 work
  - Trigger 5 條覆蓋 metric / scale / business / cross-axis 4 個 dimension
  - Chris approve 作為 final gate 保留 architectural authority
- **Negative**:
  - Trigger evaluation 需要 W5+ retro 階段 surface;Chris 要持續監察 metric
  - Trigger 5 條都 fire 都唔做 = governance failure
- **Neutral**:
  - Tier 2 GraphRAG 同 multi-agent (L4+) 有 overlap(ADR-0007 trigger 4 + ADR-0008 trigger 4 同條),但 evaluation independent

## References

- `architecture.md` §13.7 為何 GraphRAG Trigger Matrix(source)
- `architecture.md` §11.1 Tier 2 list(GraphRAG explicit)
- `architecture.md` §11.2 GraphRAG trigger matrix detail
- CLAUDE.md §5.4 H4 Tier boundary
- ADR-0007 L2 CRAG(complementary complexity decision)
