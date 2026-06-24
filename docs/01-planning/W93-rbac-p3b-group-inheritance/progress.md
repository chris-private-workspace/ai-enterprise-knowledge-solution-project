# W93 P3b — Progress

> 每日進展 + 決策 + commits + 結尾 retro。對應 [`checklist.md`](./checklist.md)。

## Day 1 — 2026-06-24(P3b kickoff)

### 開工背景
- P3a 完成（W92,commit `041813b`,doc_acl override G6,已 push）。用戶批准「開 W93 P3b」。
- P3b = ADR-0067 §Decision 3 群組繼承（G7,= P4）。手動 admin group member（DG-P3-B）。
- **核心性質**:chunk 存 group key 非 member oid → member 加減純 query 側 `principals_for_user` 展開 → **零 re-stamp**。

### kickoff(R1)
- rolling JIT 建 W93 三件套。F1-F4 backend-only。kb_acl-restamp 遺留 + frontend（H7）延後。

### F1-F4 全部完成(✅ 2026-06-24 Day 1 一輪)
- **F1**:`RbacBackend` Protocol +4 方法 + InMemory(`_group_members` dict 帶 added_at)+ Postgres(per-op,既有 `group_members` 表)+ `list_groups` member_count 真計 + `GroupMember`/`GroupMemberListResponse`/`GroupMemberAddRequest` schema + 6 store 測試。
- **F2**:`GET/POST/DELETE /groups/{group_key}/members`(`require_role("admin")`,POST 204 idempotent / DELETE 204|404)+ 3 route 測試。
- **F3**:`principals_for_user` sync→async + rbac_backend 展開([oid]→[oid]∪group_keys / admin None / rbac None degrade)+ query.py 2 call site await + **下游 11 層 threading 零改** + test_acl_middleware 更新 + 端到端 query-route group 展開測試。
- **F4 Gate**:針對性 44 passed + ruff clean + mypy 改動 production 檔自身 0 error。

### think-before / 實作決策(R3)
- **`get_kb_access` group resolution 缺口**(F3 think-before):KB-level guard `get_kb_access` 只認 user grant,「只靠 group 取 **KB 層**存取」嘅 user 會 403。**但 P3b 主用例(doc_acl group refine **文件層**可見度,user 已有直接 KB 存取)F3 已足夠** → KB-level group 存取列 follow-up(plan §5/§6)。
- **drive-by 修 `rbac_postgres._ensure_schema` annotation**:bare `psycopg.AsyncConnection`(預設 tuple row)vs `dict_row` conn 全檔型別不符(HEAD 已有,12+ 既有 method 都報)→ 改 `AsyncConnection[Any]` 一行清 16→0,令我改動檔 mypy self-0-error。pre-existing debt root-cause fix,零 runtime 風險。
- **BC 保障**:query 測試多數無 wire rbac_backend → `getattr(...,None)` → `principals_for_user(None, user)` = `[oid]`(非 admin)/ None(admin),byte-identical P2。
- **零 re-stamp**(核心性質):member 加減純 query 側 `principals_for_user` 展開,索引零改動。

### 待續(本 phase)
- 全套測試綠 → commit + push（視用戶）。**P3 完整**(P3a G6 + P3b G7)。

### Commits
- (kickoff)docs(planning): kickoff W93 P3b group-inheritance phase artifacts
- (本 entry)feat(api): P3b group inheritance(group_members 寫 + principals_for_user async 展開 + 管理 API)
