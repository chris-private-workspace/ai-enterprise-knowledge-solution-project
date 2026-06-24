# W90 P2 — Progress

> 每日進展 + 決策 + commits + 結尾 retro。對應 [`checklist.md`](./checklist.md)。

## Day 1 — 2026-06-24(P2 kickoff + P2.0)

### 開工背景
- P1 完全完成(ADR-0066 **Accepted** 2026-06-24,用戶 decision owner 拍板;M2 達成)→ 次序鐵律 5 satisfied,P2 implementation 解鎖。
- 用戶「即 kickoff W90 P2」→ rolling JIT 建 W90 三件套(R1)。
- P2 = implementation phase(改 code/schema/檢索),H1 由 ADR-0066 Accepted 涵蓋;H6(retrieval/pipeline test)適用。

### P2 scope(per ADR-0066 Decision)
- P2.0 query 守衛(G1)→ P2.1 schema+stamp(G3)→ P2.2 filter+重建索引(G2/G4,高風險)→ P2.3 classification(DG1)。
- **north-star §15 硬閘**:P2.2 動檢索主路徑,必須 eval 驗 W43-85 圖文還原 + 問答品質不退。
- 文件 ACL 來源 = 5.1 KB 繼承(P2);5.2 文件級表留 P3。

### P2.0 query 端點 KB 層守衛(2026-06-24 ✅ 完成)
- **實作**:`/query` + `/query/stream` handler 加 `current_user` + `await assert_kb_access(request, payload.kb_id, current_user, "query")`。`acl.py` 加 `assert_kb_access` body-aware helper + refactor `require_kb_acl._guard` 復用(DRY)。
- **deviation(R3,見 plan changelog)**:守衛用 `assert_kb_access` 非 `require_kb_acl`(後者 path-based,不適用 body kb_id)。policy 相同,ADR-0066 G1 意圖達成。
- **測試**:`test_query_route_acl.py` 4(403×2 query+stream / 401×2);`test_acl_middleware` 加 4 `assert_kb_access` 單元(admin pass / 無 grant 403 / grant pass / backend None 503);4 受影響 query 整合 wire admin(per_kb / overlay 加 `get_current_user` override;observe / smoke user 加 `role=admin`)+ signature 斷言加 `current_user`(驗證透過 @observe_async chain 暴露)。
- **驗證**:67 passed + signature fix;ruff clean。

### P2.1 索引 schema + ingestion stamp(2026-06-24 ✅ 完成)
- **production-preserve 拍板:過渡期 fail-open**(plan §6 changelog)。理由:P2.1 只 stamp 新 ingest,P2.2 先重建現有索引;過渡期所有現有 chunk 未 stamp,fail-closed 會即刻擋光現有 KB 全部 chunk → W43-85 圖文還原 + 問答品質爆,撞 north-star §15。fail-open 係唯一唔破壞 north-star 嘅選擇;穩態(P2.2 重建後)所有 chunk 都 stamp → fail-open 與 fail-closed 收斂等價,洩漏面僅限過渡窗。
- **6 處 code(資料層 → stamp 層 → wire 層)**:
  1. `ChunkRecord`(`indexing/schemas.py`)加 `allowed_principals: list[str] = []` + `classification: str = "internal"`(fail-open default;`to_search_doc` 經 model_dump 自動帶)。
  2. `schema.json` 加 `allowed_principals: Collection(Edm.String)`(filterable)+ `classification: Edm.String`(filterable, facetable)。
  3. `acl.py` 加 `resolve_kb_principals(rbac_backend, kb_id)`(rbac None → `[]` fail-soft;讀 `list_kb_acl` 全 grant principal — query/edit/manage 都可讀,role rank 只 gate 寫)。
  4. `orchestrator.ingest()` 加 `allowed_principals` + `classification` 2 param → stamp 每 chunk(per-chunk list copy 不共享);orchestrator 零 rbac 依賴(關注點分離,Karpathy §1.3)。
  5. `documents.py`:`_IngestionDeps` 加 `rbac_backend` optional DI field + `_ingestion_deps_or_503` getattr(對齊既有 doc_config_store optional pattern)。
  6. `_run_ingest_pipeline` 經 `deps.rbac_backend` resolve principals → 傳落 `orchestrator.ingest`(3 caller upload/reindex/doc-reindex 全經此統一入口,零改 caller)。
- **stamp 真實生效**:server.py lifespan L153-155 已 wire `app.state.rbac_backend`(P2.0 F6b live smoke 驗過)→ production `_ingestion_deps_or_503` getattr 拿到真 backend。
- **測試**(7 新):`test_populate`(ChunkRecord ACL default + to_search_doc 帶 2 欄位)/ `test_orchestrator`(stamp 每 chunk + list 不共享 + BC fail-open default)/ `test_acl_middleware`(resolve None→[] / 空 KB→[] / 全 grant + 跨 KB 不洩漏)。
- **驗證**:71 passed(orchestrator/populate/acl/kb_reindex/query_route_acl)+ 67 passed(documents_route/contextual/ch009/doc_profile caller BC)+ ruff clean + mypy(acl/orchestrator 自身 0 error,17 全係既有 api/auth + ingestion/parsers transitive debt)。

### 下一步 → P2.2(🔴 高風險)
- 檢索 filter 注入 `allowed_principals/any(p: search.in(p, '{principals}', ','))`(`hybrid.py`)+ 重建現有索引一次(W46 機制)。
- **north-star §15 硬閘**:必須 eval 驗 W43-85 圖文還原 + 問答品質不退,任何退化 = STOP。
- 動檢索主路徑前先 surface eval 基準 + 重建索引風險,等用戶拍板。

### Commits
- (kickoff)docs(planning): kickoff W90 P2 phase artifacts
- feat(api): P2.0 query endpoint KB-level guard
- (本 entry)feat(api): P2.1 index ACL schema + ingestion stamp
