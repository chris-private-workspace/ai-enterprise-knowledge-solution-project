# W91 — Enterprise RBAC P3:文件級 ACL override + 群組繼承 設計 + ADR-0067

| 項目 | 值 |
|---|---|
| Phase | W91-rbac-p3-doc-acl-design(enterprise RBAC track 第 4 期) |
| Status | **active**(2026-06-24 用戶批准開 W91 設計 phase) |
| Tier | ⚖️ **Tier 邊界拍板點**(P3 = 設計 + ADR,**唔 implement**;ADR-0067 Accept 需 decision owner approve per H1 + H4) |
| 依賴 | P2(✅ 完成 2026-06-24,W90,檢索層 KB 繼承 + classification clearance 上線就緒,DG4 達成) |
| 錨點 | **ADR-0066**(Accepted,P2 架構基礎)・ [`../W89-rbac-p1-threat-model-arch/threat-model.md`](../W89-rbac-p1-threat-model-arch/threat-model.md)(G1-G5)・ [`target-architecture.md`](../W89-rbac-p1-threat-model-arch/target-architecture.md)(5.1 KB 繼承 → 5.2 文件級表) |
| 粗估 | 設計 3–5 日(implementation 另期 P3-impl) |
| 下一期 | P3 implementation(**ADR-0067 Accepted 後**才 kickoff,次序鐵律 5) |

> **本 plan 受 ADR-0066(Accepted)約束**:索引 ACL 結構 / 檢索 filter / principal 解析以 ADR-0066 + 本 phase ADR-0067 為準。本檔只定 scope + deliverables + acceptance + decision gate。**P3 設計建喺 P2 已落地嘅 `allowed_principals` Collection 之上,非推倒重來。**

---

## §1 目標(Why)

P2(W90)令檢索層文件級 security trimming 上線就緒,但 `allowed_principals` 來源只係 **5.1 KB 繼承**(整個 KB 共用同一 ACL,principal 只係 user oid)。兩個企業級缺口未補:

- **缺口 H1(文件級 override,5.2)**:同一 KB 內**唔同文件唔同權限**做唔到(e.g. `staff_handbook` KB 內薪資文件只經理可見、政策文件全員可見)。現時整個 KB 一個 ACL,文件級分權 = 0。
- **缺口 H2(群組繼承,P4)**:`allowed_principals` 只 stamp user oid,group key 永遠 resolve 唔到 member。`principals_for_user` 只返 `[oid]`(P2 註明 group 留 P4)。100 人團隊要逐個 grant,無 group 級授權。

P3 = **設計** 呢兩層 ACL 嘅目標架構 + 拍板 **ADR-0067**,為 P3 implementation 鋪路。

**次序鐵律 1(ROADMAP §3)**:影響索引 stamp / principal 解析嘅決定要先定。P3 改 `allowed_principals` 嘅**來源**(doc_acl override + group resolution),唔改索引欄位本身(P2 已有 `allowed_principals` Collection),故重建成本低於 P2,但 group 改動牽連面廣(re-stamp 範圍)需設計清楚。

**P3 設計 phase 唔 implement** —— 唔改 retrieval 主路徑、唔加表、唔改 `principals_for_user`。implementation = P3-impl(ADR-0067 Accept 後)。產出 = 文檔(威脅模型補充 + 目標架構)+ ADR-0067(Proposed → decision owner Accept)。

## §2 Deliverables(F1–F3)

| # | Deliverable | Acceptance(可驗證成功標準) |
|---|---|---|
| F1 | 威脅模型補充(doc-level + group) | 在 G1-G5 之上補 **G6 文件級 override 缺口** + **G7 群組繼承缺口**:攻擊情景(同 KB 內分文件權限洩漏 / group 授權無法落地)+ codebase 證據(`doc_acl` 表現狀 / `principals_for_user` / `resolve_kb_principals`)+ re-stamp 牽連分析 |
| F2 | 目標授權模型(P3) | **5.2 `doc_acl` override 表設計**(override 語義 / 與 KB 繼承 precedence / re-stamp 機制)+ **P4 群組繼承設計**(group membership 來源 / `principals_for_user` group 展開 / group 改動 re-stamp 範圍)— 每 fork 列選項 + 推薦 + trade-off |
| F3 | ADR-0067 草擬 + Accept | `docs/adr/0067-*.md`(Context / Decision / Alternatives / Consequences)→ **Status: Proposed** → decision owner review → Accept(H1 + H4 硬閘)|

## §3 Decision Gates(需 decision owner 拍板,P3 阻塞點)

> P3 範圍(5.2 doc_acl + P4 群組)已由用戶 2026-06-24 拍板。以下係範圍內嘅設計 fork,F2 分析後附推薦,decision owner 拍板後寫入 ADR-0067。

| Gate | 內容 | 推薦 default(F2 grounded) | 阻塞 |
|---|---|---|---|
| **DG-P3-A** | doc_acl override 語義:additive(UNION KB)/ replace(取代 KB)/ allow+deny | F2 後定;傾向 **replace**(doc_acl 存在 → 該文件用 doc_acl,缺 → 繼承 KB;最易解釋 + 解 confused deputy) | F2 doc_acl 表 + filter |
| **DG-P3-B** | group membership 來源(SSO/SCIM 已 defer) | **手動 admin 管理 `group_members`**(復用 W24c `groups` 表 + 加 member 指派);真 SCIM 留 Tier 2 | F2 group 解析 |
| **DG-P3-C** | P3 Tier 定位 + implementation 時序 | **Tier 1.5 post-launch enhancement**(P2 已達 launch 安全 DG4;P3 等真實 doc-level 需求 driver 落 implementation) | P3-impl kickoff |
| **DG-P3-D** | ADR-0067 Accept | — | P3-impl 全部(鐵律 5) |

## §4 Risks

- 🔴 **Tier 邊界**(active):P4 群組繼承 + 真 SCIM 撞 H4(multi-tenancy 鄰近領域)→ P3 須明確劃 group member **手動管理**(Tier 1.5)vs SCIM 自動同步(Tier 2)。**DG-P3-C 須 decision owner 拍板,AI 唔自行定**(H1+H4)。
- 🟡 **re-stamp 牽連面**:doc_acl 改動 = re-stamp 該文件 chunks(同 P2.3 classification restamp,可控);**group membership 改動 = re-stamp 所有含該 group 嘅 chunks**(跨文件跨 KB,牽連大)→ F2 必須設計 re-stamp 範圍 + 觸發機制,唔可 silent stale。
- 🟡 **索引結構**(次序鐵律 1):P3 沿用 P2 `allowed_principals` Collection,**唔加索引欄位**(group key 同 user oid 一樣入同一 Collection)→ 重建成本低;但 principal 命名空間(user oid vs group key)要設計防碰撞。
- 🟢 **唔影響 W43-85 + north-star §15**:P3 純設計唔 implement,零 retrieval 改動;implementation 階段沿用 P2.2b 已驗證嘅 filter 機制(fail-open + admin bypass),eval 重驗留 P3-impl。

## §5 Out of scope(留 P3-impl / 後期)

doc_acl 表 + group_members **實作** + `principals_for_user` group 展開 + doc_acl re-stamp 端點 + 群組管理 UI(全 P3-impl)/ 真實 SCIM 自動同步(Tier 2)/ chunk 級獨立授權(ADR-0066 已否決,文件係授權邊界)/ 治理 + 審批流(P5)/ ABAC 政策引擎(P6)。P3 設計 phase **只**設計 + 拍板,不寫 production code(retrieval / schema / 表 / `principals_for_user` 一律不動)。

## §6 Changelog

| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-24 | P3 kickoff — P2 收尾後 rolling JIT 建三件套;用戶 AskUserQuestion 拍板「開 W91 設計 phase」+ 範圍「5.2 doc_acl + P4 群組繼承」;scope = 設計 + ADR-0067,不 implement(H1/H4 gate,implementation 待 ADR Accept) | 開工 |
