# 設計提案 — SharePoint 連接改用 UI 配置(甲/乙/丙 比較)

> **日期**:2026-07-01
> **作者**:Claude(EKP AI）· **決策擁有者**:Chris
> **狀態**:**`proposed`** — 決策用,**未 code**,等用戶 review + approve 方向後先落實(per PROCESS.md §1.3 approval gate + memory `feedback_change_spec_approval_gate`)
> **觸發**:2026-07-01 用戶測試 pushback —「唔可以喺 UI 建立同 Azure / Microsoft 環境嘅連接好唔現實;其他平台都容許用戶自行配置」。並更正我先前「credential 入 UI 會違反 H5」嘅錯誤陳述。
> **關聯**:ADR-0070(整合層,Accepted)· ADR-0026(admin 9-provider 連接管理)· ADR-0071 · [`integration_import_browse_scope_analysis_20260701.md`](./integration_import_browse_scope_analysis_20260701.md)(B-08)· 藍圖 [`integration_layer_phase1_sharepoint_solution.md`](./integration_layer_phase1_sharepoint_solution.md)

---

## 1. 問題陳述 + H5 更正

**現狀**:SharePoint 連接 credential(tenant / client-id / secret 或 cert)只可經 server 端 `.env` 配置 + 重啟 backend;wizard step 1 顯示唯讀「server-side configured」banner,唔收 credential。

**用戶質疑(成立)**:對「多環境 / 多連接 / 自助配置」,`.env` 唔現實(一個檔一組值、要人手改 + 重啟、唔支援多連接);成熟平台一般容許用戶喺 UI 配置外部連接。

**H5 更正**:CLAUDE.md §5.5 H5 規管嘅係 **secret 唔可以 commit 入 git / 唔可以 hard-code / 要安全儲存**(POC `.env` → Beta+ Azure Key Vault),**並冇禁止「UI 輸入 credential」**。一個 UI 表單收 credential → 寫入 Key Vault → 畫面 mask 真值,係完全 H5-compliant。先前「UI 會違反 H5」屬過度陳述,本提案更正。

---

## 2. 現狀 + 可複用資產(全部已 build,first-hand 核對)

呢個能力 EKP **架構上已有大部分零件**,唔係從零:

| 資產 | 位置 | 對本提案意義 |
|---|---|---|
| **admin 連接管理 pattern** | `backend/api/routes/admin/connections.py`(ADR-0026)—— 9 provider `GET / PATCH / test / rotate-secret`,secret 存 Key Vault、UI mask(`***`+尾4碼) | **正正係「UI 配置連接 + secret 安全」模式**,SharePoint 加做 provider 即可 |
| **Key Vault 寫入** | `storage/key_vault.py` `KeyVaultProvider.set_secret(name, value)`(+ `EnvVarProvider` dev fallback) | 可寫入**用戶輸入**嘅新 secret(唔止 rotate) |
| **前端連接 surface** | `frontend/app/(app)/settings/page.tsx`(Settings 內連接配置) | 已有 admin 配置 UI 落腳點 |
| **mockup 原設計** | `integration-import/20-step1-connect.html` step 1 **本身就有** Tenant ID / App ID / Credential 欄 + hint「Key Vault at Beta+, H5」 | UI 配置一直係設計意圖;實作階段 1 先簡化成 `.env`(D-4 偏離) |
| **credential 型別** | `SharePointCredentials(tenant_id, client_id, client_secret?, certificate_path?)` | 連接 config 要存嘅 field 已定義 |

**結論**:所需基建(Key Vault 寫入 / admin 連接 CRUD / masked secret / 前端 surface)全部已存在;SharePoint 只係未接上去。

---

## 3. 一個貫穿三方案嘅重要事實(誠實前提)

無論邊個方案,**`Sites.Selected` per-site grant 本質上係 IT / Entra admin 動作**,唔可能全自助零 IT:

- app 對每個 site 要 IT 逐個 grant(`POST /sites/{site-id}/permissions`,藍圖 §1.3)。呢步要 site / SharePoint admin 權限,平台自己做唔到(除非攞 `Sites.FullControl.All` 高權限 → 違反 least-privilege,ADR-0070 §2.3 已 reject)。
- 連 Copilot 式 connector 都係靠「admin consent + 用戶自身 delegated 訪問」,唔係完全零 IT。

**所以本提案解決嘅係「app credential 配置搬上 UI」**(tenant / client-id / secret 唔使改檔 + 重啟);**per-site 授權仍係 IT 一次性動作**。要連 per-site grant 都 UI 化 = 另一個更大課題(需高權限,另議)。呢點必須對 stakeholder 講清楚,免得期望「UI 一 click 全自助」。

---

## 4. 分類建議

屬 **新功能 / 整合層增強**(非 bug、非純 change adjacent behavior)。涉 backend(連接來源)+ 前端(配置 UI)+ secret 寫入路徑 + 測試 → **建議當一個 phase(W102+）** 開 `plan.md`(per §10 R1);若揀最小 scope 嘅甲(單連接)亦可縮做一個 Change(CH-NNN)。**確切分類喺方向拍板後定**。

---

## 5. 三方案詳述

### 甲 — 把 SharePoint 加入 `/admin/connections` 管理(推薦）

**設計**:SharePoint 成為 admin 連接管理嘅第 10 個 provider。
- Backend:`AdminProviderConfigBackend` 加 SharePoint config(tenant_id / client_id / credential_type);secret / cert 經 `KeyVaultProvider.set_secret` 存 Key Vault。整合層 `_sharepoint_credentials_or_503` 改為由 managed connection 讀(Key Vault 攞 secret),`.env` 降級做 fallback。
- 前端:Settings → Connections 加 SharePoint 卡(tenant / client-id / credential 表單 + Test connection + rotate)。
- 複用既有 `PATCH` / `test` / `rotate-secret` 端點模式(ADR-0026)。

**多連接**:9-provider 模型現為 one-config-per-provider(單例)。初版可先支援**單一 SharePoint 連接**(對齊現 `.env`);多連接 / 多 tenant(named connections list)列 follow-up。

**H-constraint / ADR**:H5 ✅(Key Vault + masked);**無新 vendor**(Key Vault + Graph 已在,H2 ✅);需一份短 ADR 或 ADR-0026/0070 amendment(記「SharePoint 做 managed connection」+ credential 來源優先序 managed > `.env`)。

**優**:複用已 build pattern,擴充非重做;H5-compliant;credential 配置離開 per-import wizard,放正確位置(admin 設定);天然延伸多連接。
**缺**:per-site grant 仍 IT 步驟(§3);初版單連接。
**工作量**:**中**。

### 乙 — 還原 wizard step 1 嘅 credential 欄

**設計**:把 mockup step 1 嗰組 Tenant / App ID / Credential 欄還原落 import wizard,提交時寫 Key Vault。

**H-constraint / ADR**:H5 ✅;**H7 正向**(還原貼近 mockup,非偏離);ADR 影響細。

**優**:UI 改動最細(mockup 現成);還原設計原意。
**缺**:credential 配置**耦合喺 per-import wizard** —— 但 credential 係一次性 admin setup,唔應該每次匯入都見 / 重入;多連接無自然歸屬;架構位置差。
**工作量**:**中細**(但 UX 位置唔理想)。

### 丙 — OAuth「Connect」流程(最現代,長線方向）

**設計**:admin 撳「Connect SharePoint」→ 轉去 Microsoft admin-consent / auth-code flow → callback 收 + 存授權,免人手貼 secret。

**關鍵交互**:ingestion 係 **app-only `Sites.Selected`**(ADR-0070 §2.1 雙模式)。OAuth auth-code 攞到嘅係 **delegated** token,唔係 app-only。所以丙要小心設計:OAuth 用嚟做 **admin-consent UX**(授權 app + 可能觸發 grant），ingestion 仍用 client credentials —— 唔可以用 OAuth 用戶 token 直接做批次 ingestion(會削弱可靠性 + 改認證模型)。

**H-constraint / ADR**:改 / 加認證流程 = **H1 需 ADR**;interactive OAuth + token 儲存 + refresh + callback route。

**優**:最貼近 Copilot / 現代平台 UX;OAuth 天然支援 per-tenant consent → 最啱真多環境自助。
**缺**:工作量最大;同 §2.1 雙模式認證交互要細心設計;需 ADR。
**工作量**:**大**。

---

## 6. 對比表

| 維度 | 甲(admin connections) | 乙(還原 wizard 欄) | 丙(OAuth Connect) |
|---|---|---|---|
| 複用既有 build | 高(ADR-0026 pattern) | 中(mockup 現成) | 低(全新 flow) |
| credential 配置位置 | admin 設定(正確) | per-import wizard(差) | admin(OAuth) |
| 多連接 / 多環境 | 可延伸(follow-up) | 弱 | 最強(per-tenant consent) |
| H5 合規 | ✅ | ✅ | ✅ |
| H7 | 中性 | 正向(還原 mockup) | 中性 |
| ADR 需求 | 短 ADR / amendment | 細 | **需 ADR(H1 認證)** |
| per-site grant 仍 IT | 係(§3) | 係 | 部分可 OAuth 化(高權限議題) |
| 工作量 | 中 | 中細 | 大 |

---

## 7. 推薦

**近期落地推薦「甲」**;「丙」列長線方向;「乙」不推薦。

理據:
1. **甲最大化複用已 build 資產**（`/admin/connections` + Key Vault `set_secret` + masked secret + Settings surface）—— 擴充而非重做,風險 + 工作量最低。
2. **甲把 credential 放正確位置**（admin 一次性設定,非 per-import),UX 正確,天然延伸多連接。
3. **乙** 雖最平,但 credential 耦合 per-import wizard 係架構倒退,多連接無歸屬 → 不推薦。
4. **丙** 係最理想終態(真多環境自助 + 現代 UX),但工作量大 + 需 ADR + 同 §2.1 認證交互要細設計 → 留長線,待「甲」落地 + 有真多環境 driver 再上。
5. 三者都**唔能消除 §3 嘅 IT per-site grant** —— 呢點要對 stakeholder 明示。

**建議路徑**:先做「甲」(單連接 managed config,搬 credential 上 UI)→ 有多連接 / 多 tenant 真需求再評估延伸多連接 or 升「丙」OAuth。

---

## 8. 下一步(等你決定)

1. **你揀方向**(甲 / 乙 / 丙,或甲+丙分階段)。
2. 拍板後我**先建正式 pre-doc**:phase `plan.md`(W102+）或 Change `CH-NNN/spec.md`,`status: proposed` → **再等你 approve** → 先 code(守 approval gate)。
3. 涉 ADR 者(甲短 ADR / 丙 H1 ADR）同步草擬。
4. 登記 BACKLOG 候選(本提案觸發,per R7)。

**本提案本身無 code 改動;等你揀方向。**

---

## 附:關鍵事實錨(已對 code first-hand 核對)

- H5 原文(§5.5):不 commit / 不 hard-code secret;POC `.env`、Beta+ Key Vault —— **無禁 UI 輸入**。
- `admin/connections.py`:9 provider,`GET / PATCH / POST test / POST rotate-secret`,secret Key Vault + masked(ADR-0026）。
- `key_vault.py`:`KeyVaultProvider.set_secret / get_secret / rotate_secret / delete_secret / list_secrets`;`EnvVarProvider` dev fallback。
- mockup `20-step1-connect.html`:step 1 原有 Tenant ID / App ID / Credential(Certificate|Client secret)欄 + 「Key Vault at Beta+, H5」hint。
- 實作偏離:`sharepoint/import/page.tsx` #2/D-4 註明「credentials NOT entered in UI … instead of the mockup's tenant/app/credential input fields」。
- `SharePointCredentials`:tenant_id / client_id / client_secret? / certificate_path?。
- per-site grant:`POST /sites/{site-id}/permissions`,IT / SharePoint admin 動作(藍圖 §1.3)。
