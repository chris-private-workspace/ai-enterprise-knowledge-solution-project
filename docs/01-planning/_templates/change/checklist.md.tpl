---
change_id: CH-{NNN}
spec_ref: ./spec.md
status: in-progress     # in-progress | done
last_updated: YYYY-MM-DD
---

# CH-{NNN} — Checklist

> Atomic checkbox items derived from `spec.md` §3 acceptance criteria。每 item ≤ 1-2h effort。
> AI tick 完成嘅 item;唔可以 tick 嘅 item 喺 progress Day-N entry 寫原因。

## Implementation

- [ ] {Atomic task 1}
- [ ] {Atomic task 2}
- [ ] {Atomic task 3 — verify with `<command / criterion>`}

## Verification

- [ ] Run all acceptance criteria from `spec.md §3`
- [ ] Smoke test in dev env
- [ ] (if user-facing)manual verify in browser per spec scenario

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1(`feat(scope): description (Cn)`)
- [ ] (if architectural)ADR written + tag affected Cn(R5)
- [ ] (if affects component)Update `components/Cn-*.md` design note + bump status `v0-draft → v1-active`(per CC-5)
- [ ] OQ status sync(if applicable)(R4)
- [ ] `progress.md` closeout summary written
- [ ] `progress.md` frontmatter status flipped to `closed`

---

**Lifecycle reminder**:呢份 checklist 隨 spec acceptance criteria 衍生。新加 item 必須先入 spec + changelog,然後再加 checklist。
