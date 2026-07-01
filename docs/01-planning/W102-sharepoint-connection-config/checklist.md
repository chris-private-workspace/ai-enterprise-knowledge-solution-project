# W102 Checklist — SharePoint 連接 UI 配置

> 逐項 atomic;對應 `plan.md` §2 deliverable。完成先 tick,未做保持 `[ ]`。

## F1 — ADR-0072
- [x] 寫 ADR-0072(SharePoint managed connection + set-secret 能力 + 來源優先序 + H5)
- [x] ADR README index 加一行

## F2 — admin provider 加 SharePoint
- [x] `ProviderCategory` Literal 加 `integration`
- [x] `ProviderConfig` 加 `settings: dict[str,str]`(default `{}`)
- [x] `ProviderPatch` 加 `settings`
- [x] `default_providers()` 加 `sharepoint` seed(category integration + secret_kv_ref + settings tenant/client-id/credential_type 空值)
- [x] Postgres backend:加 `settings JSONB` 欄 + `ALTER ADD COLUMN IF NOT EXISTS` + `_COLS`/`_row_to_config`/`_config_params`/placeholder(14→15)+ PATCH Jsonb 處理

## F3 — set-secret 能力(核心)
- [x] `SetSecretRequest` schema(`value`,min_length=1)+ `SetSecretResult`(masked preview + updated_at)
- [x] `POST /admin/connections/{id}/set-secret` 端點(`set_secret` 寫 Key Vault + update masked + audit `connection_set_secret`)
- [x] H5:value 絕不 log / 絕不回傳真值(from None 斷 exception chain)+ audit backend Literal 加 `connection_set_secret`

## F4 — 整合層 credential 來源
- [x] `_managed_sharepoint_credentials` helper(讀 settings + Key Vault)+ `_sharepoint_credentials_or_503` managed > `.env` fallback
- [x] resolve-site / browse / documents / import route 傳 `request` 攞 app.state + `_new_connector` async
- [x] 未配置 503 訊息更新(提 Settings→Connections + `.env` 兩條路)

## F5 — 前端 Settings Connections SharePoint 卡
- [x] `admin.ts`:`ProviderCategory` 加 integration + `ProviderConfig.settings` + `ProviderPatch.settings` + `SetSecretResult` + `setSecret` + audit action
- [x] `settings-connections.tsx`:`integration` category 分組(CATEGORY_ORDER/LABEL)
- [x] `SharePointConfig` 組件:tenant / client-id 表單(PATCH settings)+ secret 輸入(set-secret,password)+ masked 顯示;沿用既有 `.field`/`.input`/`.btn` primitives(H7 一致)

## F6 — Test connection
- [x] `_probe_sharepoint`(config-state:tenant/client-id + secret_masked_preview 齊唔齊 → not_tested/degraded/ok)接入 `_run_probe`
- [x] 前端卡 Test 按鈕(共用既有 ProviderRow test 按鈕,所有 provider 通用)

## F7 — 測試
- [x] backend `test_sharepoint_managed_connection.py`:set-secret 寫入+mask+value 不外洩 / 404 / 400 / 422 / settings roundtrip / probe 三態 / managed 讀取 / `.env` fallback / 503
- [x] backend `test_admin_connections.py`:nine→ten 修正(3 個)+ sharepoint category
- [~] 前端組件 test — deferred(plan「視進度」;tsc + eslint 已綠;卡邏輯由 backend 端到端測試覆蓋)
- [x] ruff(淨新增只 UP017,同檔案既有 style 一致)/ mypy(淨新增 0,6 個 pre-existing psycopg 型別債非本 phase)/ eslint(exit 0)/ tsc(exit 0)

## F8 — 文件同步
- [x] runbook §2 加 UI 配置路徑(managed > `.env` fallback,per-site grant 仍 IT)
- [~] user-guide 連接章節 — deferred(optional;runbook 已覆蓋操作)
- [x] BACKLOG B-09 → `完成` + closeout retro(progress.md）

## Gate G-W102
- [x] AC1 secret masked + 不外洩(test 驗) / AC2 managed 讀取+fallback(test) / AC3 `.env` 零回歸(route 測試全綠) / AC4 test connection(probe 測試) / AC5 H5 稽核(from None + masked + gitignore) / AC6 測試綠+linter+ingestion diff 零 / AC7 ADR-0072 Accepted
