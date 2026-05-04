# ADR-0009: Frontend / Backend separated (not Next.js full-stack)

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.8(v5 frozen 2026-04-27)

## Context

Next.js 14(see ADR-0006)支持 full-stack(React frontend + Node.js API routes)。但 EKP backend 係 Python ML / RAG 重度 ecosystem(Docling、RAGAs、Pydantic、Azure Python SDK、OpenAI Python SDK)。Node.js full-stack 會 kill 呢個 ecosystem。

## Decision

**Frontend / Backend 分開部署**:

- **Frontend**:Next.js 14 + shadcn(per ADR-0006),via API call to backend
- **Backend**:FastAPI + Python 3.12+ async,REST + SSE streaming
- 兩個 separate Docker container,via API contract(`docs/api-contract.md` W2 末)
- **Future client**:第三方 client(Slack bot、Teams bot、CLI、MCP integration)直接連 FastAPI,無需經 Next.js

## Alternatives Considered

- **Next.js full-stack**(Node.js API routes)— Reject:kills Python ML ecosystem;Docling / RAGAs / Pydantic 全部 Python only;rewrite 入 TypeScript = massive cost
- **Backend Python + Frontend SSR with hydration via API**(current decision) ✅
- **GraphQL middle layer** — Reject:over-engineered for Tier 1;REST + Pydantic schema 已足夠;GraphQL adds maintenance burden
- **gRPC**(internal-only)— Reject:browser non-native 支援;HTTP/JSON simpler for frontend;gRPC reserved for inter-service Tier 2 scenarios

## Consequences

- **Positive**:
  - Backend 可以 fully leverage Python ML / RAG ecosystem
  - Frontend / Backend 各自迭代速度最高(non blocking)
  - Future Slack / Teams bot 直接 wire FastAPI,不需 Next.js indirection
  - MCP integration zero-additional-effort(FastAPI already MCP-ready per `§4.4`)
- **Negative**:
  - 2 個 container deployment(frontend + backend)— 多 ~$20/month
  - CORS / API contract version 一致性需要 explicit governance(`docs/api-contract.md`)
  - Auth flow 跨 service 設計需要 W7+ Entra ID work
- **Neutral**:
  - W7+ Beta deploy 階段 reverse proxy(Azure Front Door / Caddy)可 unify domain

## References

- `architecture.md` §13.8 Frontend/Backend 分開(source)
- `architecture.md` §4.1 FastAPI architecture
- `architecture.md` §4.4 + §4.5 API contract
- `components/C08-api-gateway.md`
- ADR-0006 Next.js + shadcn(complementary frontend decision)
