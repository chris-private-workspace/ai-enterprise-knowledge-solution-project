# ADR-0068: Admin Tiering + Access Governance — Auditor Role + Access Review(管理權分級 + 存取治理 — 稽核員角色 + 存取覆核)

**Date**: 2026-06-25
**Status**: Accepted
**Approver**: Chris(2026-06-25 — 用戶 session 行使 decision owner 拍板 Accept;DG-P5-A/B/C/D resolved → P5 implementation 解鎖,H1 + H4;依 DG-P5-D 暫不 implement,等用戶另批)

> Enterprise RBAC track P5 產出。在 ADR-0027(W24c RBAC,4 role + permission matrix + audit log)之上加 **職責分立**(auditor 唯讀稽核角色)+ **存取覆核**(access review report + re-certify)。範圍由用戶 2026-06-25 拍板 = 核心 + 存取覆核;JIT / break-glass / 自動回收延後 Tier 2。
> 技術基礎:[`../01-planning/W94-rbac-p5-governance-design/threat-model-p5.md`](../01-planning/W94-rbac-p5-governance-design/threat-model-p5.md)(F1 G8/G9)+ [`target-architecture-p5.md`](../01-planning/W94-rbac-p5-governance-design/target-architecture-p5.md)(F2)。

## Context

W24c(ADR-0027)落地**功能性** RBAC(4 role + 92-cell permission matrix + audit log 讀寫端點),但欠**治理性**(合規)能力。F1 威脅模型確認兩個治理缺口:

- **G8 職責分立(Separation of Duties)缺**:`admin` 單層全權(`acl.py:112` 無條件 bypass + `cfg.view_audit_log` admin-only),**被監察者 = 監察者**;冇唯讀稽核角色,要俾合規 / 審計人員睇 audit log 就要俾 admin = 過度授權。違反 SOX / ISO 27001 SoD。
- **G9 存取覆核(Access Review)缺**:權限 grant 後**永久有效**,冇 snapshot「邊個有咩權限」+ 冇 re-certify + 冇遺留清理流程 → privilege creep / 離職遺留無人察覺。

**Tier 1.5 post-launch**(承 ADR-0066/0067):上線安全先決已 P2 達成(DG4);P5 = 合規治理增強,**非上線阻塞**。

**關鍵約束(零檢索影響)**:G8/G9 純授權 + 報告層,完全唔掂 `allowed_principals` / 檢索 filter / chunk schema / `principals_for_user` → **north-star §15 by construction no-op**。Additive(現有 4 role byte-identical)。

## Decision

採目標治理模型(F2),建喺 ADR-0027 role / permission / audit 之上,**零檢索改動、additive**:

1. **auditor role**(DG-P5-A = 加 `RoleKey` 第 5 值,用戶 2026-06-25 拍板):`RoleKey=[...,"auditor"]` + permission matrix 第 5 column(92→115 cell)。auditor **唯讀**:granted `kb.view_assigned` + `cfg.view_audit_log` + 新 `cfg.view_access_review`;所有寫 permission(kb.create / delete、doc.upload、cfg.manage_* 等)denied。auditor **唔加入** admin bypass(`acl.py:112` 維持只 admin);`principals_for_user(auditor)` = `[oid]`(非 None,檢索受正常 ACL 約束)。`_TIER1_ROLES`(`users.py`)加 auditor 令可指派。

2. **管理權分層 = 只加 auditor**(DG-P5-B = B1,用戶拍板 + F2 push-back 成立):admin 維持單層。**super-admin / KB owner 唔加** —— `kb_acl.manage` 已係 per-KB 最高權近似 owner;super-admin 委派 = 大型多團隊需求,**無真實 driver = speculative**(Karpathy §1.2)。出現明確需求先加(留後期,同 P6 ABAC 政策引擎邊界互通)。

3. **access-review report**(G9):新端點 `GET /admin/access-review`(`require_role("admin","auditor")`)。匯總每 user:workspace role + KB ACL grants(逐 KB)+ group 成員 + last login / verified。**建喺既有** `users` / `rbac` / `kb_acl` store,純讀 + 組裝,**唔新增 data plane**。

4. **re-certify = 報告 + 覆核標記**(DG-P5-C = C2,用戶拍板):新 `access_review_store`(Protocol + InMemory + Postgres `access_reviews(principal_id, reviewed_by, reviewed_at, note)` 表,mirror 既有 store pattern)記覆核事件 + 新 audit action `access.reviewed`。**無審批 workflow**(審批屬延後 JIT)。覆核 = 確認現狀適當,**唔改** user / kb_acl(要改權限走既有 `/users` / `/kb/{id}/acl` 端點)。

5. **Tier 定位 = Tier 1.5 post-launch**(DG-P5-D,用戶 2026-06-25 拍板「暫不 implement」):本 ADR = 設計拍板;**implementation = P5-impl,用戶另批**(非即刻 kickoff)。

6. **P5 分段**(implementation,ADR Accept + 用戶另批後):F1 auditor role(`RoleKey` + matrix column + guard)→ F2 access-review report 端點 → F3 re-certify store + 端點 → F4 前端治理 UI(H7)→ F5 Gate(BC + 零檢索影響驗證)。

## Alternatives Considered

- **auditor = 獨立 permission flag(`is_auditor` bool)**:唔郁 `RoleKey`,但引入 role 以外第二授權維度,guard 複雜化 → **reject**(DG-P5-A 揀 role)。
- **auditor = 特殊 group**:group 係 ACL principal 唔係 workspace role,語義錯位 → **reject**。
- **加 KB owner 級(DG-P5-B B2)**:`kb_acl.manage` 已近似 owner,語義重疊收益低 → **defer**(無 driver)。
- **加 super-admin(DG-P5-B B3)**:單一 workspace 一個 admin tier 夠,委派 = 大型組織需求無 driver = speculative → **defer**。
- **re-certify 加自動過期提醒(DG-P5-C C3)**:引入時間政策 + 背景 job,接近 JIT → **defer Tier 2**。
- **JIT 臨時提權 / break-glass / 自動回收**:用戶 2026-06-25 拍板**延後 Tier 2**(需審批 workflow / SSO/SCIM)。

## Consequences

- **Positive**:職責分立(G8 — 獨立唯讀稽核角色,管理操作第三方可見);存取覆核(G9 — snapshot + 可追溯 re-certify);**零 vendor(H2)、零索引、零檢索改動**(north-star §15 no-op);additive(現有 4 role byte-identical);建喺既有 store + audit log。
- **Negative**:permission matrix 92→115 cell(auditor column);新 `access_review_store` + 1 表;前端多一 column + access-review view(H7,等 mockup)。
- **Neutral**:P5 = Tier 1.5 post-launch(非上線阻塞);super-admin / owner / JIT / break-glass / 自動回收劃後期或 Tier 2(需將來 ADR);implementation 待用戶另批(本 ADR 只拍板設計)。

## References

- [`threat-model-p5.md`](../01-planning/W94-rbac-p5-governance-design/threat-model-p5.md)(F1 G8/G9 + 企業 SoD / access-review 對標)
- [`target-architecture-p5.md`](../01-planning/W94-rbac-p5-governance-design/target-architecture-p5.md)(F2 設計 + DG 選項 trade-off + 分層 push-back)
- ADR-0027(W24c RBAC,role / permission matrix / audit log 基建來源)
- ADR-0066(P2 檢索層 ACL)+ ADR-0067(P3 doc_acl + group)— P5 與檢索層正交,純治理層
- DG resolution(W94 plan §3 + AskUserQuestion,用戶 2026-06-25 拍板 DG-P5-A 加 role / DG-P5-B 只加 auditor / DG-P5-C 報告 + 覆核標記 / DG-P5-D Tier 1.5 暫不 implement)
- `ROADMAP.md §2 P5` + 次序鐵律 5(ADR Accept = P5-impl 解鎖前置)
