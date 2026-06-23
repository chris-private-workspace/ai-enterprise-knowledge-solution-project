# Enterprise RBAC — 協作標準作業流程(COLLABORATION-SOP)

> **用途**:用戶 ⇄ AI 合作開發呢個權限管理項目嘅標準流程。目標:更精準、專業、有效率、專注、系統。
> **建立**:2026-06-23(由當日協作經驗固化 —— 咩 work、咩造成摩擦)
> **適用**:呢個 enterprise-rbac 項目嘅所有 session。與 CLAUDE.md(全域 standing instructions)並行,呢份係本項目嘅 working agreement。
> **追蹤入口**:[`TRACKER.md`](./TRACKER.md) ・ **事實基準**:[`FINDINGS.md`](./FINDINGS.md)

---

## §1 Session 開工 / 收工協議

**開工(每次 session 頭)**:
1. **Pre-flight 健康檢查**(`/ekp-preflight` 或手動):Langfuse `/api/public/health` 200 + Postgres handshake + backend `:8000/health` + frontend port。以 endpoint 200 為準,唔以 Docker flag 為準。
2. **讀狀態**:`TRACKER.md`(狀態 + 待決)→ `FINDINGS.md`(事實基準)→ active phase(`W88-*/` plan + checklist next item + progress 最近 entry)。
3. **`git status --short` + `git log --oneline -5`**:知 working tree + 有冇另一 session 在動。
4. **防 stale**:若會驗證 backend 行為,先確認 backend 進程啟動時間 ≥ 最新 backend commit,否則重啟。

**收工(每次 session 尾)**:
1. 更新 `TRACKER.md`(勾選完成項 + 改狀態 + 變更日誌)。
2. commit + push(守 §7 多 session + OneDrive 規則)。
3. 留 carry-over(active phase `progress.md` Day-N entry 或 TRACKER)。

---

## §2 溝通協作模式

- **標準節奏**:我**提建議 → 畀清單 / 選擇題 → 你揀 → 我執行**。唔自己 assume 重大方向。
- **重大 / 不可逆決定**:用 `AskUserQuestion` 或清單畀你揀,唔默默決定(CLAUDE.md §13)。
- **我嘅誠實義務**:
  - 唔肯定就明講「我未確認」,唔靠估(Karpathy §1.1)。
  - **發現自己誤判即明說 + 糾正** —— 今日兩次:「兩套並存技術債」→ 環境同步;「85%」→ 三層量度。唔死撐。
  - 你質疑時,我**先 think 再答**,有理據先 surface,唔即刻跪低又唔硬撐。
- **語言**:繁體中文為主(CLAUDE.md §11 binding-strict)。
- **唔過度 disclaimer**:重要決定第一句講清,唔埋喺長文。

---

## §3 任務執行流程

- **Think-before-acting**:開工前講 **plan + assumption + 風險**(Karpathy §1.1)。多步任務先列「步驟 → 每步 verify」。
- **逐 phase,唔一次過諗晒**(解「大 project 好茫」):每階段 kickoff 用 `Plan` agent 出實作策略 + 關鍵檔案 + 風險。專注當前一個 phase 嘅 F1–Fn。
- **Goal-driven**:每個任務轉成**可驗證**成功標準(Karpathy §1.4),例「加 validation」→「寫 test for invalid input + make pass」。
- **Surgical**:只改該改,唔順手 refactor 無關 code(Karpathy §1.3)。每行改動 trace 返你嘅 request。

---

## §4 驗證 / 品質護欄

- **不信自報,實測**(今日核心教訓):驗證一律親自**跑 test / 實打端點 / 查資料庫**,唔信 doc 嘅「PASS / 達標」。今日「85% → 實測三層」就係呢條救返。
- **每個 F 完成**:跑 `verify` skill(確認真 end-to-end work,唔淨係 pytest 綠 —— pytest 綠 ≠ running server 有該 code)。
- **PR / 重大改動**:跑 `code-review`(bug)+ **`security-review`(安全項目必跑)**。P2 改檢索主路徑必 review。
- **自動護欄**:`scripts/hooks/` pre-commit(ruff lint)+ pre-push(pytest);啟用 `git config core.hooksPath scripts/hooks`。
- **反偽驗收**:`ekp-anti-patterns` skill 自檢(Potemkin citation / gate-only 偽驗收 / mock-vs-real 混淆 / in-memory 假象 / stale 數字)。

---

## §5 決策把關協議

- **Tier 邊界硬閘**:P2+ 跨 Tier(摸 Tier 2)→ **ADR-0066 Accepted + Chris approve 先開工**(H1 + H4)。
- **Phase 開工閘**:W88 P0 `draft` → Chris flip active 先 implement(§10 R1,無 plan / 無批准唔開工)。
- **唔 silent drift**:scope / deliverable 變動 → 記 `plan.md` 或 `TRACKER.md` changelog(§10 R3)。
- **H1–H7 觸發**:第一句即 STOP + explain,等你決定(尤其 H7 design fidelity / H5 security)。
- **資料 / 帳號改動走正當路徑**:例帳號升權走 bootstrap / 升權 endpoint,**唔裸改資料庫 hack**(今日 P0 決定)。

---

## §6 文件 / 狀態管理

- **單一事實來源**:現狀 / 實測 / 根因 / 缺口 / 改造性質**只喺 `FINDINGS.md` 維護一份**;ROADMAP / REPORT / RECORD / TRACKER 一律**引用**,唔各自複製。改數據只改一處。
- **TRACKER 持續追蹤**:每完成一項 → 勾選 + 改狀態 + 補變更日誌。佢係項目入口。
- **Phase 文件**:每 phase kickoff 建 `W{NN}-*/` plan + checklist + progress(§10 rolling JIT,唔一次過建晒)。
- **唔重複維護**:同一資訊唔好喺多份文件各寫一份(今日「方案 A 整合」就係修呢個)。

---

## §7 環境 / 基礎設施應對(今日最大阻礙)

- **OneDrive 同步不穩**(今日反覆):
  - Write tool 報告成功但 **git / disk 睇唔到** → 用 PowerShell `[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))` 直寫繞過(LF + no BOM)。
  - 或叫你喺檔案總管右鍵「**一律保留在此裝置上**」強制本地化。
  - **commit 前必驗**:`git ls-files --others` / `git diff --cached --name-only` 確認文件真係入咗,缺就唔 commit(防破碎,如今日險啲丟 RECORD)。
- **多 session 協調**:
  - commit 前 `git reset -q HEAD -- <其他 session 路徑>` 避開唔屬你嘅 staged 文件(今日反覆避開 `W87-onedrive-path-migration`)。
  - 撞到陌生新進程 / staged 文件 → **先停手問**,唔當入侵者殺、唔當自己嘢 commit。
- **Backend stale**:`python -m api.server` 無 `--reload`,code 改完唔自動 pick up。驗證行為前確認進程啟動時間 ≥ 最新 commit,否則重啟。
- **重啟 = 全部服務**(infra docker + azurite + backend venv 殺 dual-process + frontend wipe `.next`),但**只起服務,唔順手跑 eval / 改 config / 開 plan**(per memory)。

---

## §8 工具使用約定

| 工具 | 幾時用 |
|---|---|
| `Explore` agent | sweep codebase / 多檔多角度調查(今日查 RBAC 用過,有效) |
| `Plan` agent | 每 phase kickoff 出實作策略 + 關鍵檔案 + 風險 |
| `Workflow`(多 agent) | **只** P2 / P5 呢類可並行大階段;燒 token,opt-in,細階段唔用 |
| browser MCP(playwright) | 前端 RBAC UI 驗證 + E2E + 截圖(P0 F3/F4、P3 介面);產物已 gitignore |
| `verify` / `code-review` / `security-review` skills | §4 護欄;安全改動必 security-review |
| git hooks(`scripts/hooks/`) | commit / push 自動把關 |
| `memory` | 跨 session 知識(現狀 / 繞坑法);recalled memory 要先 verify 仍適用 |
| `AskUserQuestion` | 重大 / 不可逆決定畀你揀 |

---

## §9 使用說明 + 變更日誌

- **每 session 開工**跟 §1;**做嘢**跟 §3 + §4;**遇環境坑**查 §7;**重大決定**跟 §5 + §2。
- 呢份 SOP 隨協作演進;新教訓 → 補對應章節 + 下表。

| 日期 | 變動 | 由 |
|---|---|---|
| 2026-06-23 | 初版(完整 8 章,由當日協作經驗固化) | 初版 |