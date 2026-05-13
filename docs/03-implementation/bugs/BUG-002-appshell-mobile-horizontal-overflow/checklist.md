---
bug_id: BUG-002
report_ref: ./report.md
status: done            # in-progress | done
last_updated: 2026-05-13
---

# BUG-002 — Checklist

> Derived from `report.md §7 Acceptance for Fix`。延後項標 🚧 + reason(per CLAUDE.md sacred rule — 唔可以刪未勾 `[ ]`)。

## Fix

- [x] **T1** — Root cause confirmed: `<AppShell>` top-bar search-trigger `<button>` (flex item, no `min-w-0`) + its inner `<span class="truncate">` (no `min-w-0`) → neither shrinks within the `<header>` flex row → overflow at ≤375px. Not the dashboard cards grid (the smoke F9 first guess).
- [x] **T2** — `frontend/components/nav/app-shell.tsx`: add `min-w-0` to the search `<button>` and `min-w-0` to its inner truncate `<span>`. No change at ≥376px.
- [x] **T3** — `frontend/tests/e2e/app-shell-path.spec.ts`: add a "no horizontal overflow at 375px" test (`scrollWidth <= innerWidth + 1` across `/dashboard` `/chat` `/kb`). 🚧 the *run* is R8-blocked (`npx playwright install chromium` / CO_W15_F4 / ADR-0017) — the test is the regression check, gated behind the same caveat as the rest of the E2E suite.
- [x] **T4** — `pnpm type-check` + `pnpm lint` clean; `[oklch(` grep 0; `pnpm exec vitest tests/unit/app-shell.test.tsx` → 4 passed (the existing `/collapse sidebar/i` test unaffected).
- [ ] **T5** — re-run §2 repro in a browser at 375px → 🚧 user pre-Beta smoke (R8 — same umbrella as W12-W18 + CH-002 AC14; not blocking a Sev4 cosmetic-fix closeout).

## Cross-Cutting

- [x] Commit references `progress.md` entry; component tag `(C09)` in commit message per CC-1
- [x] No ADR (cosmetic CSS fix, no architectural change — H1 not triggered)
- [x] `report.md` status `triaged → done`; this `checklist.md` status `in-progress → done`; `progress.md` written

---

**Lifecycle reminder**:新加 acceptance item 必先入 `report.md §7`,然後再加 checklist。延後項標 🚧 + reason,唔可以刪。
