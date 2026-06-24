# W93 — Enterprise RBAC P3b:群組繼承 implementation(G7)

| 項目 | 值 |
|---|---|
| Phase | W93-rbac-p3b-group-inheritance(enterprise RBAC track 第 6 期,P3 implementation 第 2 段 = P4 群組) |
| Status | **active**(2026-06-24 用戶批准開 W93 P3b) |
| Tier | Tier 1.5(per ADR-0067 DG-P3-C;手動 admin group member,真 SCIM = Tier 2) |
| 依賴 | **ADR-0067 Accepted**・ P3a(W92,doc_acl override,commit `041813b`)・ P2（`allowed_principals` filter）・ W24c F6（`groups` + `group_members` 表已存在） |
| 錨點 | **ADR-0067** §Decision 3（DG-P3-B 手動 admin group member + `principals_for_user` async 展開）・ [`../W91-rbac-p3-doc-acl-design/target-architecture-p3.md` §3](../W91-rbac-p3-doc-acl-design/target-architecture-p3.md) |
| 粗估 | 中（backend-only） |
| 下一期 | P3 完成；後續候選 = kb_acl-change-restamp 遺留補完 / frontend group 管理 UI（H7）/ 真 SCIM（Tier 2）/ 其他軌道 |

> **本 plan 受 ADR-0067(Accepted)約束**。**關鍵設計性質**:chunk 存 group **key** 非 member oid → **群組成員加減 = 純 query 側 `principals_for_user` 展開 → 零索引 re-stamp**（F1 §3 洞察）。沿用 P2/P3a 機制，零新索引欄位。

---

## §1 目標(Why)

實作 ADR-0067 §Decision 3（G7 群組繼承）:令 `kb_acl` / `doc_acl` 嘅 `principal_type="group"` grant **真正落地到 member**。現狀 `principals_for_user` 只返 `[oid]` 無展開（`group_members` 表 W24c F6 已建但**無寫方法**）→ group grant 形同虛設。

P3b = ① `group_members` 寫方法（手動 admin 管理，DG-P3-B）② `principals_for_user` 改 async + 展開 `[oid] → [oid] ∪ {user 所屬 group_key}` ③ group member 管理 API。

## §2 Deliverables(F1–F4,backend-only)

| # | Deliverable | Acceptance |
|---|---|---|
| **F1** | `RbacBackend` group_members 寫方法 | Protocol + InMemory + Postgres：`add_group_member(group_key, user_oid)` upsert / `remove_group_member(...)` / `list_group_members(group_key)` / **`list_groups_for_user(user_oid) -> list[str]`**（核心：user → 所屬 group keys）；單元測試 |
| **F2** | group member 管理 API | `POST /groups/{group_key}/members`（grant，body user_oid）+ `DELETE /groups/{group_key}/members/{user_oid}`（revoke）；`require_role("admin")` 守衛；測試 403/CRUD |
| **F3** | `principals_for_user` async 展開 | `acl.principals_for_user` 由 sync 改 **async + rbac_backend**：非 admin → `[oid] + list_groups_for_user(oid)`；admin → None；rbac None → `[oid]`（degrade）。`query.py` 2 call site（query + query_stream）改 `await` + 傳 rbac_backend。**不改下游 11 層 `user_principals: list[str]` threading**。測試展開正確 + admin None |
| **F4** | Gate | RBAC/retrieval pytest 全綠 + ruff + mypy（改動檔自身 0 error）+ **north-star §15 不退**（無 group member → `principals_for_user` = `[oid]` byte-identical P2；drive-images-1 eval 以 admin 跑 bypass → no-op） |

## §3 Phase Gate
- **G-F1** group_members CRUD + `list_groups_for_user` 正確
- **G-F2** API admin 守衛 + CRUD
- **G-F3** `principals_for_user` 展開（member → group key 入 principals）+ **BC**（無 member byte-identical `[oid]`）+ 下游 threading 不變
- **G-全** pytest 全綠 + ruff + mypy + north-star §15 no-op

## §4 Risks
- 🟡 **`principals_for_user` 改 async**（F3）：2 call site（query/query_stream）改 await + 傳 rbac_backend。**BC 關鍵**：無 group member → `[oid]`，下游 11 層收 `list[str]` 不變。測試守。
- 🟢 **零 re-stamp**（核心性質）：member 加減純 query 側，索引零改動。
- 🟡 **group grant 對既有 chunk**：新 group grant 到 kb_acl 後，**既有 chunk 未 restamp**（kb_acl-change-restamp 遺留，§5）→ 新 group 對既有文件需 reindex 或留待遺留補完；新 ingest 即生效（resolve 帶 group key）。本期不解此遺留。
- 🟢 **backend reload=False**：live 驗證前確認 backend 啟動時間，否則 pytest 為準。

## §5 Out of scope(留後期)
**`get_kb_access` KB-level group resolution**（令「只靠 group 取得 **KB 層**存取、無直接 user grant」嘅 user 過 `assert_kb_access` guard）= **follow-up**（F3 think-before 發現,§6 changelog）。本期 F3 只做檢索 filter 側 group 展開（主用例 = doc_acl group refine 文件可見度,user 已有直接 KB 存取）。**kb_acl-change-restamp 遺留**（ADR-0067 §Decision 4：kb_acl ingest 後改未 restamp 既有 chunk）= 後續 phase（範圍大 — restamp KB 內所有繼承文件，需跳過 doc_acl override）。Frontend group member 管理 UI = **H7**（視 `/groups` mockup 有無 member 管理；無 → design-stage expansion）。真實 SCIM/Entra member 自動同步 = **Tier 2**。

## §6 Changelog
| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-24 | P3b kickoff — P3a 落地後 rolling JIT；用戶批准開 W93；scope = group 繼承 backend（member 寫 + principals 展開 + API），kb_acl-restamp 遺留 + frontend 延後 | 開工 |
| 2026-06-24 | **think-before scope 釐清(R3）**:F3 group 展開只做**檢索 filter 側**（`principals_for_user`）。發現 **`get_kb_access`（KB-level guard，`assert_kb_access` 用）只認 user-type grant,唔 resolve group** → 「只靠 group 取得 **KB 層**存取」嘅 user 會喺 KB guard 403。**但 P3b 主用例唔受影響**:doc_acl grant group → user 已有直接 KB 存取（過 guard），group 只 refine **文件層**可見度（檢索 filter）→ F3 已足夠。**KB-LEVEL group 存取**（`get_kb_access` resolve group，令「只 group 無直接 grant」嘅 user 過 KB guard）= **documented follow-up**（§5），非本期 scope。理由:P3 = 細粒度（doc-level + group refine），KB 層 group 存取屬較粗功能，可後補；本期聚焦檢索 filter 群組繼承 | F3 think-before |
