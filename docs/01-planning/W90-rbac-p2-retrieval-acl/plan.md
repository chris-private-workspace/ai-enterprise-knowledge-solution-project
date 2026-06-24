# W90 — Enterprise RBAC P2:檢索層文件級 ACL implementation

| 項目 | 值 |
|---|---|
| Phase | W90-rbac-p2-retrieval-acl(enterprise RBAC track 第 3 期) |
| Status | **active**(2026-06-24 ADR-0066 Accepted 解鎖) |
| Tier | Tier 1 上線先決(DG4 per ADR-0066;非 Tier 2) |
| 依賴 | P1(✅ ADR-0066 **Accepted** 2026-06-24,次序鐵律 5 satisfied) |
| 錨點 | **ADR-0066**(Accepted)・ [`../W89-rbac-p1-threat-model-arch/target-architecture.md`](../W89-rbac-p1-threat-model-arch/target-architecture.md)(F2 設計)・ [`threat-model.md`](../W89-rbac-p1-threat-model-arch/threat-model.md)(G1-G5) |
| 粗估 | 大(分 4 段 P2.0-P2.3) |
| 下一期 | P3 文件級 ACL 表(5.2)/ P4 群組繼承 — 視 P2 完成 + 新 ADR |

> **本 plan 受 ADR-0066(Accepted)約束**:索引結構 / 檢索 filter / 文件 ACL 來源一律以 ADR-0066 Decision 為準,本檔只定 deliverables + acceptance + 分段。

---

## §1 目標(Why)

P1 威脅模型確認 5 缺口(G1-G5):檢索層文件級安全 = 0%,confused deputy 洩漏成立。P2 = **implement 檢索層文件級 ACL**,令無權 chunk 喺**檢索階段**已剔除(LLM 永遠睇唔到),系統可安全上線(DG4:Tier 1 上線先決)。

**核心安全原則**:授權喺檢索之前 / 之中執行,非答案生成之後(content 入 prompt = 已洩漏)。

## §2 Deliverables(P2.0–P2.3,per ADR-0066 分段)

| # | Deliverable | Acceptance |
|---|---|---|
| **P2.0** | `/query` + `/query/stream` 補 `require_kb_acl("query")`(G1) | 無 KB query grant 帳號 query → 403;admin / grant 用戶通過;測試覆蓋(類似 P0 F5) |
| **P2.1** | 索引 schema 加 `allowed_principals` + `classification`(G3)+ ingestion stamp(5.1 KB 繼承) | `schema.json` + `ChunkRecord` 有 2 欄位;ingest/reindex stamp 正確;單元測試;**production-preserve**(現有無 ACL chunk 行為定義) |
| **P2.2** | 檢索 filter 注入(G2/G4)+ 重建現有索引一次 | query filter 含 `allowed_principals/any(...)`;無權 chunk 檢索層剔除;**W43-85 問答品質 + 圖文還原不退**(eval 驗,north-star §15) |
| **P2.3** | `classification` clearance + restricted 文件流程(DG1) | restricted 文件只 restricted clearance 用戶可見;internal 用戶被擋;測試 |

## §3 Phase Gate

- **G-P2.0** query 守衛無缺口 + 測試綠
- **G-P2.1** schema + stamp 正確 + production-preserve
- **G-P2.2** 檢索 filter 生效 + **eval 驗問答品質/圖文還原不退**(north-star §15 硬閘)
- **G-P2.3** classification clearance 生效
- **G-P2.全** RBAC/retrieval pytest 全綠 + ruff + mypy + 端到端 smoke

## §4 Risks

- 🔴 **P2.2 動檢索主路徑**(active):filter 注入 + 重建索引 → **必須 eval 驗 W43-85 圖文還原 + 問答品質不退**(north-star §15)。任何退化 = STOP。
- 🔴 **重建索引一次**:現有 KB re-index(W46 reindex 機制),需驗 chunk_id / 圖文 marker 不爛。
- 🟡 **ingestion stamp 改 `ChunkRecord`**:加 2 欄位,驗不影響 chunking/embedding(保 W43-85)。
- 🟡 **production-preserve**:現有無 `allowed_principals` 嘅 chunk → 定義 fail-open(過渡)定 fail-closed(安全);P2.1 拍板。
- 🔴 **backend reload=False**:改 backend code 後重啟驗(per `project_stale_backend_no_reload`)。

## §5 Out of scope(留 P3+)

文件級 ACL 表(5.2 doc_acl override)= P3 / 群組成員繼承 = P4 / 管理權分級 = P5 / 真實 SSO clearance 來源。P2 用 **5.1 KB 繼承**(文件 `allowed_principals` 由 `kb_acl` 推導),classification 用文件 metadata 預設 internal。

## §6 Changelog

| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-24 | P2 kickoff — ADR-0066 Accepted 解鎖;P2.0-P2.3 分段 per ADR Decision;P2.0 先做(最低風險) | 開工 |
| 2026-06-24 | **P2.0 實作 deviation(R3)**:守衛用 **`assert_kb_access("query")`** body-aware helper 而非 plan/ADR 寫嘅 `require_kb_acl("query")` dependency。原因:`/query` 嘅 `kb_id` 喺 `QueryRequest` body 非 route path,`require_kb_acl` 嘅 `_guard(kb_id: str,...)` 從 path 取 kb_id 不適用(同 `POST /kb` create 一樣 kb_id 在 body)。policy 完全相同(admin pass / grant rank check),acl.py 加 `assert_kb_access` + refactor `require_kb_acl._guard` 復用佢(DRY,既有測試驗行為不變)。非架構偏離,ADR-0066 G1 意圖(query KB 層守衛)達成 | P2.0 實作 |
