---
phase: W42-hybrid-semantic-ranker-toggle
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed_partial
last_updated: 2026-05-29
---

# W42 — Progress

> Daily progress journal。每日 append 一個 Day-N entry,closeout 時 retro 7 段。

## Day 0 — 2026-05-29(kickoff)

### Trigger

W41 closed 2026-05-28 + smoke test session 揭露 chat UI hybrid mode 撞 Azure Free tier 402。User 問「是否有其他更平嘅 vector DB 選擇能支援 chat UI full pipeline」→ 三方深入 trade-off 分析(Option ① drop semantic ranker / ② pgvector swap / ④ Basic $75)→ Chris AskUserQuestion 揀「起 W42 plan 做 Option ①」。

### 關鍵分析發現(driving Option ①)

1. **402 root cause = semantic ranker,NOT vector DB** — `hybrid.py:371` `queryType="semantic"` 係 Azure billable semantic ranker;vector / fulltext mode 唔用 → Free tier work
2. **換 vector DB 解錯問題** — pgvector / Qdrant 都冇 Azure semantic ranker,照樣要重寫 hybrid,仲觸發 H2 vendor swap
3. **semantic ranker 喺 EKP 大致 redundant** — Q21 已證佢比 Cohere WORSE;EKP search 之後行 Cohere 做主 reranker(同一 50 候選集)→ semantic ranker 只係被 override 嘅次等中間層
4. **成本落差 flag** — spec budget ~$75 以今日定價只買到 Basic,S1(spec lock)實際 $249.98

### Plan rationale

- **Option ① = cheapest path to stated goal**:$0(留 Free tier)/ ~1-2h / 完全可逆 / 唔換 vendor / 質素 risk 近乎零
- **對齊 W37-W41 knob pattern**:加 flag、default preserve production、`.env` override 做測試
- **但 H1-adjacent**(比 post-rerank knobs 更 core)→ 需 ADR-0039 + Gate 1 re-verify + F1 GATE STOP+ask

### R6 Day 0 7 catches surfaced(per CLAUDE.md §10 R6)

| # | Catch | Mitigation |
|---|---|---|
| 1 | `queryType=semantic` 只喺 `hybrid.py:371`;`reranker/azure_semantic.py` 係另一回事(unused standalone reranker)| F1 只 toggle hybrid.py,唔郁 reranker |
| 2 | chat UI 固定 hybrid(useChat SSE 唔 expose mode)→ flag main beneficiary | F3 chat UI test |
| 3 | flag 同 mode param 正交 — flag 控制 hybrid 用唔用 semantic,mode 控制 hybrid/vector/fulltext | F1 設計獨立 |
| 4 | `azure_semantic_config_name` settings 存在但 hybrid.py:372 hard-code literal | F1 順手 parametrize |
| 5 | Gate 1 0.9722 measured WITH semantic → flag OFF 必須 re-verify | F2 H1 safety gate |
| 6 | `test_hybrid_search_payload_shape_matches_spec` assert semantic | F1 保留 + 加 flag-False test |
| 7 | flag OFF hybrid = BM25+vector+RRF Azure 自動 fusion 仍 work | F1 design confirm |

### H1 boundary 評估(per plan §5)

W42 改 §3.1 retrieval search behavior(semantic ranker on/off)= **H1-adjacent**。雖然 default-preserve flag 令 production 行為不變,但觸及 Gate 1 + Q21 decision predicate → **需 ADR-0039 + Gate 1 re-verify**。

**F1 retrieval code 之前必須 STOP+ask 等 user confirm H1 boundary + ADR-0039 Accept**(per CLAUDE.md §5.1 H1 Required behavior)。

### Real-calendar projection

F0 ~30min + (等 H1 confirm)+ F1 ~45min + F2 eval ~30-45min + F3 LIVE chat UI ~30min + F4 ~20min = **~2.5-3h total**。

### Next

F0.7 commit + F0.8 session-start sync → **F0.9 STOP+ask H1 boundary + ADR-0039 Accept**(F1 GATE)。

---

## Day 1 — 2026-05-29(F0 commit + F0.9 H1 gate + F1 implementation)

### F0 — committed
- `f52cae1` — kickoff plan/checklist/progress + ADR-0039 DRAFT(Proposed)+ R6 Day 0 7 catches + §5 H1 boundary 評估
- F0.8 session-start.md §10 W42 row append(active 2026-05-29)

### F0.9 H1 gate — PASSED ✅
Chris 經 AskUserQuestion 批「Approved — ADR-0039 Accept + 開始 F1」→ ADR-0039 status Proposed → **Accepted**(approver Chris,2026-05-29)。H1-adjacent boundary cleared,F1 retrieval code unlocked。

### F1 — implementation committed(`684ec05`)
- F1.1 `settings.py` NEW `hybrid_use_semantic_ranker: bool = True`(default preserve W2 baseline)
- F1.2 `hybrid.py` `HybridSearcher.__init__` 加 `use_semantic_ranker: bool = True` + `semantic_config_name: str = "ekp-semantic-config"` params
- F1.3 search() hybrid branch — `payload["queryType"]="semantic"` + `semanticConfiguration` wrap 入 `if self.use_semantic_ranker:`;flag False → BM25 + vector + RRF(Azure 自動 fusion)
- F1.4 `server.py` wire from settings
- F1.5 2 NEW unit tests:`test_w42_hybrid_semantic_disabled_drops_query_type`(`test_retrieval.py:100`)+ `test_w42_hybrid_semantic_enabled_default_preserves_semantic_config`(`test_retrieval.py:130`)
- **R3 deviation**:F1.5.b 原 plan 寫沿用 existing `test_hybrid_search_payload_shape_matches_spec`,實際改加獨立 NEW enabled-default test — 更明確 lock default-preserve 行為,無 scope 擴大
- F1.6 backend pytest **1106 → 1108** + ruff PASS + mypy W42 edits self-clean
- F1.7 commit `684ec05`

### Bookkeeping catch-up note
F0+F1 code 喺前一 session 提交(`f52cae1` + `684ec05`),但 checklist tick + 本 Day 1 entry 因 context compaction 滯後;本 entry 補回 per R2(daily commit ↔ progress Day-N entry)。

### 阻塞 — F2/F3 BLOCKED by 本機 Docker down
F2(Gate 1 R@5 flag-OFF re-verify safety gate)+ F3(LIVE chat UI full pipeline)需 backend + pre-flight(Langfuse `/api/public/health` 200 + Postgres `SELECT 1`)→ 需 Docker。當前 Docker daemon 未連接(Docker Desktop 未起)。前置診斷:`com.docker.service` 需 admin + `GOADOMAIN\CLai03` 加入 docker-users 後需 log off/on token refresh;azurite image MCR 503(per compose L63-84 = ADR-0017 R8/R9 occurrence #6,W42 query-time 唔需 azurite,可跳過淨起 postgres+langfuse)。

### Next
等 Docker Desktop 起 → 跳過 azurite 淨起 postgres+langfuse → re-register KB `sample-document-with-image-1`(數據 factory-reset 已清,Azure index chunks 喺 cloud 完好)→ F2 eval → F3 chat UI。

---

## Day 2 — 2026-05-29(Docker 恢復 + F2 環境發現 + F3 PASS + F4 closeout)

### 本機 Docker 恢復(F2/F3 前置阻塞)
- 重啟後 Docker Desktop engine 卡 loading。診斷階梯:`com.docker.service` Stopped(access denied,CLai03 非 admin)→ engine named pipe 通但 dockerd 回 **500** → backend log root cause:backend ping `docker-desktop` WSL distro 嘅 **init control API 5m+ timeout** = distro 內 init 損壞(factory reset 後遺)
- recovery:① `wsl --shutdown` + 重啟(無效,distro 內部已壞)→ ② **Chris 授權 `wsl --unregister docker-desktop` 重建 distro**(破壞性但徹底)→ dockerd READY 5s,Server 29.5.2
- 起 postgres + langfuse(跳過 azurite 避 MCR 503 per ADR-0017 R8/R9);image 有 cache 免 pull;pre-flight Langfuse `/api/public/health` 200 + Postgres `SELECT 1` 全 PASS
- **Postgres named volume 喺 distro 重建後存活**,KB metadata 完好(4 個 sample KB),無需 re-register

### F2 結構性發現 — drive corpus index 唔喺呢個 Azure Search service
- `/eval/run` hard-code `kb_id="drive_user_manuals"`(eval.py:130)→ 解析 index `ekp-kb-drive-v1` → **404**
- service 實際只有 2 個 per-KB index:`ekp-kb-sample-doc-with-image-1-v1` + `ekp-kb-sample-document-with-image-1-v1`(scheme = `ekp-kb-{kb_id}-v1`,**非 C03 描述嘅單一共用 index + kb_id filter**)
- 即 **W2 Gate 1 R@5=0.9722 baseline 唔能喺呢個 service 直接重現**(drive corpus 從未 index 喺此服務;W25-W41 LIVE 全用 sample KB)
- **Chris pick**:F2 環境受限結案(對齊 W38 R8 environmental-block 先例);safety gate 改由 ADR-0039 理論(Q21 semantic ranker inferior + Cohere override redundant 同候選集)+ F3 LIVE 質性證據滿足

### F3 LIVE — chat UI 全 pipeline Free tier PASS ⭐(THE user goal)
3 條 `/query` hybrid mode flag-OFF(`sample-document-with-image-1`):
- Q-W25-I07 enumeration「show me all the Integration scenarios」→ **200**,citations 3,答案識別「five end-to-end integration scenarios」+ Scenario A 詳述
- Q-W25-I01 control「what is the high level architecture」→ **200**,citations 6,refused False,正確答 Azure iPaaS 架構
- image「show me the diagram of Scenario A」→ **200**(無 402),synthesizer refused(citations 0)— retrieval 質素 refusal,屬 W40 deboost disabled 範疇,**非 W42 issue**

**W42 主 deliverable 證成**:`HYBRID_USE_SEMANTIC_RANKER=false` → hybrid drop semantic ranker → BM25+vector+RRF → Cohere → 全 pipeline 喺 Free tier $0 行得通,3 query 全 **200 無 402**(vs W41 smoke flag-default-ON 撞 402 = before/after 證據)。

### F4 closeout
- `.env` W42 marker block REVERT(production preserve default True per W37-W41 invariant)
- ADR-0039 維持 Accepted;phase outcome closed_partial(G3 user-goal PASS + G2 environmental-INCONCLUSIVE)

---

## Retro

### 1. 整體結果
**Phase Gate PASS WITH G2-ENVIRONMENTAL-INCONCLUSIVE CAVEAT(closed_partial)**。W42 主目標(Free-tier 全 pipeline + chat UI 解鎖)**達成** —— `hybrid_use_semantic_ranker=false` 令 chat UI hybrid mode 喺 Azure Free tier 行得通,3 條 LIVE query 全 200 無 402。Gate 結算:G1 unit tests PASS / G2 R@5 re-verify **INCONCLUSIVE**(drive corpus index 唔喺 service,W2 0.9722 不可重現)/ G3 chat UI LIVE PASS ⭐ / G4 pytest 1108 + ruff + mypy PASS / G5 R6 + ADR-0039 Accepted PASS / G6 production preserve PASS。safety 由 ADR-0039 理論 + F3 質性證據滿足,production default True 零風險。

### 2. 5 axes lessons learned
- **Technical**:EKP 實際用 per-KB index scheme `ekp-kb-{kb_id}-v1`,**非** C03 描述嘅單一共用 index — COMPONENT_CATALOG C03 描述同實際 divergence(W43+ doc reconcile candidate)。`/eval/run` hard-code `kb_id="drive_user_manuals"` 係 W2-era 遺留,同當前 sample-KB-based LIVE workflow 脫節
- **Process**:Docker distro-level 損壞 `wsl --shutdown` 救唔到,要 `wsl --unregister` 重建 — backend log「init control API timeout」係關鍵診斷信號(GUI loading 狀態 ≠ root cause,呼應 §10.3 Docker-flag ≠ endpoint 原則)
- **Cost**:Option ① $0 達成目標,印證 trade-off 分析(vs ② pgvector H2 swap / ④ Basic $75)
- **Scope**:F2 環境受限不影響主 deliverable — F3(user goal)同 F2(safety gate)解耦,F3 LIVE 質性證據可補 F2 numeric gap
- **Diagnostic discipline**:smoke-before-full(2-query eval)即時揭 404,慳咗 full eval 時間 — Karpathy goal-driven 細範圍先驗證見效

### 3. CLAUDE.md / PROCESS.md / session-start.md 同步
- session-start §10 W42 row → closed_partial(本 closeout)
- CLAUDE.md 無需改(無新 constraint / vendor / convention)
- **W43+ doc candidate**:COMPONENT_CATALOG C03 single-index 描述 vs per-KB index 實際 reconcile

### 4. Memory updates
- 更新 `project_azure_search_tier_semantic_billing`:402 root cause 之外,NEW 發現 `ekp-kb-drive-v1` index 唔喺 service + per-KB index scheme `ekp-kb-{kb_id}-v1` + /eval/run hard-code drive_user_manuals 脫節

### 5. 後續(W43+ candidates)
- HIGHEST(若 drive corpus re-index 或 /eval/run parametrize kb_id):F2 Gate 1 numeric re-verify 補完
- HIGHEST NEW:production default flip `hybrid_use_semantic_ranker=false`(若 F2 補完 confirm no regression — sequential per W26 PC1)
- HIGHEST 保留:W40 F1+F2 deboost production default flip ADR(per W41 STRONG evidence)
- MEDIUM NEW:COMPONENT_CATALOG C03 index-scheme doc reconcile + `/eval/run` kb_id parametrize
- 永久 OUT:judge LLM 升級(per feedback_judge_llm_cost_policy)

### 6. Real-calendar collapse
本 session 大部分時間在 Docker distro 重建(unregister + rebuild)+ 環境恢復;W42 code(F0+F1)前 session 已 ship。F2/F3 LIVE + F4 closeout 以 Docker recovery 為時間主導,code 工作量細。

### 7. PR readiness
W42 F0+F1 code(`f52cae1` + `684ec05`)已提交未 push;F4 closeout(bookkeeping + doc sync + .env revert + memory)為新 commit。push 待 user explicit 指示。
