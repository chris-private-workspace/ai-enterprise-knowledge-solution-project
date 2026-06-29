# 統一整合層階段 1 — SharePoint 按需匯入 · 方案藍圖(Solution Blueprint)

**Date**: 2026-06-29(起)
**Status**: 方案藍圖 — 逐節寫,**交付給用戶喺公司真實環境執行**(非 local repo implement)。
**對應**: ADR-0070(Accepted 2026-06-28)/ BACKLOG B-01 / COMPONENT_CATALOG C17 / progress tracker `integration_layer_phase1_sharepoint_solution_PROGRESS.md`
**前置 deep-research**: `unified_integration_layer_architecture_20260628.md`(設計骨架)+ `sharepoint_connector_permission_mapping_external_research_20260628.md`(權限實證)
**讀者**: Chris(技術 Lead)+ 公司 IT + Claude Code

> **本檔性質**:呢份係**你帶去公司真實環境執行嗰份方案書** —— 由前置條件、認證、interface、SharePoint 連接、權限映射、撤權、到公司執行 checklist。技術決定全部 ground 喺上述 ADR + 兩份 deep-research(對抗式查證,20 confirmed / 5 killed)。**唔喺 local repo 假裝 implement**(SharePoint / Microsoft Graph 要真 tenant + `Sites.Selected` per-site grant,本機造唔到)。
>
> **寫作進度**:**§0–§10 + 附錄 全部完成**(2026-06-29)。下一步 = 按 §10 R1 考慮開階段 1 implementation phase(先 plan 三件套)。逐節 commit 記錄見 progress tracker。

---

## §0 總覽

### 0.1 目標

令 EKP 嘅 KB 內容**唔再只靠人手上傳文件**,而係可以**直接連接公司 SharePoint**,揀指定 site / library / 資料夾 → 把文件 + **原生權限** 拉入 KB,經 EKP 自家 Docling ingestion 建索引,並喺檢索時**尊重來源權限**(冇權限嘅人唔會透過 RAG 睇到內容)。

### 0.2 階段 1 鎖死範圍(per DG-INT-2,守 H4)

| 階段 1 **做** | 階段 1 **唔做**(留 Tier 2) |
|---|---|
| 落 `SourceConnector` 抽象 interface(provider-agnostic) | 多 provider(Google Drive / Box / Confluence)→ 階段 2 |
| **一個** concrete connector = SharePoint | 自動同步(delta / 排程 / webhook 撤權)→ 階段 3(H4 明確 Tier 2) |
| **按需手動匯入**(用戶揀範圍,觸發一次匯入) | turnkey indexer(會繞過 Docling 核心)|
| push-model + GA 字串比對 ACL `allowed_principals` | preview Entra-native 自動 token-trim(無 SLA) |

階段 1 定位 = **Tier 1.5**。架構**一次過設計成 Tier 2-friendly**(interface + capability model 一步到位),但**實作分階段**,將來加 provider / auto-sync 唔使重構。

### 0.3 主路線一句(per deep-research 裁決)

```
Graph(Sites.Selected, application 服務帳號)拉 SharePoint 文件 + /permissions ACL
  → 自家 Docling ingestion(圖文還原 / profile / 可調配置全保留)
  → 用 Graph transitiveMembers 把 nested group 展成 flat principal set(group 級)
  → push chunks + allowed_principals(Entra GUID 字串)入 Azure AI Search
  → query-time:GA 字串比對 security filter 按用戶 principal set trim
撤權:排程 full re-ingest(delta 對 library 層唔可靠)+ 接受有界延遲
```

### 0.4 設計鐵律(保護核心競爭力)

> **Connector 只負責「來源 → 標準化文件 + 權限 + metadata」,絕對唔掂 ingestion 核心。**

換來源 = 換 adapter;Docling layout-aware parsing / 圖文還原 / per-doc profile / per-KB 可調配置 **全部零改動**,無論文件由邊個來源嚟。

### 0.5 交付 ↔ 執行分工(reframe,per D4)

| 角色 | 負責 |
|---|---|
| **本方案書(AI 交付)** | 架構 / interface / 認證 / 權限映射 / 撤權策略 / 公司執行 runbook |
| **你 + 公司 IT(真實環境執行)** | Entra app registration、`Sites.Selected` per-site grant、credential、真實 tenant 上跑匯入 + 驗證 |

### 0.6 本檔導航

§0 總覽 · **§1 前置條件(IT / tenant)** · **§2 認證架構** · §3 `SourceConnector` interface + capability model · §4 SharePoint connector 實作 · §5 權限映射(ACL → `allowed_principals`) · §6 撤權 / stale permission · §7 與 EKP 核心銜接 · §8 錯誤模型 + 生命週期 · §9 範圍邊界 + 未答缺口 · §10 公司執行 checklist · 附錄(Graph endpoints / scopes / 來源)。

---

## §1 前置條件(IT / tenant)

> 呢節係**公司 IT 喺真實環境要先 set 好嘅嘢**;缺一階段 1 匯入就行唔到。每項標明由邊個角色做。

### 1.1 前置清單(總覽)

| # | 前置 | 角色 | 備註 |
|---|---|---|---|
| P1 | SharePoint / Microsoft 365 tenant + 目標 site / library | 公司既有 | 確認要匯入邊個 site/library |
| P2 | Entra app registration(ingestion 服務帳號)| IT / Entra admin | 建 app + client credential |
| P3 | 授予 `Sites.Selected`(**application** permission)+ admin consent | Entra admin | **consent ≠ 有權**(見 1.3)|
| P4 | **per-site 顯式授權**(逐個 site grant app 讀權限)| SharePoint / site admin | 三步缺一即拒(見 1.3)|
| P5 | credential 安全儲存 | IT | 階段 1 配置 / `.env`;Beta+ Azure Key Vault(H5)|
| P6 | (query-time)delegated / OBO 認證可用 | IT | 重用 EKP 既有 Entra ID(W7–W8 bridge)|

### 1.2 Entra app registration(P2)

ingestion 服務帳號用一個 Entra app registration(client credentials / app-only token):
- 註冊 app → 攞 `tenant_id` / `client_id`。
- 建 client secret 或 certificate(certificate 較安全,建議生產用 cert)。
- 呢個 app 之後**只**會被授予 `Sites.Selected`(least-privilege),唔授 `Sites.FullControl.All`。

### 1.3 `Sites.Selected` 三步授權(P3 + P4)— **最易踩中嘅位**

deep-research 確認:`Sites.Selected` 係**「同意都唔等於有權」**嘅最小權限模型。授一個 site 要**三個獨立步驟,缺一即拒**:

1. **App 層**:app registration 加 `Sites.Selected`(**application** permission)。
2. **Tenant consent**:Entra admin 對該 app 嘅 `Sites.Selected` 做 admin consent。
   - ⚠️ 做完 1+2,app **仍然對任何 site 零權限** —— 只係「**有資格**被逐 site 授權」。
3. **Per-site grant**:對**每一個**要匯入嘅 site,顯式授予該 app 角色(`read` 足夠 ingestion;唔需要 write)。逐 site 做,由 site / SharePoint admin 執行。
   - 具體 Graph 呼叫(POST 到該 site 嘅 permissions + role)放 §4 / 附錄。

**好處**:逐 site least-privilege,security review 可辯護(app 只能掂被明確授權嘅 site),優於 turnkey indexer 需要嘅 `Sites.FullControl.All`。
**撤權**:有兩個控制點(移除 per-site grant / 移除 app consent),撤其一即斷。

### 1.4 credential 儲存(P5)

- **階段 1**:配置 / `.env`(gitignored,per H5;絕不 commit secret)。
- **Beta+**:Azure Key Vault(EKP 已喺 C12 落 `azure-keyvault-secrets` SDK,`KEY_VAULT_URL` 設定即啟 `AzureKeyVaultProvider`)。
- certificate / secret 輪替:由 `ConnectionHandle` 處理 token refresh(見 §2.4)。

### 1.5 query-time 認證前置(P6)

檢索時要按**登入用戶**嘅 principal set 做 security trimming(§5 / §7),所以 query-time 需要 per-user token(delegated / on-behalf-of)。EKP W7–W8 已做過 Entra ID mock bridge,呢部分認證可重用(見 §2.2)。

---

## §2 認證架構

### 2.1 雙模式分工(核心決定)

| 用途 | 認證模式 | 權限 | 點解 |
|---|---|---|---|
| **Ingestion**(拉文件 + 抽 ACL) | **application** `Sites.Selected`(app-only token,client credentials)| 服務帳號 superset(被授權嘅 site 全讀)| 後台批次匯入,無互動用戶;least-privilege 逐 site |
| **Query-time**(security trimming)| **delegated / on-behalf-of**(per-user token)| app 權限 ∩ **用戶**權限 | 要知道「邊個用戶」先 trim;delegated「app 永不超過用戶權限」更安全(微軟建議優先)|

> **caveat(per deep-research §3.4)**:delegated `Sites.Selected` 僅 Microsoft Graph API 實作 —— 對我哋呢種 **Graph-based RAG 無影響**(我哋本身就行 Graph)。

### 2.2 query-time trimming 概念流(細節在 §5 / §7)

```
用戶登入(Entra ID,delegated / OBO token)
  → 取得用戶 principal set = {user GUID} ∪ {用戶所屬 group GUID(展開)}
  → 查詢 Azure AI Search 時加 GA 字串比對 security filter:
       allowed_principals/any(p: search.in(p, '<用戶 principal set>'))
  → 只返回用戶 principal set 命中 allowed_principals 嘅 chunk
```

呢個比對邏輯**只寫一次、全 provider 共用**(收斂點 = `allowed_principals`,複用 EKP RBAC track / ADR-0066/0067)。

### 2.3 為何唔用 `Sites.FullControl.All` / turnkey indexer

- turnkey SharePoint indexer 需要高權限 + 自己 crawl/parse/chunk → **繞過 Docling 核心**(放棄 EKP 競爭力)→ reject。
- 競品(Glean)real-time 撤權 gated on `Files.ReadWrite.All` + `Sites.FullControl.All`(高權限)且 claim 被反證 → 唔行高權限路線。
- 我哋 push-model + `Sites.Selected` = 低權限 + 保留核心 + GA 穩妥。

### 2.4 token refresh(interface ⑥)

長時間 ingestion run 期間 app token 會過期。`ConnectionHandle`(§3)**內部封裝 refresh** —— connector 各方法攞 handle 時自動確保 token 有效,呼叫方唔使理。credential 來源 = §1.4(階段 1 配置 / Beta+ Key Vault)。

### 2.5 認證相關 H2 注意

Microsoft Graph 存取(`azure-identity` + `httpx` managed-REST,傾向 over `msgraph-sdk`,對齊 C16 F1「managed-REST > heavy SDK」)屬**新 dependency = H2** → 階段 1 implementation plan 內逐項確認 + R8 corp-proxy mitigation(per ADR-0017)。本方案書唔喺定方向階段加 dep。

---

## §3 `SourceConnector` interface + capability model

> provider-agnostic 抽象;SharePoint(§4)只係第一個實作。跟 EKP backend convention(Protocol + async,參考 `ConversationStore` / `KBStorageBackend`)。**呢個係概念草案,正式型別簽名喺階段 1 implementation plan 落實**(本方案書唔喺定方向階段寫 code)。

### 3.1 capability model — framework 唔可以假設所有 provider 一樣

```python
class ConnectorCapabilities:
    auth_kind: Literal["oauth", "app_registration", "api_key"]
    supports_browse: bool       # 可唔可以列容器樹
    supports_acl: bool          # 有冇文件級權限可抽
    supports_delta: bool        # 有冇可靠增量同步
    acl_granularity: Literal["none", "kb", "document"]
```

UI + lifecycle **讀 `capabilities` 決定行為**(退化規則見 §3.4)—— 一次寫嘅框架,接新 provider 唔使改 framework,只係宣告唔同 capability。

### 3.2 `SourceConnector` Protocol(含 5 點修正 ①–⑤)

```python
class SourceConnector(Protocol):
    capabilities: ConnectorCapabilities

    async def connect(self, credentials) -> ConnectionHandle: ...
    async def browse(self, handle, container_id=None) -> AsyncIterator[SourceContainer]: ...        # ②
    async def list_documents(self, handle, container_id) -> AsyncIterator[SourceDocumentRef]: ...   # ②③
    async def fetch_document(self, handle, doc_ref) -> SourceDocument: ...                           # ④
    async def get_principals(self, handle, doc_ref) -> list[Principal]: ...                          # ①
    async def delta(self, handle, container_id, token) -> DeltaResult: ...                           # ⑤(保留唔實作)
```

| method | 做咩 | 修正 |
|---|---|---|
| `connect` | 認證 → 攞 handle | ⑥ handle 封裝 token refresh |
| `browse` | 列可連容器(site / library / folder 樹)| ② 分頁 `AsyncIterator` |
| `list_documents` | 列容器內文件 | ②③ 分頁 + ref 帶 change-detection |
| `fetch_document` | 抓單一文件內容 | ④ stream / temp path |
| `get_principals` | 抽文件級權限 | ① 展平到 group 級(詳見 §5)|
| `delta` | 增量同步 | ⑤ 保留唔實作(capability-gate)|

### 3.3 五點修正(per DG-INT-3)+ ⑥⑦(入階段 1 plan,唔改 interface)

- **①** `get_principals` 展平到 **group 級非 user 級**(零 re-ingest;同 ADR-0067 一致)
- **②** `browse` / `list_documents` 分頁 `AsyncIterator`(大 library 上萬文件唔可以一次 `list[...]`)
- **③** `SourceDocumentRef` 帶 `etag` / `version` / `last_modified` / `size`
- **④** `fetch_document` stream / temp path(大掃描件唔好全 bytes-in-memory)
- **⑤** `delta` 保留但唔實作(`supports_delta=false`)
- **⑥** `ConnectionHandle` token refresh(§2.4)
- **⑦** per-doc 錯誤模型(單一文件失敗唔 abort batch,§8)

### 3.4 capability 退化規則(framework 共用)

| capability | 退化行為 |
|---|---|
| `supports_delta=false` | 隱藏「自動同步」,只提供排程 full re-ingest |
| `acl_granularity="none"` | 退化到 KB 層權限(該來源全部文件 = KB 嘅 ACL)|
| `acl_granularity="document"` | 行文件級 security trimming(填 `allowed_principals`)|
| `supports_browse=false` | UI 要用戶手填 container id(無樹狀瀏覽)|

### 3.5 資料模型(概念草案)

| 型別 | 欄位(概念)|
|---|---|
| `SourceContainer` | `id` / `name` / `type`(site/library/folder)/ `parent` |
| `SourceDocumentRef` | `id` / `name` / `path` / `etag` / `version` / `last_modified` / `size`(③)|
| `SourceDocument` | `ref` + `content`(stream / temp path)+ `metadata` + `allowed_principals`(④)|
| `Principal` | `kind`(user / group)+ `entra_guid`(① group 級)|
| `ConnectionHandle` | 認證 context + token refresh(⑥)|
| `DeltaResult` | `changes` + `new_token` + `resync_required`(⑤,保留)|

---

## §4 SharePoint connector 實作(Microsoft Graph)

> 把抽象 interface(§3)映射到 SharePoint via Microsoft Graph。階段 1 **唯一** concrete connector。`get_principals` 嘅權限映射深度(`transitiveMembers` / Anyone-link / 防爆量)喺 §5。

### 4.1 SharePoint capability 宣告

```python
ConnectorCapabilities(
    auth_kind="app_registration",   # Entra Sites.Selected
    supports_browse=True,
    supports_acl=True,
    supports_delta=False,           # 階段 1 唔實作(delta 對 library 層唔可靠,§6)
    acl_granularity="document",
)
```

### 4.2 `connect` — app-only token

- client credentials flow(`tenant_id` / `client_id` / secret|cert,§1.2)→ app-only token(application `Sites.Selected`)。
- `ConnectionHandle` 內部封裝 token refresh(⑥):長 ingestion run token 過期自動續。
- 存取機制:`azure-identity` + `httpx` managed-REST(傾向 over `msgraph-sdk`,H2 — §2.5;階段 1 plan 確認 + R8 mitigation)。

### 4.3 `browse` — 列 site / library / folder(② 分頁)

| 層 | Graph endpoint(概念)|
|---|---|
| 搵 site | `GET /sites?search=` / `GET /sites/{hostname}:/{site-path}` |
| 列 library(drive)| `GET /sites/{site-id}/drives` |
| 列 folder / 檔 | `GET /drives/{drive-id}/root/children` / `GET /drives/{drive-id}/items/{item-id}/children` |

分頁:Graph 用 `@odata.nextLink` continuation → connector 包成 `AsyncIterator[SourceContainer]`,逐頁 yield(唔一次過 load,防爆 memory + 超 Graph 分頁上限)。

### 4.4 `list_documents` — 列 driveItem(②③)

- `GET /drives/{drive-id}/items/{item-id}/children`(或 `/root/children`),`@odata.nextLink` 分頁。
- 每個 driveItem 映射成 `SourceDocumentRef`,**change-detection 欄位取 Graph 原生**:`eTag` / `cTag`(③)、`lastModifiedDateTime`、`size`。
- re-import 時用 ref 嘅 `eTag`/`cTag` 比對,只 re-ingest changed 文件慳成本。

### 4.5 `fetch_document` — 下載 stream(④)

- `GET /drives/{drive-id}/items/{item-id}/content` → **stream 落 temp file**(唔好全 bytes-in-memory,大掃描件頂唔順)。
- 把 temp file path 交俾 **EKP 既有 ingestion 入口**(現食 multipart upload)→ Docling pipeline 接手(**核心零改動**,§7)。
- 抓完即清 temp(per-doc lifecycle)。

### 4.6 `get_principals` — 抽文件級 ACL(① + 深度在 §5)

- `GET /drives/{drive-id}/items/{item-id}/permissions` → 抽 `grantedToIdentitiesV2`(user.id)+ group。
- 正規化 Entra GUID + 用 `GET /groups/{group-id}/transitiveMembers` 展 nested group **到 group 級**(① — 唔展到 member user)。
- Anyone-link / 特殊 principal / 防爆量(< 2,049 / file)→ **詳見 §5**。

### 4.7 `delta` — 保留唔實作(⑤)

- `supports_delta=False`;`GET /drives/{drive-id}/root/delta` **階段 1 唔接**(delta 對 library / folder 層權限變更唔可靠,會 `resyncRequired`,§6)。
- interface 保留 method + capability-gate,將來階段 3 加 auto-sync 唔使改 Protocol。

### 4.8 錯誤模型(⑦,詳見 §8)

- 單一 driveItem fetch / permission 抽取失敗 → 記 per-doc 失敗,**唔 abort 成個 batch**;framework orchestrator 收集成功 / 失敗報告(同 ADR-0043 reindex per-doc summary pattern 一致)。

### 4.9 per-site grant(呼應 §1.3)

- 匯入前 IT 要對每個目標 site 做 per-site grant(`POST /sites/{site-id}/permissions` 授 app `read` 角色);connector `connect` 只攞 token,**唔自動授權**(least-privilege 由 IT 控)。

---

## §5 權限映射(來源 ACL → `allowed_principals`)

> 統一整合層**最難一環**。把「有 ACL / 冇 ACL / 特殊 principal」嘅來源**統一收斂到 EKP `allowed_principals`**(文件級 ACL 欄,複用 RBAC track ADR-0066/0067)。query-time security trimming 邏輯**只寫一次、全 provider 共用**。

### 5.1 收斂點 = `allowed_principals`

每個 connector 嘅權限映射,最終都係「填同一個 `allowed_principals`」。SharePoint connector 嘅 `get_principals`(§4.6)輸出 → 正規化 → 寫入 chunk 嘅 `allowed_principals` → query-time GA 字串比對 filter(§2.2 / §7)。整合層同 RBAC track 係**同一條路兩段**,唔係兩件獨立工作。

### 5.2 抽取 + 正規化流程

```
GET /drives/{drive-id}/items/{item-id}/permissions
  → 抽 grantedToIdentitiesV2(user.id)+ group identity
  → 正規化成 Entra GUID
  → nested group:GET /groups/{group-id}/transitiveMembers 展平到 group 級(§5.3)
  → 特殊 principal 按規則處理(§5.4)
  → 防爆量檢查(§5.5)
  → 寫入 allowed_principals(Entra GUID 字串集)
```

### 5.3 nested group 展平 — **展到 group 級,唔展到 user 級**(①)

- 用 Graph **`transitiveMembers`**(**非**被 0-3 反證嘅 `transitiveMemberOf` — kill list #2)展開 **nested group(group-of-groups)**。
- 結果 = **flat group id set + 直接 user id**,**唔展到每個 member user**。
- application 最小權限 = `GroupMember.Read.All`。

**點解 group 級**(同 ADR-0067 group key 洞察一致):

| 做法 | 加 user 入 group | index 大細 | 改 membership |
|---|---|---|---|
| 展到 **user 級**(❌)| 要 re-stamp 全部文件 | 爆炸 | 重 re-ingest |
| 展到 **group 級**(✅ 採用)| **零 re-ingest** | 細 | 唔使 re-stamp |

→ query-time 用**登入用戶 token 帶嘅 group membership**比對 `allowed_principals`(§2.2);user 加入某 group **即時生效**。

### 5.4 特殊 principal 處理規則

| 來源 principal | 可否映射 | 階段 1 規則 |
|---|---|---|
| **Specific people** link | ✅ 帶可解析 `grantedToIdentitiesV2` user.id | 直接映射 |
| **Anyone** link | ❌ **無可解析 Entra object ID**(permission 物件只有 link facet)| **明確規則**:預設 **drop**(唔索引該 grant);可 config 改「當 public」/「拒絕索引整個文件」— 屬 KB 政策,階段 1 plan 定 default |
| **People in your organization** link | ⚠️ 不令內容出現喺 SharePoint search / Copilot(官方 surface)| 我哋自建 pipeline → 建議當 **tenant-wide / org principal**(一個代表全 org 嘅 group id);階段 1 plan 確認 |
| **非 Entra group**(SharePoint local group / 跨系統)| ⚠️ 非 Entra GUID 構造 | 模型化為 **external group**(參考 M365 Copilot connector external-groups 設計);階段 1 SharePoint 主力 = Entra group,local group 列 plan 處理 |

### 5.5 防爆量(scale 硬上限)

| 限制 | 數值 | 應對 |
|---|---|---|
| 單一用戶 group membership | **< 2,049**(超過結果不可預測)| 展開設上限保護 |
| query principal set | > 10,000 → Graph 直接 400 | query 側 principal set 截斷 / 分批 |
| ACL entry / file | SharePoint 1,000 · ADLS Gen2 32 | 抽取時知上限,超額策略 plan 定 |

→ 自家展 group **亦要防爆量**:`transitiveMembers` 展開設 < 2,049 / file 上限,超額 → 記 warning + 策略(截斷 / 退化 KB 層 / 拒索引)。

### 5.6 chunk-level ACL 傳播(未答缺口②)

文件切多 chunk,每 chunk 是否重複完整 `allowed_principals`?大文件 + 大 group set 下 index 膨脹 + query filter 效能 —— **無 production case,階段 1 implementation plan 要解**(per deep-research §7 缺口②)。候選:每 chunk 重複(簡單但膨脹)/ 文件級 ACL 表 join(慳空間但 query 複雜)。

### 5.7 認證(呼應 §2)

- `get_principals` 用 ingestion 側 application token(`Sites.Selected` + `GroupMember.Read.All`)。
- query-time 比對用 delegated / OBO per-user token(用戶自己嘅 group membership)。

---

## §6 撤權 / stale permission

> deep-research 最重要警示之一:**撤權係結構性有界延遲,無方案做到即時撤權**。設計要把呢個當前提,唔好假設有即時方案。

### 6.1 兩種「撤權」要分清(關鍵)

因為權限展到 **group 級**(§5.3),兩種撤權行為唔同:

| 撤權類型 | 例 | 階段 1 行為 |
|---|---|---|
| **(a) group membership 變**(user 加 / 出 group)| 某員工調離部門,移出該 group | ✅ **query-time 即時生效、零 re-ingest** —— query 側用用戶當前 token group membership 比對,user 一出 group 即唔再命中該 group 嘅 `allowed_principals` |
| **(b) 文件 ACL 變**(library / folder 層 grant 加 / 減 group)| 某 library 移除某 group 嘅讀權限 | ⚠️ 要**更新 `allowed_principals`** —— delta 唔可靠(§6.2)→ 靠 re-ingest(§6.3),有界延遲 |

→ group-level flatten 嘅紅利:最常見嘅撤權(人事異動 = membership 變)係**即時**嘅;只有**文件本身 ACL 改動**先要等 re-ingest。

### 6.2 為何唔可以靠 delta query(反證)

- Graph delta query **無法可靠捕捉 library / folder 層權限變更**(架構性):連 3 個 Prefer header(`deltashowremovedasdeleted` / `deltatraversepermissiongaps` / `deltashowsharingchanges`)都唔得;folder / library 層加減 user / group 會令 delta token 失效(`resyncRequired`)。
- 故 **撤權唔可以靠 delta**。(注:kill list #5 — 唔好引用「微軟員工確認 Graph 唔支援」嗰個被過度簡化嘅 framing;但「library 層 delta 唔可靠」本身由獨立 3-0 claim 確認。)

### 6.3 撤權補機制 = 排程 full re-ingest

- 文件 ACL 變(類型 b)→ 用**排程 full re-ingest / per-site re-crawl** 重抽 `/permissions` 重填 `allowed_principals`。
- 階段 1 = **按需手動匯入**,所以「撤權生效」= 用戶下次手動 re-import 嗰個 site / library 時更新 ACL(re-import 用 `eTag` / `cTag` 慳成本,但 ACL 變要重抽 `permissions`)。
- **自動排程 re-ingest = 階段 3(Tier 2,auto-sync,H4)**。

### 6.4 產品上明示有界延遲

- 撤權延遲(類型 b)**要喺產品上明示為有界延遲**(官方只給定性「timing lag」,無精確 SLA 數字)。
- **唔承諾即時撤權**;競品(Glean)「webhook 即時撤權」claim 被反證(1-2,kill list #3),唔跟。

### 6.5 未答缺口(承 §9)

- library / folder 層撤權補機制嘅實際頻率 vs 成本 + 實測延遲 = **缺口③**(階段 1 plan / 階段 3 設計補)。

---

## §7 與 EKP 核心銜接

> 設計鐵律落地點:connector sit **upstream**,交標準化文件落 EKP ingestion,**核心零改動**。

### 7.1 銜接全圖(component 對應)

```
C17 SourceConnector(SharePoint)
   │  fetch_document → temp file       get_principals → allowed_principals(group 級)
   ▼
EKP 既有 ingestion 入口(C08 POST /kb/{kb_id}/documents,現食 multipart)
   ▼
C01 Ingestion(Docling parsing / chunking / 圖文還原 / per-doc profile / per-KB config)── 零改動
   ▼
C03 Indexing(chunk + allowed_principals 寫入 Azure AI Search index)
   ▼
C04 Retrieval ← query-time GA 字串比對 security filter(用戶 principal set)
   ▲
C16 Users Service(allowed_principals 收斂 + query-time principal 解析)── RBAC track
```

### 7.2 ingestion 交接(零改動鐵律)

- connector `fetch_document`(§4.5)stream 落 temp → 交 **EKP 既有 multipart ingestion 入口**(C08 `POST /kb/{kb_id}/documents`,per CH-001)。
- 之後 **Docling pipeline 全程不變**:layout-aware parsing / chunking / 圖文還原(image recall / inline markers / section anchoring)/ per-doc profile / per-KB 可調配置 —— **無論文件由上傳定 SharePoint 嚟都一樣**。
- **零改動範圍**(明確):§3.3 / §3.5 + ADR-0041 / 0054 / 0056 等 ingestion 核心一律唔郁。

### 7.3 `allowed_principals` 注入(push-model,ingest 時)

- `get_principals`(§5)輸出 group 級 principal set → **ingest 時 stamp 落每個 chunk 嘅 `allowed_principals` 欄** → push 入 Azure AI Search index。
- 用 **GA 字串比對**(`allowed_principals` 字串集),**唔開** `permissionFilterOption=enabled`(preview Entra-native token-trim,無 SLA,kill list #1)。
- index schema 嘅 `allowed_principals` 欄 + stamp 邏輯 = **RBAC track(ADR-0066/0067,P2)提供**;connector 只負責**填內容**。整合層同 RBAC track 係同一條路兩段。

### 7.4 query-time security trimming(檢索時)

用戶 query → 取用戶 principal set(user GUID + token group membership,§2.2)→ Azure AI Search 加 GA filter:

```
allowed_principals/any(p: search.in(p, '<用戶 principal set>'))
```

只返回命中嘅 chunk。**呢段邏輯 RBAC track 已鋪(C04 / C16),全 provider 共用、只寫一次。**

### 7.5 混合來源 KB

- 一個 KB 可有**混合來源**(人手上傳 + SharePoint 匯入)。
- 上傳文件 → `allowed_principals` 跟 KB 層 / RBAC 既有規則;SharePoint 文件 → `allowed_principals` 跟來源文件級 ACL(§5)。
- 兩者收斂同一欄,query-time 同一 filter 處理。

### 7.6 EKP 側要加 / 改嘅(minimal)

| 項 | 屬邊 | 狀態 |
|---|---|---|
| index `allowed_principals` 欄 + ingest-time stamp | RBAC track ADR-0066 P2 | RBAC track 進行(非 connector 工作)|
| query-time GA 字串比對 filter(C04)| RBAC track ADR-0066 P2 | 同上 |
| ingestion 入口接受 connector-sourced 文件 + 帶 `allowed_principals` | C01 / C08 薄銜接 | 階段 1 plan(薄 adapter,核心零改動)|
| **C17 connector 本身** | 階段 1 新 code | 階段 1 plan |

→ connector 落地**唔需要改 ingestion 核心**;EKP 側嘅 ACL 欄 / filter 係 RBAC track 已規劃嘅嘢。

---

## §8 錯誤模型 + 生命週期

### 8.1 錯誤分層(fatal vs per-doc)

| 層 | 例 | 行為 |
|---|---|---|
| **Fatal**(停 batch)| connect / auth 失敗、token refresh 持續失敗、per-site 無權(§1.3 未 grant)| 整個匯入 job 停 + 明確 actionable 錯誤(邊步缺)|
| **Per-doc**(skip + 記,⑦)| 單一 driveItem fetch / parse / permission 抽取失敗 | **唔 abort batch** → 記 per-doc 失敗,繼續下一份 |

### 8.2 per-doc 失敗報告(⑦,對齊 ADR-0043)

- framework orchestrator 收集每份文件 `{doc_id, name, status: success|failed, error?}`。
- 匯入完成後畀用戶睇 **per-doc summary**(邊啲成功 / 邊啲失敗 / 原因),**唔係 all-or-nothing**。
- 對齊 EKP 既有 reindex per-doc summary pattern(ADR-0043)。

### 8.3 生命週期

| 階段 | 行為 |
|---|---|
| **初次匯入(full)**| `browse` → 用戶揀範圍 → `list_documents` → per-doc `fetch` + ingest + `allowed_principals` stamp → per-doc summary |
| **按需 re-import**| 用 `eTag` / `cTag` 比對只 re-ingest changed 文件(§4.4);**ACL 變要重抽 `permissions`**(§6.3);同一 doc = replace-in-place(對齊 CH-001 reindex Decision A)|
| **撤權**| membership 變 = query-time 即時(§6.1 a);文件 ACL 變 = re-import 更新(§6.1 b)|
| **credential**| `ConnectionHandle` token refresh(⑥);secret / cert 輪替(§1.4)|

### 8.4 健康監控(掛 C07 Observability)

- 匯入 job 狀態 / per-doc 成功率 / Graph API 錯誤率 + 限流(429)/ token 健康 / 防爆量 warning(§5.5)。
- 掛 EKP 既有 observability(C07 Langfuse / structlog),唔另起一套。

### 8.5 idempotency + 安全

- re-import 同一文件 = replace-in-place(唔重複建 chunk)。
- 全程守 H5:credential 絕不 log / commit;temp file 抓完即清(§4.5)。

---

## §9 範圍邊界 + 未答缺口

### 9.1 階段 1 明確**唔做**(守 H4 Tier 邊界)

| 唔做 | 留邊個階段 | 原因 |
|---|---|---|
| auto-sync(delta / 排程 / webhook 撤權)| 階段 3(Tier 2)| H4 明確 Tier 2;delta 對 library 層唔可靠(§6.2)|
| 多 provider(Google Drive / Box / Confluence)| 階段 2(Tier 2)| 範圍控制;interface 已 Tier 2-friendly,唔使重構 |
| turnkey SharePoint indexer | 永不 | 繞過 Docling 核心(§2.3)|
| preview Entra-native token-trim(`permissionFilterOption`)| 待 GA(缺口①)| 無 SLA(kill list #1)|
| server-side 自動 group 展開 | push-model 自己展(§5.3)| GA 路徑要自己展 |

> **🔴 Tier 邊界風險**:統一框架好易滑入 Tier 2 —— 要嚴守「階段 1 只落抽象 interface + **一個** SharePoint connector + 按需手動匯入」,唔好順手做多來源 / auto-sync。

### 9.2 未答缺口(承 deep-research §7,階段 1 plan / 後階段補)

| # | 缺口 | 何時解 |
|---|---|---|
| ① | **GA 時間線** — Entra-native token-trim 幾時 GA | 寫階段 1 plan 前重核;主路線押 GA 字串比對(現有做法),唔等 preview |
| ② | **chunk-level ACL 傳播** — 每 chunk 重複 `allowed_principals`?膨脹 + 效能 | 階段 1 implementation plan(§5.6)|
| ③ | **library 層撤權補機制** — 排程 re-ingest 頻率 vs 成本 + 實測延遲 | 階段 1 plan(手動)/ 階段 3(自動)|
| ④ | **分階段策略業界實證** — 「先手動後自動」common pattern? | 階段 2 前 focused research(需要時先做)|

### 9.3 階段 1 implementation plan 要落實嘅決定

- `SourceConnector` 正式型別簽名(本藍圖係概念草案)
- Anyone-link default 政策(drop / public / 拒索引,§5.4)
- credential 儲存方式(配置 / Key Vault,§1.4)
- chunk-ACL 傳播做法(§5.6 缺口②)
- 防爆量超額策略(§5.5)
- Graph 存取 dep(`httpx` managed-REST vs `msgraph-sdk`)+ R8 mitigation(H2,§2.5)

---

## §10 公司執行 checklist(runbook)

> **你帶去公司真實環境逐步做嘅清單。** 階段 A / B 一次性;C 起每次匯入。

### 階段 A — IT / tenant 前置(一次性)

- [ ] **A1** 確認目標 SharePoint site / document library(要匯入邊啲)
- [ ] **A2** Entra app registration:建 app → 攞 `tenant_id` / `client_id` → 建 client secret 或 certificate(生產建議 cert)
- [ ] **A3** 授權 + admin consent:`Sites.Selected`(application)+ `GroupMember.Read.All`(application)→ Entra admin consent
- [ ] **A4** **per-site grant**(每個目標 site):`POST /sites/{site-id}/permissions` 授該 app `read` 角色(§1.3 — consent ≠ 有權,缺呢步即拒)
- [ ] **A5** credential 安全儲存(階段 1 `.env` gitignored / Beta+ Azure Key Vault;絕不 commit,H5)
- [ ] **A6** 確認 query-time delegated / OBO 認證可用(重用 EKP Entra ID)

### 階段 B — EKP 側準備

- [ ] **B1** 確認 index 有 `allowed_principals` 欄 + query-time GA 字串比對 filter(**RBAC track ADR-0066 P2** — 非 connector 工作)
- [ ] **B2** 落 **C17 connector**(階段 1 implementation phase;先 plan 三件套 per §10 R1)
- [ ] **B3** ingestion 入口接受 connector-sourced 文件 + 帶 `allowed_principals`(薄銜接,核心零改動)

### 階段 C — 首次匯入(按需)

- [ ] **C1** `connect`(app-only token)
- [ ] **C2** `browse` → 揀 site / library / folder
- [ ] **C3** `list_documents` → `fetch_document` → ingest(Docling)→ stamp `allowed_principals`
- [ ] **C4** 睇 **per-doc summary**(成功 / 失敗 / 原因)

### 階段 D — 驗證(north-star + 安全)

- [ ] **D1** **圖文還原度不退**(north-star §15)—— connector-sourced 文件行同一 Docling pipeline,應同人手上傳一致(對 W43–85 baseline)
- [ ] **D2** **security trimming 正確** —— 有權用戶查到 / 冇權用戶查唔到(用唔同 group 用戶測)
- [ ] **D3** **撤權測試** —— user 出 group → query-time 即時唔見(§6.1 a);文件 ACL 變 → re-import 後更新(§6.1 b)
- [ ] **D4** **per-doc 失敗** —— 一份壞文件唔影響其他(§8.1)

### 階段 E — 維運

- [ ] **E1** 撤權延遲產品上明示為**有界延遲**(唔承諾即時)
- [ ] **E2** re-import 頻率(階段 1 人手;自動排程 = 階段 3)
- [ ] **E3** 健康監控掛 C07(匯入狀態 / Graph 錯誤率 / 限流 / token 健康)

---

## 附錄

### A. Microsoft Graph endpoints 一覽(階段 1)

| 用途 | endpoint(概念)|
|---|---|
| per-site grant | `POST /sites/{site-id}/permissions`(授 app read 角色)|
| 搵 site | `GET /sites?search=` / `GET /sites/{hostname}:/{site-path}` |
| 列 library | `GET /sites/{site-id}/drives` |
| 列 folder / 檔 | `GET /drives/{drive-id}/root/children` / `.../items/{item-id}/children` |
| 下載內容 | `GET /drives/{drive-id}/items/{item-id}/content` |
| 抽 ACL | `GET /drives/{drive-id}/items/{item-id}/permissions` |
| 展 nested group | `GET /groups/{group-id}/transitiveMembers` |
| delta(**唔實作**)| `GET /drives/{drive-id}/root/delta` |

> 分頁全部用 `@odata.nextLink` continuation。

### B. 認證 scopes

| 用途 | 模式 | 最小權限 |
|---|---|---|
| ingestion(拉文件 + 抽 ACL + 展 group)| application | `Sites.Selected` + `GroupMember.Read.All` |
| per-site 授權 | — | site `read` 角色 |
| query-time trimming | delegated / OBO | per-user token |

### C. 來源(官方優先)

完整來源分層(20 confirmed claims)見 deep-research doc `sharepoint_connector_permission_mapping_external_research_20260628.md` §附錄。關鍵官方 Microsoft Learn anchor:

- Document-Level Access Control / Index ACL & RBAC push API / Query-time enforcement / Security filters(Azure AI Search)
- `Sites.Selected` permissions overview / `transitiveMembers` / Shareable links(Anyone / Specific people / Org)/ `driveItem: delta`(Microsoft Graph)
- External groups for connectors(Microsoft Graph)

### D. 配套文件

- ADR-0070(Accepted)— 決策 + scope decisions
- `unified_integration_layer_architecture_20260628.md` — 設計骨架(7 正交關注點)
- `sharepoint_connector_permission_mapping_external_research_20260628.md` — 權限實證 + kill list
- COMPONENT_CATALOG.md **C17** — component 登記
- `docs/01-planning/enterprise-rbac/` — RBAC track(`allowed_principals` 地基)
- 進度 tracker `integration_layer_phase1_sharepoint_solution_PROGRESS.md`

---

**藍圖正文 §0–§10 + 附錄 完**(2026-06-29)。下一步:按 §10 R1 考慮開階段 1 implementation phase(`SourceConnector` interface + SharePoint connector),先 plan 三件套。
