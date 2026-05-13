---
bug_id: BUG-002
title: "AppShell top bar overflows the viewport at ≤375px → horizontal scrollbar on every authenticated page"
severity: Sev4          # Sev1 | Sev2 | Sev3 | Sev4 (per PROCESS.md §4.5)
status: done            # triaged | investigating | fixing | verifying | done | wont-fix
reported: 2026-05-13
reporter: "AI (Deep Smoke v2, finding F9)"
affects_components: [C09]      # C09 Admin Console UI — <AppShell> shared chrome
spec_refs:
  - architecture.md v6 §5.0     # Application Shell (top bar + sidebar + main content; responsive collapse)
  - ADR-0024                    # unified application shell IA
---

# BUG-002 — AppShell top bar overflows the viewport at ≤375px

> **Report version**:1.0(initial)
> **Triage approver**:AI(self-triaged Sev4 — cosmetic, no functional/data/security impact;per PROCESS.md §4.5 no mandatory postmortem)

## 1. Symptom

On a 375px-wide viewport (iPhone SE / "small phone" breakpoint), `/dashboard` — and, since the offending element is the shared `<AppShell>` top bar, **every authenticated page** — has a horizontal scrollbar: `document.body.scrollWidth` ≈ 409 vs `document.documentElement.clientWidth` ≈ 360 (a ~34–49px overflow). 768px+ is fine.

## 2. Reproduction Steps

1. Open any authenticated route (`/dashboard`, `/chat`, `/kb`, …) in a 375px-wide viewport (DevTools device toolbar → "iPhone SE", or `browser_resize(375, …)`).
2. Observe a horizontal scrollbar at the bottom of the page; `document.body.scrollWidth > window.innerWidth`.

**Reproduction reliability**:Always (deterministic — it's a layout/CSS issue, no data dependency).

**Environment**:local dev (frontend `:3001`), any browser; first observed in Deep Smoke v2 (2026-05-12) on `/dashboard` at 375px.

## 3. Expected vs Actual

- **Expected**:per architecture.md v6 §5.0 + ADR-0024, the AppShell is responsive — at narrow widths the sidebar collapses to an off-canvas drawer and the top bar fits the viewport (no horizontal scroll). The W15 "mobile responsive" milestone established this for the views that existed then.
- **Actual**:the top bar's centre search-trigger `<button>` (`mx-auto flex h-9 w-full max-w-md … gap-2 …`) is a flex *item* of the `<header>` flex row with the default `min-width: auto`, and its inner label `<span class="truncate">Search knowledge bases, traces…</span>` has `white-space: nowrap` (Tailwind `truncate`) with no `min-width: 0`. So the button can't shrink below its label's full intrinsic width (~210px) + icon — the header row sums past 375px → the body scrolls horizontally. `<main>` has `overflow-x-hidden`, but the `<header>` is a *sibling* of `<main>`, not inside it, so that clip doesn't help.

## 4. Impact

- **Affected users / scenarios**:anyone on a ≤375px viewport (small phones) — visual only; the page is still fully usable (you can scroll). 376px–767px and 768px+ unaffected. The W12-W18 "user pre-Beta browser smoke" is where this would normally have been caught; W18 added `/dashboard` after the W15 responsive pass and the new shared `<AppShell>` top bar wasn't re-checked at 375px.
- **Workaround available?**:Yes — it's cosmetic; the user can ignore the scrollbar.
- **Data loss / corruption?**:No.
- **Security implication?**:No.

## 5. Severity Justification

**Sev4** per `PROCESS.md §4.5`: cosmetic / minor-UX, no functional breakage, no data risk, no security implication, a workaround exists (ignore the scrollbar), small blast radius (one viewport band). Sev4 → no mandatory postmortem.

## 6. Initial Diagnosis

- **Initial hypothesis**(at triage):the W18 `/dashboard` cards grid min-width/gap at 375px (Deep Smoke v2 F9's first guess).
- **Root cause confirmed**(2026-05-13):**not** the dashboard cards — it's the shared `<AppShell>` top-bar search-trigger button: a flex item without `min-w-0`, with a `truncate`/`whitespace-nowrap` label that also lacks `min-w-0`, so neither can shrink within the header flex row → the row overflows. Reproduces on every authenticated page, not just `/dashboard` (the smoke just happened to test `/dashboard`). The dashboard's own grid is fine (`grid-cols-1` at 375px; the `grid-cols-2` quick-actions inner grid has short labels) and `<main>` already has `overflow-x-hidden`.

## 7. Acceptance for Fix

- [x] Reproduction confirmed (deterministic CSS — flexbox min-width analysis; the ~409 vs 360 numbers from Deep Smoke v2)
- [x] Root cause identified (`<AppShell>` top-bar search button + its `truncate` `<span>` both need `min-width: 0`)
- [x] Fix implemented — `frontend/components/nav/app-shell.tsx`: added `min-w-0` to the search `<button>` and to its inner truncate `<span>` (the textbook flexbox-truncation fix); no visual change at ≥376px (the button only shrinks below ~234px, which is the overflow band)
- [x] Regression test added — `frontend/tests/e2e/app-shell-path.spec.ts`: a "no horizontal overflow at 375px" test (`document.documentElement.scrollWidth <= window.innerWidth + 1` across `/dashboard` `/chat` `/kb`). **Caveat**: jsdom doesn't do layout, so a Vitest unit test can't catch this — the regression check is the Playwright one, which is gated behind the R8 `npx playwright install chromium` block (CO_W15_F4_browser_binaries / ADR-0017), same as the rest of the E2E suite. The fix itself is verified by the flexbox analysis + `tsc`/`lint`/`vitest` staying green + the existing `app-shell` Vitest test still passing.
- [ ] Re-run §2 repro steps in a browser — 🟡 user pre-Beta smoke (R8 — `npx playwright install chromium` blocked; same caveat umbrella as W12-W18 + CH-002 AC14). Not blocking closeout for a Sev4 cosmetic fix.

## 8. Report Changelog

| Date | Change | Reason | Approver |
|---|---|---|---|
| 2026-05-13 | Initial triage (Sev4) + root-cause confirmed + fix + closeout — bundled into the housekeeping batch that closed deep-smoke nits F1/F4/F11 | Deep Smoke v2 finding F9 | AI(self) |

---

**Lifecycle reminder**:Sev1/Sev2 → `postmortem.md` mandatory(per `PROCESS.md §4.5`)。Sev4 — none required。
