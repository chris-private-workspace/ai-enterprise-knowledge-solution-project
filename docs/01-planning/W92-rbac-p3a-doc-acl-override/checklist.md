# W92 P3a — Checklist

> 對應 [`plan.md`](./plan.md) §2 F1-F5 + §3 Phase Gate。完成 → `[x]` + progress Day-N。
> 未完項**不可刪**,只 `→ [x]` 或標 🚧 + 理由。
> **約束**:doc_acl 表 / replace 語義 / restamp 以 ADR-0067(Accepted)為準;沿用 P2 `allowed_principals` Collection 零新索引欄位。

## F1 doc_acl 表 + DocAclStore(✅)
- [x] `api/schemas/doc_acl.py`:`DocAclEntry`(+ doc_id)+ `DocAclGrantRequest` / `DocAclRoleChangeRequest` / `DocAclListResponse`(mirror rbac.py KbAcl* 復用 `KbPrincipalType`/`KbAclRole`)
- [x] `kb_management/doc_acl_store.py`:Protocol(`list_for_doc` / `add` upsert / `set_role` / `remove`)+ InMemory(flat list mirror `_kb_acl`)+ Postgres(`document_acls` 表 `UNIQUE(kb_id,doc_id,ptype,pid)`,RETURNING upsert)+ `make_doc_acl_store` factory
- [x] 單元測試 `test_doc_acl_store.py`(8):add/list/upsert/set_role 範圍/remove idempotent+範圍/isolation/factory

## F2 doc_acl API(✅)
- [x] `api/routes/doc_acl.py`:GET/POST/PATCH/DELETE `/kb/{kb_id}/docs/{doc_id}/acl`(mirror `kb_acl.py`)+ router-level `require_kb_acl("manage")` + audit `doc.access.granted`(加入 `AuditAction` Literal)
- [x] server.py register router(`include_router(doc_acl.router)` after kb_acl)+ wire `app.state.doc_acl_store = make_doc_acl_store(settings)`
- [x] 測試 `test_doc_acl_route.py`(6):403 非 manage / 201 grant+persist+restamp / list+role+revoke(revoke 還原 KB 繼承 restamp []）/ 404×2 / 503 無 store

## F3 replace 解析(ingest stamp)(✅)
- [x] `acl.resolve_doc_principals(doc_acl_store, rbac_backend, kb_id, doc_id)`:doc_acl 有行 → doc principals;無 / store None → `resolve_kb_principals`(replace fallback,BC)
- [x] `_IngestionDeps` 加 `doc_acl_store` + `_ingestion_deps_or_503` resolve + `_run_ingest_pipeline` 由 `resolve_kb_principals` 改 `resolve_doc_principals`(removed unused import)
- [x] **BC 測試**:`test_doc_acl_resolution.py`(4:doc override / 無行繼承 KB / store None 繼承 / rbac None 空)+ `test_documents_route.py`(doc_acl override stamp doc-user / 無 doc_acl 繼承 kb-user)

## F4 doc_acl 改動 restamp(✅)
- [x] `IndexPopulator.update_doc_principals(kb_id, doc_id, principals)`(search-then-merge `allowed_principals` collection,復用 P2.3 pattern)
- [x] wire 落 doc_acl POST/DELETE(`_restamp_doc` best-effort:resolve_doc_principals → populator.update_doc_principals;PATCH role 不改 principal 集故不 restamp)
- [x] 測試 `test_populate.py`(3:merge collection 正確 + 0-match + index-missing fail-soft)

## F5 Gate(✅)
- [x] 針對性 89 passed + **全套待綠** + ruff clean(我嘅檔全過)+ mypy(改動 production 檔自身 0 error,transitive debt pre-existing)
- [x] **north-star §15 no-op 論證**:drive-images-1 無 doc_acl 行 → `resolve_doc_principals` fallback `resolve_kb_principals` → 無 kb_acl grant → `[]`,**ingest byte-identical P2**(BC 測試證);restamp 只 doc_acl 改才觸發,drive-images-1 無 → 零影響;eval 以 admin 跑亦 filter bypass。**no-op by construction,無需重跑 eval**(同 P2.3 邏輯)
- [x] 更新 progress retro + commits 對應
