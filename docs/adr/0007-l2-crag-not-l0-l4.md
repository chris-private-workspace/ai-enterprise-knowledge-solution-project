# ADR-0007: L2 CRAG (not L0 / L4+) for Tier 1

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.6(v5 frozen 2026-04-27)

## Context

RAG 「complexity ladder」:
- **L0** — single-shot retrieve+generate(naive RAG)
- **L1** — + reranker / query rewrite
- **L2 CRAG** — Corrective RAG:retrieve → grade → if-low-confidence-rewrite-and-retry → generate
- **L3** — adaptive routing(per-query strategy selection)
- **L4+** — planner-executor multi-agent orchestration

Tier 1 12 週 sprint 需要選一個 sweet spot:夠 advanced 滿足「Advanced RAG」expectation,但唔可以 over-engineered 跑唔完 schedule。

## Decision

Tier 1 採用 **L2 CRAG**:

- W3-W4 implement L2 CRAG loop(retrieve → grade with judge → if-low-confidence-rewrite-query-and-retry → generate)
- W5 conditional **L3 adaptive routing**(only if Gate 2 全 pass + 4 metric stable)
- L4+(multi-agent / planner-executor)= **Tier 2 explicit out-of-scope**(per `architecture.md §11`)

## Alternatives Considered

- **L0 single-shot** — Reject:太淺,「Advanced RAG」expectation 不滿足;對 multi-step query 能力低
- **L1 reranker + query rewrite only** — Considered but reject:CRAG grading loop 提供 self-correction,L1 缺呢層
- **L4+ planner-executor agent** — Reject:over-engineered;LangGraph / Microsoft Agent Framework 引入 framework 風險(see ADR-0011);12 週做唔好;maintenance cost 高
- **L3 adaptive routing from Day 1** — Reject:routing logic 需要 W4 metric 數據驅動 — Day 1 無依據

## Consequences

- **Positive**:
  - L2 CRAG 學術 + 業界 well-established(CRAG paper 2024)— 實作風險低
  - Self-correction 對低信心 retrieval 提供 second pass,提升 hard-query recall
  - W5 stretch L3 為 Gate 2 PASS 後嘅升級路徑保留 flex
- **Negative**:
  - CRAG grading 需要 judge LLM call → +latency / cost
  - L2 → L4 jump cost 高,Tier 2 進入 multi-agent 時要 framework migration evaluate(see ADR-0011)
- **Neutral**:
  - L2 不阻 future Tier 2 GraphRAG(see ADR-0008 trigger matrix)— two complexity axes 獨立

## References

- `architecture.md` §13.6 為何 L2 CRAG(source)
- `architecture.md` §3.1 RAG Core pipeline + CRAG loop spec
- `architecture.md` §11 Tier 2 trigger matrix(L4+ deferred)
- `components/C05-generation.md`(W3-W4 CRAG impl)
- ADR-0011 Custom CRAG vs LangGraph(framework path for L2 impl)
