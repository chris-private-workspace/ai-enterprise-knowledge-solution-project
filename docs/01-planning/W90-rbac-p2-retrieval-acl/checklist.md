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
- [ ] `schema.json` 加 `allowed_principals: Collection(Edm.String)` + `classification: Edm.String`
- [ ] `ChunkRecord`(`indexing/schemas.py`)加 2 欄位
- [ ] ingestion stamp(5.1 KB 繼承:`allowed_principals` 由 `kb_acl` 推導;`classification` 預設 internal)
- [ ] **production-preserve 拍板**:現有無 `allowed_principals` chunk → fail-open(過渡)vs fail-closed(安全)
- [ ] 單元測試(stamp 正確 + 不影響 chunking)

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
