# W102 — SharePoint 連接 UI 配置(managed connection + Key Vault)

> **狀態**:**`proposed` — 等用戶 review + approve 先 implement(R1 approval gate;未 approve 前唔 code)**
> **分類**:新功能 / 整合層增強(phase 級,跨 backend + 前端 + secret 寫入 + ADR + 測試)
> **方向**:提案甲(用戶 2026-07-01 AskUserQuestion 拍板)—— 見 [`docs/09-analysis/integration_connection_config_ui_proposal_20260701.md`](../../09-analysis/integration_connection_config_ui_proposal_20260701.md)
> **Owner**:Chris(架構決策)
> **關聯**:ADR-0026(admin 9-provider 連接)· ADR-0070(整合層)· ADR-0072(**待寫,本 phase 產出**)· BACKLOG B-09

---

## §1 Scope + 目標

把 SharePoint 連接 credential 由**只可 `.env` + 重啟** 改為**經 admin UI 配置 + Key Vault 安全儲存**,複用既有 `/admin/connections`(ADR-0026)pattern。

**目標(成功定義)**:admin 可喺 Settings → Connections 揀 SharePoint,填 tenant / client-id、輸入 client secret(或指定 cert),secret 寫入 Key Vault(畫面 mask、絕不 log / commit),按 Test connection 驗證;整合層 wizard 之後由呢個 managed connection 攞 credential,**唔再需要手改 `.env` + 重啟**。

**初版 scope 收窄**:**單一** SharePoint 連接(對齊現 `.env` 單組值)。多連接 / 多 tenant、OAuth(提案丙)、per-site grant UI 化 = **out of scope**(§5)。

---

## §2 Deliverables

| # | Deliverable | 層 |
|---|---|---|
| **F1** | ADR-0072(**proposed**)— SharePoint 做 managed connection + 「set-secret from UI」能力 + credential 來源優先序(managed > `.env` fallback)+ H5 secret 處理 | 設計 |
| **F2** | admin provider 加 SharePoint 第 10 個(`default_providers()` + `ProviderConfig`;新 category `integration`;非 secret field = tenant_id / client_id / credential_type;`secret_kv_ref="ekp-sharepoint-client-secret"`) | backend |
| **F3** | **「set-secret from UI」新能力**(核心)—— 現有 pattern 只有 rotate(app 生成新值),但 SharePoint secret 係 Azure 發嘅要**用戶輸入**;加 `POST /admin/connections/{id}/set-secret`(body 帶 secret,經 `KeyVaultProvider.set_secret` 寫入,回 masked preview,**絕不 log / 回傳真值**)。含 cert 路徑選項(輸入 cert 引用,dev 用 `certificate_path`) | backend |
| **F4** | 整合層 credential 來源改動 —— `_sharepoint_credentials_or_503` 由 managed connection 讀(tenant/client-id 由 `ProviderConfig`,secret 由 Key Vault `get_secret(secret_kv_ref)`);**`.env` 降級做 fallback**(managed 未設就用 `.env`,零回歸) | backend |
| **F5** | 前端 Settings → Connections SharePoint 卡 —— tenant / client-id 表單 + secret 輸入(masked)+ Test connection + set-secret;複用既有 provider 卡 pattern(H7 對齊 Settings mockup) | 前端 |
| **F6** | Test connection 打通 —— SharePoint 卡「Test」行 `resolve-site`-style 連通探測(config-state + 可選真 probe,對齊 ADR-0026 test 慣例) | backend + 前端 |
| **F7** | 測試 —— backend(managed 讀取、`.env` fallback、set-secret 寫入 + mask、未配置 503、secret 不外洩)+ 前端(卡 render / 表單);ruff / mypy / eslint / tsc clean | 測試 |
| **F8** | 文件同步 —— runbook §2 加「UI 配置」路徑(`.env` 保留做 fallback)+ user-guide 連接章節 + BACKLOG B-09 → `完成` + closeout retro | 文件 |

---

## §3 Acceptance Criteria(Gate G-W102）

- [ ] **AC1**:admin 喺 UI 填 tenant / client-id + 輸入 secret → secret 寫入 Key Vault,`GET` 回 masked preview(`***`+尾4碼),**真值永不回傳 / 永不 log**(grep log 證實)。
- [ ] **AC2**:整合層 `resolve-site` / `browse` 由 managed connection 攞 credential 成功(managed 已設時);managed 未設 → **fback `.env`**;兩者皆無 → 503 not configured(訊息更新提兩條路)。
- [ ] **AC3**:`.env`-only 舊路徑**零回歸**(唔設 managed connection,行為同今日一致 → W100/W101 route 測試全綠)。
- [ ] **AC4**:Test connection 喺 UI 回正確狀態(configured / not-tested / failed)。
- [ ] **AC5**:H5 稽核 —— secret 只 transit-to-Key-Vault + write-only,無 plaintext 落 log / DB / git;`.env` 仍 gitignored。
- [ ] **AC6**:全測試綠 + linter clean;ingestion 核心 diff = 零(只碰 credential 來源,唔碰匯入 pipeline)。
- [ ] **AC7**:ADR-0072 Accepted(Chris 拍板)。

---

## §4 設計決定(implementation 前 lock)

- **D-1(核心)set-secret 能力**:現 admin connections 只有 rotate(app 生成),SharePoint 需**用戶輸入 Azure 發嘅 secret** → 加 set-secret 端點寫 Key Vault。**H5 敏感面**:secret 只喺 request→Key Vault transit,route / storage / log 一律唔留 plaintext,回應只 masked。
- **D-2 credential 來源優先序**:managed connection(Key Vault)> `.env` fallback。理由:平滑遷移、零回歸、dev 仍可用 `.env`。
- **D-3 category**:新增 `integration`(或沿用 `identity`)—— ADR-0072 定;影響 Settings 卡分組。
- **D-4 cert 處理**:client secret(UI 輸入)為主;certificate 初版接受「cert 引用 / 路徑」(生產 cert 上載 = follow-up,避免 UI 傳大檔 + 私鑰處理複雜度)。
- **D-5 單連接**:初版一個 SharePoint 連接(對齊現 `.env`);多 named connection = follow-up(BACKLOG）。

---

## §5 Out of Scope(明確唔做)

- 多連接 / 多 tenant named connections(follow-up）。
- OAuth「Connect」flow(提案丙,需 H1 ADR;另議）。
- **per-site `Sites.Selected` grant UI 化**(本質 IT / 高權限動作,提案 §3 誠實前提;任何方案都消除唔到)。
- auto-sync / 多 provider connector(Tier 2,H4)。
- 生產 cert 檔上載 UI(D-4，follow-up）。

---

## §6 H-constraint / ADR 影響

- **H5**:核心相關 —— secret UI 輸入 → Key Vault(合規,前提係唔 log / 唔 persist plaintext,AC1/AC5 守）。
- **H2**:**無新 vendor / dependency**(Key Vault + Graph + azure-identity 已在）。
- **H1**:credential 來源 + 新 admin 能力屬架構-adjacent → **需 ADR-0072**(F1）;amends ADR-0026 + ADR-0070。
- **H7**:F5 前端卡對齊 Settings Connections mockup。
- **H4**:守 —— 唔掂多 provider / auto-sync。

---

## §7 Risks

| Risk | 緩解 |
|---|---|
| secret 意外 log / 回傳(H5 破口) | 專門測試 grep log + 回應 schema 只 masked;code review 針對 set-secret 路徑 |
| managed vs `.env` 來源混淆 | D-2 明確優先序 + AC3 零回歸測試 + log 標示來源 |
| 現有 admin connections 只 rotate 無 set → 改動觸及共用 pattern | set-secret 做**新增**端點,唔改 rotate;InMemory + Postgres backend 對稱加 |
| Test connection 真 probe 撞真 tenant(D4） | 對齊 ADR-0026 config-state 探測為主,真 probe 可選;live 真驗證仍走 runbook |

---

## §8 Changelog

- 2026-07-01:plan 建立(`proposed`)—— 方向甲(用戶 AskUserQuestion 拍板);**等 approve 先 implement**。

---

> **下一步**:用戶 review 本 plan → approve(或調 scope / 分類）→ 我建 `checklist.md` + `progress.md` + kickoff → 先寫 ADR-0072 → 逐 F implement。**未 approve 前唔 code。**
