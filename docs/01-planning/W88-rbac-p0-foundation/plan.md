# W88 — Enterprise RBAC P0:基礎校正 + W24c 收尾

| 項目 | 值 |
|---|---|
| Phase | W88-rbac-p0-foundation(enterprise RBAC track 第 1 期) |
| Status | **active**(2026-06-24 用戶批准開工) |
| Tier | ✅ 純 Tier 1(W24c 收尾,不撞 H1 / H4) |
| 依賴 | 無(track 起點) |
| 錨點 | ADR-0027(W24c RBAC)・ 事實基準 [`../enterprise-rbac/FINDINGS.md`](../enterprise-rbac/FINDINGS.md) |
| 粗估 | 3–5 日 |
| 下一期 | P1 威脅模型 + ADR-0066(rolling JIT,本期收尾才建) |

> **本 plan 受 FINDINGS 約束**:現狀 / 實測 / 根因 / 缺口一律以 [`../enterprise-rbac/FINDINGS.md`](../enterprise-rbac/FINDINGS.md) 為準,本檔只定 scope + deliverables + acceptance criteria,事實不複製。

---

## §1 目標(Why)

W24c 交付咗扎實嘅 RBAC 程式碼地基(160 測試通過),但**系統未活**:登入不穩、角色解析錯、首位管理員 bootstrap 未生效、前端硬編 badge、`/users` 寫操作佔位、KB 端點未全接 ACL 守衛。

P0 唯一目標 = **令地基活起來**,做到端到端走通(登入正常 → 角色正確 → 寫操作可用),為 P1 目標架構拍板鋪路。**P0 = 校正,唔係新功能,唔係重做**(per FINDINGS §3 + §5)。

## §2 Deliverables(F1–F6)

| # | Deliverable | Acceptance(可驗證成功標準) |
|---|---|---|
| F1 | 環境基準確認 + 帳號角色理順 | HEAD / disk / running backend 三層 rbac schema 一致;`admin@example.com` 解析為正確角色(非 viewer 幻值);三層實測截錄入 progress |
| F2 | 首位用戶自動管理員 bootstrap + 角色值一致 | 空 DB 第一個註冊用戶 → role=admin;DB role 值域對齊 `RoleKey`(四級);單元測試覆蓋 |
| F3 | 前端硬編 badge → 讀真角色 | 移除前端寫死 "Workspace Admin";badge 讀 `/auth/me` 真角色;不同角色登入顯示對應 badge(H7 對齊 mockup) |
| F4 | `/users` 寫操作接通 | 改角色 / 邀請 / 停用 由佔位接通後端;操作後 DB 變更且重查反映;前端錯誤態處理 |
| F5 | KB 端點補接 `require_kb_acl` | 盤點 KB 寫端點守衛覆蓋;缺口補上 `require_kb_acl`;無權帳號被擋(測試覆蓋) |
| F6 | Phase Gate + 端到端驗證(smoke) | G1–G6 全綠;登入 → 角色正確 → 寫操作可用 端到端走通 |

## §3 Phase Gate(G1–G6,收尾驗證)

- **G1** 環境一致:三層 schema + 帳號角色對齊(F1)
- **G2** bootstrap 生效 + 角色值一致 + 測試綠(F2)
- **G3** 前端 badge 讀真角色 + H7 fidelity(F3)
- **G4** `/users` 寫操作端到端可用(F4)
- **G5** KB 端點 ACL 守衛無缺口 + 測試綠(F5)
- **G6** RBAC / auth pytest 全綠(≥ 160 baseline)+ 端到端驗證 + ruff clean

## §4 Risks

- 🔴 **OneDrive 同步吞文件**(active):Write 報成功但 git / disk 睇唔到 → PowerShell `[System.IO.File]::WriteAllText` 直寫 + commit 前 `git ls-files` 驗入庫。**本 plan 本身就係呢個 risk 嘅受害者**(初版三件套規劃階段未入庫,2026-06-24 重建)。
- 🔴 **backend stale**(active):running backend 無 `--reload`,改 backend code 後必須重啟先生效;驗證行為前先確認進程啟動時間 ≥ 最後 backend commit(per memory `project_stale_backend_no_reload`)。
- 🟡 **多 session 衝突**:另一 session `W87-onedrive-path-migration`(untracked),commit 前 `git reset -q HEAD -- docs/01-planning/W87-onedrive-path-migration/` 避開。
- 🟡 **改 RBAC 主路徑勿爛問答品質**:F5 動 KB 端點守衛,勿影響 W43–85 圖文還原(P0 應只**加守衛**,不改檢索邏輯)。

## §5 Out of scope(留 P1+)

威脅模型 / 目標授權架構 / ADR-0066 / 檢索層文件級 ACL(P2)/ 群組同步(P4)/ 真實 SSO / 管理權分級(P5)。P0 **只**收尾 W24c 既有債,不開新架構(per ROADMAP §3 次序鐵律 3)。

## §6 Changelog

| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-23 | 規劃階段嘗試建立三件套,**但未真正入庫**(OneDrive 同步吞文件) | 規劃 |
| 2026-06-24 | **三件套重建** + 用戶批准 flip active;acceptance criteria 對齊最新實測(disk `rbac.py` 已自愈追上 HEAD) | 開工 |
