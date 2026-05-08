---
phase: W13-user-facing-views
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active
last_updated: 2026-06-10
---

# Phase W13 — Progress(Daily Journal + Decisions + Retro)

> Daily progress entries per CLAUDE.md §10 R2(每 commit reference progress.md Day-N entry)。
> Status:`draft` 自 2026-06-10 W12 D5 closeout cascade rolling-JIT post stakeholder authorization pivot momentum。

---

## Day 0 — Pre-kickoff Setup(W12 D5 closeout 2026-06-10)

> **Note**:呢個 Day 0 entry 屬 W12 D5 closeout cascade carry-over governance prep,而非 W13 implementation start。W13 D1 implementation start = next session post stakeholder authorization(rolling JIT — calendar-day-collapse cont OR future session)。

### Setup completed pre-W13 D1

| Artifact | Commit | Status |
|---|---|---|
| W12 phase Gate PASS WITH CAVEAT verdict landed | _W12 D5 closeout commit_ | 🟡 in flight(this session) |
| W12 progress.md retro 7 sections complete | _W12 D5 closeout commit_ | 🟡 in flight(this session) |
| W12 frontmatter active → closed cascade(plan + checklist + progress) | _W12 D5 closeout commit_ | 🟡 in flight(this session) |
| W13 phase folder skeleton(plan.md + checklist.md + progress.md) | _W12 D5 closeout commit_ | 🟡 in flight(this session) |
| Visual identity Option C ratified | `1ac17e6` | ✅ landed W12 D2 |
| 19 shadcn primitives installed + 6 token补齊 | `1b5cb1e` | ✅ landed W12 D3 |
| Admin shell rebuild + 8 pages tokens migration | `fd85741` | ✅ landed W12 D4 |
| ADR-0014 + ADR-0015 hybrid auth + UI Tier 1 expansion | `44a52cb` | ✅ landed W11 D2 cont |
| architecture.md v5.1 → v6 amendment(§5 + §13.12) | `49a634b` | ✅ landed W11 D2 cont |
| architecture.md v6 §3.7 C13 Email Verification Service component card | `00a1dba` | ✅ landed W12 D1 |
| decision-form.md Q22 ACS Resolved | `00a1dba` | ✅ landed W12 D1 |

### Pending W13 D1 active flip pre-conditions

- ⏳ Stakeholder authorization for W13 D1 implementation start(per W12 closeout same-session OR next session pivot)
- ⏳ User F4.13 functional regression smoke browser test(`! pnpm dev` localhost:3001 + 8 routes verify)— **non-blocker** for W13 D1(W13 view-level work iteratively browser-verifies fills gap)
- ⏳ W13 plan/checklist/progress frontmatter `draft → active` flip on W13 D1 active trigger

### W13 immediate scope alignment with W12 retro Carry-overs

- **CO4** V1 Chat refactor(routing path move `/` → `/chat`)→ **W13 F1**
- **CO5** V7 Landing page → **W13 F2**
- **CO6** V8 Login page → **W13 F3**
- **CO7** V9 Register 3-step wizard → **W13 F4**
- **CO8** ADR-0014 hybrid auth backend cascade → **W13 F5**
- **CO9** C13 ACS Email Verification Service integration → **W13 F6**
- **CO2** Theme provider integration(next-themes wire + dark mode toggle UI)→ **W13 F1.3-F1.4**

### W13 critical path

- **W13 D1 routing slot**:F1 fast path(0.5 day)unblocks F2 Landing immediately;parallel start F5 backend hybrid auth(2-day largest)
- **W13 D2-D4 view + backend parallel**:F2 + F3 + F4 view UIs depend on F5 endpoints(F5 must precede F3/F4 backend integration verify);F5 backend tests stand-alone可 parallel
- **W13 D4-D5 ACS + closeout**:F6 ACS integration depends on F5 endpoint cascade;F7 closeout final

### W14 admin views entry

- W13 closes Phase 2 of 4 UI sprint cycle;W14 = V2 Admin Dashboard + V3 KB List + V4 KB Detail 5-tab(per design ref doc §6 + W12 retro CO10-CO12)
- W14 D1 implementation start trigger = W13 closeout post-W13 D5 retro

---

## Day 1 — W13 D1 active flip + F1 routing restructure(real-calendar 2026-06-10 same-day collapse cycle 2 of 4)

> **Calendar note**:plan §5 tentative date 2026-06-23 superseded by real-calendar 2026-06-10 same-day collapse cycle per pivot momentum stakeholder authorization(option A continue from W12 D5 closeout)。Time tracking calibration data:plan ~0.5 day budget vs actual ~30 min(W12 retro 7x under-budget pattern continues)。

### What landed

| F# | Deliverable | Files | Status |
|---|---|---|---|
| F1.1 | Chat path move `/` → `/chat` | NEW `frontend/app/chat/page.tsx`(full Chat content preserve W12 F4.4 tokens migration intact;header docstring updated)| ✅ |
| F1.2 | V7 Landing placeholder stub | REWRITE `frontend/app/page.tsx`(Server Component;hero text + temporary Go-to-Chat link;F2 fills full layout)| ✅ |
| F1.3 | ThemeProvider integration | NEW `frontend/lib/providers/theme-provider.tsx`(client wrapper around next-themes 0.4.6 already installed W12 D3 via sonner cascade);UPDATE `frontend/app/layout.tsx`(wire `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` + `<html suppressHydrationWarning>`)| ✅ |
| F1.4 | Dark mode toggle UI | NEW `frontend/components/nav/theme-toggle.tsx`(Sun/Moon DropdownMenu + Light/Dark/System tri-state via shadcn DropdownMenu primitive);UPDATE `frontend/components/nav/admin-shell.tsx`(integrate into desktop header + mobile header before UserMenu)| ✅ |
| F1.5 | Public-vs-protected route convention | **Deviation logged plan §7 changelog 2026-06-10 (D1)** — `middleware.ts` 從未 W7 D1 implement;apply via page-level convention(Landing/Login/Register 唔 mount AuthProvider = public;Chat/Admin/Eval/Debug 透過 UserMenu + useAuthStore 隱式 protected via AuthProvider mock auto-sign-in / MSAL real);server-side guard defer F5 backend session middleware per Karpathy §1.2 simplicity-first | ✅ (deviation noted) |
| F1.6 | Functional smoke | 🚧 user-deferred per CLAUDE.md §13(`pnpm dev` long-running Node server conflict);AI verification = type-check 0 errors + import resolution ✅ | 🚧 (parallel CO1 W12 carry-over pattern) |

### Decisions

1. **next-themes provider boundary**:wrap in `frontend/lib/providers/theme-provider.tsx` client component island so root layout stays Server Component;ComponentProps type-forward keeps the wrapper transparent to next-themes API surface
2. **Sun/Moon overlap pattern**:reuse shadcn official mode-toggle CSS transform pattern(rotate + scale transitions);added `relative` className explicit to Button per shadcn Button cva default lacks `relative` positioning
3. **F1.5 deviation**:Karpathy §1.1 think-before-coding triggered — plan reference `_PROTECTED_PREFIXES` baseline stale,`grep` confirmed never implemented;Karpathy §1.2 simplicity-first push-back avoided speculative middleware addition without backend session(F5 will own server-side guard);plan §7 changelog logged per CLAUDE.md §10 R3
4. **Calendar collapse continued**:real-calendar 2026-06-10 = W12 D5 closeout + W13 D1 same-day(cycle 2 of 4 UI sprint);user authorization via option A pivot momentum

### Verification

```
$ cd frontend && pnpm type-check
> tsc --noEmit
$ # 0 errors
```

✅ TypeScript strict mode clean(0 errors;W12 F4 baseline preserved);no `any` / no @ts-ignore introduced;all new files consume tokens via Tailwind classes(no hardcoded oklch — W12 D2 strict clean preserved)。

### Carry-overs to W13 D2

- 🚧 F1.6 user functional smoke(non-blocker for D2 work — F2 V7 Landing implementation iteratively browser-verifies fills smoke gap as full layout lands)
- ⏳ W13 D2 focus per plan §5:F2 V7 Landing finalize + F5 backend hybrid auth begin + F3 V8 Login UI parallel

### Commit

- `a15182e` feat(frontend,docs): W13 D1 F1 routing restructure + theme provider + dark mode toggle + W13 active flip

---

## Day 2 — W13 D2 F2 V7 Landing implementation(real-calendar 2026-06-10 same-day collapse cycle 2 of 4 cont)

> **Calendar note**:plan §5 tentative date 2026-06-24 superseded by real-calendar 2026-06-10 same-day collapse(D1 → D2 cycle continue post user authorization "continue W13 D2 F2 V7 Landing 開工")。Time tracking calibration:plan ~1 day budget vs actual ~30 min(7x under-budget pattern continues)。

### What landed

| F# | Deliverable | Files | Status |
|---|---|---|---|
| F2.1 | V7 Landing rebuild per wireframe §2.7 | REWRITE `frontend/app/page.tsx`(replaced D1 placeholder stub)| ✅ |
| F2.2 | Header component | `SiteHeader` — logo + nav(Features anchor / Pricing disabled / Docs disabled)+ Sign in / Get started CTA buttons | ✅ |
| F2.3 | Hero section | tagline + subheading + Start asking → `/login` primary CTA + Watch demo disabled secondary | ✅ |
| F2.4 | 3 Feature cards | shadcn Card(Multi-format ingestion / Hybrid retrieval + CRAG / Citation-grounded answers)w/ lucide icons FileText / Zap / Quote | ✅ |
| F2.5 | How-it-works 3-step | static descriptive layout(Upload + MessageSquareQuote + CheckCircle2 lucide icons;step 1-3 numbered)— Karpathy §1.2 simplicity-first vs full Stepper state machine reuse since steps non-interactive | ✅ |
| F2.6 | Footer stubs | © Ricoh + Status / Docs / Contact / Legal disabled span(cursor-not-allowed + title)| ✅ |
| F2.7 | Content discipline check | All 3 features trace Tier 1:Multi-format(W2 Docling + python-pptx)/ Hybrid + CRAG(W2-W4)/ Citation(W3);Pricing+Docs+Demo footer 全 disabled placeholder | ✅ |
| F2.8 | Responsive | Header nav `hidden md:flex` / Hero CTAs `flex-col sm:flex-row` / Cards `md:grid-cols-3` / How-it-works `md:grid-cols-3` / Footer `flex-col sm:flex-row` | ✅ |

### Decisions

1. **Static How-it-works vs Stepper reuse**:Karpathy §1.2 push-back — W12 F4.9 Stepper at `frontend/app/admin/kb/new/page.tsx:171-211` 係 active/done/pending state machine,Landing 3 steps non-interactive → 重用全套 component over-abstraction;改用 static `<ol>` w/ `<li>` icon + step number + title + description,複用 visual pattern(rounded-full + primary bg + spacing)而非 logical state
2. **Server Component for Landing**:無 client state needed;all interactivity via Link navigation(Server-compatible);Button asChild + Link 組合保持 SSR-friendly
3. **Disabled footer placeholders**:Pricing / Docs / Status / Contact / Legal 用 `<span cursor-not-allowed opacity-50>` + title attribute,non-anchor non-Link — 避免 dead anchor `href="#"` SEO 噪音 + visually 表達「post-launch」

### Verification

```
$ cd frontend && pnpm type-check
> tsc --noEmit
$ # 0 errors
```

✅ TypeScript strict mode clean(0 errors);no `any` / no @ts-ignore;`grep oklch frontend/app/page.tsx` = 0(W12 D2 strict tokens-only baseline preserved);all colors via Tailwind tokens(`bg-background` / `text-foreground` / `text-muted-foreground` / `bg-accent/10` / `bg-primary` / `border-border` etc)。

### Carry-overs to W13 D3

- 🚧 F1.6 + F2 user smoke continue defer per CLAUDE.md §13(`! pnpm dev` localhost:3001;`/` Landing renders + nav + Hero CTA + 3 Cards + Steps + Footer;light/dark mode toggle Wi-Fi via DevTools `<html class="dark">`)— W13 D3 F3 V8 Login work iteratively browser-verifies fills smoke gap
- ⏳ W13 D3 focus per plan §5:F5 backend hybrid auth `/auth/register` + `/auth/verify-email` + `/auth/login`(2-day largest deliverable)+ F3 V8 Login UI parallel + F4 V9 Register begin

### Commit

- `7e283fb` feat(frontend,docs): W13 D2 F2 V7 Landing page implementation

---

## Day 3 — W13 D3 F3 V8 Login UI(real-calendar 2026-06-10 same-day collapse cycle 2 of 4 cont)

> **Calendar note**:plan §5 tentative date 2026-06-25 superseded by real-calendar 2026-06-10 same-day collapse(D2 → D3 cycle continue post user authorization "A:continue W13 D3 — F3 V8 Login UI frontend-only,可獨立 work without F5 backend ready;auth flow wire 留 F5 lands")。Time tracking calibration:plan ~1 day budget vs actual ~25 min(7x under-budget pattern continues)。

### What landed

| F# | Deliverable | Files | Status |
|---|---|---|---|
| F3.1 | V8 Login page split layout | NEW `frontend/app/login/page.tsx`(client component;BrandPanel + form area split via `flex-col md:flex-row`)| ✅ |
| F3.2 | Brand panel | logo「EKP」+ 「Knowledge, on demand.」tagline + subtitle line + subtle dot-grid CSS pattern overlay(currentColor inherited from text-primary-foreground;opacity 0.06)| ✅ |
| F3.3 | Form area | shadcn Input + Label(Email + Password)+ Sign in default Button | ✅ |
| F3.4 | Auth path separator | shadcn Separator + 「or」text overlay + Sign in with Microsoft outline Button + Building2 lucide icon | ✅ |
| F3.5 | Footer links | Forgot password?(disabled span + title attribute per ADR-0014 Tier 2 defer)+ Register Link → `/register` | ✅ |
| F3.6 | Auth flow wire | **Deviation logged plan §7 changelog 2026-06-10 (D3)** — defer ALL auth wire(含 existing MSAL SSO W7 useAuthStore baseline)to F5 batch per user instruction「auth flow wire 留 F5 lands」;UI shell only stub handlers w/ `F5_PENDING_MESSAGE` + `F5_PENDING_SSO_MESSAGE` constants + sonner toast feedback;TODO(W13 F5)comments mark replacement points in `handleSelfSubmit` + `handleSsoClick` | ✅ (deviation noted) |
| F3.7 | Error states scaffold | sonner `toast.error()` + `toast.info()` ready;backend ApiError envelope variant logic(invalid_cred / unverified_email / locked_account)pending F5 cascade | ✅ (scaffold ready) |
| F3.8 | Loading state | Loader2 lucide animate-spin in both Sign in + SSO Buttons during local pending state(600ms simulated delay);`anyPending` derived flag prevents form interaction during either flow | ✅ |

### Sonner Toaster mount(infrastructure prerequisite)

- UPDATE `frontend/app/layout.tsx`:add `<Toaster />` from `@/components/ui/sonner`(W12 D3 installed primitive)as ThemeProvider sibling — global mount enables toast feedback across all routes(Login + future Register + admin actions)
- shadcn Sonner uses `useTheme` from next-themes → ThemeProvider parent ordering preserved → light/dark theme syncs automatically

### Decisions

1. **Stub all auth wire vs partial-wire MSAL SSO**:Karpathy §1.1 think-before-coding surfaced ambiguity — plan F3.6 原文「SSO uses existing useAuthStore W7 baseline」vs user instruction「auth flow wire 留 F5 lands」;**strict reading 採用** = full UI-only deferral,F5 cascade clean batch wire(both flows together);避免 F3 / F5 partial-wire 嘅 dual-state(some auth wired now / some later)easier-to-reason-about
2. **AuthProvider mount scope**:per F1.5 convention,Login route 不 mount AuthProvider(public);F5 cascade 將 decide 是否需要 AuthProvider(handler call useAuthStore.signIn() works in mock mode without init,real MSAL needs initMsal cascade — F5 will resolve)
3. **Brand panel pattern background**:Karpathy §1.2 simplicity-first push-back vs ASCII wireframe「(minimal pattern bg)」— used dot-grid CSS via inline style + currentColor(token-safe;0.06 opacity 極 subtle);避免 SVG asset overhead OR multi-stop gradient over-design
4. **Toast variant strategy**:`toast.info()` for F5_PENDING messaging(neutral expected state)vs `toast.error()` for actual validation errors(empty email/password)— UX clarity: pending ≠ broken

### Verification

```
$ cd frontend && pnpm type-check
> tsc --noEmit
$ # 0 errors

$ grep oklch frontend/app/login | wc -l
1  # JSX comment in page.tsx:177 explains "no hardcoded oklch" token discipline
   # (W12 admin-shell.tsx baseline pattern一致 — docstring acceptable per Karpathy §1.3)
```

✅ TypeScript strict mode clean(0 errors);no `any` / no @ts-ignore;all colors via Tailwind tokens(`bg-primary` / `text-primary-foreground` / `bg-background` / `text-foreground` / `text-muted-foreground` / `text-accent`)+ currentColor for dot-grid pattern。

### Carry-overs to W13 D4

- 🚧 F1.6 + F2 + F3 user smoke continue defer per CLAUDE.md §13(`! pnpm dev` localhost:3001;`/login` Brand panel + form + SSO Button + footer links)— W13 D4 F4 V9 Register work iteratively browser-verifies fills smoke gap
- ⏳ W13 D4 focus per plan §5:F4 V9 Register 3-step wizard(reuse V8 brand panel split layout + W12 F4.9 Stepper component for step indicator)+ F5 backend hybrid auth begin(largest deliverable)+ F6 ACS email service integration begin

### Commit

- `991e1aa` feat(frontend,docs): W13 D3 F3 V8 Login UI shell + Toaster mount + auth wire deferral

---

## Day 4 — W13 D4 F4 V9 Register 3-step wizard(real-calendar 2026-06-10 same-day collapse cycle 2 of 4 cont)

> **Calendar note**:plan §5 tentative date 2026-06-26 superseded by real-calendar 2026-06-10 same-day collapse(D3 → D4 cycle continue post user authorization "A:continue W13 D4 — F4 V9 Register 3-step wizard(frontend-only,reuse V8 BrandPanel split + Stepper visual pattern + step transitions;backend wire 同樣 stub/F5 defer)")。Time tracking calibration:plan ~1 day budget vs actual ~50 min(largest UI phase yet — wizard state machine + 6-box code input + countdown timer + 3 step components)。

### What landed

| F# | Deliverable | Files | Status |
|---|---|---|---|
| BrandPanel rule-of-2 extraction | NEW shared component | NEW `frontend/components/auth/brand-panel.tsx`(Server Component;dot-grid pattern + EKP logo + tagline preserved exactly from V8 inline)| ✅ |
| V8 Login refactor consume shared | UPDATE `frontend/app/login/page.tsx`(import shared BrandPanel + remove internal function;5-line surgical touch)| ✅ |
| F4.1 V9 Register page split layout | NEW `frontend/app/register/page.tsx`(client component;BrandPanel + form area split via `flex-col md:flex-row`)| ✅ |
| F4.2 Step indicator inline | parallel W12 F4.9 Pipeline wizard pattern(rounded circle w/ number/checkmark + dashed connector;active=primary / done=success / pending=border-only;labels hidden < sm)| ✅ |
| F4.3 Step 1 Account info | Email + Password + Confirm + Display name shadcn Input + Label + 5-segment strength bar + `validateAccountInfo` client-side rules(EMAIL_PATTERN + min 8 + uppercase + digit/symbol + match)| ✅ |
| F4.4 Step 2 Email verify | MailCheck lucide icon + email display + 6 separate Input boxes(`useRef<Array<HTMLInputElement>>`)w/ auto-advance focus + Backspace previous + ArrowLeft/Right navigation + paste distribution to first box | ✅ |
| F4.5 Step 3 Welcome | PartyPopper success icon + personalized greeting w/ displayName + disabled KB selector(`drive_user_manuals` w/ Q7 single-KB POC default title attribute)+ Tour CTA → `router.push('/chat')` | ✅ |
| F4.6 Backend integration | **Deviation logged plan §7 changelog 2026-06-10 (D4)** — defer all wire to F5 batch per user instruction「backend wire 同樣 stub/F5 defer」(F3.6 pattern一致);stub handlers w/ `F5_PENDING_REGISTER` / `F5_PENDING_VERIFY` / `F5_PENDING_RESEND` constants;TODO(W13 F5)comments | ✅ (deviation noted) |
| F4.7 Error states scaffold | `validateAccountInfo` produces field-level error map;F5 ApiError envelope variants(email_already_exists / invalid_password / verification_token_expired)→ pending F5 cascade | ✅ (scaffold ready) |
| F4.8 Resend countdown | `useEffect` + `setTimeout` decrement every 1s;`resendCooldown > 0` disables Resend button + countdown text「Resend (Ns)」;`clearTimeout` cleanup on unmount;reset to 60s on Resend click + Step 1 → 2 advance | ✅ |

### Decisions

1. **BrandPanel rule-of-2 extraction**:Karpathy §1.1-§1.3 — design ref §2.9 explicit「Brand panel(left,same V8)」+ drift-prevention(2 places to update otherwise);extract NOW vs typical "rule of three";V8 Login refactored 5-line surgical touch(import + replace internal function call w/ shared)
2. **Stepper inline retention**(no extraction yet):rule-of-3 pending — Pipeline wizard W12 F4.9 + Register W13 F4 = 2 active state-machine wizards;extract when 3rd emerges per Karpathy §1.2 simplicity-first;design ref §4 component map lists「Custom Step indicator」as future shared component
3. **6-box vs single-input verification code**:wireframe §2.9 explicit 6 separate boxes;industry-standard verification UX(auto-advance feels official);accepted moderate complexity(refs management + paste handling)over single-Input simplicity;Karpathy §1.4 goal-driven — verifiable success = wireframe match
4. **Step labels mobile collapse**:`hidden sm:inline` for label text → mobile shows just numbered circles + connectors(prevents layout overflow on narrow viewport;preserves visual rhythm)
5. **Step 1 validation strategy**:client-side `validateAccountInfo` returns error map → field-level rendering via `<Field>` helper;Continue button disabled until all errors clear;avoids form submission attempt with invalid state(Karpathy §1.4 verifiable goal — submit only when valid)
6. **Step 3 KB selector approach**:disabled visual rather than absent(communicates「multi-KB coming」without surfacing Tier 2 confusion;`title` attribute explains Q7 default to power users);accepts Tier 2 hint vs strict Tier 1 hide because architecture.md v6 §11 lists multi-KB selector as future user-facing extension

### Verification

```
$ cd frontend && pnpm type-check
> tsc --noEmit
$ # 0 errors

$ grep oklch frontend/app/register | wc -l
0  # register/page.tsx fully token-clean (no docstring oklch mentions)

$ grep oklch frontend/components/auth/brand-panel.tsx | wc -l
1  # docstring at line ~7 explains "no hardcoded oklch values" token discipline
   # (W12 admin-shell.tsx + W13 D3 login pattern一致 — Karpathy §1.3 inline comment WHY)
```

✅ TypeScript strict mode clean(0 errors);no `any` / no @ts-ignore;all colors via Tailwind tokens(`bg-primary` / `bg-accent/10` / `bg-success/15` / `bg-muted/30` / `text-foreground` / `text-muted-foreground` / `text-destructive` etc);shadcn primitives reused(Input + Label + Button)— no new vendor。

### Carry-overs to W13 D5

- 🚧 F1.6 + F2 + F3 + F4 user smoke continue defer per CLAUDE.md §13(`! pnpm dev` localhost:3001;`/register` 3-step flow + 6-box code input auto-advance + paste distribution + 60s countdown + Step 3 disabled KB selector + Tour CTA → /chat)— W13 D5 F5 backend cascade work fills smoke gap iteratively
- ⏳ W13 D5 focus per plan §5:F5 backend hybrid auth(largest 2-day deliverable)+ F6 C13 ACS Email Verification Service integration + F7 closeout retro + W14 phase folder kickoff
- 📝 Stepper extraction watch:rule-of-3 trigger pending(2/3 active wizards now);next wizard usage emergence → extract to `frontend/components/ui/stepper.tsx` shared

### Commit

- `<TBD>` feat(frontend,docs): W13 D4 F4 V9 Register 3-step wizard + BrandPanel rule-of-2 extract

---

## Day 5 — _(W13 D5,2026-06-27,tentative)_

_(placeholder — F6 ACS finalize + F7 closeout retro + W14 phase folder kickoff)_

---

## Retro(填於 W13 D5 末)

### What worked
_(W13 D5 末 fill — what user-facing views patterns / approaches landed cleanly;backend hybrid auth cascade + ACS integration evaluation)_

### What didn't
_(W13 D5 末 fill — friction points / blockers / unexpected complexity)_

### Surprises / discoveries
_(W13 D5 末 fill — non-obvious findings about Argon2id integration / session middleware / ACS SDK usage / step indicator UX)_

### Decisions
_(W13 D5 末 fill — users table backing decision + ACS sender domain decision + form validation rules + step indicator UX pick)_

### Carry-overs to W14
_(W13 D5 末 fill — items deferred to W14 admin views sprint;categorize:V2/V3/V4 implementation / shadcn extension / design ref iteration / OQ pending / Tier 2 / W16+ Beta deploy)_

### Time tracking
_(W13 D5 末 fill — actual hours per F1-F7 vs estimated 5-6 working days;identify estimation calibration adjustments for W14-W15 phases)_

### Spec ref alignment
_(W13 D5 末 fill — verify all W13 deliverables trace back to architecture.md v6 §5.2/§5.9-§5.11 + ADR-0014 + ADR-0015 spec citations)_

---

**Lifecycle reminder**:呢份 progress.md 屬 phase journal,daily entries + retro 必須 commit incrementally per R2。Day 0 setup entry 屬 W12 D5 closeout cascade carry-over prep,W13 D1 active implementation start當 stakeholder authorization 後。
