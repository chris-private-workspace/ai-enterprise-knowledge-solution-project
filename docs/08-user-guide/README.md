# EKP 用戶指引 — 設定 · 配置 · 調試 · 操作手冊

> **版本基準**:2026-06-12(W69 收官後 — config 平台 + image-recall 弧 + preset 一鍵套用全部落地)
> **讀者**:平台操作者(KB 管理員 / power user / 內容負責人)。本手冊講 **UI 上做得到嘅嘢**;
> 開發環境搭建見 `docs/setup.md`,系統架構見 `docs/architecture.md`。

## 文檔結構

一層扁平 + 編號(8 份,少於 10 份唔分子資料夾 — 加層反而增加導覽成本):

| # | 文檔 | 內容 | 邊個要讀 |
|---|---|---|---|
| 01 | [平台導覽](./01-platform-overview.md) | 頁面地圖、核心概念、角色 | 所有人(第一份讀呢份)|
| 02 | [KB 建立與文件管理](./02-kb-setup-guide.md) | 建 KB 五步 wizard、上傳、ingest 驗收、re-index | KB 管理員 |
| 03 | [配置完全參考](./03-configuration-reference.md) | 四層配置鏈 + 每個旋鈕嘅位置 / 出廠值 / 作用 / 何時調 | KB 管理員(核心參考)|
| 04 | [調試與試跑工作流](./04-tuning-workflow.md) | 試跑 panel 指標解讀、分層診斷、調參紀律 | KB 管理員 / power user |
| 05 | [文件類型 playbook](./05-document-type-playbooks.md) | 步驟手冊 / prose / 簡報 / 混合 KB 嘅實戰配方 | KB 管理員 |
| 06 | [參考指標與 benchmark](./06-benchmarks-and-metrics.md) | 平台實證數字、指標定義、預期值對照 | 評估效果時 |
| 07 | [故障排查](./07-troubleshooting.md) | 常見問題 → 原因 → 解法 | 出事時 |

## 快速路徑

- **「我啱啱接手平台」** → 01 → 02 → 05
- **「我要建一個新 KB 上傳文件」** → 02(注意 §2 兩個必看嘅出廠值)
- **「文字 / 圖片出唔齊」** → 07 對症,再去 04 學診斷
- **「想調好一個 KB 嘅效果」** → 04 工作流 + 03 查旋鈕 + 06 對指標
- **「圖密步驟手冊」** → 05 §1(一鍵 preset)

## 真實性聲明

本手冊全部旋鈕名、出廠值、頁面元素、benchmark 數字均核對自 2026-06-12 嘅 codebase
(`backend/storage/settings.py` / `backend/api/schemas/kb.py` / `doc_config.py` / frontend 各頁)
同實際 eval 報告(W2 Gate 1 / 2026-05-30 雙 eval / W59–W68 image-recall 弧)。如 UI 同手冊不一致,
以 UI 為準並回報更新本手冊。

## 維護

- 旋鈕新增 / default 改動(凡涉 ADR)→ 同步更新 03 + 06
- 新文件類型實證配方 → 補入 05
- Phase closeout doc-sync 時掃一次本資料夾
