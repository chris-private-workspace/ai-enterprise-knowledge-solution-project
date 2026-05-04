# SITUATION EKP — Session Start Prompt(每個新 session 必用)

> **用法**:每個新 session 開始時,整份 copy 入對話框送出,**只需更新最後一節「今天的任務」一行**。其他段落係常駐 onboarding context,唔需要每次改。
>
> **適用範圍**:Tier 1 12-week sprint(W1–W12,2026-04-27 → 2026-07-19 約)。Tier 1 收尾後再決定是否退役 / 改寫 V2 prompt。

---

## 第一部分:你正在加入嘅項目

你好。本項目係 **Enterprise Knowledge Platform (EKP) — Tier 1 Foundation**,目前處於 **12-week sprint POC + Beta + Rollout 階段**(W1 = 2026-04-27 啟動)。

### EKP 為何存在(Why)

Ricoh internal user manual(Word + PPT + PDF 混合 format)散落 SharePoint / Drive,員工搵唔到、引用唔啱,客戶服務同 onboarding 受影響。EKP Tier 1 提供**單一 RAG 入口**,首個 use case 係 **Drive Project — Ricoh internal user manuals**。

### EKP Tier 1 唔係咩(避免常見誤解)

- ❌ **唔係 SaaS / 多租戶平台** — Tier 1 single tenant,Beta+ 加 Microsoft Entra ID
- ❌ **唔係 GraphRAG / multi-agent** — 呢啲 explicit 屬 Tier 2(`architecture.md §11`)
- ❌ **唔係 Dify fork / 修改版** — Dify 純 read-only reference(`references/dify/`,license risk),禁止 copy code
- ❌ **唔係「Tango.us 抽 manual」** — source 係 Word / PDF / PPT 文件,非 Tango 平台
- ❌ **唔係 character-based chunker** — chunking 係 layout-aware(`§3.3 + §3.5`)

---

## 第二部分:最高指導原則(不可違反 — Strict Mode)

### 原則 1 — Behavioral Baseline(§1 Karpathy guidelines)
- **Think before coding**:assumption 明示,唔肯定就 ask,有更簡單做法就 push back
- **Simplicity first**:最少 code 解決問題,唔加未要求嘅 abstraction / flexibility / future-proofing
- **Surgical changes**:只改 user request 涉及嘅 code,唔順手 refactor / format adjacent code
- **Goal-driven execution**:task 一開始定 verifiable success criteria(寫 test for invalid input,然後 make pass)

### 原則 2 — Spec 凍結(`architecture.md` v5)
- v5 係 frozen baseline,**§3 + §4 任何 component 改動**就係 architectural change(H1)
- §3.2 vendor table 已 lock(H2):Azure AI Search S1 / Azure OpenAI text-embedding-3-large / Cohere Rerank v3.5 / GPT-5.5 / Docling + python-pptx / Langfuse / RAGAs / Next.js + shadcn/ui / FastAPI

### 原則 3 — Tier 1 only(H4)
- **Tier 1 implementation 唔可以包含 Tier 2 feature**,即使「順手做埋」:
  - GraphRAG / Knowledge Graph
  - L4+ multi-agent orchestration
  - Workflow / plugin builder
  - Multi-tenancy / Multi-language(JP/ZH)/ Multi-modal(B 類純圖片搜索)
  - Auto-sync / Custom LLM fine-tuning
- **「Tier 2 friendly」唔等於做**:Tier 1 必須 modular + extensible + MCP-ready,但實作留畀 Tier 2

完整 6 條 Hard Constraints(H1–H6)詳見 [`CLAUDE.md §5`](../../../CLAUDE.md)。

---

## 第三部分:EKP 12 Components(架構骨架)

EKP 嚴格按以下 12 component 組織代碼,**禁止跨 component 雜湊**:

| ID | Component | 首次接觸 | Status(2026-05-04 W2 closeout) |
|---|---|---|---|
| **C01** | Ingestion Pipeline(Docling + python-pptx + embedder)| W2 | 🟢 Active(F1-F5 W2 D1-D4 done;PPT parser W3 D5)|
| **C02** | Knowledge Base Manager(FastAPI in-memory)| W1 D2 | ✅ Implemented |
| **C03** | Indexing Service(Azure AI Search S1)| W2 D1 | 🟢 Active(`ekp-kb-drive-v1` index 1024d created)|
| **C04** | Retrieval Engine(Hybrid + Cohere Rerank v3.5)| W2 D5 | 🟡 Hybrid done;Cohere Rerank W3 D1 critical |
| **C05** | Generation Pipeline(GPT-5.5 + custom CRAG)| W3 D1 | ⏳ Not started |
| **C06** | Eval Framework(RAGAs + custom gate)| W1 D1 | 🟢 Validator + scaffold + F7 framework done |
| **C07** | Observability Stack(Langfuse + structlog)| W1 D1 | 🟢 Init done(BUG-001 closed)|
| **C08** | API Gateway(FastAPI + uvicorn + Pydantic v2)| W1 D1 | 🟢 18 stub scaffold;`/query` wired W2 D4 |
| **C09** | Admin Console UI(Next.js + shadcn/ui)| W1 D1 | 🟢 6 routes scaffold;4 views W2 D5 partial |
| **C10** | Chat Interface UI(Next.js + Vercel AI SDK)| W3 D2 | ⏳ Not started |
| **C11** | Identity & Access(MSAL + Entra ID)| W7 D1 | ⏳ Beta+ scope |
| **C12** | DevOps & Infra(Docker + Azurite + ACA + GHA)| W1 D1 | 🟢 Local stack done |

完整 spec:[`docs/02-architecture/COMPONENT_CATALOG.md`](../../02-architecture/COMPONENT_CATALOG.md) + per-component design notes `docs/02-architecture/components/Cn-*.md`(rolling JIT)。

---

## 第四部分:權威排序(衝突時上位者勝)

```
docs/architecture.md v5 frozen § 1-14 (content lock)
  > 根目錄 CLAUDE.md (standing instructions)
  > docs/01-planning/PROCESS.md v2.0 (workflow lifecycle)
  > docs/02-architecture/COMPONENT_CATALOG.md + components/Cn-*.md
  > active phase plan.md / checklist.md / progress.md
  > docs/decision-form.md (OQ status)
  > docs/adr/ (when 出 ADR 後)
```

**任何衝突以上位者為準**。Stakeholder feedback 同 spec 衝突 → STOP,surface conflict,等 resolution(per CLAUDE.md §13)。

---

## 第五部分:必讀文件(每次 session 至少讀以下)

依序讀完先對齊上下文:

1. **本 prompt**(你正在讀)— 高層 onboarding
2. **`CLAUDE.md`**(專案根目錄,v1.3)— Standing instructions + §1 Karpathy baseline + §5 H1–H6 hard constraints + §10 Phase Workflow R1–R5
3. **`docs/01-planning/PROCESS.md`**(v2.0)— 3 task types(Phase / Change / Bug-fix)+ R1–R5 binding rules + AI auto-classification
4. **Active phase plan.md + checklist.md + progress.md**(當前 W{NN} folder)— Sprint scope + next un-checked item + last 3 Day-N entries
5. **`docs/architecture.md`**(frozen v5)— 涉及 §3 RAG core / §4 application / §5 UI / §6 sprint timeline 嗰陣按需讀對應 section

按需要再讀:
- `docs/02-architecture/COMPONENT_CATALOG.md` + 對應 `components/Cn-*.md`(改 / 新加 component 時)
- `docs/01-planning/RISK_REGISTER.md`(living)— risk-related decision
- `docs/decision-form.md`(21 條 OQ 狀態)
- `docs/eval-methodology.md` + `docs/eval-set-v0.yaml`(寫 / 改 eval 時)
- `references/REFERENCE_USAGE.md`(借用 Dify reference 之前)

---

## 第六部分:Rolling Phase Planning 紀律(EKP §10 R1–R5 核心)⭐

> **EKP 紀律核心,每次 session 都要記住**

EKP 採用 **rolling JIT phase planning**(per `CLAUDE.md §10` + `PROCESS.md §5`):

### ✅ 正確做法

- **每 phase 喺 kickoff 先建** `docs/01-planning/W{NN}-{kebab}/` folder(W01-foundation / W02-multi-format-ingestion / W03-chat-retrieval-citation 已建)
- **任何 multi-day implementation 之前必須有對應 phase plan.md committed**(R1)
- Daily commit 必須對應 progress.md Day-N entry(R2)— `docs(planning):` housekeeping commits 例外
- Plan deviation(scope change / new deliverable / cancelled deliverable)必須 log 入 plan.md changelog(R3)
- OQ resolved → 同步更新 decision-form.md AND progress.md Day-N mention(R4)
- Phase closeout 之前任何 architectural-adjacent decision(per H1)必須寫 ADR(R5)
- **起草新 plan/checklist 必先讀「最近一個 closed phase」樣板**:章節編號 / Day 數 / acceptance criteria 細節水平必須一致;scope 差異透過**內容**調整(更多 deliverables / files / tests),**唔係**透過結構

### ❌ 禁止做法

- **唔好**一次過建 W01–W12 所有 folder(rolling JIT,違反 = 過早決定 + 將來必返工)
- **唔好**跳過 plan.md 直接 code(R1 hard constraint)
- **唔好**刪除 checklist 入面未勾選嘅 `[ ]` 項(只可 `[ ]→[x]`,延後項標 🚧 + reason)
- **唔好**喺 retrospective.md 寫具體未來 sprint task(rolling = 下一 sprint kickoff 先寫)

### 為何 rolling

1. 實作 phase N 會學到嘢,直接影響 phase N+1 設計(W2 chunk-count revised vs plan estimate 就係例)
2. 一次預寫多 phase plan,第 1 個跑完通常要改後幾個
3. ROI 偏低 + 維護成本高
4. 業界標準

→ **每個新 session 開始,AI 要先確認 rolling planning 紀律仍在執行,沒有突然出現多個未來 phase folder**

---

## 第七部分:Task Type Classification(PROCESS.md v2.0 §1)

收到 task 之後,AI 要先分類:

| Signal in user request | Likely type | Required pre-doc |
|---|---|---|
| "implement F<n>" / matches active phase deliverable | Phase/Sprint | active phase plan.md F<n> 已 committed |
| "改 X 嘅 behavior" / "add Y option" / "modify Z" / "support W format" | Change | `docs/03-implementation/changes/CH-{NNN}-{kebab}/spec.md` |
| "X 唔 work" / "broken" / "fail" / "regression" / "錯咗" | Bug-fix | `docs/03-implementation/bugs/BUG-{NNN}-{kebab}/report.md` |
| "fix typo" / "rename variable" / "update comment"(< 30 min)| Trivial | 無需 doc folder,直接 commit |

**Protocol**:
1. AI **classify** based on signals
2. **Propose to user** explicitly:「我判斷呢個係 [Phase / Change / Bug-fix / Trivial],建議走 X workflow,先準備 [plan.md / spec.md / report.md]。OK?」
3. **Wait for user confirm**(or override)
4. **Open corresponding doc**(per R1 binding)before any code

---

## 第八部分:當前進度(AI 自查,唔需用戶手動更新)

新 session 開始,AI 用以下指令自查當前進度:

```bash
# 1. 看現在喺邊個 branch
git branch --show-current

# 2. 看 main 最近 commits(過去 sprint 痕跡)
git log main --oneline -20

# 3. 看當前 branch commits(若喺 feature branch)
git log $(git branch --show-current) --oneline --not main

# 4. 看 working tree 是否乾淨
git status --short

# 5. 看 active phase folders(R1 紀律檢查 — 應該只有「過去 closed」+「當前 active」+「下一個 draft」)
ls docs/01-planning/W*-*/

# 6. 讀當前 active phase 嘅 progress.md 最新 Day-N entry
# 路徑:docs/01-planning/W{NN}-{name}/progress.md

# 7. 讀最近 closed phase retro(open items + lessons)
# 路徑:docs/01-planning/W{NN-1}-{name}/progress.md (Retro section)

# 8. 看 daily development log
ls docs/10-development-log/01-daily/ | tail -3
```

**讀完上述後**,AI 應該能夠回答:
- 目前喺邊個 sprint week?Day N?
- 上一個 closed phase 邊個?有咩 carry-over items?
- 累計完成多少 sprint?距離 Gate 1 / Gate 2 / W12 production launch 仲有幾遠?

---

## 第九部分:21 條 OQ 狀態(W2 closeout — 2026-05-04 截快照)

> **每次 phase 結束按需要 sync 此節,但唔係必更新**;權威 source = `docs/decision-form.md §4 Decision Status Dashboard`

### ✅ Resolved(7 條)
- **Q1**(format ratio,2026-04-30)
- **Q2**(source access,2026-04-30)
- **Q3**(Azure AI Search S1 + eastus2 + index `ekp-kb-drive-v1`,2026-05-02)
- **Q4**(Azure OpenAI deployment full,2026-05-01)
- **Q13**(ground truth allocation,2026-04-30)
- **Q14**(specific labeler = Chris Lai,2026-05-01)
- **Q19**(embedding dim = 1024d MRL truncate baseline,2026-05-05 W2 D3)

### 🔴 Open(14 條)— 影響將來 phase
- **Q5** Cohere procurement Path A(Azure Marketplace)vs Path B(direct API)→ **W3 D1 critical**(blocks F1 Cohere Rerank)
- **Q20** LLM synthesis final pick → W3
- **Q21** Reranker final pick → W4(4-way shootout)
- **Q6** Real query collection owner → W3-4
- **Q8** 4-metric replacement → W4 if Gate 2 fails
- **Q9** Sensitivity / CMK → Beta+
- **Q10** Visual identity / brand(default neutral tokens 進行中)→ Beta
- **Q11** Entra ID tenant → W7 Beta+
- **Q7** Beta user source → W7-8
- **Q12** Tier 2 owner → ongoing
- **Q15** Manual update frequency → Beta
- **Q16** Status quo baseline → W6 demo prep
- **Q17** Sample structure → already used 6 sample W2;OQ formal close pending Chris explicit
- **Q18** Image format → W2 D3 actual data confirmed PNG/JPEG dominant;OQ formal close pending Chris explicit

**Default behavior for Open OQ**:用 spec default value 繼續,**喺 commit message 標**:`Note: depends on OQ-Q<N> default`(per CLAUDE.md §8)。

---

## 第十部分:Sprint Awareness(W1 → W12 timeline)

per [`CLAUDE.md §9`](../../../CLAUDE.md):

| Week | Default focus | Hard cutoff |
|---|---|---|
| W1 | Foundation:FastAPI/Next.js skeleton + Docling docx parser PoC + KB CRUD + eval-set v0 + Azurite local | ✅ **closed 2026-05-02** |
| W2 | Multi-format ingestion + hybrid retrieval baseline + Admin Console layout + Gate 1 R@5 ≥ 80% | ⚠️ **code-complete 2026-05-04;Gate 1 verdict pending live run post-VPN-disconnect** |
| W3 | Cohere Rerank + GPT-5.5 synthesis + Citation + Chat UI streaming + PPT parser | _draft pending Gate 1 pass + W2 closeout sign-off_ |
| W4 | CRAG L2 + RAGAs eval automation + Reranker shootout(4-way)+ 加 20 條 real query | **Gate 2 Decision(4 metric within 5pp)** |
| W5 | Optimization;**conditional** L3 routing(only if Gate 2 全 pass) | — |
| W6 | Final eval + demo prep + Beta plan | POC 結束 |
| W7-8 | Microsoft Entra ID + rate limiting + React polish + Beta deploy | — |
| W9-10 | Beta internal testing + UX iteration | — |
| W11-12 | Staged rollout 25% → 100% | **Production launch** |

**Critical gates**:
- **Gate 1(W2 末 R@5 ≥ 80%)** — fail = HALT POC,foundation iteration loop per `architecture.md §6.3`
- **Gate 2(W4 末 4 metric within 5pp 互換)** — fail = drop L2 CRAG,Tier 1 收尾轉 baseline-only
- **Gate 3(W6 末 demo ready)** — Beta plan signoff

如果 session 唔清楚邊個 week,**ask user "What week / day are we in?"** 之後再做 default focus 對應。

---

## 第十一部分:常駐 Open Items / Carry-overs(每 phase 結束更新)

> **此節要每 phase 收尾時更新**:把 retro 嘅 carry-overs + ADR triggers 精煉成下方一句話列表

### 已知未解(at session start time = 2026-05-04 W2 D5 closeout draft)

#### W2 carry-overs to W3
- ⏸ **C1** F7 live Gate 1 eval — `scripts/run_populate_sanity.py` + `backend/eval/runner.py` ready,等 Chris VPN-disconnect 後 trigger;**verdict 决定 W3 active flip**
- ⏸ **C2** F8 chunk_id discovery + SME validation — `scripts/discover_chunk_ids.py` ready;cascade after C1 populate complete
- ⏸ **C3** R12 Azurite SDK signature mismatch — defer to W7+ cloud Azure Blob;F3 blob upload disabled in W2 baseline
- ⏸ **C4** Q5 Cohere procurement Path A vs B — **W3 F1 D1 critical**
- ⏸ **C5** plan.md F2 chunk count estimate revised(2000-3000 → 329 actual)— eval-set v0 placeholder pattern still valid
- ⏸ **C6** R8 procedural mitigation per-session — verify VPN state via `netstat -rn` + `curl Azure-OpenAI-endpoint` before cloud-bound work
- ⏸ **C7** F9 Admin Console KB views — W2 D5 partial(4 views light scaffolding);W3 D5 polish + Pipeline wizard
- ⏸ **C8** F2 chunker low_value 67.2% rate Gate 1 risk — 若 Gate 1 fail,W3 retro 三 mitigation candidates(threshold 50t / disable filter / augment short chunks)

#### Cross-phase / governance
- ⏸ **R8** Ricoh corp proxy — mitigated 2026-05-03 via home network;但 SSL inspection root cause means 每 cloud-bound session start 必 verify
- ⏸ **R12** Azurite SDK signature mismatch — `RISK_REGISTER` 🔴 Open;permanent fix = cloud Azure Blob W7+
- ⏸ **R11** Langfuse degradation — closed via BUG-001(commits `10be96d` + `78e9ece`)

#### ADR 未寫(framework still pending)
- 11 個 ADR 由 architecture.md v5 §13 Decision Log promote 而來,將喺 W2 框架完成後 batch 創建。新 ADR 由 NNNN=0012 開始(per CLAUDE.md §6)
- 任何 H1 / H2 violation approval 後必須寫 ADR(format per CLAUDE.md §6)

> **AI 任務**:每個新 phase 開始,先看本 prompt §11 + 上 phase progress.md retro 「Carry-overs」,向用戶確認哪些 follow-up 要喺呢個 phase 處理,哪些繼續延後

---

## 第十二部分:常駐 milestones(累計完成)

> **每 phase 收尾更新一行**

| Phase | 完成日期 | 主要 commits | 主要成果 |
|---|---|---|---|
| **W01-foundation** | 2026-05-02 | `dc7e37f`(retro)+ `740de4c`(R8 mitigation)+ `c38710f`/`0a2673d`(F2 carryover)| FastAPI 18 stubs + Next.js 6 routes + KB CRUD in-memory + eval validator + Docling PoC stub + Azurite local + R8 / Q3 / Q4 / Q14 resolved |
| **W02-multi-format-ingestion** | _2026-05-04(code-complete;Gate 1 verdict pending)_ | `f30f13a` D1 / `170e3db` D2 / `28341b8` D3 / `2b4bb7e` D4 / `072b95b` D5 | F1 Docling parser PoC + F2 layout-aware chunker + F3 screenshot pipeline + F4 embedder + F5 orchestrator + F6 hybrid retrieval + F7 eval framework + F8 chunk_id discovery + F9 Admin UI partial + index `ekp-kb-drive-v1` 1024d HNSW + Q19 resolved |
| W03-chat-retrieval-citation | _draft pending Gate 1 verdict_ | _pending_ | Cohere Rerank v3.5 + GPT-5.5 synthesis + Citation + SSE streaming + Chat UI + PPT parser + Pipeline wizard |
| W04-crag-eval-shootout | _not started_ | _pending_ | CRAG L2 + RAGAs eval automation + Reranker shootout(Cohere / Voyage / ZeroEntropy / Azure built-in)|
| W05+ | _not started_ | _pending_ | (rolling JIT)|

**累計**:**1.x / 12 phase** 完成(W1 closed,W2 code-complete pending Gate 1 verdict)

---

## 第十三部分:行為規範(畀 AI 助手)

每次 reply 之前,確保:

### 必做

- [ ] 對齊 §1 Karpathy baseline(think → simple → surgical → goal)
- [ ] 對齊 H1–H6 hard constraints(若觸發,**第一句就 STOP and explain**)
- [ ] 跨 component 修改前先讀對應 `components/Cn-*.md` design note
- [ ] 開始 code 前確認該 phase 已有 plan.md + checklist.md(R1)
- [ ] 起草新 phase plan/checklist 前先讀「最近 closed phase」樣板(章節 / Day 數 / 細節水平必須一致)
- [ ] commit message 用 Conventional Commits(`<type>(<scope>): <description>`)+ co-author per CLAUDE.md §4.2
- [ ] 每 commit 對應一個 checklist 項目 + progress.md Day-N entry mention(R2)
- [ ] OQ resolved 同步更新 decision-form.md AND progress.md Day-N(R4)
- [ ] Daily progress.md 維持「Actual vs Planned Effort」table(estimates vs actual variance)
- [ ] Phase 收尾寫 retro(What worked / What didn't work / Surprises / Carry-overs / ADR triggers / Phase Gate result)
- [ ] 用**繁體中文**回覆(team primary language per CLAUDE.md §11)

### EKP 紀律 9 項自檢(每 PR 前 + 每 commit 後)

per [`CLAUDE.md §12 self-verification`](../../../CLAUDE.md):

1. **Architecture lock(H1)**— `docs/architecture.md §3 + §4` 任何 component 改動 → ADR 寫咗未?
2. **Vendor lock(H2)**— 加新 dependency 之前 STOP and ask?(utility / type stub / dev dep 例外)
3. **Dify reference(H3)**— `references/dify/` 純 read,絕無 copy-paste / import / branding clone
4. **Tier 1 boundary(H4)**— GraphRAG / multi-agent / multi-tenancy / multi-modal / auto-sync / fine-tune 全部 out
5. **Security(H5)**— 無 hard-code tenant ID / subscription ID / connection string;`.env` gitignored
6. **Test coverage(H6)**— `backend/{ingestion,retrieval,pipeline,eval}/` + `api/routes/query.py` 寫 code 同步寫 test
7. **Component spine** — 每 file 明確歸屬 1 個 Cn(no cross-component scattering)
8. **PROCESS.md classification** — task → Phase / Change / Bug-fix / Trivial 之前 propose to user
9. **Rolling planning** — 無預寫多個未來 phase plan

### Coding conventions 速查

- **Python 3.12+** + `mypy --strict` clean + async by default + Pydantic v2 + structlog JSON
- **TypeScript strict** + Next.js App Router only + Server Components default + shadcn/ui only + design tokens via `frontend/lib/theming/tokens.ts`(無 hardcode 顏色 / spacing)
- Naming:`snake_case.py` / `kebab-case.tsx` / Python `snake_case` / TS `camelCase` / Class `PascalCase` / Const `UPPER_SNAKE` / DB+Search field `snake_case`
- Comments 解釋 **why**,唔係 **what**;TODO format `# TODO(<owner>): <description> [<issue-id>]`
- 絕不 commit:secret / API key / PII / `.env` / `references/dify/` 任何 file

### 唔做

- [ ] 唔預寫多個未來 phase plan(rolling planning!)
- [ ] 唔刪 V1 archive(冇 V1 archive — Tier 1 由 W1 D1 開始)
- [ ] 唔讓 AI 單方面決定不可逆操作(git tag push / git mv 大量檔案 / `git reset --hard`)— 必須先報告
- [ ] 唔執行 `--no-verify` / `--force` git 命令(除非用戶明確授權)
- [ ] 唔啟動長期運行 server process(Node / FastAPI 開發 server 同 Claude Code 衝突;鼓勵 user 自行 `! uvicorn ...`)
- [ ] 唔刪除未勾選 checklist `[ ]` 項目(只可 `→[x]` 或加 🚧 + reason)
- [ ] 唔喺 retrospective 寫具體未來 sprint task(rolling = 下 phase kickoff 先寫)

---

## 第十四部分:今天嘅任務(**唯一需要用戶填寫嘅部分**)

> 喺每個新 session 開始,把整份 prompt copy 之後,只改下方呢一節即可。

```
今天嘅任務:__________________

例:
- 「啟動 W3 Day 1 — F1 Cohere Rerank v3.5 integration」
  → AI 將先 verify W2 Gate 1 verdict pass + W3 plan.md status flip active,然後讀 W3 plan §F1 + components/C04 §3,write code

- 「繼續 W2 D5 — trigger Gate 1 live eval(VPN disconnected)」
  → AI 跑 `scripts/run_populate_sanity.py` + `backend/eval/runner.py`,collect R@5 verdict,update progress.md retro + commit `docs(planning): W02 Gate 1 verdict — R@5 = X.XX (pass/fail)`

- 「處理 BUG-002 — `/query` returns 502 on empty KB」
  → AI 判斷 Bug-fix workflow,propose `docs/03-implementation/bugs/BUG-002-{kebab}/report.md` draft,等 Chris confirm Sev + repro accuracy 先 investigate

- 「Review W2 retro + 同步準備 W3 plan active flip」
  → AI 讀 W2 progress.md retro + W3 draft,同 user 對齊 W3 範圍 + 確認 carry-overs C1-C8 處理時序

- 「加 Voyage Rerank 入 W4 shootout」
  → AI 識別 H2 vendor change,STOP and propose ADR,等 user approve 先 update W4 draft + write ADR
```

---

## 附錄:本 prompt 自身嘅維護

### 何時更新

| 觸發 | 更新位置 |
|---|---|
| Phase 收尾 | §11 Open Items(合併 retro carry-overs)+ §12 milestones(加一行)+ §9 OQ status(若有變)|
| 發現 spec / CLAUDE.md 修訂(§5 H1–H6 / §10 R1–R5 / §11 Tier 2 list)| §2 最高指導原則 + §4 權威排序 + §13 紀律自檢 9 項 |
| Phase 切換(W2 → W3 → W4)| §3 component status + §10 sprint awareness 對應行 + §12 milestones |
| 重大 OQ resolved(影響架構)| §9 OQ status + 對應 component status |

### 何時退役

- Tier 1 完成(W12 production launch 後)→ Tier 2 規劃啟動,本 prompt 變歷史紀念物,改用 Tier 2 對應 prompt(如有)
- 中途若 §3 12 component spine 大改,本 prompt §3 + §13 全部重寫

---

**Last Updated**:2026-05-04(W02 D5 closeout draft — Gate 1 verdict pending live run post-VPN-disconnect)
**Maintainer**:Chris(技術 Lead)+ AI 助手共同維護
**File location**:`docs/12-ai-assistant/01-prompts/01-session-start.md`
**Companion**:`02-compact-session.md`(每個 session `/compact` 之前用)

---

## Update history

| Date | Phase | Updates |
|---|---|---|
| 2026-05-04 | W02 D5 closeout | 初版(基於 sample-1 結構,EKP-specific 內容:12 components / H1-H6 / R1-R5 / 21 OQ snapshot / W1-W12 timeline)|
