# W93 P3b — Checklist

> 對應 [`plan.md`](./plan.md) §2 F1-F4 + §3 Phase Gate。完成 → `[x]` + progress Day-N。
> 未完項**不可刪**,只 `→ [x]` 或標 🚧 + 理由。
> **約束**:group 繼承以 ADR-0067 §Decision 3 為準;**零索引 re-stamp**（member 加減純 query 側）;沿用 P2/P3a 機制。

## F1 group_members 寫方法(✅)
- [x] `RbacBackend` Protocol 加 4 方法:`add_group_member` / `remove_group_member` / `list_group_members(group_key)->list[GroupMember]` / **`list_groups_for_user(user_oid)->list[str]`**（核心 expansion seam）
- [x] InMemory（`_group_members: dict[str, dict[str, datetime]]` 帶 added_at）+ Postgres（既有 `group_members` 表 INSERT ON CONFLICT DO NOTHING / DELETE rowcount / SELECT,per-op connection）實裝；reset 清 members
- [x] `list_groups` member_count 真實計（InMemory `model_copy` 重算取代 hardcode 0;Postgres 早已 JOIN COUNT）
- [x] 單元測試 `test_group_members.py`(6):add idempotent 保 added_at / remove idempotent / list_groups_for_user 多 group isolation / member_count / reset
- [x] schema:`GroupMember` / `GroupMemberListResponse` / `GroupMemberAddRequest`(`api/schemas/rbac.py`)

## F2 group member 管理 API(✅)
- [x] `GET/POST/DELETE /groups/{group_key}/members`（POST body `{user_oid}` 204 idempotent / DELETE 204|404）,router-level `require_role("admin")`(既有)
- [x] groups.py 加 3 端點 + 復用 `_get_rbac_backend`
- [x] 測試 `test_group_member_routes.py`(3):403 非 admin / add+list+remove(驗 expansion seam) / 404

## F3 principals_for_user async 展開(✅)
- [x] `acl.principals_for_user` sync→**async + rbac_backend**:非 admin → `[oid] + await list_groups_for_user(oid)`;admin → None;rbac None → `[oid]`(degrade)
- [x] `query.py` query + query_stream 2 call site 改 `await principals_for_user(rbac_backend, current_user)`(rbac_backend from app.state)
- [x] **下游不變**:11 層 `user_principals: list[str]` threading 鏈零改
- [x] 測試:`test_acl_middleware.py`(admin None×2 / 無 member [oid] / 展開 group keys / rbac None degrade)+ `test_query_route_acl_trimming.py`(端到端 group key 入 search filter)
- [x] **think-before scope(R3)**:`get_kb_access`(KB guard)只認 user grant 唔 resolve group → 「只 group 取 KB 層存取」follow-up;**主用例(doc_acl group refine 文件可見度,user 已有直接 KB 存取)F3 已足夠**

## F4 Gate(✅)
- [x] 針對性 44 passed + **全套待綠** + ruff clean + mypy（改動 production 檔自身 0 error;順帶修 `rbac_postgres._ensure_schema` annotation pre-existing debt 16→0）
- [x] **north-star §15 no-op 論證**:無 group member → `[oid]` byte-identical P2;`rbac_backend` getattr-None degrade 保既有 query 測試 BC;drive-images-1 eval admin bypass → no-op
- [x] 更新 progress retro + commits 對應

## Phase Gate（收尾,P3 完整）— ✅
- [x] G-F1~G-F3 逐項驗 + 全綠
- [x] **P3 完整**（P3a doc_acl override G6 + P3b group 繼承 G7 → 檢索層細粒度授權全解）
- [x] 不寫 frontend（H7 延後）/ 不解 kb_acl-restamp 遺留 + get_kb_access group resolution（後期）
