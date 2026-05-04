# ADR-0005: Multi-KB architecture from Day 1

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.4(v5 frozen 2026-04-27)

## Context

EKP 定位 platform(see ADR-0002),first use case(Drive Project)雖然 single KB,但 Tier 2 / Beta+ 必加新 KB(Operations / HR / Engineering 等)。

Single-KB code 升級到 multi-KB code 嘅 refactor cost = `kb_id` 全鏈路 propagate(API route / search index filter / blob path / chunk_id format / settings panel)= 等於 day 1 已用 multi-KB 嘅初始 cost。**冇理由 day 1 唔做**。

## Decision

從 Day 1 多 KB 架構:

- **`kb_id` 全鏈路 propagate** — API route(`/kb/{kb_id}/...`)、search index filter、`ChunkRecord.kb_id`、blob path 都帶 kb_id
- **Per-KB index naming**:`ekp-kb-{kb_id}-v{n}`(W1 D4 created `ekp-kb-drive-v1`)
- **KbConfig per-KB**:embedding_model / chunk_strategy / top_k / rerank_k 全部 per-KB tunable
- **Tier 1 baseline single tenant single KB**(Drive),但 architecture 已 ready 加 KB

## Alternatives Considered

- **Single-KB hardcode + future refactor** — Reject:per article context calc, refactor cost 同 day-1 design 等同。Defer 純粹 procrastination
- **Multi-tenant from Day 1**(per-org isolation)— Reject:Tier 2 scope per `architecture.md §11`,Tier 1 不可加(H4 boundary per CLAUDE.md §5.4)
- **Per-KB separate FastAPI app** — Reject:over-engineered;single FastAPI + filter 已足夠至 Tier 2

## Consequences

- **Positive**:
  - Tier 2 加 KB 嘅 incremental cost 接近 0(POST /kb + populate)
  - First-use-case Drive Project 唔受 architectural complexity 拖累(only 1 KB exists)
  - Per-KB tunable settings 為 future operational flexibility 鋪路
- **Negative**:
  - Day 1 setup 多 1 個 path parameter 全鏈路維護;test fixture per-KB
  - Settings UI per-KB 而非 global,UX 更 verbose(可接受 trade-off)
- **Neutral**:
  - `kb_id` 命名 convention(`drive_user_manuals` 而非 UUID)增加可讀性 trade-off vs uniqueness constraints

## References

- `architecture.md` §13.4 為何 Multi-KB Day 1(source)
- `architecture.md` §3.4 KB Manager spec
- `architecture.md` §4.4 Multi-KB API routes
- `components/C02-kb-manager.md` KB CRUD implementation
- ADR-0002 EKP rename(motivates platform-first design)
