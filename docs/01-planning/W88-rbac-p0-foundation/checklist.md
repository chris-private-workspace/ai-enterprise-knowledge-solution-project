# W88 P0 — Checklist

> 對應 [`plan.md`](./plan.md) §2 F1–F6 + §3 Phase Gate。完成 → `[x]` + progress Day-N 記錄。
> 未完項**不可刪**(per CLAUDE.md §10 sacred rule),只 `→ [x]` 或標 🚧 + 理由。

## F1 環境基準確認 + 帳號角色理順
- [ ] `git show HEAD:backend/api/schemas/rbac.py` vs disk vs running backend 三層比對
- [ ] running backend `/auth/me` 實測(確認有無 viewer / role_source 幻欄位 → 若有則重啟)
- [ ] `admin@example.com` DB role + 解析角色對齊正確值
- [ ] 三層實測截錄入 progress

## F2 首位用戶自動管理員 bootstrap
- [ ] 定位 bootstrap 邏輯(首位註冊 → admin)
- [ ] 修正令空 DB 第一個用戶 role=admin
- [ ] DB role 值域對齊 RoleKey 四級
- [ ] 單元測試覆蓋

## F3 前端硬編 badge → 讀真角色
- [ ] 定位前端硬編 "Workspace Admin"
- [ ] 改讀 `/auth/me` 真角色
- [ ] H7 對齊 mockup(不同角色 badge)

## F4 /users 寫操作接通
- [ ] 改角色接通
- [ ] 邀請接通
- [ ] 停用接通
- [ ] 前端錯誤態處理

## F5 KB 端點補接 require_kb_acl
- [ ] 盤點 KB 寫端點守衛覆蓋
- [ ] 補缺口
- [ ] 無權帳號被擋(測試)

## F6 Phase Gate + 端到端驗證
- [ ] G1–G5 逐項驗
- [ ] RBAC / auth pytest 全綠(≥ 160)
- [ ] 端到端 smoke 走通
- [ ] ruff clean
- [ ] P0 closeout + 更新 TRACKER + FINDINGS 基準
