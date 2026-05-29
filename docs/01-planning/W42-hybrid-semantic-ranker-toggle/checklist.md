---
phase: W42-hybrid-semantic-ranker-toggle
plan_ref: ./plan.md
status: closed_partial   # 2026-05-29 — G3 user-goal PASS ⭐ + G2 environmental-INCONCLUSIVE (drive corpus index 唔喺 service)
last_updated: 2026-05-29
---

# W42 — Checklist

> 原子化勾選項。Option ① drop semantic ranker config flag — F1 implementation GATED on H1 confirm + ADR-0039 Accept。F2 eval safety gate(Gate 1 re-verify)+ F3 LIVE chat UI full pipeline(user goal)+ F4 closeout。

## F0 — 啟動

- [x] F0.1 建立 `docs/01-planning/W42-hybrid-semantic-ranker-toggle/` folder
- [x] F0.2 R6 Day 0 7 catches — (1) queryType=semantic 只喺 hybrid.py:371 production-hot path;(2) chat UI 固定 hybrid 係 flag main beneficiary;(3) flag 同 mode param 正交;(4) semantic_config_name hard-coded literal 需 parametrize;(5) Gate 1 0.9722 measured WITH semantic → F2 re-verify mandatory;(6) test_hybrid_search_payload_shape_matches_spec assert semantic → 保留 + 加 flag-False test;(7) flag OFF hybrid = BM25+vector+RRF 自動 fusion 仍 work
- [x] F0.3 起草 `plan.md` 7 段(含 §5 H1 boundary 評估)
- [x] F0.4 起草 `checklist.md`(本文件)
- [x] F0.5 起草 `progress.md` Day 0
- [x] F0.6 起草 `docs/adr/0039-hybrid-semantic-ranker-toggle.md` DRAFT(Proposed)
- [x] F0.7 F0 commit(`f52cae1`)
- [x] F0.8 session-start.md §10 W42 row append active 2026-05-29 + W42+ → W43+ placeholder rename
- [x] **F0.9 STOP+ask user confirm H1 boundary + ADR-0039 Accept(F1 GATE per CLAUDE.md §5.1 H1)** — Chris approved 2026-05-29(AskUserQuestion「Approved — ADR-0039 Accept + 開始 F1」);ADR-0039 status Proposed → Accepted

## F1 — Implementation(GATED — post H1 confirm + ADR-0039 Accept)

- [x] F1.1 `storage/settings.py` NEW field `hybrid_use_semantic_ranker: bool = True`(default preserve W2 baseline)+ comment block
- [x] F1.2 `retrieval/hybrid.py` `HybridSearcher.__init__` add `use_semantic_ranker: bool = True` + `semantic_config_name: str = "ekp-semantic-config"` params + store
- [x] F1.3 `retrieval/hybrid.py` search() hybrid branch — wrap `payload["queryType"]="semantic"` + `payload["semanticConfiguration"]` 喺 `if self.use_semantic_ranker:`;flag False → BM25 + vector + RRF(Azure 自動 fusion)
- [x] F1.4 `api/server.py` HybridSearcher init wire `use_semantic_ranker=settings.hybrid_use_semantic_ranker` + `semantic_config_name=settings.azure_semantic_config_name`
- [x] F1.5 NEW unit tests:
  - [x] F1.5.a `test_w42_hybrid_semantic_disabled_drops_query_type`(`test_retrieval.py:100`)— flag False → payload 無 queryType=semantic + 無 semanticConfiguration 但有 search text + vectorQueries
  - [x] F1.5.b **R3 deviation** — 原寫沿用 existing `test_hybrid_search_payload_shape_matches_spec`,實際改加獨立 NEW test `test_w42_hybrid_semantic_enabled_default_preserves_semantic_config`(`test_retrieval.py:130`)— default True → payload 保留 queryType=semantic + semanticConfiguration,更明確 lock default-preserve,無 scope 擴大
- [x] F1.6 backend pytest preserve(1106 → 1108)+ ruff PASS + mypy W42 edits self-clean + ADR-0039 Accepted
- [x] F1.7 commit(`684ec05`)

## F2 — Eval safety gate(H1 re-verify Gate 1)— ⚠️ INCONCLUSIVE(環境受限)

- [x] F2.1 Pre-flight per CLAUDE.md §10.3 step 5b — Langfuse `/api/public/health` 200 + Postgres `SELECT 1` PASS(post Docker distro 重建)
- [x] F2.2 `.env` `HYBRID_USE_SEMANTIC_RANKER=false` marker block + backend restart(venv python `-m api.server`)
- [~] F2.3 Gate 1 retrieval eval `eval-set-v0` flag-OFF → **404**:`/eval/run` hard-code `kb_id="drive_user_manuals"` → index `ekp-kb-drive-v1` 唔喺 service(只有 2 個 sample-KB per-KB index `ekp-kb-{kb_id}-v1`)→ W2 0.9722 不可重現
- [~] F2.4 G2 gate — **INCONCLUSIVE**(drive corpus 唔喺 service);Chris pick 環境受限結案,safety 由 ADR-0039 理論 + F3 LIVE 質性證據滿足(對齊 W38 R8 先例)

## F3 — LIVE chat UI full pipeline(user goal)— ✅ PASS ⭐

- [x] F3.1 `.env` flag OFF preserved + backend restart;LIVE 驗證經 `/query` API(= chat UI useChat SSE 同一 retrieval engine + flag);literal Next.js frontend 瀏覽器視覺測試可選 follow-up
- [x] F3.2 Q-W25-I07「show me all the Integration scenarios」hybrid flag-OFF → **HTTP 200 無 402** + citations 3 + 答案識別 five scenarios ⭐
- [x] F3.3 Q-W25-I01 control → 200 / citations 6 / refused False;image「diagram of Scenario A」→ 200(無 402)synthesizer refused(W40 deboost disabled 範疇,非 W42)
- [x] F3.4 G3 gate — chat UI 全 pipeline 喺 Free tier work confirmed(3 query 全 200 無 402)✅

## F4 — 收尾 + 跨文件同步 + commit + push

### A. 跨文件同步
- [x] A.1 plan.md frontmatter status flip → closed_partial + §7 changelog row
- [x] A.2 checklist.md cross-cutting tick(本文件)
- [x] A.3 progress.md Day 2 + retro 7 段 + frontmatter status flip
- [x] A.4 session-start.md §10 W42 row flip active → closed_partial
- [x] A.5 `.env` REVERT flag(W42 marker block removed,production preserve default True per W37-W41 invariant)
- [x] A.6 ADR-0039 final status confirm — Accepted(F0.9 H1 gate)+ closeout note F2 environmental
- [~] A.7 RISK_REGISTER R-W38-1 — register 內搵唔到該 id(只記喺 session-start §10 + memory);W42 flag workaround 已記 memory `project_azure_search_tier_semantic_billing`;補 register entry = W43+ housekeeping candidate

### B. W43+ priority queue(captured in progress.md Retro §5)
- [x] B.1 W43+ candidate:production default flip `hybrid_use_semantic_ranker=false`(若 F2 補完 confirm no regression — sequential per W26 PC1)
- [x] B.2 W43+ HIGHEST preserved:Hybrid mode billing-resolved re-verify(若 GA 升 paid tier 用 semantic)
- [x] B.3 W43+ preserved:W40 F1+F2 deboost production default flip ADR(per W41 STRONG evidence)
- [x] B.4 Long-term carry-over 維持 + NEW:COMPONENT_CATALOG C03 index-scheme reconcile + `/eval/run` kb_id parametrize
- [x] B.5 永久 OUT path (a) judge LLM 升級(per feedback_judge_llm_cost_policy)

### C. commit + push
- [ ] C.1 F4 收尾 commit
- [ ] C.2 push origin/main confirmed

---

## Cross-Cutting

- [ ] All deliverables committed to git(F4 closeout commit pending)
- [x] All OQ status changes 反映於 decision-form.md — 無 OQ 變動
- [x] ADR-0039 documented + status Accepted(post H1 confirm F0.9)
- [x] progress.md retro section 寫好 7 段 per F4 closeout
- [x] progress.md frontmatter status flipped per outcome(closed_partial)
- [x] Phase W43+ kickoff trigger 標記於 retro §5

---

**Lifecycle reminder**:本 checklist 隨 plan deliverables 衍生。F1 GATED on H1 confirm — 唔可以未 confirm 就寫 retrieval code。
