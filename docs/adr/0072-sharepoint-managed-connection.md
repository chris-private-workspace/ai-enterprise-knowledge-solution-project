# ADR-0072: SharePoint 做 managed connection(UI 配置 + Key Vault)

**Date**: 2026-07-01
**Status**: Accepted
**Approver**: Chris(2026-07-01 AskUserQuestion 揀方向甲 + approve W102 plan)

## Context

階段 1(ADR-0070 / W100-W101)嘅 SharePoint 連接 credential 只可經 server 端 `.env`(`SHAREPOINT_TENANT_ID` / `_CLIENT_ID` / `_CLIENT_SECRET` 或 `_CERTIFICATE_PATH`)配置 + 重啟 backend。用戶 2026-07-01 測試 pushback:對「多環境 / 自助配置」唔現實,成熟平台一般容許 UI 配置外部連接。並更正先前「UI 輸入 credential 違反 H5」嘅錯誤陳述 —— H5(§5.5)只規管 secret 唔可 commit / 唔可 hard-code / 要安全儲存(Key Vault),**冇禁 UI 輸入**。

EKP 已有 `/admin/connections`(ADR-0026)—— 9-provider config CRUD + test + rotate-secret,secret 存 Key Vault、UI mask,正正係「UI 配置連接 + secret 安全」pattern。方向甲(用戶拍板)= 把 SharePoint 加入呢個 pattern。

**關鍵限制**:現有 admin connections 只有 **rotate-secret**(app 自己 `generate_secret_value` 生成新值,用於 EKP 自有 secret 如 postgres / langfuse)。但 SharePoint 嘅 client secret 係 **Azure AD 發俾** 嘅,app 生成唔到 —— 必須**用戶輸入**。所以需要一個現有 pattern 未有嘅新能力。

## Decision

把 SharePoint 加入 `/admin/connections` 做 managed connection,具體:

1. **新 provider category `integration`**(`ProviderCategory` Literal 加一個成員)+ seed `provider_id="sharepoint"`(`secret_kv_ref="ekp-sharepoint-client-secret"`)。

2. **`ProviderConfig` 加 generic `settings: dict[str, str]` 欄**(default `{}`)存 provider-specific **非 secret** config。SharePoint 用 `settings = {"tenant_id", "client_id", "credential_type"}`。Postgres 加 `settings JSONB` 欄 + `ALTER TABLE ADD COLUMN IF NOT EXISTS`(既有 row 零遷移痛)。`ProviderPatch` 加 `settings` 令 UI 可改。

3. **新能力 `POST /admin/connections/{provider_id}/set-secret`**(body `{value}`)—— 收**用戶輸入** secret → `KeyVaultProvider.set_secret(secret_kv_ref, value)` 寫入 → 回 masked preview。**H5**:value 絕不 log、絕不回傳真值、只 transit-to-Key-Vault。有別於 rotate(app 生成);set 係用戶提供。

4. **credential 來源優先序:managed connection > `.env` fallback**。整合層 `_sharepoint_credentials_or_503` 改為先讀 managed connection(tenant/client-id 由 `settings`,secret 由 Key Vault `get_secret(secret_kv_ref)`);managed 未齊就用 `.env`(零回歸);兩者皆無 → 503。

5. **初版單一連接**(`provider_id="sharepoint"`)。多 named connection / 多 tenant = follow-up。

## Alternatives Considered

- **乙 還原 wizard step-1 credential 欄**:credential 耦合 per-import wizard(每次匯入見 credential,架構位置差)+ 多連接無歸屬 → reject(提案 §5)。
- **丙 OAuth Connect flow**:最現代但工作量大 + 需改認證模型(delegated vs app-only §2.1)+ 需獨立 ADR → 留長線(提案推薦甲先行)。
- **tenant/client-id 存 `endpoint_url`/`region` 等既有欄**:語意扭曲、混亂 → reject,改用 generic `settings` dict(可擴展未來 connector)。
- **tenant/client-id 加做 SharePoint 專屬 TEXT 欄**:污染 generic 9-provider schema → reject,generic `settings` dict 較乾淨。
- **tenant/client-id 存 Key Vault**:非 secret 存 secret store,latency / 語意都差 → reject。

## Consequences

- **Positive**:credential 搬上 UI(唔使改 `.env` + 重啟);secret 安全存 Key Vault + masked(H5);複用 ADR-0026 pattern(擴充非重做);`settings` 欄可擴展未來 connector;`.env` fallback 保零回歸。
- **Negative**:touches 共用 admin provider schema(新 `settings` 欄 → InMemory + Postgres + roundtrip + PATCH Jsonb 處理)；set-secret 係新 H5 敏感路徑(需專門測試守 value 不外洩)。
- **Neutral**:**per-site `Sites.Selected` grant 仍係 IT 動作**,本 ADR 唔改變(任何方案消除唔到,提案 §3 誠實前提);dev(EnvVarProvider)set-secret 寫 process env,重啟 wiped(同 `.env` 行為,可接受);多連接留 follow-up。

## References

- 提案:`docs/09-analysis/integration_connection_config_ui_proposal_20260701.md`(甲/乙/丙 比較)
- W102 plan:`docs/01-planning/W102-sharepoint-connection-config/plan.md`
- amends ADR-0026(admin 9-provider 連接)+ ADR-0070(整合層)
- 藍圖 `docs/09-analysis/integration_layer_phase1_sharepoint_solution.md` §2.1(雙模式認證)
- CLAUDE.md §5.5 H5(secret 儲存)
