# W91 P3 F1 — 威脅模型補充(文件級 override + 群組繼承)

> P3 deliverable F1。純設計分析(唔改 code)。codebase 證據來自 2026-06-24 Explore 盤點。在 [`../W89-rbac-p1-threat-model-arch/threat-model.md`](../W89-rbac-p1-threat-model-arch/threat-model.md) 嘅 G1-G5 之上補 **G6 + G7**。

---

## 1. 範圍 + 前提

**範圍**:P2(W90)已落地後**仍未覆蓋**嘅兩個企業 ACL 缺口 —— 文件級權限差異(同 KB 內)+ 群組級授權繼承。

**P2 已達(基準)**:`allowed_principals: Collection(Edm.String)` 每 chunk;來源 = **5.1 KB 繼承**(`resolve_kb_principals` 讀 `kb_acl` 全 grant principal,stamp 落 chunk);檢索 filter `allowed_principals/any(p: search.in(p, '{user principals}', ','))` + classification clearance;`principals_for_user(user)` = `[oid]`(非 admin)/ `None`(admin bypass)。

**前提(承 ADR-0066 DG)**:2 級 classification、單租戶、文件係授權邊界(chunk 級獨立授權已否決)。

---

## 2. 缺口 G6 — 文件級 override 缺失(同 KB 內無法分文件權限)

| 項 | 內容 |
|---|---|
| **缺口** | `allowed_principals` 只能由 **KB 層** `kb_acl` 繼承 —— 整個 KB 共用同一 ACL。同一 KB 內**唔同文件唔同權限做唔到**。 |
| **證據** | `doc_acl` / document-level ACL **全 codebase 不存在**(Explore grep 0 命中);`allowed_principals` 唯一來源 = `acl.resolve_kb_principals(rbac_backend, kb_id)`(`backend/api/middleware/acl.py:127-149`,只讀 `list_kb_acl(kb_id)`)。`_run_ingest_pipeline` 對一個 KB 所有 doc stamp **同一** principal list(`backend/api/routes/documents.py` ingest 段)。 |
| **結論** | KB 係目前最幼授權粒度。文件級分權 = 0。 |

**攻擊情景(同 KB 內分文件權限)**:
- KB `staff_handbook`(政策 / 薪資 / 福利 3 文件),`kb_acl` grant User A(員工)+ User B(經理)`query`。
- A 應只讀政策,但 P2 下 A 對整個 KB 有 query grant → A 嘅 oid 喺**全部 3 文件**嘅 `allowed_principals` → A query「薪資」→ 薪資 chunk 通過 filter → **LLM 洩漏薪資畀 A**。
- **根因**:授權粒度 = KB,文件級差異無法表達。P2 解咗「跨 KB」洩漏,但**同 KB 內文件級**洩漏未解。

**修復方向(G6 → P3 5.2)**:`doc_acl` override 表令薪資文件 stamp `[userB]`(非繼承 KB 嘅 `[userA, userB]`)→ A query 薪資 → 薪資 chunk `allowed_principals=[userB]` 不含 A → 檢索階段剔除。

---

## 3. 缺口 G7 — 群組繼承缺失(group 授權無法落地到 member)

| 項 | 內容 |
|---|---|
| **缺口** | `kb_acl` / 未來 `doc_acl` 可 grant `principal_type="group"`,但 **group key 永遠 resolve 唔到 member** → group 授權對 user 無效。 |
| **證據** | `principals_for_user(user)`(`backend/api/middleware/acl.py:152-164`)非 admin 只返 `[user.oid]`,**無 group 展開**(docstring 自注「Group principals fold in once P4 group-member sync lands」);`group_members(group_key, user_oid)` 表已存在(`backend/storage/rbac_postgres.py:77-82`)但 **無任何寫方法**(`rbac_storage.py:11-12`「group_members write … stay absent until F8」);無 `list_groups_for_user` / member 展開 code。 |
| **結論** | group 基建半成品:`groups` 表 + `group_members` schema + kb_acl `principal_type="group"` 齊備,但「user → 佢屬邊啲 group」嘅展開鏈斷。 |

**攻擊/失效情景(group 授權)**:
- Admin grant `kb_acl(staff_handbook, group="grp-managers", query)` → `resolve_kb_principals` 返 `["grp-managers"]` → chunk stamp `allowed_principals=["grp-managers"]`。
- 經理 B(屬 grp-managers)query → `principals_for_user(B)=[B.oid]`(**無 grp-managers**)→ filter `search.in(p, 'B-oid', ',')` 不 match `grp-managers` → **B 被錯誤剔除**(本應有權)。
- **根因**:chunk 側 group key OK,但 user 側無展開到 group → group grant 形同虛設,逼 admin 逐個 user grant。

**關鍵洞察(re-stamp 牽連,Karpathy §1.1 修正 plan §4 過度估計)**:
- chunk `allowed_principals` 存 **group key**(非 member oid)。
- **群組成員變動(加/減 member)→ 只改 `principals_for_user(user)` 嘅展開結果(query 側)→ 完全唔使 re-stamp 索引**。chunk 仍存 group key 不變。
- 真正需要 re-stamp 嘅只係:**doc_acl / kb_acl 嘅 principal 集變動**(邊個 group/user 被 grant 到呢份文件)→ restamp 該文件 chunks。
- ⟹ P4 群組繼承嘅 re-stamp 成本 **= 0**(query 側解析),plan §4「group membership 改 → re-stamp 所有含該 group chunks」**過度估計,F2 更正**。

---

## 4. 需求(P3-derived)

| 需求 | 來源 | 階段 |
|---|---|---|
| 文件級 `doc_acl` override 表(kb_id, doc_id, principal, access_role) | G6 | P3 5.2 |
| ingest 解析:doc_acl 優先 → KB 繼承 fallback(override 語義 DG-P3-A) | G6 | P3 5.2 |
| doc_acl 改動 → restamp 該文件 chunks 嘅 `allowed_principals`(復用 P2.3 restamp pattern) | G6 | P3-impl |
| `group_members` 寫方法(admin 手動指派 member,DG-P3-B) | G7 | P4 |
| `principals_for_user` 展開 `[oid]` → `[oid, grp1...]`(查 user 嘅 group membership) | G7 | P4 |
| principal 命名空間(user oid vs group key)防碰撞 | G6/G7 | P3 設計 |
| 真實 SCIM/Entra member 自動同步 | — | **Tier 2**(out of scope) |

---

## 5. 對 F2 目標架構嘅含義

- **doc_acl 表**:新建,mirror 既有 4 個 per-doc store(`doc_config`/`doc_profile`/`doc_classification`/`preset_override`)嘅 Protocol+InMemory+Postgres+factory pattern,但 **per-doc-per-principal 多行**(似 kb_acl 而非單值)。**唔加索引欄位**(沿用 P2 `allowed_principals` Collection)。
- **override 語義(DG-P3-A)**:F2 列 additive / replace / allow+deny 三選項 + 推薦。
- **group 解析(G7/P4)**:`principals_for_user` 由 **純 sync 函數** 變 **async + rbac_backend 依賴**(查 group membership)→ threading 改動(P2 已 explicit thread `user_principals`,P4 只改其來源計算,不改 threading 鏈)。
- **re-stamp**:doc_acl 改 → restamp 該文件(復用 P2.3 `update_doc_*`);**group member 改 → 零 re-stamp**(query 側)。
- **principal 命名空間**:user oid(Azure AD object id)vs group key(Entra object id)—— 都係 GUID 格式,理論上唯一,但 F2 建議加前綴或顯式 `principal_type` 區分防碰撞。

→ **F2** 設計 doc_acl 表 + override 語義 + group 解析鏈 + re-stamp 機制 + principal 命名空間,每 fork 列選項 + trade-off。
