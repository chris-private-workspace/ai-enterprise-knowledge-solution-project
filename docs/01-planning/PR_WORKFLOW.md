# EKP Pull Request Workflow

> **目的**:本 doc 定義 EKP project 嘅 **git PR 操作流程**。係 CLAUDE.md §4(Git & Workflow Conventions)嘅執行細則 + [`PROCESS.md`](./PROCESS.md)(task lifecycle)嘅 git 層補充 —— PROCESS.md 講「一個 task 點規劃」,本 doc 講「寫完點入 `main`」。

**Version**: 1.0 | **Effective**: 2026-07-04 | **Owner**: Chris(技術 Lead)
**Mode**: Solo self-merge(階段 1)| **Branch protection**: 未開(分階段,見 §7)

---

## 0. 點解 solo 都要 PR

一直以嚟 EKP 係 solo 直推 + 本地 ff-merge,`origin/main` 長期落後本地(盤點時落後 32 個 commit)。呢個做法有三個實質損失:

1. **CI gate 從未當 gate 用** — `backend-ci.yml` 早就 `on: pull_request`(ruff + pytest),但唔開 PR 就唔觸發,broken code 有機會直入 `main`。
2. **零變更審查痕跡** — 冇 PR 討論載體,日後追「呢個改動點解」只可以靠 commit message。
3. **`origin/main` 同本地脫節** — GitHub 上 `main` 唔係真最新,將來協作者 / CI / 部署基準都會亂。

Solo 開 PR 唔係官僚,係**用返已有基建 + 為未來協作/protection 鋪路**。現階段模式:自己開 PR、CI 綠 + self-review 之後自己 merge。

## 1. 適用範圍(幾時要開 PR)

對齊 PROCESS.md §1.4 task type:

| 改動類型 | 走 PR? | 理由 |
|---|---|---|
| 掂 `backend/**` 或 `frontend/**` 嘅 feat / fix | ✅ 要 | 有 CI gate 把關(ruff / pytest / lint / build) |
| Change / Bug-fix instance(已有 spec / report) | ✅ 要 | 同上 + 留審查痕跡 |
| 純 docs / planning / ADR(唔掂 code) | ⚪ 可選 | CI 唔觸發(paths filter),solo 可直推當前 branch 慳時間;涉及多人要睇嘅重要 doc 建議都開 |
| Trivial(typo / 單行 / < 30min,唔掂 code) | ❌ 免 | 對齊 PROCESS.md §1.4 trivial = just commit |

## 2. 標準流程

```
1. 開 branch      git checkout -b feat/<area>-<desc>      (CLAUDE.md §4.1 naming)
2. Commit         Conventional Commits                     (CLAUDE.md §4.2)
3. Push           git push -u origin feat/<area>-<desc>
4. 開 PR          GitHub 網頁 / gh(§5)+ 填 body(§3)
5. CI 自動跑      backend-ci / frontend(§4)— 等綠
6. Self-review    自己 review 個 diff + 過 CLAUDE.md §12 self-verify checklist
7. Merge          rebase merge(建議,§6)
8. 清理           git branch -d feat/<area>-<desc>(本地)+ GitHub 自動刪遠端 branch
```

## 3. PR body 要求(CLAUDE.md §4.3)

Template 暫未建(手動填以下,將來階段 3 先固化成 `.github/PULL_REQUEST_TEMPLATE.md`):

- **Link spec**:對應 `architecture.md §X` / ADR-NNNN / phase folder。
- **Test scenario**:列驗過乜(pytest / eval / 手動 smoke)。
- **Screenshots**:frontend 改動**必附**(對齊 H7 design fidelity — mockup vs 實作對照)。
- **Dify reference**(若有):`Reference: dify/<path>`(H3,只標 layout 借鑒,唔可以 copy code)。

## 4. CI gate(已有,自動觸發)

| Workflow | 觸發條件 | 做乜 |
|---|---|---|
| `backend-ci.yml` | PR 掂 `backend/**` | ruff check → `pytest -q` |
| `frontend-deploy.yml` | PR 掂 `frontend/**` | lint + type-check → next build(+ SWA staging) |
| `backend-deploy.yml` | push `main` / 手動 | ACA 部署(**唔喺** PR 跑) |

**留意**:純 docs PR 唔會觸發任何 CI(paths filter)→ 可以快速 self-merge。

## 5. 開 PR 嘅方法

**方法 A — GitHub 網頁(現況,`gh` 未裝)**
Push 之後終端會列 `Create a pull request` 連結;或去 `https://github.com/laitim2001/ai-enterprise-knowledge-solution-project/pulls` → **New pull request** → base `main` ← compare `<你嘅 branch>`。

**方法 B — `gh` CLI(可選,日後裝返方便)**
```bash
winget install GitHub.cli        # 或 scoop install gh
gh auth login
gh pr create --base main --fill  # 用 commit 自動填,再補 §3 body
gh pr merge --rebase --delete-branch   # CI 綠之後
```
裝咗 `gh` 之後,開 PR / merge / 睇 CI 狀態都可以留喺終端,唔使切網頁。

## 6. Merge 策略

- **預設 rebase merge** — 保留每個 atomic conventional commit + `main` 線性(貼合 EKP 現有歷史,每個 commit 已 self-contained)。
- **例外 squash merge** — PR 內有一堆 WIP / fixup commit 唔想入 `main` history 時先用。
- **唔用** merge commit — 避免 `main` 出現分叉 merge node,同現有線性風格唔一致。

Merge 之後 `origin/main` 自然前進 → 順手解決 `origin/main` 脫節問題。

## 7. 分階段路線圖

| 階段 | 狀態 | 內容 |
|---|---|---|
| **階段 1** | ← 依家 | Solo self-merge,無 branch protection,跑順 PR 流程 |
| 階段 2 | 穩定幾個 cycle 之後 | GitHub 開 `main` branch protection:禁直推 + require `backend-ci` pass + require PR。設定清單日後補 |
| 階段 3 | 有協作者時 | CODEOWNERS + required reviewers + `.github/PULL_REQUEST_TEMPLATE.md` 固化 §3 body |

階段 2 / 3 觸發時各自係一個 change,依 PROCESS.md 走 + 記 [`BACKLOG.md`](./BACKLOG.md)(R7)。

---

**End of PR_WORKFLOW.md**
