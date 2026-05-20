---
phase: W24c-users-rbac
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active                      # active | closed
---

# W24c-users-rbac — Progress

## Day 0 — 2026-05-21 — Kickoff cascade(F0)

### Done

- **W24c phase folder created** — `docs/01-planning/W24c-users-rbac/{plan,checklist,progress}.md` `status: active`
- **Phase scope** — ADR-0027 **Option A full RBAC**(Chris W19 F6 pick over Option B minimal recommendation):`/users` Tier 1.5 NET NEW 4-tab surface(Members / Roles / Groups / Audit log)+ per-KB ACL + 5 NEW Postgres tables + ACL middleware + Entra Graph SDK + `/kb/[id]` Access tab activation per ADR-0025。F0-F12 deliverables(largest W-series phase,~20 backend days)。
- **Wave lineage** — Wave C3 per W19 F4 §3.6 SPLIT:Wave C1 = W24 ADR-0026 Settings backend + read-mostly;Wave C2 = W24b ADR-0026 Settings depth;**Wave C3 = W24c ADR-0027 RBAC**(this phase)。
- **F0 pre-active-flip 5-step grep audit recursive**(per CLAUDE.md §10 R6)— 讀 ADR-0027 + ADR-0025 + glob `ekp-page-users.jsx` / `backend/api/auth/users*` / `backend/api/middleware/` / `frontend/app/(app)/users/`:
  - **(2) grep** — `references/design-mockups/ekp-page-users.jsx` 存在(`PageUsers` 4 tabs + `TabKbAccess` lines 390-519);`backend/api/auth/{users_store,postgres_users_store,users_repo}.py` 存在(`users` table per ADR-0023);`backend/api/middleware/` 有 `audit_log.py` + `rate_limit.py`(NEW `acl.py` 需建);`frontend/app/(app)/users/` 不存在(`/users` route NET NEW)
  - **(3) surface** — **R6 finding**:ADR-0027 §Decision Option A 寫「6 NEW Postgres tables(`roles` + `role_permissions` + `groups` + `group_members` + `audit_log` + `kb_acl`)」,但 `audit_log` table **已存在**(W24-c1 F4 ADR-0026 created + W24b F6 加 filter/pagination)→ W24c F2 實際 = **5 NEW tables**,`audit_log` 由 F7 **EXTEND**(additive `AuditAction` Literal append)非 create
  - **(4) document** — plan §7 Day 0 row + F2/F7 acceptance reflect 5-NEW-not-6
  - **(5) adjust** — plan §2 F2 = 5 tables;F7 = audit_log EXTEND;checklist F2.1 = 5 tables
- **F0 kickoff cascade committed** `(this commit)`

### Decisions

- **D0.1 — W24c = single phase 非 further-split** — ADR-0027 Option A ~20 backend days。W19 F4 §3.6 SPLIT 係指 Wave C(ADR-0026 + ADR-0027 combined ~42 days)split 做 sub-phases — ADR-0026 已拆 W24(C1)+ W24b(C2);ADR-0027 本身係 Wave C 餘下工作,ADR 無進一步要求拆。W24c = ADR-0027 Option A 一個 phase,F0-F12(12 deliverables);F-deliverable 喺 active-flip 按實際 scope sub-split per §7 R3(rolling JIT — 唔預拆 W24c/W24d)。
- **D0.2 — `audit_log` table EXTEND 非 create**(R6 finding)— ADR-0027「6 NEW tables」其中 `audit_log` 已係 W24-c1 ADR-0026 既有 table。W24c 唔重建,F7 additively extend `AuditAction` Literal 加 RBAC action types。避免 schema double-ownership conflict — risk R-W24c-4 mitigated。
- **D0.3 — C16 Users Service vs C11 expansion = F1 decision** — ADR-0027 §Decision Option A 明文 leave open「New Cn:C16 Users Service(or fold into C11)」。F0 唔強行決定;F1.3 evaluate(~20 days + 5 tables + ACL middleware + Entra Graph SDK weight)後 log plan §7 + COMPONENT_CATALOG。
- **D0.4 — Entra Graph SDK H2 pre-cleared** — CLAUDE.md §5.2 H2 加新 dependency 要 STOP and ask + ADR。ADR-0027 **已 Accepted**(W19 F6 Chris pick)且明文列「Entra Graph SDK new dependency(H2 trigger)」→ H2 4-step 已滿足(ADR documents + Chris approved)。F1 install 跟 ADR-0017 Plan B sequencing,**無需 fresh stop-and-ask**;若 install R8-fail 至 Plan B (c)則 ADR-0017 amendment occurrence #9。

### Acceptance(plan §3 + checklist F0)

- [x] F0.1 W24c folder 3 docs created status: active
- [x] F0.2 NO frontend/backend code change at kickoff
- [x] F0.3 architecture.md §3.7 amendment deferred to F1
- [x] F0.4 Pre-active-flip 5-step grep audit recursive completed + documented
- [x] F0.5 W24c kickoff cascade committed

**Day 0 F0 Verdict**:F0 complete — W24c-users-rbac phase folder + plan(§0-§7,F0-F12 deliverables)+ checklist + progress landed `status: active`。ADR-0027 Option A full RBAC scope locked。R6 audit surfaced `audit_log`-already-exists(5 NEW tables 非 6)。F1 spec amendment + Entra Graph SDK install next。

---

## Day 1 — 2026-05-21 — F1 Spec amendment + Entra Graph approach + C16 decision

### Done

- **F1 pre-active-flip 5-step grep audit recursive**(per CLAUDE.md §10 R6)— 讀 `architecture.md §3.7` + §5 region + `backend/pyproject.toml` + `COMPONENT_CATALOG.md` C08-C12 cards:
  - **(2) grep** — `architecture.md §3.7` 實為「C13 Email Verification Service」;§3.8 不存在;§5 有 3 個 `> **Amendment**` inline block(ADR-0024 line 752 / ADR-0026 line 754 / ADR-0025 §5.5 line 887);`pyproject.toml` 有 `azure-identity>=1.20` + `httpx>=0.27`(W24-c1),**無 `msgraph`**;COMPONENT_CATALOG component cards C08-C12,C13 無 full card(per-component section 收喺 C12 後)
  - **(3) surface** — 2 findings + 1 decision(plan §7 Day 1 row)
  - **(4) document** — plan §7 Day 1 changelog row landed
  - **(5) adjust** — F1.1-F1.2 amendment 落 §5;F1.4 install no-op;F1.3 = C16 NEW
- **F1.1-F1.2** `architecture.md v6 §5.0` 加 NEW `> **Amendment(/users Tier 1.5 RBAC + Access tab activation)**` inline block — RBAC「Tier 2 hook」→「Tier 1.5 minimum」+ `/users` 4-tab(Members / Roles & permissions / Groups / Audit log)+ per-KB ACL `TabKbAccess` + `/kb/[id]` Access tab activation;4 triggers(5 NEW Postgres tables + C16 + ACL middleware + managed-REST `sync-from-entra`);H4 boundary(custom roles + Power User + multi-tenancy = Tier 2);doc version held;ADR-0027 authoritative + §-pointer 更正 note
- **F1.3** C16 vs C11 decision — **pick C16 NEW Users Service**;`COMPONENT_CATALOG.md` 加 `### C16 — Users Service(Tier 1.5)` card(10-row Field/Value table,Status 🟡 W24c active,inserted 在 §4 component cards 段尾 C12 之後)
- **F1.4** Entra Graph approach — **managed-REST**(Chris AskUserQuestion 2026-05-21)— 既有 `azure-identity` token + `httpx` REST call,**no `msgraph-sdk`**;install no-op(deps W24-c1 已在)
- **F1.5** `pyproject.toml` 無 change;F1 無 backend code change(spec + component-registry only)

### Decisions

- **D1.1 — F1.1-F1.2 amendment 落 §5 非 §3.7/§3.8**(R6 finding 1)— ADR-0027 §Decision「amend `architecture.md v6 §3.7` + add §3.8 /users」嘅 §-pointer 錯:`§3.7` = C13 Email Verification Service(v6 amendment per ADR-0014),`§3.8` 不存在。`/users` 係 UI view → 屬 §5 UI Specifications。§5 已有 3 個 ADR-driven `> **Amendment**` inline block precedent(ADR-0024 / ADR-0026 §5.0 + ADR-0025 §5.5)。**Adjust**:amendment 落 §5.0 第 3 個 inline block,對齊 convention。屬 W22 D9「plan-text-contamination」anti-pattern class(ADR draft-time §-numbering 錯,plan F1 inherit)— R6 auto-adjust,established convention 明確故不需 user escalate;ADR-0027 §-pointer 更正 note 寫入 amendment block 自身 + F12 ADR-0027 Implementation Status 會 record。
- **D1.2 — Entra Graph = managed-REST 非 SDK**(R6 finding 2,Chris AskUserQuestion 2026-05-21)— ADR-0027 寫 `sync-from-entra` 用 Entra Graph SDK(明標 new dep / H2 / R8 risk)。但 `azure-identity>=1.20` + `httpx>=0.27` W24-c1 已裝;`sync-from-entra` 本質 = `GET https://graph.microsoft.com/v1.0/groups` 一個 REST call。ADR-0017 §Decision-rule 本身明寫「stdlib > managed-REST > lazy-imported optional dep」。managed-REST(`DefaultAzureCredential` 取 Graph token + `httpx` call)= 零新 dependency / 零 H2 / 零 R8 install risk。Chris pick managed-REST。**Adjust**:F1.4 Entra Graph SDK install 變 no-op;F6 `entra_graph.py` 用 managed-REST helper(lazy `azure-identity` import per ADR-0023 — unset Entra config 唔 touch)。屬 §13「spec 同 idea 衝突 → raise + get approval」— 已 raise + Chris approve。
- **D1.3 — C16 NEW Users Service 非 fold-into-C11**(R6 finding 3 / plan F1.3)— ADR-0027 §Decision Option A leave open「New Cn:C16 Users Service(or fold into C11)」。決定 = **C16 NEW**。Rationale:(a) scope weight ~20 backend days + 5 NEW Postgres tables + ACL middleware = substantial cohesive subsystem;(b) **concern separation** — C11 Identity & Access = *authentication*(MSAL / Entra SSO / token validation),C16 Users Service = *authorization*(RBAC / role enforcement / per-KB ACL / user management)— fold 入 C11 會 overload 一個 authentication component 做埋 authorization;(c) ADR-0027 §Decision Option A 首選 phrasing 就係「C16 Users Service」。C14 / C15 維持 Tier 2 reserved slot(Training Pipeline / Workflow Engine);C16 = 首個 post-C13 Tier 1.5 component。

### Acceptance(plan §3 + checklist F1)

- [x] F1.1 architecture.md §5.0 ADR-0027 inline-amendment block(R6-corrected §3.7→§5)
- [x] F1.2 /users 4-tab + Access tab activation reference 入同一 §5 block(R6-corrected §3.8→§5)
- [x] F1.3 C16 NEW Users Service decision + COMPONENT_CATALOG C16 card
- [x] F1.4 Entra Graph = managed-REST(Chris pick)— no msgraph-sdk install
- [x] F1.5 pyproject.toml 無 change;F1 無 backend code change

**Day 1 F1 Verdict**:F1 complete — `architecture.md v6 §5.0` ADR-0027 inline-amendment block(RBAC Tier 2 hook → Tier 1.5 + `/users` 4-tab + Access tab activation)+ COMPONENT_CATALOG C16 Users Service card。3 R6 findings resolved:§-pointer 更正(§3.7→§5)/ Entra Graph managed-REST(零新 dep)/ C16 NEW component。**Zero new dependency** — ADR-0027 原假設嘅 Entra Graph SDK 經 managed-REST 避免。F2 RBAC schema layer(5 NEW Postgres tables + storage)next。

---

<!-- Day 2+ F2 entries land at F2 active flip per CLAUDE.md §10 R2 -->
