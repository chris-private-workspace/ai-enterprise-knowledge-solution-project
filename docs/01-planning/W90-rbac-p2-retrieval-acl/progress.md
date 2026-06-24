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

### 下一步 → P2.1
- P2.1 索引 schema 加 `allowed_principals` + `classification` + ingestion stamp(5.1 KB 繼承);**production-preserve 拍板**(現有無 ACL chunk → fail-open 過渡 vs fail-closed 安全)。

### Commits
- (kickoff)docs(planning): kickoff W90 P2 phase artifacts
- (本 entry)feat(api): P2.0 query endpoint KB-level guard
