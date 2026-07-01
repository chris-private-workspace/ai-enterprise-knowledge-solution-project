# 統一整合層階段 1 — SharePoint live 驗證 Runbook(可執行版)

> **用途**:真 tenant 到手後,**拎住逐步做**嘅 live 端到端驗證清單。呢份係方案藍圖 [`integration_layer_phase1_sharepoint_solution.md`](./integration_layer_phase1_sharepoint_solution.md) §10 A–E checklist 嘅**可執行展開版** —— §10 係概念骨架,呢度係確切 `.env` key / 端點 / curl / UI 步驟 / 預期結果 / 故障對照。
>
> **何時用**:企業 IT 已完成 Entra app registration + `Sites.Selected` per-site grant(§1 前置),你手上有 `tenant_id` / `client_id` / secret(或 cert)+ 已授權嘅 site URL。**未有真 tenant 前跑唔到**(D4 — 本機造唔到,前端 layout 已用 mock demo 對齊驗證,見 BACKLOG B-01)。
>
> **範圍**:階段 1 = **按需手動匯入**(守 H4;多 provider + auto-sync = Tier 2,唔喺呢份)。
>
> **狀態**:backend(W100 G-PASS)+ 前端(W101 G-PASS)已 landed;本 runbook 未執行(blocked on 真 tenant)。

---

## §0 一頁速覽(三段)

```
[IT 交付物] ──► [EKP 側配置] ──► [驗證]
 tenant_id       .env 填 4 個      連通冒煙 (curl resolve-site)
 client_id       SHAREPOINT_*      → UI wizard 4 步走查
 secret/cert     重啟 backend      → north-star + 安全 (D1-D4)
 已 grant site    (reload=False!)   → 故障對照 + 撤權測試
```

三個 gate:**(G-連通)** resolve-site 回 200 → token + grant OK;**(G-匯入)** import per-doc summary 成功;**(G-還原+安全)** 圖文還原不退 + security trimming 正確。

---

## §1 前置:向 IT 拿齊 4 樣(缺一跑唔到)

真 live 驗證開始前,確認手上有以下 4 樣(全部由公司 IT / Entra admin 產出,對應藍圖 §1 P1–P6):

| # | 你要拿到 | 對應 | 備註 |
|---|---|---|---|
| 1 | **`tenant_id`**(Directory / tenant ID)| P2 | Entra app registration |
| 2 | **`client_id`**(Application ID)| P2 | 同上 app |
| 3 | **client secret** *或* **certificate 檔路徑** | P2 / P5 | 生產建議 cert;secret dev 可 |
| 4 | **已 per-site grant 嘅目標 site URL** | P3+P4 | 例 `https://contoso.sharepoint.com/sites/manuals` |

### 1.1 IT 側必須做完嘅授權(否則 site 零權限 —— 最易踩)

`Sites.Selected` 係「同意都唔等於有權」模型,**三步缺一即拒**(藍圖 §1.3):

1. **App 層**:app registration 加 **application** permission:`Sites.Selected` + `GroupMember.Read.All`(後者用嚟展 nested group 到 group 級,藍圖 §5.3 / 附錄 B)。
2. **Tenant consent**:Entra admin 對呢兩個 permission 做 **admin consent**。
   - ⚠️ 做完 1+2,app 對**任何** site 仍然零權限 —— 只係「有資格被逐 site 授權」。
3. **Per-site grant**(每個目標 site,由 site / SharePoint admin 做):
   ```http
   POST https://graph.microsoft.com/v1.0/sites/{site-id}/permissions
   Content-Type: application/json

   {
     "roles": ["read"],
     "grantedToIdentities": [
       { "application": { "id": "{client-id}", "displayName": "EKP ingestion app" } }
     ]
   }
   ```
   > `read` 足夠 ingestion,唔需要 write。確切 body 以 Microsoft Learn「Sites.Selected permissions」官方為準(藍圖 §附錄 C)。`{site-id}` 可由 `GET /sites/{hostname}:/{server-relative-path}` 攞。

### 1.2 query-time 認證(P6)

檢索時按登入用戶做 security trimming,重用 EKP 既有 Entra ID(W7–W8 bridge)。dev 階段用 mock auth 亦可先驗 ingestion + 匯入路;真 per-user trimming 驗證見 §5 D2。

---

## §2 EKP 側配置(UI 配置 或 `.env` + 重啟)

> **W102 / ADR-0072 更新**:credential 現可經 **UI 配置** —— Settings → Connections → **SharePoint** 卡:填 tenant / client-id(Save)+ 貼 client secret(Store secret,寫入 Key Vault、masked、絕不回傳/log,H5)。來源優先序 **managed connection > `.env` fallback**:UI 已配置就用 UI;未配置就讀下面 `.env`(零回歸)。生產建議 UI + Key Vault;dev 可續用 `.env`。**per-site `Sites.Selected` grant 仍係 IT 動作**(§1.1 第 3 步),UI 配置唔改變呢點。UI 路免重啟(即時生效);`.env` 路仍需重啟(§2.2)。

### 2.1 填 4 個環境變數(逐字,對應 `backend/storage/settings.py`)

喺 `backend/.env`(gitignored,**絕不 commit** — H5)加:

```bash
SHAREPOINT_TENANT_ID=<tenant_id>
SHAREPOINT_CLIENT_ID=<client_id>
# 二選一:
SHAREPOINT_CLIENT_SECRET=<client_secret>
# 或(生產建議):
SHAREPOINT_CERTIFICATE_PATH=<cert 檔絕對路徑>

# 可選:Anyone-link 政策(預設 drop)
SHAREPOINT_ANYONE_POLICY=drop   # drop | public | reject
```

- **判斷已配置**:route `_sharepoint_credentials_or_503` 要求 `tenant_id` + `client_id` + (`client_secret` 或 `certificate_path`)三者齊,否則所有端點回 **503**「SharePoint integration not configured」。
- **`SHAREPOINT_ANYONE_POLICY`**:`drop`(預設,Anyone-link 唔映射做公開 principal,最保守)/ `public`(映射公開)/ `reject`(遇 Anyone-link 報錯)。首次驗證用 `drop`。
- **Beta+**:secret 改放 Azure Key Vault(設 `KEY_VAULT_URL` 即啟 `AzureKeyVaultProvider`,藍圖 §1.4)。

### 2.2 重啟 backend(關鍵 — 唔重啟 = 跑 stale config)

> ⚠️ backend `python -m api.server` **無 `--reload`**;改 `.env` 後 running backend **唔會** pick up 新 config,會繼續跑舊值(memory `project_stale_backend_no_reload`)。**必須重啟**。

重啟後確認端點由 503 → 可連(見 §3)。

---

## §3 連通冒煙(先 curl,早捕 403 / 認證錯)

入 UI 之前,先用 curl 打 `resolve-site` 確認 **token + per-site grant** 通,可以喺 wizard 之前隔離「認證 / 授權」問題。

```bash
# 需要 admin/editor 身份嘅 auth token(dev mock auth 見 memory / user-guide)
curl -X POST http://localhost:8000/integration/sharepoint/resolve-site \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"site_url":"https://contoso.sharepoint.com/sites/manuals"}'
```

| 回應 | 意思 | 下一步 |
|---|---|---|
| **200** + site container JSON | ✅ token + grant OK(**G-連通** 過)| 入 §4 UI |
| **503** not configured | `.env` 未填齊或未重啟 | 返 §2 |
| **5xx**(connect/auth/403-no-grant)| token OK 但 site **未 per-site grant**,或 consent 未做 | 返 §1.1 第 3 步 |
| **401** | auth token 無效 / 非 admin·editor | 換 admin/editor token |
| **422** invalid site URL | URL 格式錯 | 用 `https://<tenant>.sharepoint.com/sites/<name>` |

> 可順手 `GET /integration/sharepoint/browse`(唔帶 `container_id` = top level)確認能列 site。

---

## §4 UI wizard 走查(前端 4 步,W101)

### 4.1 前置(EKP 側)

- 目標 **KB 已存在**(冇就先 `/kb/new` 建)。
- 你係 **admin 或 editor**(端點 `require_role("admin","editor")`)。
- 你對目標 KB 有 **edit** ACL(import 額外 `assert_kb_access(kb_id,"edit")`,body-aware)。bootstrap admin 見 RBAC track。

### 4.2 逐步(對 mockup `integration-import/` + memory demo 截圖)

1. **Sidebar → Integrations**(頂層 Workspace section)→ SharePoint connector card →「Import documents」。
2. **Step 1 Connect**:揀目標 KB + 填 site URL →「Test connection」(= `resolve-site`)→ 出 **Connected** badge → Continue。
   - credential **唔喺 UI 輸入**(唯讀 banner「server-side configured」,H5 — #2 deviation,已 approve)。
3. **Step 2 Select**:左樹 `browse`(site→library→folder,lazy)→ 揀 folder → 右 table `list_documents` → checkbox 個別揀文件 → 「Import N documents」。
4. **Step 3 Import**:整體 progress 過場(backend 同步無 SSE — 方案 A)→ 自動去 Step 4。
5. **Step 4 Summary**:per-doc **READY / FAILED** table(失敗有原因,例 scan-PDF ADR-0065)+ mini-stats(Imported / Failed / Documents)+「View knowledge base」。

**G-匯入** 過 = Step 4 見到成功 doc + 失敗唔阻其他(§8.1 per-doc)。

---

## §5 north-star + 安全驗證(D1–D4,展開藍圖 §10 階段 D)

| ID | 驗證 | 做法 | 通過準則 |
|---|---|---|---|
| **D1** | **圖文還原度不退**(north-star §15)| 匯入嘅文件行**同一** Docling pipeline,同人手上傳一致 → 去 `/chat` 問該文件內容,睇圖文還原 | 對 W43–85 baseline 不退(圖跟隨原文段還原,非退底部)|
| **D2** | **security trimming 正確** | 用**有權** group 用戶 + **冇權** group 用戶各查一次 | 有權查到 / 冇權查唔到(§7.4 query-time GA 字串比對 filter)|
| **D3** | **撤權** | (a) user 出 group → query-time **即時**唔見(§6.1 membership);(b) 文件 ACL 改 → **re-import 後**先更新(§6.1 文件級,有界延遲非即時)| a 即時 / b re-import 後 |
| **D4** | **per-doc 失敗隔離** | 匯入一份壞文件 + 幾份好文件 | 壞嗰份 FAILED,其餘照 READY(§8.1)|

> **north-star 提醒**(§15):D1 唔係「每段配圖」,係**忠實還原原文檔本來圖文關係**;connector-sourced 文件應同上傳版一致,因為行同一核心(§7.2 零改動鐵律)。

---

## §6 故障排查對照表

| 症狀 | 最可能原因 | 解法 |
|---|---|---|
| 全部端點 **503** not configured | `.env` 4 變數未齊 / 未重啟 backend | §2.1 填齊 + §2.2 重啟 |
| resolve-site **5xx**(非 503)| site 未 per-site grant(consent≠有權)| §1.1 第 3 步逐 site grant |
| **401 / 403** 入唔到端點 | 非 admin/editor,或對 KB 無 edit ACL | 換角色 / grant KB edit |
| **422** invalid site URL | URL 格式 | `https://<tenant>.sharepoint.com/sites/<name>` |
| browse / documents 空 | folder 真係空,或 grant 只到某 subsite | 換 container / 確認 grant 範圍 |
| list 疑似截斷 | server-side cap `_LIST_CAP=2000`(D-6,**會 log** `integration_list_cap_hit`)| 大 library:分 folder 匯入(continuation token HTTP transit = 階段 2)|
| per-doc **FAILED: scan requires confirmation** | scan PDF guard(ADR-0065)| 屬預期;force override 見 scan guard memory |
| 匯入成功但 chat 查唔到 | index 未有 `allowed_principals` 欄 / filter,或 stamp 失敗 | 確認 RBAC track ADR-0066 P2 已 landed(藍圖 §10 B1)|
| 圖文還原變差 | **唔應該**(同一核心)— 若真退,先驗係咪同上傳版都退 | 屬核心問題非 connector,另開 bug |

---

## §7 撤權 / 回滾 / 清理

- **撤權兩控制點**(藍圖 §6.1):移除 per-site grant(`DELETE /sites/{site-id}/permissions/{perm-id}`)或移除 app consent → 即斷 ingestion 讀權。
- **回滾配置**:清空 `.env` 嘅 `SHAREPOINT_*` + 重啟 → 端點回 503(唔影響已匯入文件)。
- **清匯入文件**:當普通 KB 文件由 `/kb/{id}` 刪(匯入後 = 一般 KB doc,無特殊清理)。
- **撤權延遲**:產品上明示**有界延遲**(文件級 ACL 變更靠排程 re-ingest,唔承諾即時 — 藍圖 §6.4 / §10 E1)。

---

## §8 執行後記錄(驗證完做)

- ✅ 全通過 → 更新 BACKLOG **B-01**(live 驗證 done,`進行中`→ 可 `完成`)+ `W100-integration-sharepoint-phase1/progress.md` 記 live run 結果 + 移除 carry-over ①。
- ⚠️ 有問題 → 開 bug(`docs/03-implementation/bugs/`),Sev 按影響;認證 / 授權類問題多數係 §1 IT 側,非 code。
- 📌 follow-up principal(org-link / Anyone-public / external_group 端到端)= 另一 carry-over,需 query 側 inject org/public token,唔喺本次 default(`SHAREPOINT_ANYONE_POLICY=drop`)路徑。

---

## 附:關鍵事實錨(全部已對 code first-hand 核對)

- **環境變數**(`backend/storage/settings.py`):`sharepoint_tenant_id` / `_client_id` / `_client_secret` / `_certificate_path` / `_anyone_policy`(`drop`|`public`|`reject`,預設 `drop`)。
- **端點**(`backend/api/routes/integration.py`,prefix `/integration/sharepoint`):`POST /resolve-site`(body `{site_url}`)/ `GET /browse?container_id=`(略 = top)/ `GET /documents?container_id=`(required)/ `POST /import`(body `{kb_id, container_ids[], documents[]}`,兩者皆空→422)。
- **RBAC**:全部 `require_role("admin","editor")`;`/import` 額外 `assert_kb_access(kb_id,"edit")`(body-aware)。
- **未配置**:所有端點 503(detail 列 4 個 env key)。
- **cap**:browse/documents server-side `_LIST_CAP=2000`,截斷 log `integration_list_cap_hit`(no silent cap)。
- **零改動鐵律**:production adapter 寫 doc-level ACL rows → 既有 `_run_ingest_pipeline` 5.2 override stamp,ingestion 核心零改動(§7.2)。

**配套**:藍圖 [`integration_layer_phase1_sharepoint_solution.md`](./integration_layer_phase1_sharepoint_solution.md)(§1 前置 / §5 權限映射 / §6 撤權 / §8 錯誤模型)· ADR-0070(Accepted)· ADR-0071(前端 IA)· COMPONENT_CATALOG C17 · deep-research `sharepoint_connector_permission_mapping_external_research_20260628.md`。
