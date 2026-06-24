# W91 P3 F2 — 目標授權模型(文件級 override + 群組繼承)

> P3 deliverable F2。在 ADR-0066(P2,5.1 KB 繼承)之上設計 **5.2 文件級 override** + **P4 群組繼承**。每 fork 列選項 + trade-off + 推薦,decision owner 拍板後寫入 ADR-0067。

---

## 1. ACL 解析層級(目標)

```
chunk.allowed_principals 來源(ingest stamp 時,由上而下 short-circuit):
  5.2 doc_acl(該文件有 override 行)→ 用 doc_acl 嘅 principals
  5.1 kb_acl(無 doc override)       → 繼承 KB 嘅 principals   ← P2 現狀
查詢時 user 嘅 principals(principals_for_user):
  P2 現狀: [user.oid]
  P4 目標: [user.oid] ∪ {user 所屬 group_key…}            ← group 展開
admin: principals_for_user → None(bypass 全部 filter)      ← 不變
```

**邊界**:RBAC(角色,粗)管「邊個角色可做邊類操作」;doc_acl + group(細,檢索層 trimming)管「邊個 principal 可見邊份文件」。沿用 ADR-0066 選項 A(`allowed_principals` Collection + Azure `any()` filter),**唔加索引欄位**,只擴 principal 嘅**來源**同**展開**。

---

## 2. 5.2 `doc_acl` override 表設計

**Schema**(Postgres,mirror `kb_acl` 但 doc-scoped):
```
document_acls(
    id              SERIAL PRIMARY KEY
    kb_id           TEXT NOT NULL
    doc_id          TEXT NOT NULL
    principal_type  TEXT NOT NULL   -- "user" | "group"(復用 KbPrincipalType)
    principal_id    TEXT NOT NULL   -- user oid | group key
    access_role     TEXT NOT NULL   -- "manage" | "edit" | "query"(復用 KbAclRole)
    granted_by      TEXT
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    UNIQUE (kb_id, doc_id, principal_type, principal_id)
)
```
- **Store**:`DocAclStore` Protocol + InMemory + Postgres + `make_doc_acl_store(settings)` factory,mirror 既有 4 個 per-doc store;但 value = **多行 list**(`list_for_doc(kb_id, doc_id) -> list[DocAclEntry]`),非單值。
- **復用**:`KbPrincipalType` / `KbAclRole` enum、`granted_by` 約定、role rank `_KB_ACL_RANK`。
- **API**:mirror `kb_acl` 路由,改為 `/kb/{kb_id}/docs/{doc_id}/acl`(GET list / POST grant / PATCH role / DELETE)— admin / KB-manage 守衛(同 kb_acl 寫端點)。

### DG-P3-A — override 語義(三選項)

| 選項 | 語義 | 優 | 劣 | 推薦 |
|---|---|---|---|---|
| **A. replace(取代)** | doc 有 doc_acl 行 → **只用** doc_acl principals;無 → 繼承 KB | 最易解釋;一份文件嘅可見者一目了然;直接解 G6 confused deputy | 要 grant 齊(唔會自動帶 KB 成員) | ✅ **推薦** |
| B. additive(UNION) | doc principals = KB 繼承 ∪ doc_acl | 唔使重 grant KB 成員 | **只能加唔能減** → 解唔到「KB 全員 grant 但薪資文件要收窄」(G6 主場景) | ✗ |
| C. allow + deny | doc_acl 可 allow 亦可 deny(扣減 KB 繼承) | 最靈活 | filter 要 encode 排除(`not allowed_principals/any(p: p eq 'denied')` 複雜)+ 語義難解釋 + Tier 1 過度 | ✗(留 Tier 2) |

> **推薦 replace**:G6 主場景 = 「KB 全員可見,但某文件收窄到子集」→ replace 直接表達(薪資文件 doc_acl=`[managers]` 取代 KB 嘅全員);additive 做唔到收窄;allow+deny Tier 1 過度。stamp 邏輯 = `doc_acl 有行 ? doc_acl_principals : kb_inherited_principals`(short-circuit,清晰)。

---

## 3. P4 群組繼承設計

### 3.1 兩側機制(關鍵:不對稱)

| 側 | 機制 | re-stamp? |
|---|---|---|
| **chunk 側** | `resolve_kb_principals` / doc_acl 已返 **group key**(`principal_type="group"` 已支援)→ stamp 落 chunk `allowed_principals`。**已 work**。 | doc/kb ACL principal 集變 → restamp 該文件(§4) |
| **user 側** | `principals_for_user(user)` 展開 `[oid]` → `[oid] ∪ {user 所屬 group_key}`(P4 新)。 | **N/A — 純 query 側,零索引改動** |

> **核心洞察(F1 §3 修正)**:chunk 存 group **key** 非 member oid → **群組成員加減 = 純 query 側(`principals_for_user` 展開結果變)→ 零 re-stamp**。呢個令 P4 成本極低,亦係「group key in chunk + member expand at query」嘅優雅性質。

### 3.2 `principals_for_user` 改動

- 現:純 sync `def principals_for_user(user) -> list[str] | None`(`acl.py:152`)。
- P4:變 **async + rbac_backend 依賴**:`async def principals_for_user(rbac_backend, user) -> list[str] | None` —— 非 admin 返 `[user.oid] + await rbac_backend.list_groups_for_user(user.oid)`(新方法,查 `group_members`)。
- **threading 影響**:P2 已 explicit thread `user_principals` 經 11 層(`principals_for_user` 喺 query 端點算一次 → thread 落去)。P4 **只改 `principals_for_user` 內部計算 + 其 call site await**(query handler + query_stream),**唔改下游 11 層 threading 鏈**(下游收到 `list[str]` 不變)。surgical。

### DG-P3-B — group membership 來源(三選項)

| 選項 | 來源 | 優 | 劣 | 推薦 |
|---|---|---|---|---|
| **A. 手動 admin 管理** | 復用 `group_members` 表(已存在)+ 加寫方法(`add_member`/`remove_member`/`list_groups_for_user`)+ admin UI 指派 | 表已有;無外部依賴;Tier 1 自足;符合「SSO/SCIM 已 defer」 | admin 手動維護成員 | ✅ **推薦** |
| B. 純 Entra 自動同步 | `sync-from-entra` 拉 member | 零手動 | **撞 H4 鄰近(真 SCIM/SSO)+ 需 Entra 整合(Track A 未 ready)** | ✗(留 Tier 2) |
| C. 混合(手動 + 將來 sync) | 手動為主,`source` 欄位預留 sync | 平滑升級 | 同 A,sync 部分留 Tier 2 | A 之超集,實際=A |

> **推薦 A 手動管理**:`group_members(group_key, user_oid)` 表 + `groups.source='local'` 已存在(W24c F6),只缺寫方法。真 SCIM/Entra member 自動同步明確劃 **Tier 2**(`source='entra'` + `synced_at` 欄位已預留,將來 ADR)。

---

## 4. re-stamp 機制(ACL 改動 → 索引同步)

| 觸發 | 範圍 | 機制 |
|---|---|---|
| doc_acl grant/revoke(某文件) | 該文件 chunks 嘅 `allowed_principals` | 復用 P2.3 `IndexPopulator.update_doc_*`(search-then-merge,無 re-ingest)→ 新 `update_doc_principals(kb_id, doc_id, principals)` |
| kb_acl grant/revoke(整 KB) | 該 KB **所有未被 doc override 嘅文件** chunks | 較大:遍歷 KB 文件 restamp(或標 dirty 延後);**P2 遺留考量**(P2 只 ingest 時 stamp,kb_acl 後改未 restamp)→ P3 順帶設計 |
| **group membership 加/減 member** | **零**(query 側 `principals_for_user` 解析) | **無 re-stamp** |

> **P2 遺留**:P2 只喺 ingest stamp `allowed_principals`,kb_acl **ingest 後**改動唔會 restamp 現有 chunk(stale)。P3 加嘅 restamp 機制(doc/kb principal 改 → restamp)順帶補呢個缺口(implementation 階段)。group member 改動唔受影響(§3.1)。

---

## 5. principal 命名空間(防碰撞)

- user oid = Azure AD object id(GUID);group key = Entra object id / local group_key(GUID 或自訂)。
- 理論上 GUID 唯一,但 local group 自訂 key 可能撞 user oid 格式 → **建議**:`allowed_principals` 入面 group key 加前綴(e.g. `grp:`)或維持 `principal_type` 顯式區分。
- **推薦**:stamp 時 group principal 用 `group_key` 原值(W24c 已用 Entra object id 作 key,GUID 唯一);local group 強制 key 加 `grp-` 前綴約定(已見 test `g-1` / `grp-managers`)。F3 ADR 記此約定。

---

## 6. 解析流程(目標)

**ingest stamp(每文件)**:
```
1. doc_acl_store.list_for_doc(kb_id, doc_id)
2. 有行 → principals = doc_acl 嘅 principal_id 集(replace 語義)
   無行 → principals = resolve_kb_principals(kb_id)(KB 繼承,P2 現狀)
3. orchestrator.ingest(allowed_principals=principals)  ← stamp(P2 已有此 param)
```

**query(每 user)**:
```
1. principals = await principals_for_user(rbac_backend, user)
   非 admin → [oid] ∪ list_groups_for_user(oid)
   admin    → None(bypass)
2. _build_acl_filter(principals) → allowed_principals/any(...) + classification clearance
   （P2 已有,完全不改 filter 構造）
3. Azure 檢索層 trimming（P2 機制，零改動）
```

---

## 7. Tier 定位(DG-P3-C)+ 對齊 H2/H4

- **DG-P3-C 推薦 = Tier 1.5 post-launch enhancement**:P2 已達 launch 安全(DG4 — KB + classification trimming);P3 文件級 + group 係**更幼粒度**,非上線阻塞。設計即刻做(ADR-0067),**implementation 等真實 doc-level 需求 driver**(某 KB 確實要分文件權限)→ 避 speculative。
- **H2**:doc_acl + group 全部復用 Azure `allowed_principals` Collection + `any()` filter,**零新 vendor / 零新索引欄位**。
- **H4**:手動 group 管理 = Tier 1.5;真 SCIM/Entra member 自動同步 = Tier 2(明確劃界,需將來 ADR)。doc_acl override 本身 = Tier 1 細粒度(非 multi-tenancy)。
- **次序鐵律 1**:P3 唔改索引欄位(沿用 P2 Collection)→ **無索引重建**(只 doc_acl 改動時 restamp 受影響文件)→ 成本遠低於 P2。

---

## 8. 小結 — P3 要新建 vs 復用

| 項 | 狀態 | P3 行動 |
|---|---|---|
| 索引 `allowed_principals` Collection + filter | ✅ P2 | 復用,零改 |
| `kb_acl` 表 + KbPrincipalType/KbAclRole | ✅ W24c | 復用 enum + 約定 |
| `doc_acl` 表 + Store + API | ✗ 不存在 | **P3 新建**(mirror per-doc store + kb_acl 路由) |
| `groups` 表 + list API | ✅ W24c F6 | 復用 |
| `group_members` 表 | ✅ schema 存在 | **P4 加寫方法**(無索引改動) |
| `principals_for_user` group 展開 | ✗ 只 [oid] | **P4 改 async + group 展開**(不改下游 threading) |
| doc/kb principal 改 → restamp | ✗(P2 ingest-only) | **P3-impl 加**(復用 P2.3 search-then-merge) |

→ **F3 ADR-0067** 拍板:doc_acl replace 語義(DG-P3-A)+ 手動 group 管理(DG-P3-B)+ Tier 1.5 定位(DG-P3-C)+ 上述表/解析/restamp 設計。
