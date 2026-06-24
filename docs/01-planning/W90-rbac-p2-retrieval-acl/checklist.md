# W90 P2 — Checklist

> 對應 [`plan.md`](./plan.md) §2 P2.0-P2.3 + §3 Phase Gate。完成 → `[x]` + progress Day-N 記錄。
> 未完項**不可刪**(per CLAUDE.md §10 sacred rule),只 `→ [x]` 或標 🚧 + 理由。
> **約束**:索引結構 / filter / ACL 來源以 ADR-0066(Accepted)Decision 為準。

## P2.0 query 端點補 KB 層守衛(G1,最低風險先做)
- [x] `/query` + `/query/stream` 加守衛 → **`assert_kb_access("query")`**(body-aware;kb_id 在 `QueryRequest` body 非 path → `require_kb_acl` path-based 不適用,acl.py 加 helper + refactor `_guard` 復用 DRY)
- [x] 無 KB query grant 帳號 query/stream → **403**(`test_query_route_acl.py` 4 測試)
- [x] admin / query-grant 用戶通過 → admin pass-guard(4 整合測試 pipeline 跑通)+ `assert_kb_access` 單元測試 grant pass(`test_acl_middleware` 4 新測試)
- [x] 受影響 query 整合測試 wire admin(test_query_per_kb_config / _doc_config_overlay 加 override;_observe / _smoke user 加 role=admin)+ signature 斷言同步(`current_user` 透過 @observe_async chain 暴露)
- [x] 零 regression(67 passed + signature fix)

## P2.1 索引 schema + ingestion stamp(G3)
- [x] `schema.json` 加 `allowed_principals: Collection(Edm.String)`(filterable)+ `classification: Edm.String`(filterable, facetable);`to_search_doc` drift guard `test_w70_search_doc_fields_align_with_schema_json` 自動驗對齊
- [x] `ChunkRecord`(`indexing/schemas.py`)加 2 欄位(`allowed_principals` default `[]`、`classification` default `internal`;`to_search_doc` 經 model_dump 自動帶,無 rename)
- [x] ingestion stamp(5.1 KB 繼承):`resolve_kb_principals(rbac_backend, kb_id)` helper(acl.py,讀 `list_kb_acl` 全 grant principal,role rank 只 gate 寫)→ `_run_ingest_pipeline` 經 `deps.rbac_backend` resolve → `orchestrator.ingest(allowed_principals=...)` stamp 每 chunk(per-chunk list copy 不共享);`classification` 預設 internal(P2.3 先分);orchestrator 零 rbac 依賴(關注點分離)
- [x] **production-preserve 拍板:過渡期 fail-open**(plan §6 changelog 2026-06-24):空 `allowed_principals` = 公開;rbac None / 無 grant → `[]`(fail-soft);穩態(P2.2 重建後)收斂等價。理由 = north-star §15(P2.1→P2.2 過渡期 fail-closed 會擋光現有 KB chunk → 圖文還原爆)
- [x] 單元測試:`test_populate`(ChunkRecord ACL default + to_search_doc 帶 2 欄位)/ `test_orchestrator`(stamp 每 chunk + list 不共享 + BC fail-open default)/ `test_acl_middleware`(resolve None→[] / 空 KB→[] / 全 grant + 跨 KB 不洩漏)= 7 新測試;71 + 67 passed + ruff + mypy(自身 0 error)

## P2.2 檢索 filter + 重建索引(G2/G4,高風險)
- [ ] `hybrid.py` query filter 注入 `allowed_principals/any(p: search.in(p, ...))`
- [ ] 重建現有索引一次(W46 reindex 機制)
- [ ] **eval 驗 W43-85 問答品質 + 圖文還原不退(north-star §15 硬閘)**
- [ ] 無權 chunk 檢索層剔除(驗證)

## P2.3 classification clearance(DG1)
- [ ] `classification` clearance 比對(internal/restricted)
- [ ] restricted 文件只 restricted clearance 用戶可見 + internal 用戶被擋(測試)

## Phase Gate(收尾)
- [ ] G-P2.0 ~ G-P2.3 逐項驗
- [ ] RBAC / retrieval pytest 全綠 + ruff + mypy
- [ ] **eval 問答品質 + 圖文還原不退(north-star §15)**
- [ ] 端到端 smoke + 更新 TRACKER / FINDINGS
