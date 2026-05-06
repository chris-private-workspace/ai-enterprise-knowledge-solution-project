# Azure Key Vault — secrets management(W8 D2 F2.4)

> Per W08-beta-deploy-sprint2 plan §2 F2.4 + components/C12-devops.md + CLAUDE.md §5.5 H5。
> **Owner**:Chris(infra apply)+ AI(SOP authoring)。
> **Status**:SOP only — actual `az keyvault` apply lives in Chris infra session(W8 D2-D3 cascade)。

## Why Key Vault

CLAUDE.md §5.5 H5 — secrets must never bake into Docker images,Bicep templates,GHA workflow logs,or `.env` files committed to git。Beta phase onwards,every secret 走 Key Vault reference;backend reads via User-assigned Managed Identity at runtime。

## Vault layout(`kv-ekp-beta`)

| Secret name | Purpose | Source | Rotation |
|---|---|---|---|
| `azure-openai-api-key` | Azure OpenAI access(embedding + GPT-5.5)| Azure portal AI Foundry resource keys | Quarterly per Microsoft default;auto-rotate post-Beta |
| `azure-search-admin-key` | Azure AI Search index management | Azure portal Search resource keys | Quarterly |
| `cohere-api-key` | Cohere Rerank v4.0-pro(Path A Marketplace per Q5)| Marketplace billing portal | Per Marketplace cycle |
| `azure-tenant-id` | Entra ID tenant id(F1.2 JWT validation `iss` check)| Q11 IT delivery W8 D1 | Static — never rotates |
| `azure-client-id` | Entra ID app registration client id(F1.2 JWT `aud` check)| Q11 IT delivery W8 D1 | Static — refreshed only if app registration recreated |
| `azure-client-secret` | Entra ID app registration secret(F1.3 frontend confidential client flow if applicable)| Q11 IT delivery W8 D1 | 6-month rotation per Microsoft default;Beta+ |

## Pre-requisites(Chris infra setup)

1. **Resource group** — `rg-ekp-beta-eastus2`(per Q3 Resolved 2026-05-02)
2. **User-assigned Managed Identity** — `id-ekp-beta-backend`(referenced by `infrastructure/aca/backend.bicep:userAssignedIdentityId`)
3. **GHA service principal** — for `azure/login@v2` OIDC federated credential(GHA secret `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_SUBSCRIPTION_ID`)。The GHA SP needs:
   - `Contributor` on `rg-ekp-beta-eastus2`(or scoped `Container Apps Contributor` + `AcrPush` + `Key Vault Reader`)
   - `acrpush` on `acrekpbeta`
4. **Q11 IT delivery**(W8 D1 trigger):tenant_id + client_id + client_secret 由 Chris IT engagement 收集

## Vault create + initial populate

```bash
# Create the vault — RBAC mode(per Microsoft 2024 default;non legacy access policy)。
az keyvault create \
  --name kv-ekp-beta \
  --resource-group rg-ekp-beta-eastus2 \
  --location eastus2 \
  --enable-rbac-authorization true \
  --retention-days 7 \
  --enable-purge-protection false  # set true Beta+ if compliance requires

# Grant Chris(self)Key Vault Administrator for initial populate。
USER_OID=$(az ad signed-in-user show --query id -o tsv)
KV_ID=$(az keyvault show --name kv-ekp-beta --query id -o tsv)
az role assignment create \
  --role "Key Vault Administrator" \
  --assignee-object-id "$USER_OID" \
  --assignee-principal-type User \
  --scope "$KV_ID"

# Wait ~30s for RBAC propagation。

# Populate secrets — values from Azure portal /  Q11 IT delivery / Cohere portal。
az keyvault secret set --vault-name kv-ekp-beta --name azure-openai-api-key   --value "<paste>"
az keyvault secret set --vault-name kv-ekp-beta --name azure-search-admin-key --value "<paste>"
az keyvault secret set --vault-name kv-ekp-beta --name cohere-api-key         --value "<paste>"
az keyvault secret set --vault-name kv-ekp-beta --name azure-tenant-id        --value "<from-IT-W8-D1>"
az keyvault secret set --vault-name kv-ekp-beta --name azure-client-id        --value "<from-IT-W8-D1>"
az keyvault secret set --vault-name kv-ekp-beta --name azure-client-secret    --value "<from-IT-W8-D1>"
```

## Grant backend Managed Identity read access

```bash
MI_OID=$(az identity show --name id-ekp-beta-backend --resource-group rg-ekp-beta-eastus2 --query principalId -o tsv)
KV_ID=$(az keyvault show --name kv-ekp-beta --query id -o tsv)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id "$MI_OID" \
  --assignee-principal-type ServicePrincipal \
  --scope "$KV_ID"
```

`Key Vault Secrets User`(reader only)— principle of least privilege per CLAUDE.md §5.5 H5。Backend never writes secrets;rotation goes through Chris(KV Administrator)+ separate runbook。

## Rotation SOP

| Frequency | Procedure |
|---|---|
| **Per Azure resource rotation cadence** | (1) Rotate secret in source(Azure portal / Cohere portal)→(2)`az keyvault secret set` 新 value(creates new version)→(3)ACA picks up new version on next revision deploy(or restart):`az containerapp revision restart --name ekp-beta-backend --resource-group rg-ekp-beta-eastus2`→(4)smoke `/health` → if fail,rollback via `azure-deploy.yml workflow_dispatch + rollback=true` |
| **Emergency rotation**(suspected leak)| Immediate KV `secret set` + `revision restart`;notify stakeholder + RAPO security;document in `docs/01-planning/RISK_REGISTER.md` |

## Verification

```bash
# Confirm Managed Identity can read the vault(simulates ACA runtime path)。
az login --identity --username $(az identity show --name id-ekp-beta-backend --resource-group rg-ekp-beta-eastus2 --query clientId -o tsv) 2>/dev/null || true
# Inside an ACA exec session:
az containerapp exec \
  --name ekp-beta-backend \
  --resource-group rg-ekp-beta-eastus2 \
  --command "env | grep -E '^(AZURE_TENANT_ID|AZURE_CLIENT_ID)='"
# Expected:non-empty values resolved from Key Vault references via Bicep secretRef:。
```

## Rollback

KV deletion(soft-delete enabled by default 90 days):recoverable via `az keyvault recover`;hard-purge NEVER unless explicitly required + stakeholder approve。

## Cross-component dependencies

| Component | Wired |
|---|---|
| **C11 Identity** | Real `msal_provider.py` reads `AZURE_TENANT_ID` + `AZURE_CLIENT_ID` from Settings → backed by Key Vault secrets |
| **C12 DevOps** | `infrastructure/aca/backend.bicep` references KV via `keyVaultUrl:` per secret;Managed Identity binding |
| **C04 Retrieval** | `cohere-api-key` → Cohere Rerank v4.0-pro Marketplace billing |
| **C05 Generation** | `azure-openai-api-key` → GPT-5.5 synthesis + judge |

## Tier 2(out-of-scope)

- Customer-managed keys(CMK)— Q9 Resolved 2026-05-05 default Azure-managed;CMK trigger post-Beta if compliance requires
- Secret rotation automation(Azure Function timer-triggered)— Tier 2 governance scope
- Cross-region KV replication — Tier 2 multi-region production

## Update history

| Date | Change | Reason |
|---|---|---|
| 2026-05-20 | Initial SOP(W8 D2 F2.4)| Cascading from W8 D1 Bicep spec(F2.2)+ Q11 IT delivery W8 D1 trigger |
