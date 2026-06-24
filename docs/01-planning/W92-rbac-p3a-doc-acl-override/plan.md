# W92 — Enterprise RBAC P3a:文件級 doc_acl override implementation

| 項目 | 值 |
|---|---|
| Phase | W92-rbac-p3a-doc-acl-override(enterprise RBAC track 第 5 期,P3 implementation 第 1 段) |
| Status | **active**(2026-06-24 用戶批准開 P3-impl) |
| Tier | Tier 1.5(per ADR-0067 DG-P3-C;P2 已達 launch 安全,P3 = 更幼粒度 enhancement) |
| 依賴 | **ADR-0067 Accepted**(2026-06-24,次序鐵律 5 satisfied)・ P2(W90,`allowed_principals` Collection + filter) |
| 錨點 | **ADR-0067** §Decision(replace 語義 / doc_acl 表 / restamp)・ [`../W91-rbac-p3-doc-acl-design/target-architecture-p3.md`](../W91-rbac-p3-doc-acl-design/target-architecture-p3.md) |
| 粗估 | 中(backend-only,P3a 段) |
| 下一期 | **W93 P3b**(=P4 群組繼承:`group_members` 寫方法 + `principals_for_user` async 展開)— P3a 落地後 kickoff |

> **本 plan 受 ADR-0067(Accepted)約束**:doc_acl 表結構 / replace 語義 / restamp 機制以 ADR-0067 Decision 為準。本檔只定 deliverables + acceptance + 分段。**沿用 P2 `allowed_principals` Collection,零新索引欄位、無索引重建。**

---

## §1 目標(Why)

實作 ADR-0067 §Decision 第 1/2/4 點(G6 文件級 override):令同一 KB 內**唔同文件唔同權限**。doc_acl override 表 + replace 解析 + doc_acl 改動 restamp。**P3b 群組繼承(G7)= 下一期 W93**(本期不做)。

**replace 語義(DG-P3-A)**:文件**有** `doc_acl` 行 → `allowed_principals` = doc_acl principals;**無** → 繼承 KB(P2 現狀,BC)。

## §2 Deliverables(F1–F5,backend-only)

| # | Deliverable | Acceptance |
|---|---|---|
| **F1** | `doc_acl` 表 + `DocAclStore`(Protocol + InMemory + Postgres + factory) | `document_acls(id, kb_id, doc_id, principal_type, principal_id, access_role, granted_by, created_at, UNIQUE(kb_id,doc_id,ptype,pid))`;多行 per doc;復用 `KbPrincipalType`/`KbAclRole`;單元測試 CRUD |
| **F2** | doc_acl API(`/kb/{kb_id}/docs/{doc_id}/acl` GET/POST/PATCH/DELETE) | mirror `kb_acl.py`;router-level `require_kb_acl("manage")` 守衛;audit `doc.access.granted`;測試(403 非 manage / CRUD) |
| **F3** | replace 解析(ingest stamp) | `acl.resolve_doc_principals(doc_acl_store, rbac_backend, kb_id, doc_id)` = doc_acl 有行 ? doc principals : `resolve_kb_principals`;`_run_ingest_pipeline` 改用之;**BC**:無 doc_acl → byte-identical P2;測試 |
| **F4** | doc_acl 改動 restamp | `IndexPopulator.update_doc_principals(kb_id, doc_id, principals)`(search-then-merge `allowed_principals`,復用 P2.3 pattern)+ wire 落 doc_acl POST/PATCH/DELETE 端點(改完即 restamp 該文件 chunks);測試 |
| **F5** | Gate | RBAC/retrieval/ingestion pytest 全綠 + ruff + mypy(改動檔自身 0 error)+ **north-star §15 不退**(drive-images-1 無 doc_acl → resolution = KB 繼承 no-op,同 P2.3 邏輯,eval 預期 bit-identical) |

## §3 Phase Gate
- **G-F1** doc_acl store CRUD 正確 + 測試
- **G-F2** API mirror kb_acl + manage 守衛 + 測試
- **G-F3** replace 解析 + BC(無 doc_acl byte-identical)
- **G-F4** restamp 生效（doc_acl 改 → 該文件 chunks `allowed_principals` 更新）
- **G-全** pytest 全綠 + ruff + mypy + **north-star §15**(eval no-op 驗證 filter/resolution 正確非退化)

## §4 Risks
- 🟡 **動 ingest stamp 解析**(F3):`_run_ingest_pipeline` 由 `resolve_kb_principals` 改 `resolve_doc_principals` → **BC 關鍵**:無 doc_acl 必須 byte-identical P2(replace 語義 fallback KB)。測試守。
- 🟡 **restamp 動索引**(F4):復用 P2.3 search-then-merge(已驗證);doc_acl 改才觸發,drive-images-1 無 doc_acl → 唔受影響。north-star §15 eval no-op 驗。
- 🟢 **零新索引欄位/無重建**:沿用 P2 `allowed_principals` Collection。
- 🟢 **backend reload=False**(per `project_stale_backend_no_reload`):若需 live 行為驗證(browser/curl :8000)先確認 backend 啟動時間 ≥ 最後 commit,否則重啟(但有撞 session 風險,prefer pytest 驗)。

## §5 Out of scope(留 W93 / 後期)
**P3b 群組繼承**(`group_members` 寫方法 + `principals_for_user` async 展開,G7)= **W93**。Frontend doc_acl 管理 UI = **H7 design-stage expansion**(無 mockup → 另需 mockup 或 design-stage ADR,backend-first 同 P2 一致)。真 SCIM = Tier 2。kb_acl-change-restamp 遺留補完(ADR-0067 §Decision 4 提及)= W93 或 P3a F4 順帶(視範圍)。

## §6 Changelog
| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-24 | P3a kickoff — ADR-0067 Accepted 解鎖;用戶批准開 P3-impl;scope = P3a backend(doc_acl override),P3b group + frontend 延後 | 開工 |
