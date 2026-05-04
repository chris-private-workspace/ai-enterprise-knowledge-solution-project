# ADR-0011: Custom CRAG (~200 lines) vs LangGraph framework — Tier 1 path

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.11(v5 frozen 2026-04-27)

## Context

L2 CRAG impl(per ADR-0007)需要 orchestration:retrieve → grade → conditional rewrite-retry → generate。Multiple framework path candidates:

- **LangGraph 1.0**(GA Oct 2025,400+ companies prod)— state-machine workflow framework
- **Microsoft Agent Framework**(MAF, 1.0 GA April 2026,< 1 month track record)
- **Custom Python orchestration**(自寫 ~200 行)

Strategy 文件 §3.1 stance:「framework-agnostic via MCP」+「LangGraph for POC, MAF for production」。但呢 stance 反映 multi-BU long-term scale 嘅合理選擇,可能對 Drive Project Tier 1 規模 over-engineered。

## Decision

Tier 1 用 **自寫 CRAG orchestration(~200 行 Python)**,**唔用 LangGraph 1.0 / Microsoft Agent Framework**。

Tier 2 進入 multi-agent / cross-KB synthesis 時 **evaluate framework migration**(滿足 ≥ 2 條 trigger 即 evaluate):

1. 跨 KB synthesis(end user 一條 query 同時撈 Drive + future KB)成為 recurring requirement
2. Multi-step planner-executor agent capability 需要(L4+)
3. 跨多個 LLM provider 嘅 prompt-aware orchestration 需要
4. Team 規模擴展 → framework 嘅 standardization value 超過 lock-in cost

## Alternatives Considered

- **LangGraph 1.0** — Reject for Tier 1:
  - Per-node overhead ~10–14ms(LangGraph 自報 benchmark,所有 framework 最高)
  - Framework lock-in medium(state schema、checkpointer pattern)
  - 200 行自寫 vs LangGraph wrapping cost — 自寫 easier debug
  - 反向 migration 難(LangGraph state convention 已固化)
- **Microsoft Agent Framework**(MAF) — Reject for Tier 1:
  - 1.0 GA April 2026,< 1 month production track record
  - Azure-native bonus 但 lock-in 高
  - 同 LangGraph 同 framework lock-in trade-off
- **Other frameworks**(LlamaIndex Workflows / CrewAI / AutoGen) — Reject:同 framework lock-in trade-off;non Microsoft / Anthropic / Google enterprise pedigree
- **Plain Python procedural code**(no class structure) — Reject:CRAG 有 cyclical control flow + state(grading score),class-based orchestration(~200 行)更 readable

## Consequences

- **Positive**:
  - Tier 1 規模(2K chunks + L2 single-loop)~200 lines 完全足夠
  - Per-node overhead 0(直接函數 call)
  - Debuggability 100%(自己 code 全可 trace)
  - Migration cost lower(自己 wrap → LangGraph 較容易)
  - Strategy 文件嘅 LangGraph commitment 推到 Tier 2,non Tier 1 leak
- **Negative**:
  - Tier 2 升 L4+ multi-agent 時 framework migration 必經 path
  - 自寫 orchestration 需要 maintain — non community-driven framework
  - LangSmith / LangGraph Studio 等 ecosystem tooling 不可用(W4 自家 trace via Langfuse 補)
- **Neutral**:
  - MCP wrapper 喺 Tier 1 已 ready(`§4.4` endpoint design)— framework-agnostic boundary 維持

## References

- `architecture.md` §13.11 Custom CRAG vs LangGraph(source)
- `architecture.md` §3.1 RAG Core pipeline + CRAG loop spec
- `architecture.md` §4.4 MCP-ready endpoint design
- ADR-0007 L2 CRAG(parent decision: complexity tier)
- RAPO Drive Knowledge Agent POC Strategy 文件 §3.1 + §4.2(framework discussion origin)
