# ADR-0010: Dify as read-only reference (no fork, no copy)

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.9(v5 frozen 2026-04-27)

## Context

Dify 係優秀 open-source LLMOps 平台,UI / API design 對 EKP 有 strong reference value。但 Dify 用 **modified Apache 2.0 license**,有 commercial restriction:

- 唔可 multi-tenant SaaS rebrand
- 唔可移除 Dify branding
- Fork 後 derivative work 受限

Direct fork 或 vendoring 會將 EKP 暴露於 license risk。

## Decision

Dify 純 **read-only reference**:

- `git clone --depth 1 https://github.com/langgenius/dify.git` 入 `references/dify/`
- `.gitignore` exclude `references/dify/`(`references/DIFY_PINNED_COMMIT.txt` 都 gitignore)
- **可以做**:Read Dify source 學 layout、interaction、component composition;PR comment 標 reference path(`Reference: dify/web/app/components/datasets/...`)
- **絕對唔可以做**:`cp` Dify code into EKP / `import` Dify package / fork Dify / replicate Dify branding(logo, primary color, marketing copy)

詳細 policy 喺 `references/REFERENCE_USAGE.md`(W1 Day 1 setup)。

## Alternatives Considered

- **Fork Dify + customize** — Reject:license risk(modified Apache 2.0 commercial restriction);derivative work scope 受限
- **Vendor Dify packages**(npm import / pip install)— Reject:同 fork 同類 license issue + supply chain dependency
- **Don't reference Dify at all** — Reject:UI / interaction patterns 有 reference value;ignore = re-invent wheel
- **Read Dify documentation only**(non source-code)— Reject:文檔覆蓋唔到 implementation detail;source code reference faster

## Consequences

- **Positive**:
  - License clean — EKP codebase 100% own
  - Scope 自主 — 可以做 Dify 唔做嘅嘢(MCP-ready / 自家 chunk strategy)
  - Reference value 保留(學 layout、API design)
- **Negative**:
  - PR comment 標 reference path 嘅 discipline 要 maintain(developer 可能忘)
  - `references/dify/` 佔本地 disk(~2GB)— 已 gitignored,不 push
- **Neutral**:
  - Dify update upstream 唔 auto sync;需要時手動 `git pull` re-clone

## References

- `architecture.md` §13.9 為何 Dify 唔 fork(source)
- `references/REFERENCE_USAGE.md` Dify reference policy
- CLAUDE.md §5.3 H3 Dify reference constraint(hard rule version)
- CLAUDE.md §7 Dify reference workflow
