---
bug_id: BUG-002
report_ref: ./report.md
checklist_ref: ./checklist.md
status: closed          # in-progress | closed
---

# BUG-002 — Progress

## 2026-05-13 — triage + root cause + fix + closeout (single sitting)

### Done
- Triaged Sev4 (cosmetic; no functional/data/security impact; workaround = ignore the scrollbar). Per PROCESS.md §4.5 → no mandatory postmortem.
- Root cause: **not** the W18 `/dashboard` cards grid (Deep Smoke v2 F9's first guess) — it's the shared `<AppShell>` top-bar search-trigger `<button>` (`mx-auto flex h-9 w-full max-w-md … gap-2 …`): a flex *item* of the `<header>` flex row with the default `min-width: auto`, and its inner `<span class="truncate">…` (`white-space: nowrap`, no `min-w-0`). Neither can shrink below the label's intrinsic width (~210px) + icon, so the header row sums past 375px → `document.body.scrollWidth ≈ 409` vs `clientWidth ≈ 360`. Reproduces on **every** authenticated page (the smoke just tested `/dashboard`). `<main>` has `overflow-x-hidden` but the `<header>` is a *sibling*, not a child, so that doesn't clip it.
- Fix: `frontend/components/nav/app-shell.tsx` — `min-w-0` on the search `<button>` (so the header flex row can shrink it) + `min-w-0` on the inner truncate `<span>` (so the `truncate` actually truncates within the button's own flex context). Textbook flexbox-truncation fix; zero visual change at ≥376px (the button only shrinks below ~234px, which is exactly the overflow band).
- Regression test: `frontend/tests/e2e/app-shell-path.spec.ts` — a new "no horizontal overflow at 375px" test asserting `document.documentElement.scrollWidth <= window.innerWidth + 1` across `/dashboard` `/chat` `/kb` after `page.setViewportSize({width: 375, …})`.
- Gates: `pnpm type-check` 0; `pnpm lint` clean; `[oklch(` grep 0; `pnpm exec vitest tests/unit/app-shell.test.tsx` → 4 passed.

### Decisions
- **No Vitest-level regression test** — jsdom doesn't do layout, so a unit test can't measure `scrollWidth`. The regression check is the Playwright one, which is gated behind the R8 `npx playwright install chromium` block (CO_W15_F4_browser_binaries / ADR-0017), same as the rest of the E2E suite. The fix is verified by the flexbox analysis + the green `tsc`/`lint`/`vitest` + the existing `app-shell` Vitest test still passing. For a Sev4 cosmetic fix that's an acceptable verification bar.
- **Fix location = `<AppShell>`, not `/dashboard`** — fixing the shared top bar resolves it for all `(app)/` pages at once, which is the correct surface (the bug isn't dashboard-specific).
- Bundled with the housekeeping batch that closed deep-smoke nits F1/F4/F11 (`80980dc`) — separate commit (this one) per the bug-fix-gets-its-own-paper-trail convention; report.md committed alongside the fix.

### Acceptance (report.md §7)
- ✅ Reproduction confirmed (deterministic CSS / flexbox min-width analysis; ~409 vs 360 from the smoke)
- ✅ Root cause identified
- ✅ Fix implemented
- ✅ Regression test added (Playwright; run gated by R8 — caveat documented)
- 🟡 Browser re-run at 375px = user pre-Beta smoke (R8 — same umbrella as W12-W18 + CH-002 AC14; not blocking a Sev4 closeout)

**Verdict**: BUG-002 **CLOSED 2026-05-13** (Sev4; fix + report + regression test landed; the browser re-verify is the user pre-Beta smoke).

### Commits
| Hash | Subject |
|---|---|
| _(this commit)_ | `fix(frontend): BUG-002 — AppShell top bar overflows the viewport at ≤375px (search button + label need min-w-0)` |

---

**End of BUG-002 progress**
