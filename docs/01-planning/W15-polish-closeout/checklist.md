---
phase: W15-polish-closeout
plan_ref: ./plan.md
status: active
last_updated: 2026-06-10
---

# Phase W15 — Checklist

> Atomic checkbox(每 item ≤ 0.5–2 hour effort per W6 C10 calibration)。
> Status:`draft` — pending W15 D1 active flip post stakeholder authorization。

## F1 — V5 Eval Console implementation

- [x] F1.1 NEW `frontend/app/eval/page.tsx` + NEW `frontend/app/eval/layout.tsx`(admin shell wrap mirror `frontend/app/admin/layout.tsx` AuthProvider + QueryProvider + AdminShell)— top filter bar(Eval set Select + Run + Run Single Button + responsive flex);**deviation logged plan §7 changelog 2026-06-10 (D1)** — baseline mismatch(plan literal "rebuild from W12 F4.5 baseline" vs actual = W1 skeleton 15-line placeholder)→ effective NEW implementation per Karpathy §1.1 think-before-coding upfront verification;**5th occurrence of plan literal vs actual code grep verification gap pattern**(W13 F1.5 + W14 F1.1 + W14 F2.2 + W15 F1.1 baseline + W15 F1.3 metric naming;CO_W14_process_grep_verify call-out reinforced)
- [x] F1.2 Run config card — LLM Select(gpt-5.5 / gpt-5.4-mini)+ Reranker Select(cohere-v4.0-pro / cohere-v3.5 / azure-builtin)+ Top K Input(default 5)+ CRAG threshold Slider(default 0.70)+ Intent type Select(auto / how_to / conceptual / lookup)per design ref §2.5 layout;DEFAULT_CONFIG const initialized from W6 production lock(gpt-5.5 + cohere-v4.0-pro + top_k=5 + crag=0.70 + intent=auto)
- [x] F1.3 4-metric cards — **deviation logged plan §7 changelog 2026-06-10 (D1)** — schema(`backend/api/schemas/eval.py`)+ design ref §2.5 wireframe codes(R@5/FFul/CRct/IAss)agree on Recall@5 / Faithfulness / Correctness / Image Association(plan literal "Context Relevancy / Answer Relevancy" inconsistent with both;采 spec-aligned naming);MetricCard component shows score + PASS/FAIL Badge + threshold(R@5 ≥ 0.80 Gate 1 W2 末 + others ≥ 0.85 Tier 1 strict per W6 retro);**stub mitigation pattern** for backend 501(empty state Card + AlertCircle + Run CTA hint + ApiError.status === 501 → `toast.info("docs/eval-methodology.md")`)per W14 BackendStubNote pattern
- [x] F1.4 Failed queries table — EvalReport.failed_queries → plain HTML `<table>` w/ query_id (mono) + query (line-clamp-2) + metric_failed Badges + Inspect Link → `/debug/{query_id}`;empty state w/ CheckCircle2 「No failed queries」;mirrors W14 F1.2 Failed ingestion table pattern + design ref §3.4 empty state
- [x] F1.5 W4 Reranker Shootout table — **deviation logged plan §7 changelog 2026-06-10 (D1)** — no `reranker_shootout*` artifact file exists per Glob check + W4 Karpathy §1.2 simplicity drop = effective 2-way not "4-way";采 inline `RERANKER_SHOOTOUT` static const populated from W6 demo-prep.md §107-114 Q-A2 actual W6 D1 LIVE Azure 2-way data(Cohere v4.0-pro 1.000/0.841 RECOMMENDED + Azure built-in 0.882/0.743 Fallback + Voyage + ZeroEntropy null status='dropped' opacity-60 visual dim per W4 simplicity drop);3 status variants(recommended Badge bg-success/15 + fallback Badge bg-muted + dropped Badge bg-muted + row opacity-60)
- [x] F1.6 Loading + empty state — Skeleton 4-card matching shape per design ref §3.5(`frontend/app/admin/kb/page.tsx` KbGridSkeleton precedent);empty state per design ref §3.4(AlertCircle + heading + Run CTA hint + stub note "Backend `/eval/run` is W4 stub — pending implementation per docs/eval-methodology.md");Failed queries empty state CheckCircle2 + "No failed queries";Reranker Shootout has no empty state(static data always present)

## F2 — V6 Debug View implementation

- [x] F2.1 REWRITE `frontend/app/debug/[traceId]/page.tsx` + NEW `frontend/app/debug/layout.tsx`(admin shell wrap mirror eval/admin layout)+ NEW `frontend/lib/api/debug.ts`(typed client + TraceData/PipelineStageMetric forward-looking schema)— Trace ID header + Back to Eval link + Total ms / Total cost / Query summary cards;**deviation logged plan §7 changelog 2026-06-10 (D2)** — plan literal "NEW route" stale(file actually exists as W1 skeleton 15-line placeholder per Karpathy §1.1 think-before-coding upfront grep verification;**6th occurrence of plan literal vs actual code grep verification gap pattern**)
- [x] F2.2 6-stage pipeline timeline(NOT 9-stage)— **deviation logged plan §7 changelog 2026-06-10 (D2)** — plan literal "9-stage timeline" inconsistent with plan F2.2 own enumeration(Query Preprocessor / Hybrid Retrieval / Reranker / CRAG / LLM Synthesis / Final Response = 6 stages)+ design ref §2.6 wireframe shows "Stage 1 ... Stage 6";aligned with wireframe + plan enumeration spec;PIPELINE_STAGES const w/ id + name + vendor(Cohere v4.0-pro / gpt-5.5)+ description for each stage
- [x] F2.3 Custom Collapsible per stage(NOT shadcn Accordion)— **deviation logged plan §7 changelog 2026-06-10 (D2)** — Accordion NOT in W12 D3 19-primitive install list per Glob check;design ref §2.6 explicitly permits "shadcn Accordion **OR custom Collapsible** primitive";采 custom Collapsible(useState boolean + ChevronDown lucide rotation 0deg ↔ 180deg via CSS transition + button + aria-expanded)per Karpathy §1.2 simplicity-first + H2 vendor lock(no new dependency)
- [x] F2.4 Open in Langfuse link — stub URL pattern `https://langfuse.example.com/trace/{encodeURIComponent(traceId)}` per plan literal Tier 1 acceptance;ExternalLink lucide icon + target=_blank + rel=noopener noreferrer;link works independently of backend trace API status(uses traceId from URL params)
- [x] F2.5 Loading + error + stub states — Skeleton 3-card during initial loading(matching SummaryCard shape per design ref §3.5);**deviation logged plan §7 changelog 2026-06-10 (D2)** — backend `GET /debug/trace/{trace_id}` returns 501 stub(W3+ implementation per Langfuse correlation);采 stub mitigation pattern(AlertCircle alert with stub note + 6-stage scaffold "—" duration + "Stage details pending backend trace API + Langfuse correlation")per W14/W15 F1 backend stub pattern precedent;non-501 error states show destructive-bordered error banner + retry: false on useQuery (avoid 4-retry waste against 501 stub)

## F3 — Responsive + a11y polish across 9 views

- [x] F3.1 Keyboard navigation audit — shadcn primitives 自帶 focus-visible ring(via radix-ui)+ Next.js `<Link>` keyboard nav OK + Esc dismiss handled by shadcn Dialog/Sheet via radix-ui internal;**1 a11y gap fixed** — V6 Debug View custom `<button>` PipelineStageCollapsible 缺 focus-visible ring(W15 D2 own mess per Karpathy §1.3 surgical「only clean your own mess」)→ added `focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1` + `rounded-md` for ring fit
- [x] F3.2 ARIA labels audit — grep `aria-label|aria-expanded|aria-describedby|aria-hidden|role=` across `frontend/app/` = 5 occurrences across 4 files(chat + admin/kb + register + debug);shadcn primitives via radix-ui automatically include role + aria-* labels for Dialog title-content link / Tabs role labels / Accordion role(via custom Collapsible aria-expanded);role="alert" on error-boundary.tsx preserved post-token-cleanup;**no new ARIA gaps surface during W15 D1+D2 implementation**(Tier 1 acceptance preserved)
- [x] F3.3 Mobile responsive verify — grep `sm:|md:|lg:|grid-cols-|flex-col|flex-row` across `frontend/app/admin/` = 18 occurrences across 4 files(comprehensive responsive coverage);eval/page.tsx W15 D1 has `flex-col sm:flex-row` filter bar + `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` metric cards + `md:grid-cols-[280px_1fr]` 2-column main + `overflow-x-auto` tables;debug/[traceId]/page.tsx W15 D2 has `flex-col sm:flex-row` header + `grid-cols-1 sm:grid-cols-3` summary cards + collapsible buttons full-width(natural mobile);**0 regressions** vs W12 F4 admin shell baseline + W14 admin views baseline
- [x] F3.4 CO_W14_F4_error_boundary token cleanup — REWRITE `frontend/components/error/error-boundary.tsx`(74 lines)with Tailwind tokens replacing 6 hardcoded oklch values(L36 `border-[oklch(0.88_0.04_25)]` → `border-destructive/30`;L36 `bg-[oklch(0.98_0.02_25)]` → `bg-destructive/10`;L39 `text-[oklch(0.45_0.18_25)]` → `text-destructive`;L42+L49 `text-[oklch(0.55_0_0)]`/`text-[oklch(0.45_0_0)]` → `text-muted-foreground`;L58 `border-[oklch(0.45_0.18_25)]` + `bg-[oklch(0.98_0_0)]` + `hover:bg-[oklch(0.94_0_0)]` → shadcn Button outline destructive;L67 `border-[oklch(0.92_0_0)]` + `hover:bg-[oklch(0.94_0_0)]` → shadcn Button outline default);native `<button>` + `<a>` replaced w/ shadcn `<Button>` + `<Button asChild>` for visual consistency + automatic dark mode + focus-visible ring;**MAJOR MILESTONE** — grep `\[oklch` across **entire `frontend/`** now = 0 hits(W12 D2 strict baseline now extends globally vs previously confined to `frontend/app/admin/` strict scope per W14 F4.3 audit boundary)

## F4 — Playwright E2E + pixel diff baseline harness

- [ ] F4.1 Playwright install + config(`playwright.config.ts` + `frontend/tests/e2e/` directory)— corp proxy R8 mitigation if needed
- [ ] F4.2 Golden-path E2E:landing → register → verify → login → /chat → ask query → citations(W12+W13+W14 manual smoke deferred subsumed)
- [ ] F4.3 Admin golden-path E2E:login → /admin → /admin/kb → click KB Card → /admin/kb/[id]?tab=settings → save toast
- [ ] F4.4 Pixel diff baseline — capture baseline screenshots per view + commit `frontend/tests/e2e/screenshots/baseline/` + maskedDiff for dynamic regions
- [ ] F4.5 CI integration plan(non-blocking;Beta hardening trigger if cost concerns;local-only baseline OK Tier 1 per PARTIAL PASS acceptance)

## F5 — Tier 1 UI sprint cycle final closeout + W16+ Beta deploy phase folder kickoff

- [ ] F5.1 W15 phase Gate verdict landed(PASS / PARTIAL PASS / FAIL per W14 F5.1 pattern)
- [ ] F5.2 W15 progress.md retro 7 sections + **Tier 1 UI sprint cycle final closeout retrospective**(W12+W13+W14+W15 cumulative learnings)
- [ ] F5.3 `docs/01-planning/W16-beta-deploy/{plan,checklist,progress}.md` draft per W11 plan F1+F2+F3 Track A IT cred event-triggered + R-B1 closure
- [ ] F5.4 W15 plan + checklist + progress frontmatter status flipped to `closed`
- [ ] F5.5 No new OQ surface expected;if surface → sync to decision-form.md per R4
- [ ] F5.6 4-sprint UI Tier 1 expansion 收尾 marker — architecture.md v6 §13.12 fully implemented;ready for W16+ Beta deploy

---

## Cross-Cutting

- [ ] Each commit references `progress.md` Day-N entry(R2)
- [ ] Component tag in commit message per CC-1(C09 / C06 / C07 / C10 / C11)
- [ ] OQ status sync to `decision-form.md`(R4)— no W15 critical OQ expected
- [ ] Risk register update if any new risk surface
- [ ] CLAUDE.md §5.1 H1 boundary check:no architectural change without ADR(W15 scope already covered by ADR-0014 + ADR-0015 + ADR-0016)
- [ ] CLAUDE.md §5.2 H2 boundary check:no new vendor / dependency without ADR(Playwright as Tier 1 utility test framework — pre-approved per CLAUDE.md §5.2「dev dependency」example exception OR ADR-0017 if scope expand)
- [ ] CLAUDE.md §3.2 frontend conventions check:no `any` / no @ts-ignore / shadcn/ui only / tokens consumption verified(grep oklch=0 across all touched files including CO_W14_F4_error_boundary post-cleanup)
- [ ] CLAUDE.md §5.5 H5 security check:no secret commit;Langfuse stub URL not real production endpoint

---

**Lifecycle reminder**:呢份 checklist 衍生自 `plan.md` deliverables。新加 deliverable 必須先入 plan + changelog,然後再加 checklist item。
