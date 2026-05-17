# EKP Page Inventory

> Every route in the prototype, mapped to the Component Catalog (`docs/02-architecture/COMPONENT_CATALOG.md`) and to Tier 1 vs Tier 2 status. Use this as the implementation checklist when building real Next.js components.

---

## Tier 1 — Active (Beta launch scope)

| # | Route | File | Component slot | Tier 1 status | Backend schema |
|---|-------|------|---------------|---------------|----------------|
| 1 | `/dashboard` | `ekp-page-dashboard.jsx` | C09 §5.3 (W18 NEW) | ✅ **Implemented W20 F2** — 4-stat strip + 5 cards (KB summary / recent-query CTA / latest-eval CTA / per-component health dots / quick actions); backend `GET /health` extracted + extended payload | `KbStatus`, `CostSummary`, `EvalReport`, `HealthResponse` |
| 2 | `/chat` | `ekp-page-chat.jsx` | C10 §5.2 + W3 D4 streaming | ✅ **Implemented W20 F3b** — server-side Conversation History pane (per ADR-0031 Option B, promotes §7 Tier 2 → Tier 1) + 3 citation placement modes (inline / footnote / sidebar) + image gallery + `<CitationPill>` popover + `<FeedbackBar>` thumbs + `<CragStrip>` (Wave B+ dormant); SSE persistence shim best-effort | `QueryResponse`, `Citation`, `ImageRef`, `FeedbackRequest`, `Conversation`, `Message` |
| 3 | `/kb` | `ekp-page-kb.jsx` `PageKbList` | C09 §5.4 | ✅ **Implemented W20 F4.3** — grid + table view toggle via `localStorage['ekp-kb-list-view']` + status filter (All / Indexed / Empty / Degraded) | `KbStatus` |
| 4 | `/kb/new` | `ekp-page-kb-new.jsx` | C09 §5.4 + C02 POST /kb | ✅ **Implemented W20 F4.4** — 5-step wizard (Source / Parsing / Chunking / Multimodal / Review) per ADR-0028; Multimodal step ships 4 Tier 1 toggles active + 3 Tier 2 `<DisabledAffordance variant="p3-preview" showBadge>` | `KbCreate`, `KbConfig` (W20 F4.1 +4 multimodal fields) |
| 5 | `/kb/[id]` | `ekp-page-kb.jsx` `PageKbDetail` | C09 §5.5 (8 tabs) | ✅ **Implemented W20 F5 — 7-tab `-Access` Wave A scope per ADR-0025**: Documents · Chunks · Images NEW · Chunking Lab NEW · Pipeline · Retrieval Testing · Settings (Settings Danger zone Archive landed). **Access tab disabled affordance Tier 1.5** — Wave C1 activates per ADR-0027 Option A RBAC infra. | `KbStatus` (W20 F5.1 +archived flag), `ChunkRecord`, `ImageRef` (W20 F5.2 aggregation), `KbMetadataPatch` |
| 6 | `/doc-detail/[kbId]/[docId]` | `ekp-page-doc-detail.jsx` | C09 §5.5.2 chunk inspector | ⏳ Wave B candidate (W21+) per ADR-0029 Option C `/kb/[id]/docs/[docId]`. 3-pane: outline / chunks / inspector | `ChunkRecord`, `ImageRef` |
| 7 | `/kb-upload/[id]` | `ekp-page-misc.jsx` `PageUploadWizard` | C09 §5.5.3 Pipeline Wizard | ✅ **Implemented W20 F6** (actual route `/kb/[id]/upload`) — single-step → 3-step wizard skeleton per ADR-0028 §5.5.3b: Source (file picker) → Multimodal (read-only display per KB config + Tier 2 disabled affordances + "Edit settings" link to per-KB Settings) → Review (summary + 1-stage Stage progress) | `IngestionResult`, `FailureRecord`, `KbStatus` (read for config snapshot) |
| 8 | `/eval` | `ekp-page-eval.jsx` | C09 §5.6 Eval Console | ⏳ Wave B candidate (W21+). RAGAs 4-metric + Reranker Shootout + Failed queries + CRAG insights | `EvalReport`, `ShootoutReport`, `RerankerShootoutEntry` |
| 9 | `/traces` | `ekp-page-trace.jsx` `PageTracesList` | C09 §5.7 trace list | ⏳ Wave B candidate (W21+) per ADR-0030 absorb split (Dashboard part = Wave A landed; Trace / `/traces` parts = Wave B) | recent queries derived from `TraceDetail` |
| 10 | `/traces/[traceId]` | `ekp-page-trace.jsx` `PageTrace` | C09 §5.7 + ADR-0020 V6 9-stage | ⏳ Wave B candidate (W21+). 3 viz modes (vertical / waterfall / flame). | `TraceDetail`, `TraceStage` |
| 11 | `/settings` | `ekp-page-settings-tabs.jsx` `PageSettingsRich` | C09 §5.0 (W18 NEW) **expanded** | ⏳ Wave C candidate (W22+) per ADR-0026 Option B fully editable. **6 tabs**: Profile · Appearance · Connections · Identity & Auth · API Keys & Quotas · Account. Replaces `.env` hardcoded credential management. | (UI-driven config; persisted in Azure Key Vault — Wave C dep) |
| 12 | `/users` | `ekp-page-users.jsx` | C11 Identity (Beta+) + Tier 1.5 hook | ⏳ Wave C1 candidate (W22+) per ADR-0027 Option A full RBAC. **4 tabs**: Members · Roles & permissions · Groups · Audit log. Tier 1 has 3 roles (Admin / Editor / User); Power User = Tier 2. **Activates `/kb/[id]` Access tab** at Wave C1 ship. | (planned — `users` + `audit_log` Postgres tables) |
| 13 | `/login` | `ekp-page-auth.jsx` `PageLogin` | §5.10 + ADR-0022 hybrid auth | ✅ **Implemented W20 F7.1** strict-fidelity refactor per mockup — SSO primary (Microsoft logo button at top, brand-asset exemption per ADR-0015 §3) + Divider "OR continue with email" + email/password secondary + Forgot password inline next to Password label via shared `<DisabledAffordance variant="p3-preview" showBadge>` + bottom mono dashed "Auth modes (Tier 1)" `<aside>` block. Mock-auth-default dev reality unchanged. | `LoginRequest`, MSAL flow |
| 14 | `/register` | `ekp-page-auth.jsx` `PageRegister` | §5.11 + C13 Email Verification | ✅ **Implemented W20 F7.2** visual polish — field reorder (Full name → Email → Password → Confirm), Hint copy specificity, NEW Terms of Use + Privacy Policy checkbox (required), Step 3 KB selector migrated to shared `<DisabledAffordance>`. Backend contract preserved (3-step + 6-digit code per ADR-0014 — mockup's 2-step email-link conflicts with backend, resolved per CLAUDE.md §4 authority ordering = backend wins). | `RegisterRequest`, C13 ACS email |
| - | Cmd+K palette | `ekp-shell.jsx` `CommandPalette` | ADR-0024 W18 NEW GlobalSearch | ✅ Implemented W18 F6 (`<GlobalSearch>` component). Pages + KB names + "Ask in chat" deep-link | — |
| - | Topbar dropdowns | `ekp-shell.jsx` | C09 AppShell W18 polish + W20 F1 NotificationsMenu | ✅ **Implemented W20 F1** — `<NotificationsMenu>` (`<Bell>` trigger + counter badge + MOCK_NOTIFICATIONS fallback) + Workspace switcher Tier 2 disabled affordance (W19 §2.3 leak fix) + Language toggle migrated to shared `<DisabledAffordance>` | (Notifications: planned per-user feed — Wave B+ when backend lands) |

### Tier 1 routes per ADR-0024 9-view baseline + extensions

The spec's 9 routes (ADR-0024) are routes #1–#5, #7–#11, #13–#14. Beyond those, the prototype adds:
- **#4 `/kb/new`** — extracted from `/kb`'s "New KB" button as its own wizard route. Equivalent feature; cleaner UX.
- **#6 `/doc-detail/...`** — equivalent to spec's `/admin/kb/[id]/chunks/[doc_id]` per C09 §5.5.2.
- **#12 `/users`** — **net new** Tier 1.5 surface. Spec only mentioned RBAC as a Tier 2 hook; the prototype designs the full Members + Roles & Permissions matrix + Audit log surface ahead of implementation.

---

## Tier 1 + Tier 2 mixed routes (page contains both)

| Route | Tier 1 (active) | Tier 2 (preview, badged) |
|-------|-----------------|--------------------------|
| **`/kb/new` Step 3 Multimodal** | Embedded images extraction (Docling + python-pptx) · SHA256 dedup · "Off — use source alt_text only" captioning · Render images inline in chat | Vision captioning (GPT-5.5 Vision, Azure DI) · Slide screenshots for .pptx · Render PDF pages · low_value image filter · Perceptual hash dedup |
| **`/kb/[id]` Access tab** | Per-KB Visibility (Private / Workspace) · Member/group ACL · Workspace-role + per-KB-role override | Public visibility · Anonymous API key |
| **`/users` Roles tab** | 3 roles (Admin / Editor / User) + permissions matrix | Power User role · Custom role creation |
| **Settings → Identity & Auth** | Entra ID tenant + App reg + MSAL config + 3 role mappings | Power User mapping · Distributed token cache (Redis) · Custom roles |
| **Settings → Connections** | All current `.env` services (Azure OpenAI, Cohere, Azure AI Search, Blob, Postgres, Langfuse, ACS, Key Vault, Container Apps) wireable | "Add provider" custom integration |

---

## Tier 2 — Preview (Labs section)

All Labs pages carry a top-level "TIER 2 PREVIEW · NOT IMPLEMENTED" banner with a Component Catalog slot citation.

| Route | File | Plugs into (per COMPONENT_CATALOG §6) |
|-------|------|----------------------------------------|
| `/labs-graph-rag` | `ekp-page-labs-1.jsx` | C04 Retrieval (graph traversal mode) + C01 Ingestion (entity/relation extraction) |
| `/labs-agents` | `ekp-page-labs-1.jsx` | C05 Generation (L4+ orchestration layer; interface unchanged) |
| `/labs-languages` | `ekp-page-labs-1.jsx` | C01 (per-language analyzer) + C04 (cross-lingual semantic config) + C09 (i18n routing) |
| `/labs-voice` | `ekp-page-labs-1.jsx` | C10 Chat extension (Web Speech API + Azure Cognitive Services Speech) |
| `/labs-finetune` | `ekp-page-labs-2.jsx` | New C14 Training Pipeline + C05 swap deployment_name |
| `/labs-workflows` | `ekp-page-labs-2.jsx` | New C15 Workflow Engine + C09 hosts canvas editor |
| `/labs-personalization` | `ekp-page-labs-2.jsx` | C04 Retrieval (ranking boost) · per-user state in Postgres |
| `/labs-tenancy` | `ekp-page-labs-2.jsx` | C02 + C03 (tenant_id prefix) + C11 (tenant claim) |

---

## Implementation priority (suggested)

When the team picks up the real Next.js implementation, build in this order:

**Wave A — already largely scaffolded in `frontend/`:**
1. `/dashboard` (W18 NEW — replace v0 thin overview)
2. `/chat` polish (add Conversation History sidebar + Feedback widget + inline image cards)
3. `/kb` + `/kb/[id]` 8-tab detail
4. `/kb/new` 5-step wizard (Multimodal step exposes the real multimodal pipeline)

**Wave B — also Tier 1, smaller surface:**
5. `/doc-detail/[kbId]/[docId]` 3-pane
6. `/eval` Eval Console + Reranker Shootout
7. `/traces/[traceId]` 9-stage Debug View (3 viz modes — start with vertical)

**Wave C — Tier 1 platform plumbing:**
8. `/settings` 6-tab hub (Connections + Identity & Auth replace `.env`)
9. `/users` 4-tab user management (depends on RBAC server-side)
10. `/login` + `/register` polish (MSAL flow + verify-email)

**Wave D — Tier 2 (post-W12 evaluate one at a time):**
11. Pick from `/labs/*` as roadmap items resolve.

---

## What's NOT in the prototype (correctly omitted)

- GraphRAG, Multi-agent, Multi-language JP/ZH (beyond disabled affordance), Voice, Custom fine-tune, Workflow builder, Per-user personalization, real multi-tenancy — all marked Tier 2 in `/labs/*`, never surfaced as if active.
- Power User role — present in role-matrix table but disabled.
- Public KB visibility — disabled radio in KB Access tab.
- Anonymous API keys — disabled in Settings → API Keys section.
- Perceptual-hash dedup — disabled select option in KB new wizard.

When implementing, respect these boundaries — surface them as **disabled affordance with "Tier 2" badge**, not as missing UI. Per ADR-0024 the pattern is "present-but-disabled".

---

## How AI assistants should use this

1. **Read this file and `DESIGN_README.md` first** before touching any UI code in `frontend/`.
2. **Open the prototype** (`EKP Platform.html`) — click into the page you're about to implement.
3. **Inspect the corresponding `ekp-page-*.jsx`** — it shows component structure, state shape, and content choices.
4. **Cross-reference the backend schema** (`backend/api/schemas/*.py`) — the prototype mock data already matches these shapes.
5. **Build with shadcn/ui + Tailwind** in `frontend/` — do not copy the prototype's stripped components. Match the layout, density, and information architecture.
6. **Preserve the Tier 1 / Tier 2 boundary** — never silently promote a Tier 2 feature to "active" without an ADR.
