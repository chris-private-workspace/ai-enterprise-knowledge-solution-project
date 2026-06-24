# W89 P1 F1 — 威脅模型 + 需求

> P1 deliverable F1。純設計分析(唔改 code)。codebase 證據來自 2026-06-24 Explore 調查;事實基準 [`../enterprise-rbac/FINDINGS.md` §4](../enterprise-rbac/FINDINGS.md)。

---

## 1. 範圍 + 方法

**範圍**:EKP RAG 檢索/查詢/合成路徑嘅授權(ACL)。對標成熟企業 KM(Microsoft Purview / SharePoint、Glean)嘅檢索層存取控制。

**方法**:攻擊面盤點 → 核心威脅(confused deputy)→ codebase 缺口確認(file:line)→ 攻擊情景 → 需求。

**需求前提(DG resolution 2026-06-24)**:DG1 = 2 級 `internal / restricted`;DG2 = 單租戶 Ricoh internal(無多租戶,唔撞 H4);DG4 = P2 檢索層安全 = **Tier 1 上線先決**。

---

## 2. 攻擊面

| 面 | 現狀 | 風險 |
|---|---|---|
| 認證(登入) | mock auth(dev)/ MSAL bridge | 🟢 P0 已理順 |
| 寫操作授權 | `require_kb_acl` / `require_role`(P0 F5/F5b 全覆蓋) | 🟢 P0 已守 |
| **查詢端點授權** | **無任何守衛**(連 KB 層都無) | 🔴 **最關鍵** |
| **檢索層 ACL** | 只 `kb_id` 作用域,無文件/chunk 級 | 🔴 **最關鍵** |
| **合成層(LLM)** | chunks 直接餵 LLM,無授權過濾 | 🔴 confused deputy |
| 索引 schema | 無 ACL / classification 欄位 | 🟠 阻 P2 落地(需擴欄位) |

---

## 3. 核心威脅 — Confused Deputy(檢索層洩漏)

**機制**:LLM 係 confused deputy —— 佢按系統餵嘅 chunks 生成答案,**唔知道**呼叫者嘅權限。若檢索階段撈到 user 無權嘅文件 chunk,LLM 會照樣摘要呈現 → **資料外洩喺答案/引用層發生**。

**核心原則(對標企業 KM)**:存取控制必須喺**檢索之前/之中**執行,唔可以靠 LLM 自律,亦唔可以喺答案生成之後先過濾(content 已入咗 prompt = 已洩漏)。

---

## 4. 檢索/查詢層 ACL 缺口(codebase 確認)

| # | 缺口 | 證據(file:line) | 結論 |
|---|---|---|---|
| **G1** | **查詢端點無授權守衛** — `/query` + `/query/stream` 只要登入即可呼叫,**連 KB 層 `require_kb_acl` 都無** | `backend/api/routes/query.py:203-218`、`:530-534`(零 `require_kb_acl`/`require_role`/`get_current_user`) | 任何登入 user 可 query 任何 KB |
| **G2** | **檢索層無文件級 filter** — Azure AI Search OData filter 只含 `kb_id eq '...'` | `backend/retrieval/hybrid.py:354-355`、`storage/kb_naming.py:63-69`(`kb_id_filter_clause` 只 KB 級) | 整個 KB 全部 chunks 返回,無視文件權限 |
| **G3** | **索引 schema 無 ACL 欄位** — 無 `allowed_principals`/`classification`/`security_level` | `backend/indexing/schema.json`、`indexing/schemas.py:65-114`(`ChunkRecord` 只內容+身份元數據) | 技術上無法喺索引層過濾(需先擴欄位) |
| **G4** | **合成層無授權過濾** — synthesizer 直接消費全部檢索 chunks 餵 LLM | `backend/generation/synthesizer.py:127-235`、`api/routes/query.py:245-251` | confused deputy 洩漏路徑成立 |
| **G5** | **KB 層 ACL 存在但 query 未採納** — `kb_acl` 表 + middleware 齊備,但查詢路徑唔用 | `backend/api/middleware/acl.py:69-102`、`storage/rbac_storage.py:234-238` | 設計 vs 實現落差(非 schema 缺陷,係 endpoint 決策) |

> **關鍵洞察**:G1 ≠ G2-G4。G1(query 端點連 KB 層守衛都無)係**獨立嘅 P0-style 缺口**,可快速補(`require_kb_acl("query")`,類似 F5);G2-G4(文件/chunk 級 + 索引 schema)係 **P2 大工程**(需擴 schema + 重建索引)。建議 G1 喺 P2 開頭快速補(或 P1 補丁),G2-G4 係 P2 主體。

---

## 5. 攻擊情景(分層存取)

**設定**:KB `staff_handbook`(3 文件:政策 / 薪資 / 福利);User A = 員工(只應讀政策);User B = 經理(全部)。

**現狀流程(User A 查薪資)**:
1. User A 呼叫 `POST /query?query=salary&kb_id=staff_handbook`
2. G1:query 端點無守衛 → 直接通過
3. G2:檢索層無文件 filter → 返回全部 chunks(政策+**薪資**+福利)
4. G4:synthesizer 餵全部 chunks 入 LLM
5. **LLM 答案洩漏「薪資」內容畀 User A** ← 存取控制形同虛設

**修復後(P2 目標)**:步驟 2 query 端點 `require_kb_acl("query")` 守 KB 層;步驟 3 檢索 filter 注入 `allowed_principals/any(p: p eq 'userA')` → 薪資 chunk 喺**檢索階段**已剔除,LLM 永遠睇唔到。

---

## 6. 需求(DG-derived)

| 需求 | 來源 | P1/P2 |
|---|---|---|
| 查詢路徑 KB 層授權(`require_kb_acl("query")`) | G1 + DG4 | P2 開頭(快速補) |
| 文件級 ACL(principal + access_role)喺索引 | G2/G3 + DG4 | P2 主體 |
| `classification` 欄位(2 級 internal/restricted) | DG1 | P2(索引擴欄位) |
| 檢索 filter 注入 per-user/principal | G2 + DG4 | P2 主體 |
| 單租戶(無 tenant 隔離維度) | DG2 | 確定(簡化索引) |
| 合規:無特定(internal manual) | DG3 default | — |

---

## 7. 威脅優先級 + P2 設計含義

**優先級**:G1(query 端點 KB 層守衛缺失)= 即時可補 + 高價值;G2-G4(文件級)= P2 主體 + 索引重建(次序鐵律 1:索引結構最先定)。

**對 F2 目標架構嘅含義**:
- 索引必須新增 `allowed_principals: Collection(Edm.String)` + `classification: Edm.String`(G3)
- 檢索 filter 必須加 `allowed_principals/any(...)` 子句(G2)— Azure AI Search S1 原生支援,唔撞 H2
- ingestion 階段需 stamp 每 chunk 嘅 `allowed_principals`(來源 = 文件級 ACL 表,P3 細粒度前先用 KB ACL 繼承)
- 單租戶 → 索引**唔需要** tenant_id 維度(DG2 簡化)
- **次序鐵律 1**:呢啲索引結構決定 = ADR-0066 必須拍板嘅核心(F2 + F3)

→ **F2 目標授權模型**將設計上述索引 ACL 結構 + 檢索 filter 機制 + 文件 ACL 來源(KB 繼承 vs 文件級表),並列多選項 + trade-off。
