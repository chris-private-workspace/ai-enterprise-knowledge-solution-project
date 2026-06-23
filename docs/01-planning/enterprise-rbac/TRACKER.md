# Enterprise RBAC — 項目工作追蹤清單(TRACKER)

> **用途**:呢個獨立項目(企業級權限管理系統)嘅**跨階段持續追蹤清單**。每次有進展 → 勾選對應項 + 更新狀態 + 補變更日誌。
> **最後更新**:2026-06-23
> **Owner**:Chris(技術 Lead)
> **狀態圖例**:🔲 未開始 ・ 🟡 進行中 ・ ✅ 完成 ・ ⏸️ 待批准 ・ 🚫 阻塞 ・ ⏭️ 延後

---

## 一、狀態總覽(一眼睇)

| 階段 | 內容 | 狀態 | 備註 |
|---|---|---|---|
| 規劃 | 路線圖 + P0 計劃 + 報告 + 紀錄 | ✅ 完成 | 已 commit + push |
| **P0** | 基礎校正 + W24c 收尾 | ⏸️ **待批准** | 計劃 draft,等 Chris flip active |
| P1 | 威脅模型 + 目標架構 + ADR-0066 | 🔲 未開始 | 依賴 P0 |
| P2 | 檢索層文件級存取控制 | 🔲 未開始 | 依賴 P1;可能係上線先決 |
| P3 | 文件/資料夾級細粒度授權 | 🔲 未開始 | 依賴 P2 |
| P4 | 群組存取(成員 + 繼承) | 🔲 未開始 | 真實同步隨 SSO 延後 |
| P5 | 管理權分級 + 存取治理 | 🔲 未開始 | 依賴 P3 |
| P6(選) | 屬性式權限 / 政策引擎 | ⏭️ 延後 | 規模化才需 |
| SSO/SCIM | 真實 SSO + 自動供應 | ⏭️ 延後 | 用戶決定後加 |

**整體定調(2026-06-23 實測)**:規劃完成;程式碼地基扎實(160 測試通過 / 13 端點)但**系統未活**(實測 login 401 + 角色錯 + 授權表空);企業核心安全 0%。**等 P0 批准令地基活起來。**

---

## 二、工作清單(可勾選持續追蹤)

### 階段 0 — 規劃(✅ 完成 2026-06-23)
- [x] 現狀調查(認證鏈 / RBAC / 資料層)
- [x] 根因分析(git 考古 → 環境同步問題,非設計缺陷)
- [x] 企業級評估(九維度 + 檢索層安全缺口)
- [x] 親自實測驗證(160 測試 / 端點 / 資料庫)
- [x] 候選路線圖 `ROADMAP-enterprise-rbac.md`
- [x] W88 P0 詳細計劃(plan / checklist / progress)
- [x] 向上級匯報報告 v2(三層誠實量度)
- [x] 對話紀錄 `RECORD-rbac-investigation-2026-06-23.md`
- [x] commit + push(`8f3e1c4` + `1e1bc2b`)

### P0 — 基礎校正 + W24c 收尾(⏸️ 待批准 → 詳見 `W88-rbac-p0-foundation/checklist.md`)
- [ ] **批准開工**(Chris flip W88 draft → active)← 當前阻塞點
- [ ] F1 基準確認(disk / HEAD / running backend 一致)+ 帳號 role 理順
- [ ] F2 修首位用戶自動管理員(bootstrap)+ role 值一致性
- [ ] F3 前端硬編「Workspace Admin」badge → 讀真 role
- [ ] F4 `/users` 寫操作接通(改 role / 邀請 / 停用)
- [ ] F5 KB endpoints 補接 `require_kb_acl`
- [ ] F6 Phase Gate 驗證 + smoke
- [ ] P0 closeout + 更新本 TRACKER + 報告基準

### P1 — 威脅模型 + 目標架構 + ADR-0066(🔲 未開始,kickoff 先展開細項)
- [ ] 威脅模型 + 需求(資料分類 / 用戶類型 / 合規 / 租戶數)
- [ ] 目標授權模型決定(資源層級 / RBAC+ABAC 邊界 / 索引結構)
- [ ] 撰寫 ADR-0066 + Chris approve(H1/H4 正式拍板)
- [ ] 建立 W{NN} P1 phase folder(plan/checklist/progress)

### P2 — 檢索層文件級存取控制(🔲 未開始,**最關鍵安全層**)
- [ ] 索引結構加 ACL / 密級欄位
- [ ] ingestion stamp 文件 ACL
- [ ] 查詢時注入 Azure AI Search filter(檢索當下過濾)
- [ ] 答案 / 引用層確認唔洩漏
- [ ] 重建索引(一次性遷移)+ 驗證唔影響問答品質

### P3 — 文件/資料夾級細粒度授權(🔲 未開始)
- [ ] 授權表擴資源層級維度(KB → 資料夾 → 文件)
- [ ] grant + 繼承 + 覆寫邏輯
- [ ] 細粒度授權管理介面

### P4 — 群組存取(🔲 未開始,真實同步隨 SSO)
- [ ] 群組成員模型 + 繼承解析
- [ ] 手動 / 匯入成員(真實 Entra 同步留待 SSO)

### P5 — 管理權分級 + 存取治理(🔲 未開始)
- [ ] 角色分立(超管 / workspace 管理 / 稽核員 / KB 擁有者)
- [ ] 存取覆核(recertification)
- [ ] 生命週期(JIT / 回收 / break-glass)

### P6(選)— 屬性式權限 / 政策引擎(⏭️ 延後)
- [ ] 評估角色是否爆炸 → 決定是否上 OPA / Cedar

### SSO / SCIM(⏭️ 延後 — 用戶決定後加)
- [ ] 真實 Microsoft Entra ID SSO 接駁
- [ ] SCIM 自動供應 + 離職回收
- [ ] 群組真實同步

---

## 三、里程碑 / Gate

- [ ] **M1** P0 完成 — 地基活起來(登入正常 / 角色正確 / 寫操作可用)
- [ ] **M2** ADR-0066 Accepted — 目標架構 + Tier scope 拍板
- [ ] **M3** P2 完成 — 檢索層文件級安全上線(企業安全先決條件達成)
- [ ] **M4** 細粒度授權 + 群組(P3+P4)可用
- [ ] **M5** 治理層(P5)可用 — 達企業級營運水平

---

## 四、待決事項(需管理層 / Chris 拍板)

- [ ] **D1** 批准 P0 開工(flip W88 active)
- [ ] **D2** 整體策略排序:先推 Tier 1 上線 vs P0+P2 安全層併入上線準備(AI 建議後者)
- [ ] **D3** P1 之後階段是否納入正式排期
- [ ] **D4**(已完成)規劃文件是否 push → ✅ 已 push 2026-06-23

---

## 五、相關文件索引

| 文件 | 位置 | 用途 |
|---|---|---|
| 候選路線圖 | `docs/01-planning/ROADMAP-enterprise-rbac.md` | P0–P6 策略藍圖 |
| P0 詳細計劃 | `docs/01-planning/W88-rbac-p0-foundation/` | plan / checklist / progress |
| 向上級匯報 | `docs/01-planning/REPORT-enterprise-rbac-status-2026-06-23.md` | 進度報告 v2 |
| 對話紀錄 | `docs/01-planning/RECORD-rbac-investigation-2026-06-23.md` | 調查歷程 |
| RBAC 架構決策 | `docs/adr/0027-users-tier-1-5-rbac.md` | W24c 已實作 |
| 本追蹤清單 | `docs/01-planning/enterprise-rbac/TRACKER.md` | 跨階段持續追蹤(入口) |

---

## 六、變更日誌

| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-23 | 建立 TRACKER;規劃階段 ✅;P0 ⏸️ 待批准;P1–P6 🔲 | 初版 |

---

> **使用說明**:呢份係項目入口 + 持續追蹤點。開工 / 完成任何項 → 勾選 + 改狀態 + 補變更日誌。各 phase kickoff 時,喺對應 W{NN} folder 建詳細 plan/checklist/progress,本 TRACKER 嘅該階段細項同步展開。
