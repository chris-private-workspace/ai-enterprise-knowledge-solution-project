---
phase: W18-app-shell-ia
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed
last_updated: 2026-05-11
---

# Phase W18 — Progress

> Daily log + decisions + commits + closing retro。每 commit 對應一個 Day-N entry mention(R2;`docs(planning):` / `docs(adr):` housekeeping commits exempt)。
> Plan deviation → `plan.md` §7 changelog（R3）。OQ resolved → `decision-form.md` + Day-N mention（R4）。

---

## Day 0 — Kickoff(2026-05-10)

### Trigger

W17-beta-hardening closeout local-dev-test session(2026-05-10). After the local backend(`:8000`)+ frontend(`:3001`)were brought up in mock-auth mode, the stakeholder evaluated the running platform and surfaced an IA-expectation gap — three points:
1. `http://localhost:3001/` looked like a public marketing webpage;the expectation = unauthenticated → `/login`,then into the platform(usually a dashboard main page).
2. After login(reached via direct URL nav), `/admin` was the landing;navigating thence to `/chat` showed *no* top bar / *no* left side menu — inconsistent chrome.
3. A normal internal platform should have a **unified** page shell — a consistent top bar / menu, a left sidebar / menu, and a right main-content area — across all views.

→ Drafted **ADR-0024**(unified application shell IA)as a Proposed proposal(`112ff20`). Chris then answered Q1-Q5 in the same session — Q1 remove the marketing landing(EKP 非對外)/ Q2 a real overview dashboard / Q3 sidebar = functional modules + top bar = global search·language·theme·profile / Q4 no "admin" → flatten URLs / Q5 its own W18 phase(different content from the prior planning)— and asked that Q6(the ADR-0015 relationship)be explained in the ADR before flipping. The revised ADR reflects Q1-Q5 + the Q6 "Relationship to ADR-0015" section.

This Day-0 entry = the next session's directive: **「開 W18-app-shell-ia phase folder + plan.md(per CLAUDE.md §10 R1)+ amend architecture.md v6 §5(刪 §5.9 Landing + 加 §5.x Application Shell / §5.x Dashboard + re-route §5.2-§5.7)+ ADR-0015 加「amended by ADR-0024」」** — = the post-acceptance implementation authorization for ADR-0024(H1 layout-philosophy change per CLAUDE.md §5.1).

### Kickoff cascade landed(`(this commit)`)

- **ADR-0024 → Accepted** — `docs/adr/0024-unified-application-shell-ia.md` Status「**Proposed**」→「**Accepted**」(Q1-Q6 resolved;Chris directed the post-acceptance cascade);`## Decision` header「proposed」→「accepted」;the Implementation-Deliverables note「folder not pre-created until Accepted」→「created on acceptance 2026-05-10」(F0.1)
- **ADR README** — `docs/adr/README.md` ADR-0024 row status「**Proposed**」→「Accepted」+ context cell updated;footnote「Proposed 2026-05-10」→「Accepted 2026-05-10」;the「Next NNNN」block's 0024 line updated(F0.2)
- **ADR-0015 amended-by note** — `docs/adr/0015-ui-tier-1-expansion-dify-leaning.md` Status line gets「**amended by ADR-0024 2026-05-10**」(3 ways:V7 Landing removed / per-view layout-regime split → single `<AppShell>` / V2「Admin Dashboard」→ real `/dashboard`;preserves V8/V9 auth pages + shadcn/ui foundation + EKP visual identity + W12-W15 impl)+ a References entry for ADR-0024(F0.3)
- **`architecture.md v6 §5` amendment**(inline-tagged, doc version held — same convention as the §3.4 ADR-0023 / §3.7 ADR-0022 tags;F0.4):
  - top-block §5 amendment note added(after the v5.1→v6「註」block)
  - **NEW §5.0 Application Shell** section inserted before §5.1 — the unified shell statement(top bar + collapsible left sidebar + main content;5 sidebar modules Dashboard/Chat/Knowledge Bases/Eval Console/Traces;top-bar contents incl. the disabled language toggle [i18n Tier 2 §11];login-gate;flattened `app/(app)/...` routing)
  - §5.2 Chat header `/`→`/chat` + an in-shell note(focus-mode toggle replaces the full-bleed chrome-less surface)
  - **§5.3「Admin Dashboard」→「Dashboard」** `/admin`→`/dashboard` + body rewritten as a real overview(KB summary / recent queries / latest eval / system health / quick actions)
  - §5.4 KB List `/admin/kb`→`/kb` + in-shell note;§5.5 KB Detail `/admin/kb/[id]`→`/kb/[id]` + in-shell note;§5.6 Eval Console in-shell note(route unchanged)
  - **§5.7「Debug View」→「Traces」** `/debug/[traceId]`→`/traces/[traceId]` + the rename rationale note(operations-facing;9 stages unchanged)
  - **§5.9 V7 Landing → REMOVED tombstone**(EKP internal-only;`/`→redirect `/login`｜`/dashboard`;view-count: out goes Landing, in comes Dashboard;`brand-panel.tsx` kept)
  - §5.10 Login + §5.11 Register redirect target `/chat`→`/dashboard` + "stays outside `<AppShell>`" notes
- **W18 phase folder** — `docs/01-planning/W18-app-shell-ia/{plan,checklist,progress}.md` created;`status: active`(per the Chris directive — not the usual draft→active flip;the directive + ADR-0024 Accepted IS the authorization, same pattern as W17 D0). Plan §2 deliverables F0-F9 = ADR-0024 D1-D10 mapped(F1=D1 / F2=D2+D7 / F3=D3 / F4=D4 / F5=D5 / F6=D6 / F7=D8 / F8=D9+D10-residual / F9=closeout)— D10's `architecture.md v6 §5` part landed at this kickoff → the W18 doc-deliverable narrows to `COMPONENT_CATALOG.md` C09/C10(F8.6)+ `session-start.md` hygiene(F9.6)(F0.5)

### Pre-kickoff state notes(grounding the plan)

- `frontend/components/nav/admin-shell.tsx` already does the hamburger-collapse + responsive + `<UserMenu>` + `<ThemeToggle>` layout — `<AppShell>` generalizes it rather than building from scratch(ADR-0024 D1 / F1).
- The W12-W15 views' *content* is the keeper — KB Detail's 5 tabs(incl. ADR-0021 Retrieval Testing + the `mode` param), Eval's metric cards, the(soon-to-be)Traces 9-stage timeline, the chat streaming + citations, the auth-page split layout — W18 re-parents + re-routes, does NOT rebuild(ADR-0015 (c)+(d) stand;Karpathy §1.3).
- The `/api/backend/*` Next.js rewrite(`next.config.mjs`)is prefix-based, not app-route-specific — the route restructure(`/admin/*` → `/kb/*` etc)doesn't touch it(verify in F3.4 anyway).
- `npx playwright install chromium` is **R8-corp-proxy-blocked**(ECONNRESET — CO_W15_F4_browser_binaries / ADR-0017)— so F8.5's Playwright deliverable = updated specs + `tsc` compile-check + spec review;the actual E2E run stays the user's pre-Beta smoke(the W12-W15 "smoke-user-deferred" caveat shape).
- `pnpm test:unit` baseline = 1 file / 3 tests(W17 F6 scaffold)— F8.4 adds `<AppShell>` + `<GlobalSearch>` tests on top.
- Backend is **untouched** — `/dashboard` v1 consumes existing `/health` + `/kb` + the last cached `/eval/run`;no new endpoint;the W17-deferred 🚧 F1.5b / F3.5b runtime checks stay under CO17, unrelated to W18.

### Carry-overs addressed by W18(from session-start.md §11 + W17 retro)

| Carry-over | W18 deliverable |
|---|---|
| ADR-0024 implementation(the whole IA restructure)| F1-F9(= ADR-0024 D1-D10)|
| CO_W15_F3_dark_mode_visual_verify(remainder — interactive 9-view walkthrough)| F8.3 re-checks `[oklch`=0 through the restructure + dark-mode smoke on the new shell surfaces;the interactive walkthrough stays the user's pre-Beta smoke |
| CO_W15_F4_interactive_flow_E2E(partial)| F8.5 — "shell present/absent" Playwright assertion + route-ref updates;full interactive E2E run stays Tier 2(blocked on the browser-binary install)|
| Vitest coverage expansion(W17 F6 left it at 1/3)| F8.4 — `<AppShell>` + `<GlobalSearch>` tests(still short of "deep component coverage" = Tier 2)|

W18 does **NOT** address(stay W16 / Tier 2 / future): CO16 Track A IT cred + R-B1(W16 F1 — W18 is frontend-only);CO17 🚧 F1.5b / F3.5b / `npx playwright install chromium`(personal-Azure-dev-tier umbrella);CO19 25% rollout(W16 F2);CO_F6a/b/c ACS email(Track A);CO_W15_F1_eval_set_v1(needs Chris SME labels per Q14);CO_W15_F3_aria_full_audit(Tier 2 full screen-reader audit);CO13/AF3(ADR-0013 reserved).

### Actual vs Planned Effort(running — fill per day)

| Deliverable | Planned | Actual | Variance / note |
|---|---|---|---|
| F0 Kickoff cascade | (D0, ~0.5d) | (this session) | ADR-0024→Accepted + README + ADR-0015 note + `architecture.md v6 §5` amendment(§5.0 added / §5.3 Dashboard / §5.9 Landing removed / §5.7 Traces / `/admin/*` flatten)+ W18 folder(plan/checklist/progress) — `(this commit)` |
| F1 `<AppShell>` | 1-1.5d | ~0.4d(this session) | NEW `components/nav/app-shell.tsx` — generalized from `admin-shell.tsx`;`tsc --noEmit` + `next lint` clean;`[oklch`=0;not yet wired into a layout (that's F2) — `(this commit)` |
| F2 `(app)/` route group + login-gate | 1d | ~0.3d(this session) | NEW `app/(app)/layout.tsx` + `components/auth/login-gate.tsx`;root layout already chrome-free(verify-no-op);**F2.3 layout-removal deferred into F3**(inseparable from the page move);`tsc`+`lint` clean,`[oklch`=0,dev server up — `(this commit)` |
| F3 move + re-route + links + Playwright | 1.5d | ~0.5d(this session) | 8 page moves into `app/(app)/` + `admin/error.tsx`→`(app)/error.tsx` + 4 layouts/page deleted + `admin-shell.tsx` deleted + 2 NEW pages(`dashboard` placeholder / `traces` index)+ all route literals + Playwright rename/update + **`.gitignore` `traces/`→`/traces/` fix**;`tsc`+`lint` clean,`[oklch`=0,curl smoke `:3001` → new routes 200 / `/admin*` 404 — **IA flip live** — `(this commit)` |
| F4 `/dashboard` | 1d | ~0.3d(this session) | rewrote the F3 placeholder → 5 overview cards(KB summary off `GET /kb` / recent-queries CTA[Q6]/ latest-eval CTA / backend-liveness off `GET /health` / quick actions)— `'use client'` + `useQuery`;no new backend;`tsc`+`lint` clean,`[oklch`=0,`/dashboard` 200 — `(this commit)` |
| F5 `/settings` | 0.5d | ~0.2d(this session) | NEW `(app)/settings/page.tsx`(Profile claims + `<ThemeToggle>` + Sign out)+ wired `<UserMenu>` "Settings" item(`asChild`+`<Link>`);`tsc`+`lint` clean,`[oklch`=0,`/settings` 200 — `(this commit)` |
| F6 `<GlobalSearch>` | 0.5-1d | ~0.3d(this session) | NEW `components/nav/global-search.tsx`(shadcn-`Dialog`-based — **zero new dep**)+ wired into `<AppShell>`(`searchOpen` state + Cmd/Ctrl+K listener filled the F1 stub)+ `chat/page.tsx` `?q=` read-on-mount pre-fill;result types = Pages(5 modules + Settings)+ KB names + "Ask in chat"(recent-docs/traces dropped — no cheap source);Vitest test → F8.4;`tsc`+`lint` clean,`[oklch`=0 — `(this commit)` |
| F7 login/register → /dashboard + delete Landing | 0.5d | ~0.2d(this session) | login(×2)+register Step 3 CTA → `/dashboard`;`app/page.tsx` V7 Landing markup deleted → thin server `redirect('/login')`;`golden-path.spec.ts` `/`→`/login` redirect test + `visual-baseline.spec.ts` Landing baseline removed + `tests/e2e/README.md` updated;`brand-panel.tsx` kept(nothing orphaned);`tsc`+`lint` clean,`[oklch`=0,`/`→307→`/login` 200 — `(this commit)` |
| F8 responsive/a11y + tests + dark-recheck + catalog | 1d | ~0.4d(this session) | 3 NEW Vitest files(`app-shell` / `global-search` / `dashboard`)→ `pnpm test:unit` **4 files / 13 tests pass**(was 1/3);`role="heading" aria-level={2}` on dashboard(6)+ settings(3) `CardTitle`s;AppShell/GlobalSearch a11y verified already in place;Playwright `app-shell-path.spec.ts` real-`/dashboard` test + chrome-present/absent test + `visual-baseline.spec.ts` re-comment;`COMPONENT_CATALOG.md` C09/C10 `Status` rows + both test READMEs updated;`tsc`+`lint` clean,`[oklch`=0(responsive multi-viewport + dark-mode browser smoke = user pre-Beta, R8)— `(this commit)` |
| F9 closeout | 0.5d | — | — |

---

## Day 1 — F1 — `<AppShell>` component(2026-05-10)

### Built — `frontend/components/nav/app-shell.tsx`(NEW)— `(this commit)`

`<AppShell>` = the single chrome that will wrap **all authenticated views**(Dashboard / Chat / Knowledge Bases / Eval / Traces)— **top bar + collapsible left sidebar + main content slot**(per architecture.md v6 §5.0 / ADR-0024 D1). Generalized from the W12-W15 `<AdminShell>`(reuses its hamburger-collapse pattern + `<UserMenu>` + `<ThemeToggle>` + the token-class layout) rather than built from scratch.

- **Top bar**(`<header sticky top-0 z-30 h-14>`):mobile hamburger(`md:hidden`, opens the off-canvas sidebar, `aria-expanded`)→ desktop focus-mode toggle(`PanelLeftClose`/`PanelLeftOpen`, `aria-pressed`, `aria-label` switches Collapse/Expand)→ **app name "EKP" → `/dashboard`**(no marketing tagline)→ **global-search trigger**(centred search-box-styled `<button>` with a `Ctrl K` `kbd` hint;`aria-label="Search (Ctrl+K)"`)→ right cluster:**disabled language toggle**(`<Languages>` icon, native `disabled` + `title="Multi-language (JP / ZH) — coming in a later tier"` — i18n stays Tier 2 per §11 / CLAUDE.md §5.4 H4)+ `<ThemeToggle>`(reused)+ `<UserMenu>`(reused).
- **Cmd/Ctrl+K** — a `window` keydown listener(`(metaKey||ctrlKey) && key==='k'` → `preventDefault` → `handleOpenSearch()`);`handleOpenSearch` is a **no-op stub with a `// TODO(W18 F6)`** — W18 F6 mounts the real `<GlobalSearch>` palette here and fills the handler. The trigger button + the key binding are both wired now so F6 only supplies the implementation behind one callback.
- **Left sidebar** — 5 flat module items(`/dashboard` `LayoutDashboard` / `/chat` `MessageSquare` / `/kb` `Database` / `/eval` `FlaskConical` / `/traces` `Activity`)via a `NavLinks` sub-component;active route via `usePathname()` + `isActiveRoute(pathname, href)`(exact or `startsWith(href + '/')`)→ `aria-current="page"` + the muted-bg highlight;`<nav aria-label="Primary">`. Desktop:`<aside sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto w-56 md:block>` — **hidden entirely when focus-mode (`collapsed`) is on**. Mobile:rendered inside a controlled shadcn `<Sheet side="left">`(opened by the top-bar hamburger;each `NavLinks` item gets an `onNavigate` that closes the sheet).
- **Focus mode** — `const [collapsed, setCollapsed] = useState(false)`(SSR-stable default)+ a mount-time `useEffect` that reads `localStorage['ekp-sidebar-collapsed']`;`toggleCollapsed` writes it back. Collapsed = the desktop sidebar is not rendered → main goes full-width;the top-bar toggle(always present on desktop)brings it back.
- **Main content** — `<main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-8">{children}</main>`.
- **Tokens** — 100% token classes(`border-border` / `bg-background` / `bg-muted/40` / `bg-muted` / `text-muted-foreground` / `text-foreground`);**no hardcoded `oklch()`** — `Grep '\[oklch'` across `frontend/` = **0**(W15 milestone preserved). File header docstring per CLAUDE.md §3.2 / session-start §13 #8.

### Verification

- `pnpm exec tsc --noEmit` → exit 0(clean)
- `pnpm exec next lint` → "No ESLint warnings or errors"
- `Grep '\[oklch'` across `frontend/` → **0**(one accidental occurrence in the F1 docstring — "[oklch(...)]=0 milestone" — was reworded to "no hardcoded `oklch()` colour arbitrary-values" before commit)
- **Not browser-tested at F1** — `<AppShell>` is not yet imported by any layout(F2 wires it into `app/(app)/layout.tsx`);`tsc` proves it compiles in isolation;the visual / interactive smoke comes with F2-F3. The existing `next dev` server on `:3001`(left running from a prior session)is unaffected — nothing imports `app-shell.tsx` yet so it isn't compiled by the dev server.

### Deviations from plan(minor — Karpathy §1.2 simplicity)

1. **F1.1「props for the active route + nav items」→ `children`-only.** `usePathname()` supplies the active route(same as `AdminShell`)and `NAV_ITEMS` is a module-level const — a single-shell app doesn't need configurable nav. No `<AppShell>` props beyond `children`.
2. **F1.3「`<UserMenu>` menu: Profile / Settings → `/settings`」not added in F1.** F1 *reuses* the existing `<UserMenu>`(which has display name + `[mock]` badge + Sign out). Adding the "Settings → `/settings`" item is **W18 F5.2's job**(`/settings` doesn't exist until F5)— surfacing it here, not silently dropping it.
3. **Language toggle a11y** — used native `disabled` + `title`(rather than `aria-disabled` + a click-interceptor). Rationale:a natively-`disabled` button is removed from the AT tab order, which is fine — multi-language genuinely doesn't exist in Tier 1;the "coming soon" affordance is for sighted users(`title` tooltip). F8.2 can revisit if a visible-but-announced "Tier 2" hint is wanted.
4. **No breadcrumb in the top bar.** `<AdminShell>` had an auto-derived breadcrumb in its desktop header;the architecture.md §5.0 top-bar spec(app name + search + lang + theme + user)doesn't include one, so `<AppShell>` omits it. If deep-route wayfinding(`/kb/[id]`)wants it back, that's an in-page breadcrumb on those pages — a W18 F3 / F8 polish detail, not a shell concern.
5. **Cmd/Ctrl+K hint shows `Ctrl K`**(not `⌘K`)— the team is Windows-primary;the keydown handler accepts `metaKey || ctrlKey` either way so Mac still works.

### Next

- F2 — `app/(app)/layout.tsx` route group(`<AuthProvider><QueryProvider><AppShell>{children}</AppShell></QueryProvider></AuthProvider>`)+ login-gate guard + remove `app/admin/layout.tsx` / `eval/layout.tsx` / `debug/[traceId]/layout.tsx` / `admin/page.tsx` + root-layout chrome cleanup — wait for the user's go-ahead(directive pattern: explicit per-step).

---

## Day 2 — F2 — `(app)/` route group + login-gate(2026-05-11)

### Built — `(this commit)`

- **NEW `frontend/app/(app)/layout.tsx`**(server component)— the single layout for all authenticated views:`<AuthProvider><QueryProvider><LoginGate><AppShell>{children}</AppShell></LoginGate></QueryProvider></AuthProvider>`. Folds in what the three W12-W15 per-section layouts(`app/admin/layout.tsx`、`app/eval/layout.tsx`、`app/debug/layout.tsx`)did(AuthProvider + QueryProvider + a shell). File header docstring per §3.2. **Inert until F3** — `app/(app)/` has no `page.tsx` yet, so no URL matches it;F3 moves `chat`/`kb`/`eval`/`traces` in(+ F4/F5 add `dashboard`/`settings`).
- **NEW `frontend/components/auth/login-gate.tsx`**(`'use client'`)— wraps `<AppShell>` inside the `(app)/` layout. Reads `useAuthStatus()` + `authMode` from `auth-provider`(the auth state lives in the Zustand `useAuthStore`, not React context — so `<LoginGate>` works wherever it's nested):
  - **mock-auth dev mode**(`NEXT_PUBLIC_AUTH_MOCK` / `FEATURE_AUTH_MOCK`)→ `return <>{children}</>` immediately. `AuthProvider` auto-signs-in on mount,so the gate never gates;the visible "未登入 → /login" only appears in real MSAL / production builds(per ADR-0024 §"the mock-auth caveat"). This is what the dev `:3001` server runs.
  - **real MSAL**:`status === 'authenticated'` → children;else → a minimal centred splash(`Loader2` spinner,or the error text when `status === 'error'`)+ a `<Link href="/login">Sign in to continue</Link>`. **No auto-redirect** — matching the existing `AuthProvider` design(comment: "no auto-redirect to Entra ID hosted login — user must click sign-in CTA so we never get into an infinite loop on startup if cred wiring is broken"). `/login` is **outside** `app/(app)/` so it's not behind this gate(no loop). A `// TODO(W16)` notes:tighten to `router.replace('/login')` on the definitively-unauthenticated state once Q11 Track A cred wiring is live.
- **Root `frontend/app/layout.tsx`** — checked:**already** only `<html>`/`<body>` + `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` + `<Toaster>` + metadata + `globals.css`. No `AuthProvider`/`QueryProvider` leak to root. F2.4 = verify-no-op,no edit.

### Verification

- `pnpm -C frontend exec tsc --noEmit` → exit 0(clean)
- `pnpm -C frontend exec next lint` → "No ESLint warnings or errors"
- `Grep '\[oklch'` across `frontend/` → **0**(milestone preserved)
- Dev server on `:3001`(left running from a prior session)→ `GET /` HTTP 200(the V7 Landing — still present until F7). The new `app/(app)/layout.tsx` being inert(no pages)didn't break any existing route;Next.js tolerates a route group with only a `layout.tsx`(it matches no URL,so it's just unused — F3 makes it live).
- **Not browser-tested at F2** — `app/(app)/layout.tsx` matches no URL until F3 moves the pages in;`tsc` proves the import chain(`AuthProvider`/`QueryProvider`/`LoginGate`/`AppShell`)compiles;the visual / interactive smoke of the shell comes with F3. Playwright `webServer` mock-auth smoke = the server is booted-and-serving;the full E2E run stays the user's pre-Beta smoke per the R8 `npx playwright install chromium` block(CO_W15_F4_browser_binaries).

### Deviations from plan(R3)

1. **F2.3(remove the old per-section layouts + `app/admin/page.tsx`)→ deferred into F3.** Reason:that removal is **physically inseparable** from the F3.1 page move — `app/admin/kb/*`、`app/eval/page.tsx`、`app/debug/[traceId]/page.tsx` currently get their `AuthProvider`+`QueryProvider`+shell from those layouts;removing the layouts before the pages move into `app/(app)/`(which provides the same)would strand them → runtime crash(`useQuery` with no `QueryProvider`,etc). And `app/admin/page.tsx`'s role is taken by `/dashboard`(F4). So the removals land atomically with the F3 move(Karpathy §1.4 "make it actually work" — don't break the app between commits). Tracked in `checklist.md` as 🚧 F2.3, not dropped.
2. **F2.2「route guard ... → redirect `/login`」→ a gate-screen with a sign-in link, not an auto-`redirect()`.** Rationale:the existing `AuthProvider` deliberately avoids auto-redirects in MSAL mode(infinite-loop risk if cred wiring is broken — and it isn't live until W16 Track A);a "Sign in to continue" splash with a `<Link>` is functionally equivalent + safer for Tier 1. The `// TODO(W16)` flags the tightening. In mock mode(what dev uses)it's a no-op either way.
3. **F2.4 was already done** — root `app/layout.tsx` has been chrome-free(ThemeProvider + Toaster only)since W13;"keeps only ..." is satisfied as-is. No edit;noted so it's not mistaken for skipped work.

### Next

- F3 — move + re-route the page tree into `app/(app)/`(`chat` ← `app/chat/`;`kb` ← `app/admin/kb/`,`/admin/` prefix dropped;`kb/[id]`、`kb/new`、`kb/[id]/upload`;`eval` ← `app/eval/`;`traces/[traceId]` ← `app/debug/[traceId]/`)+ **the F2.3 removals**(`app/admin/layout.tsx`、`eval/layout.tsx`、`debug/[traceId]/layout.tsx`、`app/admin/page.tsx`)+ update all internal `<Link>`/`router.push` + the Playwright `tests/e2e/` route refs + `next.config.mjs` check + grep-verify `'/admin'`/`/debug/` only-deliberate-refs-remain — wait for the user's go-ahead(directive pattern: explicit per-step). **After F3 the shell becomes browser-visible** — F3 is when the IA actually flips.

---

## Day 3 — F3 — move + re-route the page tree;flatten URLs;the IA flip(2026-05-11)

### Done — `(this commit)` — the IA flip is live

- **8 page moves into `app/(app)/`**(bash `mv` then `git add -A` → git records them as renames):`chat/page.tsx` ← `app/chat/` / `kb/page.tsx` ← `app/admin/kb/` / `kb/[id]/page.tsx` ← `app/admin/kb/[id]/` / `kb/new/page.tsx` ← `app/admin/kb/new/` / `kb/[id]/upload/page.tsx` ← `app/admin/kb/[id]/upload/` / `eval/page.tsx` ← `app/eval/` / `traces/[traceId]/page.tsx` ← `app/debug/[traceId]/` / `error.tsx` ← `app/admin/error.tsx`. Old dirs `app/{admin,chat,eval,debug}/` removed entirely.
- **F2.3 removals landed here**(atomic with the move):`app/admin/layout.tsx`、`app/eval/layout.tsx`、`app/debug/layout.tsx`(folded into `app/(app)/layout.tsx`)、`app/admin/page.tsx`(old "Admin Dashboard" placeholder — role taken by `/dashboard`)、`frontend/components/nav/admin-shell.tsx`(orphaned — only those 3 layouts imported it;my-own-mess cleanup per Karpathy §1.3). Note:`debug/layout.tsx` was at `app/debug/layout.tsx`(not `app/debug/[traceId]/layout.tsx` as the plan text said — minor path correction).
- **2 NEW pages**:`app/(app)/dashboard/page.tsx` — F3 **placeholder**(heading "Dashboard" + a dashed panel with links to Chat/KB/Eval/Traces;a `// W18 F4` note). F4 builds the real overview cards. `app/(app)/traces/page.tsx` — a thin **Traces index**(trace-ID `<Input>` → `router.push('/traces/<id>')` + a note;the backend has per-trace fetch, not a trace list). Both needed so the AppShell app-name link + the sidebar "Dashboard"/"Traces" items don't 404.
- **`app/(app)/error.tsx`** — relocated from `app/admin/error.tsx`(scoped error boundary;`AdminError`→`AppError`,`scope="Admin"`→`scope="App"`,docstring updated). Wasn't in the plan F2.3 list but it'd die with `app/admin/` — relocated so the `(app)/` route group keeps a scoped error UI(the root `app/error.tsx` stays for everything else).
- **All internal route literals updated** — `replace_all` `/admin/kb` → `/kb` in `kb/page.tsx`(3)、`kb/[id]/page.tsx`(5)、`kb/new/page.tsx`(3)、`kb/[id]/upload/page.tsx`(3);`eval/page.tsx` failed-query inspect link `/debug/${q.query_id}` → `/traces/${q.query_id}`;`traces/[traceId]/page.tsx` docstring header `V6 Debug View (\`/debug/[traceId]\`)` → `V6 Traces (\`/traces/[traceId]\`)`. **grep-verified**:`grep '/admin|/debug'` across `frontend/*.{ts,tsx}` → the only hits left are deliberate(`lib/api/debug.ts` = the backend endpoint `GET /debug/trace/{id}`,unchanged;the moved files' / `(app)/layout.tsx`'s docstrings referencing old paths historically;the `debugApi` import name)— no stray route literals.
- **`chat/page.tsx` re-layout for the shell** — its own `<main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">` → `<div className="mx-auto flex h-full max-w-3xl flex-col">`(+ matching closing tag):you can't nest `<main>` inside the AppShell's `<main>`,and `min-h-screen` + the AppShell's own height would over-extend;the title row slimmed `<h1>EKP — Knowledge Chat</h1>` → `<h1>Chat</h1>` + the KB chip on the right(the "EKP" wordmark is in the AppShell top bar now;the sidebar shows "Chat" active). SSE-chat logic untouched. No `/admin`/`/debug` route literals in it(it had none).
- **Playwright** — `tests/e2e/admin-path.spec.ts` → renamed `app-shell-path.spec.ts`(F3.3 expected — the old name was after a defunct concept)+ content rewritten:`/admin` → `/dashboard`(F3-placeholder smoke + a `// TODO(W18 F4)` for the real cards)、`/admin/kb` → `/kb`、`/debug/${id}` → `/traces/${id}`、heading checks loosened where W16/W17 changed the views、the W15-era "stub note" assertion dropped(`/debug/trace` was wired W16 F5.5)、the sidebar-nav test → `/kb`+`/eval`+`/chat`. `tests/e2e/visual-baseline.spec.ts` — `page.goto('/admin')` → `/dashboard`,heading `/overview|admin/i` → `/dashboard/i`,screenshot `v2-admin-dashboard.png` → `dashboard.png`,docstring updated(re-baseline once F4 lands). `tests/e2e/README.md` — coverage table row + the snapshot-tree example + the "intentional UI change" example + a W18-F3 note. `golden-path.spec.ts` — no change(`/` `/login` `/register` `/chat` URLs unchanged;it only checks for a `textarea` on `/chat`,still present).
- **`.gitignore` `traces/` → `/traces/`** — caught via `git check-ignore`:the bare `traces/` pattern(intended for local Langfuse trace dumps)was about to **shadow the new `app/(app)/traces/` route folder** → `app/(app)/traces/page.tsx` + `app/(app)/traces/[traceId]/page.tsx` would never have been committed → `/traces/*` broken in the deployed app. Anchored to the repo root(`/traces/`)+ a comment. Verified `git check-ignore` now returns nothing for those files;`git status -uall` lists them.
- **`next.config.mjs`** — verified path-agnostic(the backend proxy is `app/api/backend/[...path]/route.ts`,outside `(app)/`)— no change.

### Verification

- `pnpm exec tsc --noEmit` → exit 0. **First run failed** with `.next/types/app/admin/...` / `app/chat/...` / `app/eval/...` "Cannot find module" errors — those are **stale generated type files** in the `.next/` build cache pointing at the old route tree;`rm -rf frontend/.next/types` then `tsc` → clean(the dev server regenerates `.next/types/` on next compile). Not a real code error.
- `pnpm exec next lint` → "No ESLint warnings or errors"
- `Grep '\[oklch'` across `frontend/` → **0**(W15 milestone preserved through the restructure;the `app-shell.tsx` docstring's accidental `[oklch...` was reworded in F1 before commit, and nothing new introduced it)
- **Browser smoke** on the running `:3001` dev server(curl status codes):`/` → 200(V7 Landing,still present until F7)、`/dashboard` → 200(new placeholder,rendered inside `<AppShell>`)、`/chat` → 200(moved,inside the shell)、`/kb` → 200(moved from `/admin/kb`)、`/eval` → 200、`/traces` → 200(new index)、`/traces/dummy-trace-x` → 200(the detail page renders + handles a not-found trace gracefully)、`/kb/new` → 200、`/admin` → **404**(✓ removed)、`/admin/kb` → **404**(✓ removed). So:**the IA flip is live** — `<AppShell>` is browser-visible on the 5 module routes;the old `/admin/*` URLs are gone.
- **Not done at F3**(F8's job):the interactive in-shell walkthrough of all the moved views(focus-mode toggle / hamburger / sidebar active-state / dark-mode through the shell)— that's the user's pre-Beta smoke + F8's a11y/responsive pass;F3 verified the routes resolve(200/404)+ `tsc`/`lint`/`[oklch`,not pixel-by-pixel.

### Deviations from plan(R3)

1. **`chat/page.tsx` re-layout**(`<main>`+`min-h-screen` → `<div>`+`h-full`,title row slimmed)— a **necessary consequence** of moving a page that previously had no shell into the AppShell's `<main>`(no nested `<main>`;no double full-height). Plan F3 said "contents unchanged except internal route literals" — chat had no route literals but did need this structural fix. SSE logic untouched.
2. **`app/admin/error.tsx` → `app/(app)/error.tsx`** — not in the plan F2.3 list of files-to-remove,but it would have been deleted with `rm -rf app/admin`;relocated instead so the `(app)/` route group keeps a scoped error boundary(reasonable robustness add — Karpathy §1.3 "clean up your own mess" applies, and a route group with no error boundary is a downgrade).
3. **2 NEW pages added in F3**(`(app)/dashboard/page.tsx` placeholder + `(app)/traces/page.tsx` index)— not pure "moves". Needed so the AppShell's app-name link(→ `/dashboard`)+ sidebar "Dashboard"/"Traces" items don't 404 mid-restructure. `/dashboard` placeholder is replaced by the real overview in F4(plan F4.1);`/traces` index is a thin Tier-1 entry point(F8 can polish — it's not a separate F-item, so it lives here).
4. **`debug/layout.tsx` path** — the plan said `app/debug/[traceId]/layout.tsx`;it was actually `app/debug/layout.tsx`. Minor correction.
5. **`admin-path.spec.ts` renamed** `app-shell-path.spec.ts`(plan F3.3 anticipated "Playwright specs ... updated";the rename keeps the file name matching what it tests — accepted churn for a test file in an internal Tier-1 repo).
6. **`lib/api/debug.ts` + `debugApi` kept their names** — the frontend *route* moved(`/debug/[traceId]` → `/traces/[traceId]`)but the *backend endpoint* is still `GET /debug/trace/{trace_id}`(unchanged — not in W18 scope);the API-client module name matches the backend endpoint it calls, not the frontend route. Noted in the `traces/[traceId]/page.tsx` docstring so it's not mistaken for an oversight.
7. **`.gitignore` fix** — outside the strict "move pages" scope but a critical correctness fix surfaced by the move(without it, the `/traces` route folder would be silently un-committed). Karpathy §1.4 "make it actually work".
8. **Stale `.next/types/` cache** — had to `rm -rf frontend/.next/types` before `tsc` was clean(the generated type files for the old route tree still referenced `app/admin/...` etc). Build-cache hygiene, not a source change — noted so it's not mistaken for a code issue.

### Next

- F4 — `app/(app)/dashboard/page.tsx` real overview cards(KB summary off `GET /kb` / recent queries [or a CTA] / latest eval status off the last cached `POST /eval/run` [or a CTA] / system health off `GET /health` + component statuses / quick actions)— replaces the F3 placeholder;no new backend. + F5 — `app/(app)/settings/page.tsx`(profile display + sign-out + theme preference)+ wire the `<UserMenu>` "Settings" item to it — wait for the user's go-ahead(directive pattern: explicit per-step). **The shell is browser-visible now** — the user can click around `/dashboard` (placeholder), `/chat`, `/kb`, `/eval`, `/traces` on `:3001` and check the sidebar / focus-mode / hamburger / dark-mode.

---

## Day 4 — F4 `/dashboard` real overview + F5 `/settings`(2026-05-11)

### Done — `(this commit)`

**F4 — `/dashboard` real overview** (`frontend/app/(app)/dashboard/page.tsx` — rewrote the F3 placeholder)
- `'use client'`(uses `@tanstack/react-query`). 5 cards in a responsive grid(`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`):
  1. **Knowledge bases** — `useQuery(['kb','list'], () => kbApi.list())`(→ `GET /kb`)→ `kbs.length` as a big number + a sub-line `Σtotal_documents` · `Σtotal_chunks` · `Σstorage_size_mb.toFixed(1) MB` + a `Button asChild variant="link"` → `/kb`. `<Skeleton>` while `isPending`;`text-destructive` "Couldn't load knowledge bases." on `isError`.
  2. **Recent queries** — no backend source(Q6 real-query collection is Open per session-start §9)→ "Query history isn't collected yet (Q6)." + a CTA `Button asChild variant="link"` → `/chat`.
  3. **Latest evaluation** — no cached `/eval/run` result endpoint exists → "No eval run cached. Run RAGAs to see Recall@5 / Faithfulness / Correctness." + a CTA → `/eval`.
  4. **System health** — `useQuery(['health'], () => apiClient.get<{status:string}>('/health'), {retry:1})`. `/health` is the `{"status":"ok"}` liveness probe(no per-component statuses)→ a green `bg-success` dot "Backend operational" / a red `bg-destructive` dot "Backend unreachable" + a small note that per-component connectivity(Azure Search / OpenAI / Cohere / Langfuse)needs a richer `/health` endpoint(later tier — not W18 scope).
  5. **Quick actions**(`sm:col-span-2`)— a `<QuickAction>` grid(`grid-cols-2 sm:grid-cols-4`):New KB → `/kb/new`(`Plus`)/ Upload doc → `/kb`(`Upload`)/ Run eval → `/eval`(`FlaskConical`)/ Open chat → `/chat`(`MessageSquare`). Each = `Button asChild variant="outline" className="h-auto flex-col gap-1.5 py-3"` wrapping a `<Link>` with the icon + a `text-xs` label.
- **No new backend** — `GET /kb`(via `kbApi.list`)and `GET /health` are existing(W1/W2);there's no recent-query log or cached-eval-run endpoint, hence the two CTA cards. Used `apiClient.get<{status}>('/health')` directly rather than adding a `lib/api/health.ts`(one trivial call — Karpathy §1.2). File header docstring per §3.2.

**F5 — `/settings`** (`frontend/app/(app)/settings/page.tsx` — NEW)
- `'use client'`. 3 cards:
  1. **Profile** — reads `useCurrentUser()`(the `AuthenticatedUser` from the Zustand auth store);shows `<ProfileRow>` ×3 — Username(`preferredUsername`,mono — this is the email-shaped id;`AuthenticatedUser` has no separate `email`/`displayName` field)、User ID(`oid`,mono)、Tenant(`tid`,mono);a `<Badge variant="outline">mock auth — dev mode</Badge>` when `user.isMock`;"Signing in…" while `user` is null.
  2. **Preferences** — "Theme" label + the existing `<ThemeToggle>`(Light/Dark/System via next-themes — reused, not a new radio group).
  3. **Session** — a `<Button variant="outline">` "Sign out" → `useAuthStore((s) => s.signOut)`(the same path the `<UserMenu>` Sign-out item uses;in mock dev mode this immediately re-signs-in, matching existing behaviour;in real MSAL it logs out).
- **`<UserMenu>` wiring** — added a "Settings" item above the existing Sign-out item(with a `<DropdownMenuSeparator>` between):`<DropdownMenuItem asChild><Link href="/settings"><Settings className="mr-2 h-4 w-4"/>Settings</Link></DropdownMenuItem>`(the Radix recommended pattern for a navigation menu item — `asChild` + `<Link>`;no `useRouter` needed);imported `Settings` from lucide + `Link` from `next/link`;the menu docstring updated "C09 admin shell user menu" → "C09/C10 app-shell user menu … W18 F5: + a Settings link". File header docstring on the new page per §3.2. No separate "Profile" menu item(the ADR listed Profile/Settings/Sign out — the `<UserMenu>` label is already the profile glance and `/settings` shows the full profile, so a "Profile" item would be redundant).

### Verification

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm exec next lint` → "No ESLint warnings or errors"
- `Grep '\[oklch'` across `frontend/` → **0**(milestone preserved)
- `GET /dashboard` HTTP 200 + `GET /settings` HTTP 200 on the running `:3001` dev server(both pages render;the dashboard's data cards show loading → then data/error depending on whether the backend `:8000` is up — the page itself renders fine either way)
- **Not done at F4/F5**(F8's job):a Vitest render-smoke for the dashboard layout(F8.4 — joins the `<AppShell>`+`<GlobalSearch>` test pass);the interactive in-shell click-through(user pre-Beta smoke).

### Deviations from plan(R3)

1. **F4.1「NEW」→ a rewrite** — F3 created `(app)/dashboard/page.tsx` as a placeholder so the AppShell links wouldn't 404;F4 rewrote it into the real overview. Net new file content, but not a "create".
2. **F4.2(d) System health limited to backend liveness** — `architecture.md`'s & the ADR's "Azure Search / OpenAI / Cohere / Langfuse + component statuses" assumes a richer `/health`;the actual `GET /health` is `{"status":"ok"}`(an ACA liveness probe). Adding per-component health checks is backend work → out of W18's "no new backend" scope;the card shows backend up/down + a note. Future-tier item.
3. **F4.2(b)(c) are CTAs, not data** — no recent-query log endpoint(Q6 Open)and no cached-eval-run endpoint exist;the cards are first-class empty-state CTAs(per the plan's PARTIAL-PASS allowance "if no cached source exists, the empty-state CTA *is* the v1 deliverable").
4. **`apiClient.get('/health')` used directly** — not a new `lib/api/health.ts` module(one trivial typed call — Karpathy §1.2 minimum code).
5. **F5 profile fields** — `AuthenticatedUser` = `{oid,tid,preferredUsername,isMock}`;no separate "display name" or "email" field(`preferredUsername` is the email-shaped id). Shown: Username(`preferredUsername`)/ User ID(`oid`)/ Tenant(`tid`)+ mock badge. Close to the ADR's "display name / email / oid" — the wire payload simply doesn't carry a distinct display name.
6. **F5 theme preference = embedded `<ThemeToggle>`** — the existing component(Sun/Moon → Light/Dark/System dropdown), reused rather than building a new radio group(Karpathy §1.2;also sidesteps the next-themes SSR-hydration `theme===undefined` flash, which `<ThemeToggle>` already handles).
7. **`<UserMenu>` Settings item = `asChild`+`<Link>`** — the plan said `router.push('/settings')`;implemented as the Radix navigation-menu-item pattern(`<DropdownMenuItem asChild><Link href="/settings">…`)— same effect, the recommended pattern, no `useRouter`. The Sign-out item stays `onSelect` (it's an action, not navigation).
8. **No separate "Profile" `<UserMenu>` item** — redundant with the menu's display-name label + the `/settings` Profile card.

### Next

- F6 — `frontend/components/nav/global-search.tsx`(Cmd/Ctrl+K command palette — Tier 1 quick-jump:filter KB names + recent docs + recent traces + an「Ask in chat: …」action → `/chat?q=…`)+ mount it in `<AppShell>` and fill the F1 `handleOpenSearch` no-op stub + a small `chat/page.tsx` `?q=` read-on-mount tweak. **If a clean palette needs `cmdk` → stop-and-ask per H2 first**(the PARTIAL-PASS fallback = a shadcn-`Dialog`-based quick switcher, zero new dep). + F7 — login/register → `/dashboard`(was `/chat`)+ delete the V7 Landing markup + `app/page.tsx` → thin redirect(`/` → `/login` | `/dashboard`)+ keep `brand-panel.tsx` + orphan-check. — wait for the user's go-ahead(directive pattern: explicit per-step). The `<UserMenu>` "Settings" link is live now;clicking the avatar → Settings → `/settings`(profile + theme + sign-out)works.

---

## Day 5 — F6 `<GlobalSearch>` Cmd+K palette + F7 login/register→/dashboard + V7 Landing removal(2026-05-11)

### Done — `(this commit)`

**F6 — global search command palette**(`frontend/components/nav/global-search.tsx` — NEW)
- A **shadcn-`Dialog`-based** command palette — **no new dependency**. The plan's `cmdk` stop-and-ask path(per H2)wasn't needed:Radix `Dialog` gives `role="dialog"` + `aria-modal` + focus-trap + Escape-to-close for free;the arrow-key result navigation + `aria-activedescendant` are the only a11y bits wired by hand(input is `role="combobox"` `aria-expanded` `aria-controls`;the results `<ul>` is `role="listbox"` with `<li role="option" aria-selected>`).
- **Controlled** by `<AppShell>`:added a `searchOpen` state there;the F1 `handleOpenSearch` no-op stub(`// TODO(W18 F6)`)now does `setSearchOpen(true)`;the top-bar search trigger button + the `window` Cmd/Ctrl+K keydown listener(already wired in F1)both open it;`<GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />` mounted near the bottom of the shell render. The AppShell docstring updated("`<GlobalSearch>` (W18 F6) mounts here…" → "W18 F6 mounted `<GlobalSearch>` here…").
- **Tier 1 quick-jump scope** — three result groups, in order:(a) **Pages** — a static `PAGE_RESULTS` list of the 5 sidebar modules + Settings, each with `keywords` for fuzzy-ish matching(filter = label or keywords `.includes(query)`);(b) **Knowledge bases** — `useQuery({ queryKey:['kb','list'], queryFn:()=>kbApi.list(), enabled: open, staleTime: 60_000 })`(shares the dashboard's cache key — instant if you came from `/dashboard`;only fetches while the palette is open), filtered by `name` or `kb_id`, → `/kb/[kb_id]`;(c) an **always-present**「Ask in chat: "<query>"」(when the query is non-empty)→ `/chat?q=<encodeURIComponent>`. **NOT** semantic search-as-you-type across chunks(Tier 2 — H4).
- **`?q=` chat read-on-mount**(`frontend/app/(app)/chat/page.tsx`)— a mount-time `useEffect` reads `new URLSearchParams(window.location.search).get('q')`;if present → `setInput(q)` + `textareaRef.current?.focus()`(added a `textareaRef` + `ref=` on the existing `<textarea>`). **Pre-fill only** — the user hits Enter to send;the SSE/streaming logic is untouched(per the plan's fallback scoping "navigate with the query in the URL; chat reads it on mount; don't redesign the chat input"). Chat-page docstring updated with the W18 F6 note.

**F7 — login/register → /dashboard + delete V7 Landing**
- `frontend/app/login/page.tsx` — `router.push('/chat')` → `router.push('/dashboard')` in **both** `handleSelfSubmit`(self-register path)and `handleSsoClick`(MSAL path);docstring W18 F7 note added(post-login home is now `/dashboard`;stays outside the `(app)/` shell).
- `frontend/app/register/page.tsx` — Step 3's CTA now goes to `/dashboard`:`handleStartAsking` → `handleGoToDashboard`(`router.push('/dashboard')`),`Step3` prop `onStartAsking` → `onContinue`,button label "Start asking →" → "Go to your dashboard →",the blurb "Start asking questions about your manuals." → "Head to your dashboard to get started.";docstring W18 F7 note(verify-email auto-login per ADR-0022 means Step 3 lands authenticated → `/dashboard` resolves in the shell).
- `frontend/app/page.tsx` — **rewritten**. The V7 Landing markup(`SiteHeader` / `Hero` / `FeatureHighlights` / `FeatureCard` / `HowItWorks` / `SiteFooter` — all inline functions)is **deleted** → a thin server component: `import { redirect } from 'next/navigation'; export default function RootPage() { redirect('/login'); }`. New docstring explains why it's "always → /login"(no server-readable mock session;the `(app)/` login-gate + MSAL handle re-routing authenticated users once they reach a `/app` route — the bare `/→/login` is the honest Tier 1 behaviour).
- `frontend/components/auth/brand-panel.tsx` — **kept**(it's the auth-page brand splash, still imported by both `/login` and `/register` — verified). The deleted Landing markup was entirely inline in `page.tsx`(no `landing-*` component file)so nothing was orphaned;the shared `Button`/`Card` shadcn imports the Landing used stay(used everywhere else).
- Playwright:`tests/e2e/golden-path.spec.ts` — the first test, "V7 Landing page renders with hero + features…", rewritten to "/ redirects to /login (V7 Landing removed per ADR-0024)" — `page.goto('/')` → `expect(page).toHaveURL(/\/login$/)` + the login "Sign in" heading visible;docstring coverage line updated. `tests/e2e/visual-baseline.spec.ts` — the "V7 Landing baseline" screenshot test + the docstring line removed(the Landing no longer exists;`page.goto('/')` would now screenshot the `/login` redirect, a duplicate of `v8-login`). `tests/e2e/README.md` — the coverage table(`golden-path` row + `visual-baseline` row), the `…-snapshots/` tree(dropped `v7-landing-chromium-win32.png`), and the "intentional UI change" example all updated + a W18 F3–F7 note.

### Verification

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm exec next lint` → "No ESLint warnings or errors"(the one `autoFocus` on the palette input has an inline `eslint-disable-next-line jsx-a11y/no-autofocus` with a one-line rationale — a command palette focuses its input on open by design)
- `Grep '\[oklch'` across `frontend/` → **0**(milestone preserved)
- **Browser smoke** on the running `:3001` dev server(curl status codes):`/` → **307 → `/login` (200)**(✓ Landing gone, redirect works)、`/login` → 200、`/dashboard` → 200、`/chat` → 200、`/kb` → 200、`/eval` → 200、`/traces` → 200、`/settings` → 200(✓ all module routes + settings still resolve inside the shell).
- **Not done at F6/F7**(F8's job / user pre-Beta smoke):the interactive palette walkthrough(Cmd+K opens / type-to-filter / ArrowUp-Down / Enter selects / Escape closes / "Ask in chat" lands on `/chat` with the query pre-filled)— that's the user's click-through + the F8.4 Vitest test for the filter logic + key binding;a full Playwright run is R8-blocked(`npx playwright install chromium` — CO_W15_F4_browser_binaries / ADR-0017)so the spec updates are the deliverable, the run stays the pre-Beta smoke.

### Deviations from plan(R3)

1. **F6 result types — recent docs / recent traces dropped.** The plan F6.2 listed 4 result types(KB names / recent docs / recent traces / "Ask in chat"). There's no cheap backend source for "recent documents"(would be N `GET /kb/{id}/documents` requests across all KBs)or "recent traces"(Q6 has no query log;the backend has per-trace fetch, not a trace list). Same call as F4's "recent queries / latest eval are CTAs not data". Instead the palette ships **Pages**(the 5 sidebar modules + Settings, static)as the Tier-1 quick-jump set — arguably more useful day-to-day than a phantom "recent" list. Per the plan's PARTIAL-PASS allowance(F6 "a simpler … 'quick switcher' with the same 4 result types is acceptable" — here it's Pages + KB + Ask, 3 real groups instead of 2 real + 2 empty).
2. **F6.5 `?q=` = pre-fill only, not auto-send.** The plan said "read `?q=` on mount → pre-fill/send" with the fallback "if it needs more than trivial, scope to navigate-with-query + chat-reads-on-mount; don't redesign the chat input". Pre-fill + focus is the trivial path and keeps the SSE/streaming logic completely untouched;auto-send would mean extracting a `runQuery(text)` from `handleSubmit` — a clean refactor, but a 2-line follow-up if wanted, not worth the risk in F6.
3. **F6.4 Vitest test deferred → F8.4.** The plan F6.4 says "a Vitest test for the filter logic + key binding(**full pass = F8**)" — so this is by design;F8.4 adds `<AppShell>` + `<GlobalSearch>` tests together.
4. **F6 built on shadcn `Dialog`, no `cmdk`.** The plan's preferred path("no new dep if avoidable")— `cmdk` would have needed a stop-and-ask per H2;the Radix `Dialog` covers the dialog/focus-trap/Escape and the rest(combobox + listbox + arrow-key nav)is ~30 lines.
5. **F7.3 `app/page.tsx` = `redirect('/login')` always**, no "if-authenticated → /dashboard" branch. Mock-auth has no server-readable session(the auth store is client-side and `AuthProvider` only wraps `(app)/`);in real MSAL the `(app)/` login-gate + MSAL's own session handling re-route you once you reach a `/app` route. The bare `/ → /login` is the honest Tier 1 behaviour — documented in the `page.tsx` docstring. The plan F7.3 explicitly allowed "the simplest … that respects auth state".
6. **Step 3 CTA label changed** "Start asking →" → "Go to your dashboard →"(and the blurb) — honest given it now routes to `/dashboard`, not `/chat`.
7. **`visual-baseline.spec.ts` edit** — not in the plan F7.5 literal(which only named `golden-path.spec.ts`)but a necessary consequence of deleting the Landing:its `/` screenshot test would otherwise capture the `/login` redirect, a duplicate of `v8-login`. Karpathy §1.3 — clean up your own mess.
8. **`autoFocus` on the palette input** — eslint-disabled(`jsx-a11y/no-autofocus`)with a one-line rationale comment(a command palette focuses its input on open by design — the idiomatic pattern;Radix Dialog respects `[autofocus]` in its focus management).

### Next

- F8 — responsive + a11y pass on the new `<AppShell>`(sidebar `aria-current` / hamburger `aria-expanded` / `<GlobalSearch>` `role="dialog"`+focus-trap+Escape — most already in place, F8 spot-checks)+ `/dashboard` cards reflow to 1-col on mobile + the command palette full-width on mobile;dark-mode `[oklch`=0 re-check + browser smoke on `/dashboard` / `/settings` / the shell chrome;Vitest unit tests for `<AppShell>` nav(5 items / active highlight / focus-mode toggle)+ `<GlobalSearch>`(Cmd+K opens / filter logic / "Ask in chat" navigates)— adds to the W17 F6 baseline(1 file / 3 tests);Playwright route updates from F3 + a "shell present on `/dashboard` `/chat` `/kb` `/eval` `/traces` / absent on `/login` `/register`" assertion;`COMPONENT_CATALOG.md` C09/C10 status note. Then F9 — closeout(Gate verdict + 7-section retro + ADR-0024 D1-D10 ticked + frontmatter `closed` + `session-start.md` hygiene catch-up + W19+ rolling-JIT trigger, NOT pre-created). — wait for the user's go-ahead(directive pattern: explicit per-step). The palette is live now on `:3001` — Cmd+K(or click the top-bar search box)→ type → arrow-keys → Enter;"Ask in chat: …" lands on `/chat` with the query in the box.

---

## Day 6 — F8 responsive + a11y pass + Vitest tests + Playwright updates + dark-mode re-check + catalog note(2026-05-11)

### Done — `(this commit)`

**Vitest unit tests**(F8.4)— **3 NEW files** under `frontend/tests/unit/`(matching the W17 F6 `button.test.tsx` harness style — jsdom + RTL + jest-dom + user-event):
- `app-shell.test.tsx` — `<AppShell>`:(1) the 5 sidebar nav modules(Dashboard / Chat / Knowledge Bases / Eval Console / Traces)render under `<nav aria-label="Primary">`,(2) the active route(`/dashboard`)gets `aria-current="page"`(and an inactive one doesn't),(3) clicking the focus-mode toggle hides the desktop sidebar(the `<nav>` disappears)and flips the button's `aria-label` to "Expand sidebar",(4) the top-bar global-search trigger button is present. Mocks:`next/navigation`(`usePathname`→`/dashboard`,`useRouter`),`next/link`(→ plain `<a href>`),`@/lib/api/kb`(`kbApi.list`→`[]`);`<UserMenu>` shows "Signing in…" with no `AuthProvider` mounted(the null-user path — fine);`<ThemeToggle>` + `<GlobalSearch open={false}>` render inertly.
- `global-search.test.tsx` — `<GlobalSearch>`:(1) opening with an empty query renders the 6 static Page results(Dashboard / Chat / Knowledge Bases / Eval Console / Traces / Settings),(2) typing "eval" filters the Pages to "Eval Console" + appends an "Ask in chat: eval" action(and drops "Dashboard"),(3) typing a query + clicking the "Ask in chat" result → `router.push('/chat?q=how%20do%20refunds%20work')` + `onOpenChange(false)`,(4) `{ArrowDown}{Enter}` on the focused input selects the 2nd result(Chat)→ `router.push('/chat')`. Mocks:`next/navigation`(`useRouter`),`@/lib/api/kb`(`kbApi.list`→`[]` — so the KB-results path is empty, the Page-results path is the testable core).
- `dashboard.test.tsx` — `/dashboard` page render smoke:(1) the `<h1>Dashboard</h1>` + the 5 overview card headings("Knowledge bases" / "Recent queries" / "Latest evaluation" / "System health" / "Quick actions" — now `role="heading" aria-level={2}` per F8.2)render,(2) the 4 quick-action links resolve to the right hrefs(`/kb/new` / `/kb` / `/eval` / `/chat`). Mocks:`next/navigation`,`next/link`,`@/lib/api/kb`,`@/lib/api-client`(both query fns resolve to empty/ok);uses `findByRole` for one assertion so the mocked `useQuery` resolutions settle inside `act`. (Per the F4.5 note "a dashboard render test can join then".)
- `pnpm test:unit` → **Test Files 4 passed (4) / Tests 13 passed (13)**(was 1 file / 3 tests at the W17 F6 baseline). `tests/unit/README.md` "What's here now" rewritten to list the four files.

**a11y on the new surfaces**(F8.2)— W18's own mess only;full NVDA/JAWS/VoiceOver stays Tier 2(CO_W15_F3_aria_full_audit):
- `<AppShell>` — **verified already in place**:sidebar nav `aria-current="page"` on the active item;hamburger `aria-expanded={mobileNavOpen}`;focus-mode toggle `aria-pressed={collapsed}` + a Collapse/Expand `aria-label`;`<nav aria-label="Primary">`;the mobile `<Sheet>` has a `<SheetTitle>` for the Radix-Dialog a11y. No change needed.
- `<GlobalSearch>` — **verified**:Radix `Dialog` provides `role="dialog"` + `aria-modal` + focus trap + Escape-to-close;the search input is `role="combobox"` `aria-expanded` `aria-controls="global-search-results"` `aria-activedescendant`;the results `<ul role="listbox" aria-label="Search results">` with `<li role="option" aria-selected>`;ArrowUp/Down + Enter + `onMouseMove` keep the active index in sync;`autoFocus` on open(idiomatic for a command palette — eslint-disabled with a one-line rationale). No change needed.
- `/dashboard` + `/settings` — **added `role="heading" aria-level={2}`** to the `CardTitle`s(6 on the dashboard, 3 on settings — `<CardTitle role="heading" aria-level={2} className="…">`)so each card title is a real level-2 heading under the page `<h1>`(shadcn's `CardTitle` is a styled `<div>` by default — adding the ARIA promotes it without changing the element). The dashboard's links all have text accessible names("View knowledge bases →" / "Ask a question →" / "Open Eval Console →" / the quick-action labels). `/settings` has **no form inputs**(the `ProfileRow`s are text `<span>`s,`<ThemeToggle>` is a labelled button "Toggle theme",Sign-out is a labelled `<Button>`)— no `<Label htmlFor>` needed.
- Disabled language toggle — keeps **native `disabled`** + `aria-label="Language (multi-language coming soon)"` + `title="Multi-language (JP / ZH) — coming in a later tier"`. Native `disabled` is the strongest "this is unavailable" signal — multi-language genuinely doesn't exist in Tier 1;a visible-but-AT-announced "Tier 2" affordance(via `aria-disabled` + a click-interceptor)is more code for marginal benefit and stays a polish detail(per the F1 deviation note).

**Responsive pass**(F8.1)— verified the chrome was built responsive in F1/F4/F6:the `<AppShell>` collapses the desktop `<aside md:block>` to an off-canvas shadcn `<Sheet side="left">` < `md`(opened by the top-bar hamburger);the top bar stays at all widths;`<GlobalSearch>`'s `DialogContent` is `w-full max-w-xl`(edge-to-edge on mobile < 576px);`/dashboard`'s card grid is `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`(1-column on mobile);`/settings` is `mx-auto max-w-2xl`;the AppShell `<main className="p-4 md:p-8">` has tighter mobile padding. The 2-3-viewport browser smoke stays the user's pre-Beta walkthrough(R8 — `npx playwright install chromium` is corp-proxy-blocked / CO_W15_F4_browser_binaries / ADR-0017;the responsive classes are the F8.1 deliverable, the visual check is the smoke — same shape as the W12-W15 caveat).

**Dark-mode re-check**(F8.3)— `Grep '\[oklch'` across `frontend/` = **0**(W15 milestone preserved through the whole F1-F8 restructure — `<AppShell>` / `<GlobalSearch>` / `/dashboard` / `/settings` all consume token classes only,no hardcoded `oklch()` arbitrary-values);the W17 F5 mechanism note still holds(next-themes `ThemeProvider attribute="class" defaultTheme="system" enableSystem` in the **root** `app/layout.tsx` → `.dark` CSS-var block in `globals.css` → tailwind `oklch(var(--token))` utility classes — the `(app)/` route group's layout doesn't touch theming). Dark-mode browser smoke on `/dashboard` + `/settings` + the shell chrome = the user's pre-Beta walkthrough(same R8 caveat).

**Playwright E2E updates**(F8.5):
- `tests/e2e/app-shell-path.spec.ts` — the `/dashboard` test rewritten:was "renders heading + module links"(the F3 placeholder)+ a `// TODO(W18 F4)`;now asserts the **real F4 overview** — `<h1>Dashboard</h1>`(level 1)+ the "Knowledge bases" / "System health" / "Quick actions" card titles(`role="heading" level 2`)+ the "New KB" / "Open chat" quick-action links. **NEW test** "AppShell chrome is present on app routes and absent on the auth pages":the `<nav aria-label="Primary">` + the "Search (Ctrl+K)" trigger are visible on `/dashboard` `/chat` `/kb` `/eval` `/traces/<id>`,`toHaveCount(0)` on `/login` `/register`,and `/` redirects to `/login` with no chrome. Docstring updated(coverage list + the F4/F8 update notes).
- `tests/e2e/visual-baseline.spec.ts` — the `/dashboard` test renamed/re-commented "(W18 F3 placeholder)" → "(W18 F4 overview cards)"(the heading assertion tightened to `level: 1`;the dynamic-content mask kept since the F4 data loads async).
- `tests/e2e/README.md` — the `app-shell-path.spec.ts` coverage row updated(real F4 cards + the F8.5 chrome test).
- `pnpm exec tsc --noEmit` exit 0(compile-checks the specs). The full E2E **run** stays the user's pre-Beta smoke(R8 `npx playwright install chromium` block — CO_W15_F4_browser_binaries / ADR-0017;the updated specs + the `tsc` compile-check are the F8.5 deliverable, same as F3.3/F7.5).

**`COMPONENT_CATALOG.md` C09/C10 note**(F8.6)— C09(Admin Console UI)`Status` row appended with the W18 amendment(all authenticated views re-parented under a single `<AppShell>`;URLs flattened `/admin/*` → `/kb/*`,`/debug/[traceId]` → `/traces/[traceId]`,`/admin` → real `/dashboard` overview;`/settings` added;V7 Landing removed → `/` redirect;login/register → `/dashboard`;`<GlobalSearch>` Cmd/Ctrl+K palette;`[oklch`=0 preserved;`architecture.md v6 §5` carries the inline-tagged amendment, this catalog row mirrors it). C10(Chat Interface UI)`Status` row appended(the chat view renders inside `<AppShell>` now — its `<main>`+`min-h-screen` became `<div>`+`h-full`,the in-page header slimmed;reads `?q=` on mount for the global-search deep-link;route `/chat` + SSE logic unchanged). (Note:the catalog's §11 Tier 2 trigger matrix's stale "C13 Workflow Engine" reference + the C09 `Scope` row's old `/admin/*` route list are W17+ housekeeping territory per session-start.md §3 — out of W18 scope;F8.6 = the `Status` note, which is what the plan asked for.)

### Verification

- `pnpm test:unit` → **Test Files 4 passed (4) / Tests 13 passed (13)**
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm exec next lint` → "No ESLint warnings or errors"
- `Grep '\[oklch'` across `frontend/` → **0**(milestone preserved)
- **Not done at F8**(user pre-Beta smoke):the multi-viewport browser walkthrough(`<AppShell>` at sm/md/lg/xl — hamburger drawer / focus-mode / dashboard cards reflow / palette full-width)+ the dark-mode toggle visual check on the new surfaces + the full Playwright run(R8 — `npx playwright install chromium` blocked / CO_W15_F4_browser_binaries / ADR-0017). The interactive 9-view-in-the-shell walkthrough remains the user's pre-Beta smoke per the W12-W15 caveat.

### Deviations from plan(R3)

1. **F8.1 multi-viewport browser smoke deferred → user pre-Beta.** R8 / CO_W15_F4_browser_binaries — `npx playwright install chromium` is corp-proxy-blocked, so a headless multi-viewport run isn't possible here. The responsive *classes*(`md:` breakpoint, `<Sheet>` drawer, `w-full max-w-xl` palette, `sm:grid-cols-2 lg:grid-cols-3` dashboard grid)are in place and verified by reading;the visual check is the deliverable's smoke half(same shape as the W12-W15 "smoke-user-deferred" caveat).
2. **F8.2 language toggle keeps native `disabled`**(not `aria-disabled` + a click-interceptor). Native `disabled` is the strongest "unavailable" signal, the feature genuinely doesn't exist in Tier 1, and the `aria-label` + `title` already communicate "coming later" — `aria-disabled` would mean keeping it focusable + adding an `onClick` no-op for marginal benefit. Polish detail per the F1 deviation note.
3. **`/settings` has no form inputs → no `<Label htmlFor>`.** The plan F8.2 listed "/settings form labels(`<Label htmlFor>`)" — but `/settings` v1 is profile-display text(`ProfileRow` spans)+ the `<ThemeToggle>` labelled button + a Sign-out labelled `<Button>`;there's no input/select needing an associated `<Label>`. Noted so it's not mistaken for skipped work.
4. **F8.4 also added `dashboard.test.tsx`.** The plan F8.4 named `<AppShell>` + `<GlobalSearch>` tests;the F4.5 note said "a dashboard render test can join then" — done. The W17 F6 baseline(1 file / 3 tests)is now 4 files / 13 tests.
5. **`role="heading" aria-level={2}` on the `CardTitle`s** rather than swapping them for `<h2>` elements — shadcn's `CardTitle` is intentionally a styled `<div>`(card authors pick the heading level);adding the ARIA promotes it to a level-2 heading for AT without forking the shadcn component or churning the W12-W15 views' convention. Applied to the W18-owned surfaces only(dashboard F4 + settings F5).
6. **`COMPONENT_CATALOG.md` — only the `Status` rows touched.** The catalog's C09 `Scope` row still lists the old `/admin/*` routes and §11's Tier 2 matrix still references a hypothetical "C13 Workflow Engine" — both flagged as W17+ housekeeping in session-start.md §3, out of W18 scope. F8.6 = the `Status` amendment note(which mirrors the `architecture.md v6 §5` inline-tagged amendment), which is what the plan specified.

### Next

- F9 — phase closeout:W18 Gate verdict(PASS / PARTIAL PASS / FAIL with rationale per the W12-W15-W17 pattern)+ a 7-section retro(What worked / What didn't & friction / Surprises / Decisions / Carry-overs to W19+ / Time tracking / Spec ref alignment)+ ADR-0024 status verified `Accepted` + its "Implementation Deliverables" D1-D10 checkboxes ticked against the F1-F9 outcomes + the W18 `plan.md`+`checklist.md`+`progress.md` frontmatter `status: active` → `closed` + the `session-start.md` hygiene catch-up(§3 C09/C10 status + §10 W18 row + §11 carry-overs + §12 milestones + Last-Updated + Update-history)+ the W19+ phase folder **NOT pre-created**(rolling-JIT — kickoff post-closeout;candidates = W16 F1-F4 if Track A IT cred lands / Tier 2 prep governance Q12 / a Beta-launch readiness pass / the user's local-dev seed-KB convenience task). — wait for the user's go-ahead(directive pattern: explicit per-step). All of W18's implementation(F1-F8)is done;F9 is the governance wrap.

---

## Day 7 — F9 closeout(2026-05-11)

### W18 Phase Gate — **PASS WITH SMOKE-USER-DEFERRED CAVEAT**

**Verdict rationale**(per the W12-W15-W17 pattern):

- **All 9 deliverables landed**(F0 kickoff cascade + F1 `<AppShell>` + F2 `(app)/` route group + login-gate + F3 page-tree move/re-route/URL-flatten + F4 `/dashboard` overview + F5 `/settings` + `<UserMenu>` wiring + F6 `<GlobalSearch>` Cmd+K palette + `?q=` chat read + F7 login/register→`/dashboard` + V7 Landing removal + `/`→redirect + F8 responsive/a11y/Vitest/Playwright/dark-mode/catalog). ADR-0024 D1-D10 all checked(F1=D1 / F2=D2+D7 / F3=D3 / F4=D4 / F5=D5 / F6=D6 / F7=D8 / F8=D9 / F0+F8.6+F9.6=D10).
- **Success-criteria checklist**(plan §3)— all 9 met:`<AppShell>` top bar + collapsible sidebar(5 modules)+ focus-mode + responsive hamburger + 100% tokens(F1)✓;`(app)/` route group + login-gate + old layouts removed + chrome-free root layout for auth pages + mock-auth smoke still works(F2)✓;all pages moved into `(app)/` + `/admin/*`→`/kb/*` + `/debug/*`→`/traces/*` + all internal links updated + Playwright route refs updated + grep-clean(F3)✓;`/dashboard` real overview cards + no new backend + empty-state CTAs first-class(F4)✓;`/settings` profile + sign-out + theme pref + `<UserMenu>` link(F5)✓;`<GlobalSearch>` Cmd+K palette + Tier-1 quick-jump(F6)✓;login/register→`/dashboard` + V7 Landing markup deleted + `/`→redirect + `brand-panel.tsx` kept(F7)✓;responsive + a11y pass + dark-mode `[oklch`=0 preserved + Vitest 13/13 + Playwright route updates + "shell present/absent" assertion + `COMPONENT_CATALOG.md` note(F8)✓;closeout + `session-start.md` hygiene + W19+ rolling-JIT trigger(F9)✓.
- **No FAIL conditions tripped**(plan §3):no Tier 2 leak(the language toggle stays a disabled affordance;global search is quick-jump only — Pages + KB names + "Ask in chat",no semantic search-as-you-type);no view's *content* rebuilt(KB Detail's 5 tabs / Eval's metric cards / Traces' timeline / chat streaming+citations / auth-page split layout all re-parented unchanged — F3 only touched the chat page's wrapper `<main>`→`<div>` because you can't nest `<main>` inside the shell's `<main>`);the shadcn/ui foundation + `tokens.ts` visual identity unchanged(`[oklch`=0 held through the whole F1-F8 restructure);mock-auth dev path not broken(no infinite loop — the login-gate is a no-op when the mock provider auto-authenticates;`/`→307→`/login`→200 + all 5 module routes + `/settings` HTTP 200 on `:3001`);backend untouched(W18 is frontend-only — `/dashboard` consumes the existing `/health` + `/kb`);no `tsc`/`lint` regression(exit 0 / clean throughout)+ no `pnpm test:unit` regression(grew 1/3 → 4/13).
- **The "SMOKE-USER-DEFERRED CAVEAT"**(why not a clean PASS — same shape as W12-W15):the multi-viewport browser walkthrough(`<AppShell>` at sm/md/lg/xl — hamburger drawer / focus-mode toggle / dashboard cards reflow / palette full-width)+ the dark-mode toggle visual check on the new surfaces + the full Playwright E2E *run* + the interactive `<GlobalSearch>` click-through(Cmd+K → type → arrow-nav → Enter / "Ask in chat" lands on `/chat` with the query pre-filled)are **the user's pre-Beta smoke**. Reason:`npx playwright install chromium` is R8-corp-proxy-blocked(ECONNRESET — CO_W15_F4_browser_binaries / ADR-0017),so a headless browser run isn't possible in this environment;the responsive *classes* + the a11y attributes + the updated specs + the `tsc` compile-check + the Vitest jsdom tests are the W18 deliverable, the visual/interactive check is the smoke half(accepted, per the W12-W15 "smoke-user-deferred" caveat shape). Additionally, the *visible* "未登入 → /login" login-gate behaviour only appears in real MSAL / production builds(in mock-auth dev the gate is a no-op) — this is by-design per ADR-0024 §"the mock-auth caveat", not a shortfall;a `// TODO(W16)` flags tightening once Q11 Track A cred is live.

→ **PASS WITH SMOKE-USER-DEFERRED CAVEAT.** The IA restructure is complete and verified at the `tsc` / `lint` / `[oklch` / `pnpm test:unit` / curl-route-smoke level;the pixel-level + interactive-flow verification carries over to the user's pre-Beta walkthrough(the same backlog as W12-W15's CO_W15_F3_dark_mode_visual_verify + CO_W15_F4_interactive_flow_E2E — W18 narrows it but doesn't close it since the browser-binary install is still R8-blocked).

### Retrospective(7 sections per PROCESS.md / session-start §13)

**1. What worked**
- **Generalizing `<AdminShell>` rather than building `<AppShell>` from scratch** — the hamburger-collapse / `<Sheet>` drawer / `<UserMenu>` / `<ThemeToggle>` / token-class layout were all reusable;F1 came in at ~0.4d against a 1-1.5d estimate.
- **F2.3 deferred-into-F3**(removing the old per-section layouts atomically with the page move)— surfaced upfront in F2 as a think-before-coding deviation, not discovered mid-break;the F3 commit landed the IA flip in one atomic, never-broken step.
- **`git mv` preserving file history** — the 8 page moves into `app/(app)/` show as 94-99% renames in `git log --follow`;the W12-W15 view content is traceable through the restructure.
- **The shadcn-`Dialog`-based `<GlobalSearch>` over a `cmdk` dep** — Radix `Dialog` gave `role="dialog"`+`aria-modal`+focus-trap+Escape for free;the combobox/listbox/arrow-key layer was ~30 lines;no H2 stop-and-ask needed.
- **Vitest jsdom tests for the new components** — `app-shell.test.tsx` + `global-search.test.tsx` + `dashboard.test.tsx` caught nothing broken but proved the nav semantics(`aria-current`)/ the palette filter logic / the dashboard structure render correctly;`pnpm test:unit` grew 1/3 → 4/13. Mocking `next/navigation` + `next/link` + the api modules was the standard pattern, no surprises.
- **The `.gitignore` `traces/`→`/traces/` catch**(F3)— `git check-ignore` surfaced that the bare `traces/` pattern(for local Langfuse dumps)was about to shadow the new `app/(app)/traces/` route folder before it cost a broken deploy.

**2. What didn't work / friction**
- **The stale `.next/types/` build cache**(F3)— `tsc --noEmit` failed with "Cannot find module" for the *old* route tree(`app/admin/...` etc) because the generated type files in `.next/types/` were stale;`rm -rf frontend/.next/types` fixed it. Not a code error, but a 5-minute red herring — worth knowing for any future route restructure.
- **The Bash tool's cwd persistence** — `cd frontend` persists between Bash calls, so git commands(which need the repo root)needed an explicit `cd` back;easy to forget(`pathspec did not match` once). Used `pnpm exec` / absolute paths to compensate.
- **`/health` is just `{"status":"ok"}`** — the dashboard's "system health" card wanted per-component connectivity(Azure Search / OpenAI / Cohere / Langfuse)but the backend `/health` is an ACA liveness probe with no component statuses;the card shows backend-up/down + a "needs a richer endpoint" note. Not friction in W18(it's correctly out of "no new backend" scope)but a known follow-up shape.
- **No "recent queries" / "cached eval run" backend source** — both dashboard cards became empty-state CTAs;same for the `<GlobalSearch>` "recent docs / recent traces" result types(dropped — would be N requests across all KBs / Q6 has no log). The Pages-results substitute for the palette is arguably better, but the dashboard's two CTA cards are placeholders waiting on a backend that doesn't exist yet(Q6 / no eval cache).

**3. Surprises**
- **The whole 8-deliverable implementation(F1-F8) collapsed into ~2.3d of actual effort against a ~7.5d plan-day budget** — the W12-W15-W17 "real-calendar collapse when momentum is clean" pattern held again. F1 ~0.4d / F2 ~0.3d / F3 ~0.5d / F4 ~0.3d / F5 ~0.2d / F6 ~0.3d / F7 ~0.2d / F8 ~0.4d. Reasons:the views were re-parented not rebuilt;`<AdminShell>` generalized cleanly;no new dependency;no backend work;the Vitest harness already existed(W17 F6).
- **`app/page.tsx`'s "always → /login"** — the plan F7.3 allowed "if-authenticated → /dashboard" but there's no server-readable session in mock-auth(the auth store is client-side and `AuthProvider` only wraps `(app)/`);a server-component `redirect('/login')` is the honest Tier 1 behaviour, with the `(app)/` login-gate + MSAL handling re-entry. Cleaner than expected.
- **`<UserMenu>` Settings as `asChild`+`<Link>`** — the plan said `router.push`;the Radix nav-menu-item pattern(`<DropdownMenuItem asChild><Link>`)is the recommended way and needs no `useRouter`. A small thing, but it's the kind of "the framework already has the idiomatic pattern" that's worth noticing.

**4. Decisions**(the ones that'll matter later — see plan §7 changelog D0-D6 for the full list)
- **`<AppShell>` is `children`-only**(no nav-items prop)— a single-shell app has one nav;`usePathname()` + a module-const `NAV_ITEMS`. If Tier 2 ever needs role-gated nav, that's a prop add then, not now.
- **Login-gate = gate-screen + sign-in link, NOT auto-`redirect()`** — matches the existing `AuthProvider` anti-infinite-loop design;safer for Tier 1 where MSAL cred isn't live until W16 Track A. `// TODO(W16)` to tighten.
- **`<GlobalSearch>` result types = Pages + KB names + "Ask in chat"**(recent-docs/recent-traces dropped — no cheap backend source);`?q=` chat handling = pre-fill only(not auto-send — the SSE/streaming logic stays untouched).
- **`role="heading" aria-level={2}` on the W18 cards' `CardTitle`s**(dashboard + settings)rather than forking shadcn's `CardTitle` to be an `<h2>` element — ARIA-promote, don't churn the W12-W15 convention.
- **Debug View → "Traces" rename**(`/debug/[traceId]` → `/traces/[traceId]`)— per the ADR-0024 §1 "Chris-to-confirm" minor;adopted(operations-facing module). `lib/api/debug.ts` + `debugApi` kept their names — the backend endpoint is still `GET /debug/trace/{id}`;only the frontend route changed.
- **`COMPONENT_CATALOG.md` — only the `Status` rows touched** — the catalog's C09 `Scope` row's old `/admin/*` list + §11's hypothetical "C13 Workflow Engine" reference are W17+ housekeeping(flagged in session-start.md §3), out of W18 scope.

**5. Carry-overs to W19+**
- **CO_W15_F3_dark_mode_visual_verify(remainder)** + **CO_W15_F4_interactive_flow_E2E(partial)** — W18 F8 narrowed these(re-checked `[oklch`=0 through the restructure;added the "shell present/absent" Playwright assertion + the route-ref updates;wrote the Vitest component tests)but the *interactive 9-view-in-the-shell browser walkthrough* + the *full Playwright E2E run* are still the user's pre-Beta smoke — blocked on `npx playwright install chromium`(R8 corp proxy / CO_W15_F4_browser_binaries / ADR-0017). The "smoke-user-deferred" backlog rolls forward(same as W12-W15-W17).
- **`// TODO(W16)` in `<LoginGate>`** — tighten the real-MSAL "definitively-unauthenticated" state to a `router.replace('/login')` once Q11 Track A cred wiring is live(W16 F1).
- **Dashboard "system health" → a richer `/health`** — per-component connectivity(Azure Search / OpenAI / Cohere / Langfuse)needs a backend `/health` upgrade(currently a `{"status":"ok"}` liveness probe);out of W18's "no new backend" scope — a future-tier endpoint.
- **Dashboard "recent queries" + "latest evaluation" cards** — currently empty-state CTAs;wired to a real query-log(Q6)/ a cached-eval-run endpoint when those exist.
- **Vitest coverage** — W18 grew it 1/3 → 4/13;"deep component coverage"(every page-level component / form-validation edge cases / hook tests / MSW-mocked data-fetching)stays Tier 2 per `tests/unit/README.md`.
- W18 does **NOT** address(unchanged from the plan §6 / session-start §11):CO16 Track A IT cred + R-B1(W16 F1 — W18 is frontend-only);CO17 🚧 F1.5b(Postgres-path runtime smoke, `pip install psycopg` R8-blocked)+ 🚧 F3.5b(RAGAs live-verify, Azure-key-bound)+ `npx playwright install chromium`(CO_W15_F4_browser_binaries);CO19 25% Beta cohort rollout(W16 F2);CO_F6a/b/c ACS email(Track A);CO_W15_F1_eval_set_v1(needs Chris SME labels per Q14);CO_W15_F3_aria_full_audit(Tier 2 full NVDA/JAWS/VoiceOver — W18 F8.2 = new-surface spot-check only);CO13/AF3(ADR-0013 reserved).

**6. Time tracking**(see the Actual-vs-Planned-Effort table above)
- Plan-day budget:F0 ~0.5d + F1 1-1.5d + F2 1d + F3 1.5d + F4 1d + F5 0.5d + F6 0.5-1d + F7 0.5d + F8 1d + F9 0.5d ≈ **8-9 plan-days**(window `start_date` 2026-05-10 → `end_date` 2026-05-24).
- Actual:F0(kickoff session)+ F1 ~0.4d + F2 ~0.3d + F3 ~0.5d + F4 ~0.3d + F5 ~0.2d + F6 ~0.3d + F7 ~0.2d + F8 ~0.4d + F9(this session)≈ **~2.3d of effort over 2 calendar days**(2026-05-10 kickoff + 2026-05-11 F1-F9). Real-calendar collapse ≈ 4× under the plan-day budget — the W12-W15-W17 pattern. `end_date` 2026-05-24 was a window, not a commitment(per the frontmatter caveat).

**7. Spec-ref alignment**
- `architecture.md v6 §5` — amended at W18 kickoff(F0): NEW §5.0 Application Shell + §5.3 "Admin Dashboard"→"Dashboard"(real overview)+ §5.7 "Debug View"→"Traces" + §5.9 V7 Landing → REMOVED tombstone + §5.2 Chat in-shell note + `/admin/*`→`/kb/*` flatten + §5.10-§5.11 Login/Register redirect target — inline-tagged, doc version held(same convention as the §3.4 ADR-0023 / §3.7 ADR-0022 tags). The W18 implementation(F1-F8)matches the amended §5.0-§5.11.
- ADR-0024 — `Accepted` 2026-05-10(verified, no-op at closeout); its "Implementation Deliverables" D1-D10 all checked against F1-F9. ADR-0015 — References carry the "amended by ADR-0024" note(F0).
- ADR-0021(V4 Retrieval Testing tab + search-mode param)— the KB-detail 5-tab content moved into the shell unchanged(F3 re-parented, didn't rebuild). ADR-0022(cookie/Bearer dual-path)— the login-gate relies on it, unchanged. ADR-0014(hybrid auth)— the `/login` entry interplay, unchanged.
- `COMPONENT_CATALOG.md` C09/C10 `Status` rows + `session-start.md` §3/§10/§11/§12 — updated at W18 closeout(F8.6 + F9.6).
- `decision-form.md` — no new W18 OQ(the multi-language affordance is a known §11 Tier 2 disabled affordance, not a new OQ);no OQ status change. CLAUDE.md §5.1 H1 — the IA restructure was authorized by ADR-0024(Accepted before any W18 implement);no other architectural change(F1-F8 implement the amended §5.0-§5.11 — re-layout + re-route + 2 view changes + Landing removal;no §3/§4 component change — backend untouched).

### W19+ — NOT pre-created(rolling-JIT per CLAUDE.md §10 R1)

The W19+ phase folder is **not** created here. Kickoff is a post-W18-closeout decision. Likely candidates(for the next session to align on):
- **W16 F1-F4** if the Track A IT cred populate event lands(`.env.production` + Azure subscription IDs + Cohere Marketplace billing + R-B1 closure + 25% Beta cohort rollout + daily metric monitor + Q15 weekly signal report + the cumulative user-smoke 3-step workflow `npx playwright install chromium` + `pnpm test:e2e:update-snapshots` + `pnpm test:e2e`).
- **Tier 2 prep governance**(Q12 — Chris as Tier 2 GraphRAG / multi-agent / multi-tenancy decision owner;post-W12-production-launch trigger).
- **A Beta-launch readiness pass**(consolidating the smoke-user-deferred backlog + the dashboard "system health"/"recent queries" backend follow-ups).
- **The user's local-dev seed-KB convenience task**(`scripts/seed_dev_kb.py` or a one-liner — so `/dashboard`'s KB card / `<GlobalSearch>`'s KB results show something in dev without a manual upload).

### Closeout housekeeping landed(`(this commit)`)

- ADR-0024 D1-D10 checkboxes ticked(against F1-F9 outcomes)+ the "Implementation Deliverables" header updated("Implemented by the W18 phase … all D1-D10 landed — W18 closed 2026-05-11, Gate = PASS WITH SMOKE-USER-DEFERRED CAVEAT"). Status verified `Accepted`(no-op).
- W18 `plan.md` + `checklist.md` + `progress.md` frontmatter `status: active` → `closed`.
- W18 `checklist.md` — F9.1-F9.7 + the Cross-Cutting items ticked.
- `session-start.md` hygiene catch-up — §3 C09/C10 status(in `<AppShell>`;URL flatten;`/dashboard`;`/settings`;V7 Landing removed;`<GlobalSearch>`)+ §10 W18 row(closed, Gate verdict)+ W19+ not-pre-created + §11 carry-overs(W18-closed items + the rolling smoke-user-deferred backlog)+ §12 milestones row(累計 16 → 17 phase closed)+ Last-Updated + Update-history.
- `COMPONENT_CATALOG.md` C09/C10 `Status` rows — already updated in F8.6(verified, no further edit).
- W19+ phase folder — **NOT** created(rolling-JIT).

---

**Lifecycle reminder**:Phase 已收尾（Gate = PASS WITH SMOKE-USER-DEFERRED CAVEAT；Retro 7 sections above）。W19+ phase folder **唔會** pre-create（rolling-JIT per CLAUDE.md §10 R1 — kickoff post-closeout）。
