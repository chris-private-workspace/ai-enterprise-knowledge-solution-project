# EKP Architecture Decision Records (ADRs)

> Format per `CLAUDE.md` §6。Filename pattern:`NNNN-short-kebab-title.md`(NNNN = 4-digit zero-padded sequential)。

## Index

| ADR | Title | Status | Source |
|---|---|---|---|
| [0001](./0001-build-vs-buy-self-build-ekp.md) | Build vs Buy — Self-build EKP based on D1/D2/D3 differentiators | Accepted | `architecture.md` §13.0 |
| [0002](./0002-project-rename-to-ekp.md) | Project rename to EKP(Enterprise Knowledge Platform) | Accepted | `architecture.md` §13.1 |
| [0003](./0003-multi-format-ingestion.md) | Multi-format ingestion(Word + PDF + PPT) | Accepted | `architecture.md` §13.2 |
| [0004](./0004-layout-aware-chunking.md) | Layout-aware chunking — not character-based | Accepted | `architecture.md` §13.3 |
| [0005](./0005-multi-kb-architecture-day1.md) | Multi-KB architecture from Day 1 | Accepted | `architecture.md` §13.4 |
| [0006](./0006-nextjs-shadcn-day1.md) | Next.js 14 + shadcn/ui from Day 1(replace Streamlit) | Accepted | `architecture.md` §13.5 |
| [0007](./0007-l2-crag-not-l0-l4.md) | L2 CRAG(not L0 / L4+)for Tier 1 | Accepted | `architecture.md` §13.6 |
| [0008](./0008-graphrag-trigger-matrix.md) | GraphRAG via Trigger Matrix(not "Plan B added on") | Accepted | `architecture.md` §13.7 |
| [0009](./0009-frontend-backend-separated.md) | Frontend / Backend separated(not Next.js full-stack) | Accepted | `architecture.md` §13.8 |
| [0010](./0010-dify-read-only-reference.md) | Dify as read-only reference(no fork, no copy) | Accepted | `architecture.md` §13.9 |
| [0011](./0011-custom-crag-vs-langgraph.md) | Custom CRAG vs LangGraph framework — Tier 1 path | Accepted | `architecture.md` §13.11 |

> §13.10 ("Other v3 inherits") 屬 meta-rollup,不單獨 promote。

## Adding a new ADR

Per `CLAUDE.md` §6 — 任何違反 §5.1 H1 / §5.2 H2 嘅變動必須 ADR(approval 後)。Format:

```markdown
# ADR-NNNN: <Title>

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Superseded by ADR-MMMM
**Approver**: <Name>

## Context
## Decision
## Alternatives Considered
## Consequences
## References
```

**Next NNNN**:`0012`(per CLAUDE.md §6 explicit)。
