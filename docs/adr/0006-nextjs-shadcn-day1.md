# ADR-0006: Next.js 14 + shadcn/ui from Day 1 (replace Streamlit)

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.5(v5 frozen 2026-04-27)

## Context

V3 規格初版用 Streamlit 做 POC frontend。但「POC 都要好好睇」嘅 Tier 1 標準下,Streamlit 視覺天花板低 — demo stakeholder 一眼識破 prototype tier。

同時,Beta 階段必須 React migration(Streamlit production scale 弱、無 streaming response native 支援)。Streamlit + future React rewrite = 時間 sunk cost。

## Decision

從 Day 1 用 **Next.js 14 + shadcn/ui + Tailwind**(放棄 Streamlit)。

選擇詳情:
- **Next.js 14 App Router**(non Pages Router)— React Server Components default
- **shadcn/ui** for components — own-the-code 模式,無 vendor lock-in
- **Tailwind utility classes** + design tokens(`frontend/lib/theming/tokens.ts`)
- **Vercel AI SDK** `useChat` for LLM streaming(native SSE support)
- **TanStack Query** for non-streaming data fetching

## Alternatives Considered

- **Streamlit**(v3 initial)— Reject:POC quality 不達標;Beta 必 rewrite 浪費時間;無 streaming native support
- **Material UI / Ant Design / Chakra** — Reject:vendor lock-in + design 陳套;shadcn own-the-code 更 flexible
- **Pages Router**(legacy Next.js)— Reject:App Router 係 future;Server Components 係 default 模型轉變
- **Pure React + Vite**(no SSR)— Reject:loses Server Components benefits;部署 setup 比 Next.js 複雜

## Consequences

- **Positive**:
  - POC demo visual 接近 production tier(see W2 D5 admin views)
  - Beta phase 唔需要 React migration(慳 5–8 工作日)
  - Vercel AI SDK + LLM streaming 整合 zero-config
  - shadcn own-the-code 允許 W3 D5 polish 自由 customize
- **Negative**:
  - Setup cost 比 Streamlit 多 ~1 工作日(W1 D1 baseline scaffold)
  - Frontend dev 需要 React + Tailwind 知識(team skill 已 cover)
  - `pnpm` + `npm` ecosystem dependency surface 大
- **Neutral**:
  - W2 baseline 用 plain HTML form / table(simplicity-first per Karpathy §1.2),W3 D5 swap shadcn DataTable + Form

## References

- `architecture.md` §13.5 為何 Next.js + shadcn from Day 1(source)
- `architecture.md` §5.1-§5.7 UI views spec
- `components/C09-admin-ui.md` + `components/C10-chat-ui.md`
- CLAUDE.md §3.2 Frontend conventions
- ADR-0009 Frontend/Backend separated(complementary architectural decision)
