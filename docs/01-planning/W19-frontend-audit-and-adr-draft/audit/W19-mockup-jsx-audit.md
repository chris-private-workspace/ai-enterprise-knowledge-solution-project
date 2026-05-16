---
phase: W19-frontend-audit-and-adr-draft
deliverable: F1
plan_ref: ../plan.md
checklist_ref: ../checklist.md
date: 2026-05-16
status: complete
---

# W19 F1 — Mockup `.jsx` Audit

> Per-route + shell + foundation file inventory of `references/design-mockups/`(22 files,11K lines)against `architecture.md v6 §5` + `COMPONENT_CATALOG.md` + `ADR-0024` unified shell IA.
>
> **Scope**:audit-only(read 22 files in 5 parallel-Read batches);no mockup edit,no `frontend/` change。
>
> **Outcome**:every deviation tagged with F3 ADR feed(0025–0029)or "covered by ADR-0024" or "Tier 2 — Labs page"。Summary at §2。

---

## §1 Per-route + support file table

### 1.1 Foundation files(F1.3 + F1.4 + F1.5)

| File | Lines | Purpose | Audit result |
|---|---|---|---|
| `ekp-shell.jsx` | 482 | `<AppShell>`:`<TopBar>` + `<Sidebar>` + `<CommandPalette>` | ✅ **IA compliant per ADR-0024**(5 module sidebar + Cmd+K palette + flat URLs)。**5 surface beyond spec** — see §2.1 |
| `ekp-data.jsx` | 557 | Mock data — KBs / docs / chunks / images / traces / eval / shootout / recent queries / cost / conversations / outline / chunking comparison | ✅ **shape matches `backend/api/schemas/*.py`**(KbStatus / TraceDetail with 9 stages / EvalReport 4-metric / ChunkRecord with `section_path` + `source` + `rerank_delta` + `embedded_images` / ImageRef with `sha256` + `blob_url` / FeedbackRequest) — see §4 |
| `styles.css` | 1073 | Design tokens(oklch)+ Tailwind-equivalent class names | ✅ **Warm Charcoal + Coral Accent tokens match `frontend/lib/theming/tokens.ts`** per ADR-0015 W12 D2(primary `oklch(0.20 0.01 285)` / accent `oklch(0.65 0.18 25)` / radius 0.25/0.5/0.75rem / Inter + JetBrains Mono)。**Light + Dark mode + `[data-density="compact|comfy"]` mode 完整 defined**。`--info: oklch(0.62 0.13 240)` NEW token(spec 未 explicit declare,但係 reasonable extension)— see §3 |
| `icons.jsx` | 71 | 42 Lucide-style stroke icons(16×16 default, 1.6 stroke) | ✅ **shadcn convention compliant** — 同 `frontend/components/` 用嘅 Lucide pattern 一致 |
| `tweaks-panel.jsx` | 568 | **Design-time** Tweaks panel host protocol(`__activate_edit_mode` postMessage)+ control palette(Slider / Toggle / Radio / Select / Number / Color) | ✅ **DESIGN-TIME ONLY,NOT shipping** — confirmed per `__edit_mode_available` postMessage handshake;Wave A docs the `/dashboard`「Tweaks」affordance is the prototype's design-iteration surface,gone in real app — see §5 |

### 1.2 Tier 1 routes(per PAGE_INVENTORY.md)

| # | Route | File | Top-level component | Mock data deps | Tier | IA compliance | Visual identity | Deviation feed |
|---|---|---|---|---|---|---|---|---|
| 1 | `/dashboard` | `ekp-page-dashboard.jsx`(299) | `PageDashboard` | `MOCK_KBS` + `MOCK_RECENT_QUERIES` + `MOCK_EVAL_REPORT` + `MOCK_COST_SUMMARY` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0025 + 新 NeedADR候選**:Dashboard 加 **4-stat strip**(KBs / Documents / R@5 / Today spend) + **2-col grid 5 cards**(KbSummary table + RecentQueries activity feed + LatestEval 4-metric inline + SystemHealth 3-alert + QuickActions 4-btn)。Spec §5.3 v1 = 5 cards minimal,prototype 顯著 richer(stat strip + cost projection + reranker locked badge + ADR-0012 ref + QuickActions「API access Tier 2 disabled」affordance)→ **NEW ADR-0030 candidate** "Dashboard richer overview"(F4 Wave breakdown 標 W20 Wave A scope) |
| 2 | `/chat` | `ekp-page-chat.jsx`(1152) | `PageChat` | `MOCK_KBS` + `MOCK_CONVERSATIONS` + `SAMPLE_CITATIONS`(inline) | Tier 1 + **Beta+ Conversation History** | ✅ inside `<AppShell>` + focus-mode toggle(per ADR-0024 §5.0) | ✅ 100% tokens | **NEW ADR-0031 candidate** "Chat advanced surfaces":(a) **Conversation History sidebar**(Beta+ scope per C10 §7 — localStorage now,Tier 2 server-side persistence)→ **新 backend dep** `/conversations` CRUD;(b) **3 citation placement modes**(sidebar / inline / hover popover)via `tweaks.citationPlacement` — spec §5.2 only mentions inline;(c) **InlineImageCard + ImageGallery + SourcesStrip + CitationPanel** — 4 different citation display modes;(d) **CitationPill hover popover**;(e) **CRAG strip indicator** in answer body(W19 audit deems this Tier 1 valuable per technical highlight Q10 answer);(f) **FeedbackBar with comment reveal** — `POST /feedback` per C06。`SyntheticScreenshot` SVG mockup是 design-time,real impl 用 real `blob_url`。 |
| 3 | `/kb` | `ekp-page-kb.jsx PageKbList`(881 共) | `PageKbList` | `MOCK_KBS` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **Minor enhancement**:Grid + Table view toggle + filter bar(status / tag)+ KbCard with status badge + indexing progress bar + tags;**non-trivial 但 covered by ADR-0024 §5.4**(KB list 已 specced as card grid,prototype 加 table view + filters 屬 polish detail,non-H1) |
| 4 | `/kb/new` | `ekp-page-kb-new.jsx`(586) | `PageKbNew`,5 Step components(Identity / Config / Multimodal / Defaults / Review) | none(form state)| Tier 1 + **Multimodal Step Tier 1/2 mixed** | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0028**:5-step wizard(Identity → Format & chunking → **Multimodal** → Retrieval defaults → Review)。Spec §5.5.3 = 3-step IN KB Detail Pipeline tab(DATA SOURCE → DOCUMENT PROCESSING → EXECUTE)。**Multimodal Step**:**ACTIVE**(`extract_embedded_images` + `slide_screenshots` per Docling/python-pptx + `dedup_strategy: sha256` + `return_images_in_chat`)**vs TIER 2**(`captioning_model: gpt-5.5-vision/azure-doc-intel` + `render_pdf_pages` + `low_value_threshold` vision filter + `dedup_strategy: perceptual`)— prototype 用 OptionRow `tier2={true}` 標 boundary + coral accent badge。**Note prototype inconsistency**:comment says "4-step" but actually 5 steps(`Step 1 of 4` in footer of StepIdentity but `steps` array has 5 items)— flagged for ADR-0028 to clarify final step count |
| 5 | `/kb/[id]` | `ekp-page-kb.jsx PageKbDetail` + `ekp-page-kb-extras.jsx` | `PageKbDetail` 8 tabs(Documents / Chunks / **Images** / **Chunking Lab** / Pipeline / Retrieval Testing / **Access** / Settings) | `MOCK_KBS` + `MOCK_DOCUMENTS` + `MOCK_CHUNKS` + `MOCK_IMAGES` + `MOCK_CHUNKING_COMPARISON` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0025**:KB Detail 5→8 tabs。**NEW tabs**:(a) **Images**(`TabImages` in kb-extras.jsx)— 4-stat strip(extracted / dedup / blob storage / low_value)+ how-it-works strip + filter seg(6 types incl. low_value)+ grid + ImageDetailModal(SHA256 + blob_url + chunks ref);(b) **Chunking Lab**(`TabChunkingLab`)— sample doc selector + chunking parameters(chunk size + overlap)+ 4-strategy comparison cards(layout_aware ✅ + slide_based ✅ + heading_aware ❌ NotImplementedError + auto ✅)+ output preview;(c) **Access**(`TabKbAccess` in users.jsx)— per-KB ACL with visibility radio(Private / Workspace / Public Tier 2 disabled)+ members & permissions table(Manage/Edit/Query per-KB role override)+ Add Entra group。**Access tab hard dep on ADR-0027 RBAC acceptance**。**Retrieval Testing tab**:per ADR-0021 + **prototype 加 3 viz modes**(list / bars / heatmap with chunks × retrievers grid)— **NEW affordance candidate** "Retrieval testing 3 viz modes"。**Settings tab**:embedding_model / chunk_strategy / kb_id `locked` + `editable` distinction;Re-indexing explainer with v1→v2 atomic + 7-day rollback;Danger zone(Archive + Delete with audit-logged) |
| 6 | `/doc-detail/[kbId]/[docId]` | `ekp-page-doc-detail.jsx`(384) | `PageDocDetail` 3-pane(outline + chunk list + inspector) | `MOCK_DOC_DETAIL` + `MOCK_IMAGES` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0029**:`/doc-detail/[kbId]/[docId]` 3-pane vs spec §5.5.2 chunk-inspector single-view at `/admin/kb/[id]/chunks/[doc_id]`(ADR-0024 flat → `/kb/[id]/chunks/[doc_id]`)。**Prototype changes**:(a) route topology — `/doc-detail/...` 變 standalone route(spec was nested-under-KB);(b) 3-pane layout(outline left sticky 240px + chunk list center 1fr + inspector right sticky 380px)— more dense than single-view;(c) header 加 pipeline stages strip(5 stages — Parse / Extract / Chunk / Embed / Index)+ image strip(horizontal scroll thumbnails)+ ChunkInspector with embedding vector preview(24 dims shown + "+1000 more dims" — Power-user spec)。**新 backend dep**:`GET /kb/{kb_id}/docs/{doc_id}` returning doc + outline + chunks + image refs(currently `/kb/{kb_id}/documents/{doc_id}/chunks` only) |
| 7 | `/kb-upload/[id]` | `ekp-page-misc.jsx PageUploadWizard`(376 共) | 3-step(Data source / Document processing / Execute) | `MOCK_DOCUMENTS`(6 sample for Execute) | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **Important**:呢個 3-step wizard **COEXISTS** with `/kb/new` 5-step。Prototype 嘅 intent:**`/kb/new` 5-step = new KB creation**(provisions index);**`/kb-upload/[id]` 3-step = re-ingestion into existing KB**(spec §5.5.3 Pipeline Wizard equivalent)。ADR-0028 to clarify both flows + distinguish in §5.5.3 amendment。**Data source 4 options**:Local upload + SharePoint(OAuth-connected)+ Drive folder + URL crawler[Tier 2 disabled]— **spec only mentioned drag-drop,prototype enriches with SharePoint + Drive options** — surface in ADR-0028 |
| 8 | `/eval` | `ekp-page-eval.jsx`(301) | `PageEval` | `MOCK_EVAL_REPORT` + `MOCK_SHOOTOUT` + `MOCK_FAILED_QUERIES` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **Largely spec-aligned**(§5.6 4-metric + reranker shootout + failed queries inspector)。**Prototype enhancements**:(a) MetricCard with target + delta + "Above/Below target" pass/fail badge;(b) RerankerShootoutCard:5 + 2 dropped(v4.0-pro WINNER LOCKED + v3.5 + azure-semantic + off baseline + voyage DROPPED + zeroentropy DROPPED — per Karpathy §1.2);(c) DeltaCell with +/-pp coloring;(d) RecommendationCard(per ADR-0012 production lock + 5 comparison rows);(e) **CragInsightCard NEW**(trigger rate + threshold note "0.70 NON-STICKY per W5 D4");(f) OpsMetricsCard(p95 / cost / context_recall)。**Minor spec deviation**:spec §5.6 mentions 5 metrics including Image Assoc — prototype only 4(drops Image Assoc)。**No ADR needed** — covered by §5.6 with note about Image Assoc being a tier-1 enhancement |
| 9 | `/traces` | `ekp-page-trace.jsx PageTracesList`(485 共) | List view with filter seg + 9-col table | `MOCK_RECENT_QUERIES` | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **NEW affordance**(spec §5.7 only mention trace detail,not list view):`/traces` index with filter seg(All / Success / Error / CRAG triggered)+ date range select + 9-col table。**Wave A scope clear** — small, builds on existing W16 F5.5 `/debug/trace/{id}` infra |
| 10 | `/traces/[traceId]` | `ekp-page-trace.jsx PageTrace` | `PageTrace` with TraceVertical / TraceWaterfall / TraceFlame | `MOCK_TRACE`(9 stages) | Tier 1 | ✅ inside `<AppShell>` | ✅ 100% tokens | **NEW affordance candidate** "Trace 3 viz modes":vertical(spec §5.7 default)/ waterfall(Chrome devtools style + time axis)/ flame(stacked horizontal by category)。`tweaks.traceViz` controls。Spec §5.7 only mentions vertical;3 modes 屬 design-stage enhancement。**Wave B scope** + ADR candidate "Trace viz 3 modes" — could be merged into ADR-0030 dashboard expansion as 「visualization options」umbrella |
| 11 | `/settings` | `ekp-page-settings-tabs.jsx PageSettingsRich`(882) | 6 tabs(Profile / Appearance / Connections / Identity & Auth / API Keys & Quotas / Account) | inline mock data | Tier 1 + **MASSIVE Tier 1.5/2 surface** | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0026**:Settings 6-tab vs spec §5.0 v1 thin(profile + theme + sign-out)。**Massive scope expansion**:(a) **Profile tab** — simple v1(display info + Edit profile Tier 2 disabled);(b) **Appearance tab** — Theme + Language(disabled);(c) **Connections tab** — 5 categories × 9 providers(Azure OpenAI w/ 4 deployments + Cohere + Azure AI Search + Blob + Postgres + Azurite + Langfuse + structlog + ACS Email + Container Apps + Key Vault),each with ServiceCard expandable, fields with `ApiKeyInput`(reveal/hide/copy/rotate),meta table,deployments table with TPM/RPM bars。**這 alone 需要 ~10-15 NEW backend endpoints** + Key Vault SDK wire(rotate / fetch secret) + Test connection endpoint per service;(d) **Identity & Auth tab** — Entra tenant + App registration(client ID/secret/redirect URIs/scopes/sign-in audience)+ MSAL config(token cache mem/Redis Tier 2 + TTL + refresh rotation)+ Role mapping(3 + 1 Tier 2 Power User disabled)+ Sign-in policy(allowed domains + MFA toggles + auto-disable);(e) **API Keys & Quotas tab** — 4-stat usage + Outgoing API quotas per provider(TPM/RPM bars)+ Incoming API keys table(Tier 2 disabled — "Tier 1 access via web UI only");(f) **Account tab** — Session info(MSAL httpOnly cookie 7d TTL + CSRF per ADR-0022)+ Danger zone(Delete account Tier 2 disabled)。**ADR-0026 option set strategic call(Chris pick at F6)**:Option A read-only / Option B fully editable / Option C hybrid。 **Legacy `PageSettings` in `ekp-page-misc.jsx`(thin v1)is SUPERSEDED** — don't ship the legacy version |
| 12 | `/users` | `ekp-page-users.jsx`(523) | `PageUsers` 4 tabs(Members / Roles & permissions / Groups / Audit log) + `TabKbAccess`(used by /kb/[id] Access tab) | `MOCK_USERS`(11)+ `ROLES`(4)+ `PERMISSIONS_MATRIX`(5 areas × 24 perms × 4 roles) | **Tier 1.5 NET NEW** | ✅ inside `<AppShell>` | ✅ 100% tokens | **ADR-0027**:`/users` Tier 1.5 NET NEW。Spec §3.7 originally RBAC = Tier 2 hook;prototype 推前到 Tier 1.5。**Surface**:(a) **Members tab** — 11 mock users with filter seg(all/admin/editor/user/pending)+ 10-col table(checkbox/member/role/source/group/queries_7d/kbs_owned/last_login/status/more);(b) **Roles tab** — 4 role cards(3 active + 1 Tier 2 disabled)+ 5-area × 24-permission matrix × 4 role columns;(c) **Groups tab** — Entra ID groups sync with EKP role mapping;(d) **Audit log tab** — activity feed with 6 action types(role.changed / user.invited / kb.access.granted / provider.key.rotated / kb.config.changed / user.suspended)。**ADR-0027 option set strategic call(Chris pick at F6)**:Option A full RBAC / Option B minimal 3-role hard-coded / Option C stage。**Hard dep**:ADR-0025 Access tab uses `TabKbAccess` from this file(per-KB ACL needs RBAC);ADR-0026 Identity & Auth role mapping uses `RoleBadge` from this file。**Backend impact**:新 Postgres tables(`roles` + `role_permissions` + `groups` + `group_members` + `audit_log` + `kb_acl`)+ ACL middleware + auth-time role claim + frontend `useRole()` hook + role-gated route guard。**New Cn candidate**:C16 Users Service(or fold into C11 Identity expansion) |
| 13 | `/login` | `ekp-page-auth.jsx PageLogin`(311 共) | `PageLogin` with `AuthFrame` | none | Tier 1 | ✅ pre-auth,OUTSIDE `<AppShell>` per ADR-0024 | ✅ 100% tokens | **Mostly spec-aligned**(ADR-0024 §5.10 + ADR-0022 hybrid auth)。**Prototype enhancements**:(a) AuthFrame brand panel(left 1fr)with metrics badges(R@5 97.2% / P95 4.2s / 100% oklch)+ ekp-beta.ricoh.com mono + Ricoh RAPO credit + dots pattern background;(b) MicrosoftIcon 4-quadrant SVG logo;(c) Forgot password disabled affordance per ADR-0014;(d) Auth state notice block(mode + cookie + dev mock note);(e) `redirect → /dashboard` per ADR-0024 W18 F7。**Brand panel content** 超出 spec mention,屬 design-stage detail,non-H1 |
| 14 | `/register` | `ekp-page-auth.jsx PageRegister` | 2 steps(Form + Verify email) | none(form state)| Tier 1 + C13 Email Verification dep | ✅ pre-auth,OUTSIDE `<AppShell>` | ✅ 100% tokens | **Spec-aligned**(ADR-0024 §5.11 + C13 ACS Email per Q22 + ADR-0014):(a) Step 0 form(Full name + Email[restricted to @ricoh.com + @ricoh.co.jp]+ Password[scrypt-hashed per ADR-0022,≥12 chars + 1 number + 1 symbol]+ ToS checkbox);(b) Step 1 verify-email("Check your inbox" with auto-sign-in on click + 24h expiry + Resend btn + Powered-by ACS note + ConsoleEmailProvider dev fallback per `feature_email_mock`)。**Prototype simplification**:spec mentions 3 steps(Account info / Email verify / Welcome)— prototype 2-step(skip Welcome, verify-email leads directly to /dashboard via ADR-0022 auto-sign-in)。Non-H1 — simplification within design freedom |
| - | Cmd+K palette | `ekp-shell.jsx CommandPalette` | `CommandPalette` modal | `MOCK_KBS` | Tier 1 + ADR-0024 W18 NEW | ✅ inside `<AppShell>` | ✅ 100% tokens | ✅ **Spec-aligned per ADR-0024 §5.0**(Pages 6 results + KB names + "Ask in chat" deep-link → `/chat?q=…`);no semantic search-as-you-type(Tier 2 candidate) |
| - | Topbar dropdowns | `ekp-shell.jsx` | `LanguageMenu` / `NotificationsMenu` / `UserMenu` | `MOCK_KBS`(none),inline mocks for notifs | Tier 1 + 2 NEW dropdowns | ✅ inside `<AppShell>` | ✅ 100% tokens | **NEW affordance candidate (NOT in ADR-0024 W18 F1 spec)**:(a) **NotificationsMenu** with unread badge dot + 5 notification types(indexing-complete / eval-pass / crag-spike / indexing-failed / shootout)+ "Mark all read" + "Notification settings →";(b) **Workspace switcher**(`<WorkspaceSwitcher>` in Sidebar):Ricoh · RAPO + `ekp-beta.ricoh.com` — **Multi-tenancy Tier 2 hint** — Tier 1 single-tenant,呢個 prematurely surfaces multi-workspace affordance — should be removed for Tier 1 ship OR explicitly disabled with Tier 2 badge;(c) **Sidebar Tools section** beyond 5 modules:Settings + Users & access + Audit Log[Tier 2 disabled];(d) **Sidebar Labs · Tier 2 section** visible to all roles in prototype — F5.4 routing decision needed(prototype-only vs flag-gated vs hidden)。**Cascade ADR-0030 candidate** "Topbar + Sidebar additive surfaces" — Notifications + Workspace switcher + Tools sub-section + Labs section all need explicit Tier 1 disposition |

### 1.3 Tier 2 routes(Labs section)

| # | Route | File | Component | Tier | Disabled-affordance pattern |
|---|---|---|---|---|---|
| L1 | `/labs-graph-rag` | `ekp-page-labs-1.jsx`(627 共)| `PageLabsGraphRag` — entity extraction + traversal path + graph viz subgraph | Tier 2 | ✅ `LabsHeader` 標"Tier 2 Preview · NOT IMPLEMENTED" + accent gradient banner + Cn slot citation(C04 + C01) |
| L2 | `/labs-agents` | `ekp-page-labs-1.jsx` | `PageLabsAgents` — multi-agent orchestration / L4+ planner spec | Tier 2 | ✅ LabsHeader + slot C05(L4+ orchestration layer) |
| L3 | `/labs-languages` | `ekp-page-labs-1.jsx` | `PageLabsLanguages` — JP/ZH analyzer + cross-lingual semantic config | Tier 2 | ✅ LabsHeader + slot C01 + C04 + C09(i18n routing)|
| L4 | `/labs-voice` | `ekp-page-labs-1.jsx` | `PageLabsVoice` — Web Speech API + Azure Cognitive Services Speech | Tier 2 | ✅ LabsHeader + slot C10(extension) |
| L5 | `/labs-finetune` | `ekp-page-labs-2.jsx`(706 共)| `PageLabsFineTune` — training pipeline + runs table + model registry canary deployment | Tier 2 | ✅ LabsHeader + slot NEW C14 Training Pipeline + C05 deployment swap |
| L6 | `/labs-workflows` | `ekp-page-labs-2.jsx` | `PageLabsWorkflows` — workflow builder canvas + node palette | Tier 2 | ✅ LabsHeader + slot NEW C15 Workflow Engine + C09 hosts canvas |
| L7 | `/labs-personalization` | `ekp-page-labs-2.jsx` | `PageLabsPersonalization` — per-user ranking boost + Postgres state | Tier 2 | ✅ LabsHeader + slot C04 + per-user state Postgres |
| L8 | `/labs-tenancy` | `ekp-page-labs-2.jsx` | `PageLabsTenancy` — tenant_id prefix + tenant claim in auth | Tier 2 | ✅ LabsHeader + slot C02 + C03(tenant_id prefix)+ C11(tenant claim) |

**Labs disposition**:all 8 用 consistent `LabsHeader` pattern(gradient accent banner + bold "Tier 2 Preview · NOT IMPLEMENTED" + Cn slot citation + 46×46 icon + page title + subtitle)。F5.4 routing decision:**recommend Option C — prototype-only,never lands in `frontend/`**(Tier 1 ship);Tier 2 governance Q12 post-Beta trigger flips to A(sidebar section visible)or B(flag-gated)。

---

## §2 Deviation summary(all routes)

### 2.1 H1 architectural changes(F3 ADR drafts)

| # | Deviation | F3 ADR | Strategic call(F6 Chris pick)|
|---|---|---|---|
| D1 | KB Detail 5 → 8 tabs(Images + Chunking Lab + Access) | **ADR-0025** | Consensus(no option set)— but Access tab hard dep on ADR-0027 |
| D2 | Settings v1 thin → 6-tab hub(Connections + Identity & Auth + API Keys & Quotas) | **ADR-0026** | **岔口 2** — Option A read-only / B fully editable / C hybrid |
| D3 | `/users` NET NEW Tier 1.5(Members + Roles & permissions matrix + Groups + Audit log) | **ADR-0027** | **岔口 1** — Option A full RBAC / B minimal 3-role / C stage |
| D4 | `/kb/new` 5-step wizard(Identity / Format & chunking / Multimodal / Retrieval defaults / Review) vs spec §5.5.3 3-step | **ADR-0028** | Consensus — Multimodal step Tier 1/2 boundary explicit + clarify wizard vs /kb-upload/[id] re-ingestion 3-step coexistence |
| D5 | `/doc-detail/[kbId]/[docId]` 3-pane(outline + chunks + inspector with embedding vector preview) vs spec §5.5.2 single-view | **ADR-0029** | Consensus — route name pick `/doc-detail/...` vs `/doc/...` deferred to F6 |

### 2.2 Additional NEW ADR candidates surface from audit(beyond F3 5 ADRs)

| # | Deviation | Proposed ADR | Reasoning |
|---|---|---|---|
| D6 | Dashboard richer overview(4-stat strip + 2-col 5-card grid + cost projection + reranker locked + ADR-0012 ref + QuickActions API access Tier 2 disabled) | **ADR-0030**(NEW candidate) | Spec §5.3 v1 = minimal 5 cards;prototype 顯著 richer。Optional — could absorb as ADR-0025 sibling or W20 Wave A scope without separate ADR(F4 to decide) |
| D7 | Chat advanced surfaces — Conversation History sidebar(Beta+) + 3 citation placement modes + InlineImageCard + ImageGallery + CitationPill hover + FeedbackBar comment box | **ADR-0031**(NEW candidate) | Multiple Tier 1 enhancements;Conversation History 需 `/conversations` CRUD backend;3 placement modes 需 frontend tweaks。Optional — could split:Conversation History → standalone ADR;citation modes → polish under ADR-0024 |
| D8 | Topbar + Sidebar additive surfaces — NotificationsMenu / Workspace switcher / Sidebar Tools sub-section / Sidebar Labs section | **ADR-0032**(NEW candidate) or amend ADR-0024 | **Workspace switcher = Tier 2 multi-tenancy hint** — should be removed for Tier 1 ship。NotificationsMenu requires `/notifications` backend feed(currently mock-only)。Sidebar Tools sub-section adds Settings + Users(Settings 路徑 ADR-0024 spec via UserMenu,prototype 加 sidebar entry — duplicate path,polish detail) |
| D9 | Trace 3 viz modes(vertical / waterfall / flame) — spec §5.7 only vertical | merge into ADR-0030 | NEW affordance但 polish detail。`tweaks.traceViz` controls — implementation pattern same as 3 citation placement modes |
| D10 | Retrieval Testing 3 viz modes(list / bars / heatmap) — heatmap = chunks × retrievers grid | merge into ADR-0025 | NEW affordance within KB Detail Retrieval Testing tab(per ADR-0021)。Heatmap visualizes BM25 / Vector / RRF / Rerank ranking per chunk |
| D11 | `/traces` index list view — spec §5.7 only mentions trace detail | merge into ADR-0030 | NEW affordance,small。Filter seg(All/Success/Error/CRAG)+ date range + 9-col table。Builds on W16 F5.5 backend |

**F3 final 建議**:5 ADRs(0025–0029)足夠 cover D1–D5(highest H1 weight)+ D6–D11 absorb into ADR-0030 single "polish + visualization options" ADR or merged into Wave A/B scope per F4。決定 F4 final 時:
- 若 6 ADRs:ADR-0025–0030(D1+D6 merge / D2 / D3 / D4 / D5 / 0030 = D7+D8+D9+D10+D11 polish bundle)
- 若 5 ADRs:as proposed in plan §2 F3.1–F3.5,D6–D11 absorbed as Wave A/B scope without separate ADR

### 2.3 Tier 2 leaks audit(F5 disabled-affordance verification)

| Surface | Tier 2 disposition | Prototype affordance | F5 catalog spec |
|---|---|---|---|
| Topbar language toggle | i18n Tier 2 per §11 | Native `disabled` + tooltip "Multi-language..." | ✅ correct pattern(per ADR-0024 W18 F1) |
| Topbar Notifications dot color | uses accent coral — OK for brand emphasis | accent dot,not Tier 2 marker | ✅ correct(coral reserved for accent only) |
| Sidebar Workspace switcher | **MISSING disabled affordance** — Tier 2 multi-tenancy | currently enabled-looking | 🔴 **F5 catalog must flag** — fix in Wave A:remove entirely OR add disabled state + tooltip |
| Sidebar Tools "Audit Log" | Tier 2 multi-tenancy hint via opacity:0.5 + "Soon" tail | partial disabled affordance | ✅ correct pattern |
| Sidebar Labs · Tier 2 section | all 8 entries with "T2" tail badge | ✅ correct - F5.4 routing decision needed | recommend Option C prototype-only;visible Tier 1 OK with badge per ADR-0024 |
| Login Forgot password link | Tier 2 post-Beta per ADR-0014 | disabled + tooltip + Tier 2 badge | ✅ correct |
| /kb/new Multimodal Vision captioning options(GPT-5.5 Vision + Azure Doc Intel) | Tier 2 per §11 | tier2 styling on OptionRow + radio cards | ✅ correct |
| /kb/new Slide screenshots for .pptx | Tier 2 | tier2 styling | ✅ correct(borderline — spec §3.3 does support `slide_based` chunking, but slide-as-image rendering is Tier 2) |
| /kb/new Render PDF pages | Tier 2 | tier2 styling + warn text "Triples ingestion time" | ✅ correct |
| /kb/new Perceptual hash dedup | Tier 2 | disabled `<option>` | ✅ correct |
| /kb/new low_value image filter threshold slider | Tier 2 | tier2 styling + opacity:0.85 | ✅ correct(distinct from chunk-level low_value_flag已有) |
| /kb/[id] Access tab Public visibility | Tier 2 | disabled radio + Tier 2 badge | ✅ correct |
| /kb/[id] Access tab Anonymous API key | implied via Public Tier 2 | covered above | ✅ |
| /users Power User role | Tier 2 | row opacity:0.5 + Tier 2 badge | ✅ correct |
| /users Roles tab Custom role creation | Tier 2 | implicit — no "Create role" button | ✅ correct(absence = Tier 2 boundary) |
| /settings → Identity & Auth Power User mapping | Tier 2 | row opacity:0.5 + Tier 2 badge in table | ✅ correct |
| /settings → Identity & Auth Distributed token cache(Redis) | Tier 2 | disabled `<option>` | ✅ correct |
| /settings → Identity & Auth Multi-tenant audience | Tier 2 | disabled `<option>` | ✅ correct |
| /settings → API Keys & Quotas Incoming API keys(全 tab) | Tier 2 | table opacity:0.6 + disabled "Generate key" + "Tier 2" badge + footer text | ✅ correct |
| /settings → Account Delete account | Tier 2 | disabled `<button>` + Tier 2 badge | ✅ correct |
| /settings → Sign-in policy MFA all roles | Tier 2 | switch + "Tier 2" hint | ✅ correct |
| /settings → Profile Edit profile | Tier 2 | disabled `<button>` + Tier 2 badge | ✅ correct(self-edit profile defers to Tier 2 to avoid race with Entra ID sync) |
| /chat Conversation History sidebar | **Beta+ (Tier 1.5)** | full implementation with "BETA+" badge | 🟡 borderline — prototype paints as Tier 1 deliverable,but per C10 §7 server-side persistence is Tier 2;localStorage Tier 1 OK,server-side defer。F5 catalog flag |
| All `/labs/*` 8 pages | Tier 2 | `LabsHeader` "Tier 2 Preview · NOT IMPLEMENTED" badge | ✅ correct |

**Conclusion**:**1 Tier 2 leak**(Sidebar Workspace switcher — looks enabled,no Tier 2 badge);**1 borderline**(Chat Conversation History — Beta+ localStorage OK,Tier 2 server-side persistence — needs explicit boundary in F5)。其餘 disabled-affordance patterns 全部 correct per H4。

---

## §3 Visual identity verify(F1.4 — `styles.css` audit)

`references/design-mockups/styles.css` (lines 1-86) tokens vs `frontend/lib/theming/tokens.ts`:

| Token | Light value | Dark value | Match with `tokens.ts`? |
|---|---|---|---|
| `--primary` | `oklch(0.20 0.01 285)` | `oklch(0.95 0.005 285)` | ✅ Warm Charcoal per ADR-0015 W12 D2 |
| `--accent` | `oklch(0.65 0.18 25)` | `oklch(0.68 0.16 25)` | ✅ Coral Accent per ADR-0015 W12 D2 |
| `--background` | `oklch(1 0 0)` | `oklch(0.18 0.005 285)` | ✅ pure white / warm-neutral dark |
| `--foreground` | `oklch(0.15 0 0)` | `oklch(0.95 0 0)` | ✅ near-black / near-white |
| `--muted` | `oklch(0.96 0 0)` | `oklch(0.25 0.005 285)` | ✅ |
| `--border` | `oklch(0.92 0 0)` | `oklch(0.30 0.005 285)` | ✅ |
| `--success` | `oklch(0.65 0.16 145)` | `oklch(0.70 0.18 145)` | ✅ green |
| `--warning` | `oklch(0.78 0.16 80)` | `oklch(0.80 0.18 80)` | ✅ yellow |
| `--destructive` | `oklch(0.57 0.22 25)` | `oklch(0.62 0.24 25)` | ✅ red |
| **`--info`** | `oklch(0.62 0.13 240)` | (same — uses light value)| 🟡 **NEW token** not present in `tokens.ts` `frontend/lib/theming/`,but reasonable extension(blue for info banners) — Wave A standardize:add to `tokens.ts` |
| `--radius-sm` / `--md` / `--lg` | 0.25rem / 0.5rem / 0.75rem | (same) | ✅ per ADR-0015 spec(sharper than Dify default) |
| `--font-sans` | Inter | Inter | ✅ |
| `--font-mono` | JetBrains Mono | JetBrains Mono | ✅ |
| `--density-row` | 44px(comfortable default)| (same) | NEW — prototype `[data-density="compact|comfy"]` overrides this — `compact: 36px` / `comfy: 52px`。Wave A:**recommend NOT shipping density toggle in Tier 1**(prototype design-time only);real `frontend/` can absorb via `density: 'compact' | 'comfortable'` prop on data tables if needed,but not as user-facing toggle |
| `--ring` | `oklch(0.65 0.18 25)` | (same coral)| ✅ ring uses accent for focus state |

**Hardcoded color audit**:
- `[oklch(`-prefix hardcoded values in components:**4 occurrences found** in `ekp-page-kb-extras.jsx`(ImageCard color cycle:`oklch(0.62 0.13 200)` + `oklch(0.65 0.14 145)` + `oklch(0.60 0.16 285)` + `oklch(0.65 0.18 25)`) and `ekp-page-doc-detail.jsx` ImageThumb same cycle。These are **synthetic color cycles for distinguishing thumbnail placeholders**,not brand violations。Real `frontend/` impl should use ImageRef.blob_url with real images — placeholder colors gone。
- Dark mode badge text override(`oklch(0.85 0.15 80)`/`oklch(0.75 0.13 240)`/`oklch(0.72 0.18 25)`)— acceptable per oklch convention,not arbitrary hex
- Code-block syntax highlight tokens(`tk-key` / `tk-str` / `tk-num`)— reasonable extension,not in `tokens.ts` but stylistic only

**Conclusion**:**Tokens match**;**`--info` is the only NEW token** to add to `frontend/lib/theming/tokens.ts` in Wave A。**No Dify color leak**(per H3 — no Dify primary blue / Dify logo)。`[oklch(...)]=0` hardcoded milestone preserved at the **`frontend/` level**;prototype's color-cycle placeholders are mockup-only and don't ship。

---

## §4 Mock data shape match(F1.5 — `ekp-data.jsx` audit)

Sampled 10 mock data shapes against `backend/api/schemas/*.py`:

| Mock shape | Real schema(grep `backend/api/schemas/`)| Match? |
|---|---|---|
| `MOCK_KBS[i]` | `KbStatus`(kb_id / name / description / config{embedding_model + embedding_dimension + chunk_strategy + default_top_k + default_rerank_k} / total_documents / total_chunks / total_screenshots / failed_documents[] / last_indexed_at / storage_size_mb / index_name / recall_at_5 / status / owner / tags + indexing_progress when status=indexing)| ✅ shape complete |
| `MOCK_DOCUMENTS[i]` | `Document`(doc_id / title / source / file_type / size_kb / pages / chunks / screenshots / status / indexed_at / chunk_strategy / language + failed: error + failed_at)| ✅ matches |
| `MOCK_CHUNKS[i]` | `ChunkRecord`(chunk_id / doc_id / doc_title / chunk_title / chunk_index / section_path / score / source[BM25 / Vector / BM25+Vector] / rerank_delta / chunk_text_preview / embedded_images)| ✅ matches per ADR-0021(`source` field added W15 D5 per HybridSearcher mode param) |
| `MOCK_IMAGES[i]` | `ImageRef`(sha256 / blob_url / alt_text / width / height / size_kb / used_in_docs[] / used_in_chunks[] / doc_order / type / low_value + dedup_savings + extracted_at)| ✅ per `ingestion/screenshots/extractor.py` SHA256 dedup |
| `MOCK_TRACE` 9 stages | `TraceDetail` + `TraceStage`(name / type[SPAN|GENERATION] / latency_ms / cost_usd / model / input_tokens / output_tokens / status / details{})| ✅ exact 9-stage spec match(Query Preprocessor / Query Rewriter / Hybrid Retrieval / Reranker / CRAG Confidence Judge / Re-retrieve / Context Expander / LLM Synthesis / Final Response)— per §5.7 + ADR-0020 |
| `MOCK_EVAL_REPORT` | `EvalReport`(eval_set_id / eval_set_size / recall_at_5 / faithfulness / answer_relevancy / context_precision / context_recall / p95_latency_ms / crag_trigger_rate / avg_cost_per_query_usd / finished_at)| ✅ RAGAs 4-metric + W17 F3 integration |
| `MOCK_SHOOTOUT` 7 rerankers | `ShootoutReport` + `RerankerShootoutEntry`(reranker / recall_at_5 / faithfulness / answer_relevancy / p95_latency_ms / avg_cost_per_query_usd / locked / locked_reason / delta / baseline / skipped / skip_reason)| ✅ per ADR-0012 production lock + W6 D1 LIVE reaffirm faith Δ -11.76pp |
| `MOCK_FAILED_QUERIES[i]` | `FailedQuery`(query_id / query / expected / got / metric_failed[])| ✅ |
| `MOCK_RECENT_QUERIES[i]` | derived from `TraceDetail`(id / at / user / kb / q / latency_ms / cost / crag / trace_id)| ✅ — but **no real backend source yet**(Q6 OPEN per session-start §9)— F2 backend gap will identify `/recent-queries` cache endpoint as MISSING |
| `MOCK_COST_SUMMARY` | `CostSummary`(total_projected_daily_usd / total_projected_monthly_usd / realtime_total_usd / realtime_window_hours / rows[service / component / projected / source] / alerts[])| ✅ per `backend/observability/realtime_cost.py` W10 D3 + W11 D1 pricing rate Option B |
| `MOCK_CONVERSATIONS[i]` | **NO matching schema** — `Conversation` doesn't exist in `backend/api/schemas/`(Beta+ scope per C10 §7) | 🟡 **F2 backend gap**:`/conversations` CRUD endpoint group needed for ADR-0031 candidate(Chat History sidebar) |
| `MOCK_DOC_DETAIL` outline | **NO matching schema** — `DocumentDetail` with `outline[]` doesn't exist;`backend/api/routes/documents.py` only returns chunks list | 🟡 **F2 backend gap**:`GET /kb/{kb_id}/docs/{doc_id}` with `outline` + `total_chunks` + `total_images` + `parse_duration_ms` + `embed_duration_ms` needed for ADR-0029 |
| `MOCK_CHUNKING_COMPARISON` | **NO matching schema** — chunking preview endpoint doesn't exist | 🟡 **F2 backend gap**:`POST /chunking-preview` with strategy + chunk_size + overlap + sample_doc_id needed for ADR-0025 Chunking Lab tab |
| `MOCK_USERS[i]` + `ROLES` + `PERMISSIONS_MATRIX` | **NO matching schema** — RBAC tables不存在 | 🔴 **F2 backend gap MASSIVE**:`users` / `roles` / `role_permissions` / `groups` / `group_members` / `audit_log` Postgres tables + RBAC middleware needed for ADR-0027(option A or C only) |

**Conclusion**:**Mock shapes for existing schemas match very precisely**(KB / Document / Chunk / Image / Trace / Eval / Shootout / Cost) — prototype 對 backend Pydantic schema awareness very high。**3 mock data 結構 NO backend yet**(Conversation / DocumentDetail outline / ChunkingComparison)+ **1 massive新 schema family**(RBAC)— 全部 feed F2 backend gap map。

---

## §5 Tweaks panel design-time confirmation(F1.3)

`tweaks-panel.jsx`(568 lines)host protocol verified:
- `useTweaks(defaults)` — single source of truth for tweak values + `setTweak` posts `__edit_mode_set_keys` to `window.parent`(host rewrites EDITMODE block on disk)
- `<TweaksPanel>` registers `__activate_edit_mode` / `__deactivate_edit_mode` listener BEFORE announcing `__edit_mode_available` to host
- Control palette:`TweakSlider` / `TweakToggle` / `TweakRadio` / `TweakSelect` / `TweakText` / `TweakNumber` / `TweakColor` / `TweakButton`
- Floating panel with drag(`onMouseDown`)+ viewport clamp(`ResizeObserver`)+ close button(posts `__edit_mode_dismissed`)
- Density mode switching via tweak — controls `[data-density="compact|comfy"]` on `<body>` 影響 `styles.css` 嘅 `--density-row` + `--density-pad`

**Conclusion**:✅ **Pure design-time tool**,**NOT shipping to `frontend/`**。Wave A docs note:`/dashboard` 嘅 floating「Tweaks」button(在 prototype 開啟 panel)是 mockup-only,real app 無 floating panel。Density toggle decision per §3 — don't ship as user-facing toggle in Tier 1。

---

## Appendix A — Audit method

5 parallel Read-tool batches over 22 files(11K lines):
- Batch 1:foundation(`ekp-shell.jsx` + `ekp-data.jsx` + `styles.css` + `tweaks-panel.jsx` + `icons.jsx`)
- Batch 2:KB cluster(`ekp-page-dashboard.jsx` + `ekp-page-kb.jsx` + `ekp-page-kb-extras.jsx` + `ekp-page-kb-new.jsx`)
- Batch 3:Views(`ekp-page-doc-detail.jsx` + `ekp-page-misc.jsx` + `ekp-page-chat.jsx` + `ekp-page-eval.jsx`)
- Batch 4:Platform(`ekp-page-trace.jsx` + `ekp-page-settings-tabs.jsx` + `ekp-page-users.jsx` + `ekp-page-auth.jsx`)
- Batch 5:Labs(`ekp-page-labs-1.jsx` + `ekp-page-labs-2.jsx` — sampled first 150 lines + LabsHeader pattern,confirmed Tier 2 holding)

Spec grep verification(per CO_W14_process_grep_verify):
- ADR-0024 §5.0 / §5.5 / §5.5.3 / §5.5.2 / §5.5.4 / §5.6 / §5.7 / §5.10 / §5.11 — all cross-referenced inline above
- `frontend/lib/theming/tokens.ts` — `--info` NEW token confirmed via grep absence
- `backend/api/schemas/*.py` — KbStatus / TraceDetail / EvalReport / RerankerShootoutEntry / ChunkRecord / ImageRef confirmed present;Conversation / DocumentDetail / ChunkingComparison / RBAC全 confirmed absent

---

**Next deliverable**:F2 Backend gap map(per route × endpoint × schema)— feeds into F3 ADR drafts + F4 Wave breakdown。
