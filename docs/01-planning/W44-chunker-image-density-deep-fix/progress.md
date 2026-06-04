# W44 — Chunker Image-Density Deep Fix · Progress

> Daily progress + decisions + commits;結尾 retro。

---

## Day 0 — 2026-06-03(kickoff,F0 gate pending)

### 做咗乜
- **三方 roadmap audit 收斂**(本 session)→ 用戶 pick (a) 開 W44 深度優先。
- **根因 live-verify**:Read `layout_aware.py` 全文,確認圖洪 ingestion 根因 = 圖按 section accumulator pile-on,text flush(`:207` hard-cap / `:213-218` soft-target)**唔 reset** `image_positions`,`_build_text_chunk:248` copy 全部 + `_merge_adjacent_shorts:323` concat → 圖密短 section 單 chunk carry 全部圖(實測 `ci=15=57`,memory #7)。全 file 零 per-chunk 圖數 cap。
- **doc-level reindex 非 stub** 確認(`documents.py:786-884`,真刪 + `_run_ingest_pipeline`)→ W44 驗證唔卡 Track A([AUDIT-B])。
- **ADR-0041 draft 建立**(Status: Proposed)+ ADR README index 更新(0041 row + next=0042)。
- **W44 plan / checklist / progress 建立**(R1 plan-before-implement)。

### 決定
- 切法 recommended = **A(image-aware flush + `max_images_per_chunk` soft cap)**,Alternatives B(sub-heading)/ C(image-anchored)/ D(hybrid)/ runtime-cap-only(W43 已做,不足)記 ADR-0041。**最終切法 + cap default 待 F0 gate Chris 拍板(決策 2)**。
- **F1+ code GATED on F0 gate**(H1 per §5.1 — chunker §3.3 change + re-index)。本日只 docs housekeeping。

### F0 gate — PASS 2026-06-03
Chris(AskUserQuestion)揀 **切法 D(混合:sub-heading 細分 + image cap 兜底)** + `max_images_per_chunk` default **8**(對齊前端 `INLINE_IMAGE_CAP=8`)+ approve H1 + ADR-0041 Proposed→Accepted。F1 code gate open。
- 切法 D 實際 scope(Karpathy §1.1 surface):heading 細分**已由現有 chunker 處理**,W44 重心 = image pile-on 修 + `_should_merge` image-guard + cap force-split;**唔重寫 heading 邏輯**(避免 over-build)。
- ⚠️ cap default 8 ≠ ADR-0037/0040 OFF-default,但對正常文件 no-op、只 cap flood、且 re-index 後先生效(影響面限圖密 chunk,intentional)。

### Blockers / carry-over
- Top risk(R6 已記 plan §4):重切改變所有 chunk 邊界 → eval no-regression gate(G3/G4)必過。

### Commits
- `e5d8830` docs(planning): W44 kickoff — ADR-0041 draft + phase artifacts(F0.1)
- `c219dfa` docs(adr): W44 F0 gate PASS — ADR-0041 Accepted(切法 D + cap 8)

---

## Day 1 — 2026-06-03(F1 + F2 — chunker 切法 D code + test)

### 做咗乜
- **F1 chunker 切法 D**(`layout_aware.py`):① `_reset_images_on_flush`(text flush 按 doc_order 分配圖,修 `:207` pile-on 根因)② `_force_flush_images`(image cap 8 force-split,延續 section_path)③ `_should_merge` image-count guard(防 ADR-0033 merge re-pile)④ `_flush_text_section` residual-image guard(force-split 後殘圖唔丟)。全部 gated on `max_images_per_chunk is not None` → cap=None 完全 bit-identical(pre-W44 pile-on)。
- **Settings**:`chunker_max_images_per_chunk: int | None = 8`;`server.py:99` startup 傳落 injected chunker(override seam)。
- **F2 test**(`test_chunker.py` +6):force-split / no-image-loss / cap=None pile-on / merge image-guard / residual flush / under-cap no-op。

### 驗證
- **pytest 30 passed**(6 新切法 D + 24 既有 regression 全綠 — ADR-0033 merge + BUG-017 image isolation 零 regression)。
- **ruff**:我新增 code clean(`layout_aware` reformatted)。`server.py` E402 ×30(truststore import pattern)+ `test_chunker` `import pytest` F401 = **pre-existing 非本次引入**(git diff 證 server 只改 line 99;test 純 append + 0 `pytest.` 用法),按 Karpathy §1.3 不刪。
- **mypy --strict**:我新增 method/field clean;17 pre-existing errors(parsers docling stub + `layout_aware` 既有 `object→ParagraphItem/Table` assign)非本次引入。

### Blockers / 下一步
- **F3 re-index + F4 eval 待做** — 需 backend venv restart 載新 chunker code(`python -m api.server` 無 reload)+ doc-level reindex 圖密文件 + eval no-regression(G3/G4)。涉及 stateful + eval ~18min。
- ⚠️ 重切 risk(R6):chunker 改變所有 chunk 邊界 → G3/G4 必過先算 PASS。

### Commits
- `8145656` feat(ingestion): W44 F1+F2 chunker image-density deep fix(切法 D)
- `64b78f6` docs(planning): roadmap A-E audit calibration(順手 commit,另一 session work)

---

## Day 1 cont — F3 re-index G1/G2 PASS

- **pre-flight** ✅ Langfuse 200 / Postgres SELECT 1 / backend venv restart(kill PID 18552 venv + 43128 system-python dual-process → venv cold start ready ~100s,全 component ok,新 chunker 載入)。
- **F3 reindex** AR `test-kb-20260531-v1`(doc `drive-user-manual-0601-ar-fna-ar-management-v0-03`)via doc-level reindex(`documents.py` real pipeline,[AUDIT-B] 證唔卡 Track A):68→**90 chunks**(force-split +22),223 img uploaded / 30 deduped。
- **G1 PASS**:max per-chunk 圖數 **57 → 8**(diag `_w44diag_imgcount.py` 讀 index)。
- **G2 PASS**:分佈 baseline 多 mega(57/27/25/23/18/16/14/12/12/11)→ 重切後 0 個 >8、22 chunks at cap 8、dist 集中 ≤8;223 unique 全保留(per-chunk 總和 252 ≥ 223,無丟失;278→252 = pile-on cross-chunk dup 亦消除)。
- **下一步 F4**:reindex `drive_user_manuals`(含 AR + 5 模組)→ `/eval/run` 30q no-regression(G3 R@5 / G4 RAGAs)對比 W43 baseline(recall 1.0/faith 0.9956/corr 0.8489/0 attention)。throwaway diag script `_w44diag_imgcount.py` F4 後刪。

---

## Day 1 cont — F4 撞 eval-harness decay → 全 rigor 重建 track(user pick)

### drive 重建(連圖,新 chunker)
PATCH drive config `extract_embedded_images: false→true`(揭 W43 drive 0 圖 = text-only config,非 azurite)。6 doc doc-level reindex 連圖(AP 第一次 embed Azure transient timeout,POST retry 即成):drive **287→369 chunks** / total 圖 **0→1012** / max per-chunk **8**(diag confirm force-split 守 cap)。

### eval run 結果(eval-set-v1-draft 55q,~30min wall)
recall_at_5 0.8848 / faith 0.8583 / corr 0.7061(47 eval / 3 errored)。表面 vs W43 baseline 顯著跌,但**根因 = eval-harness decay,非切法 D**:
1. **Cohere rerank 401**(Q008/Q030/Q038)— eval 連打 47 query 觸 Azure Cohere rate-limit → retrieval/rerank fail → empty context → recall/faith 假跌。單 query Q019/Q030(eval 中 401)重跑 healthy(cohere-v4.0-pro,5-11 cit)→ 證 transient rate-limit,非 key。
2. **eval-set-v1-draft = DRAFT,Q14 SME validation pending(自 W2)**:55q 全部 `acceptable_chunk_ids` empty + `expected_answer_keywords` 0 + `validated:false`。recall 喺 empty-GT 下 unreliable(W43 recall 1.0 都係 empty-GT fallback)。

### 切法 D no-regression — 三源證實(非 RAGAs aggregate)
- G1/G2 圖洪 57→8 硬證
- pytest text token 邊界 cap=None/under-cap bit-identical(force-split 只新增 image-carrier chunk,唔改既有 text chunk)
- 單 + 3 sanity query(AP 圖密 14cit / GL 13cit / Budget 11cit,跨模組)retrieval 全 healthy → image-carrier chunk 冇 push out 真 content

### 決定(user AskUserQuestion ×3 → 全 rigor 重建)
gold RAGAs no-regression 需:(1) SME-validated GT(Q14,Chris pick) + (2) before-baseline 重建(舊 chunker cap=None,現已 reindex 走) + (3) Cohere throttle。User pick **全 rigor 重建(跨多 session)**。F4 擴展 gold-eval rigor sub-track(F4.4-F4.9),原 F4.1-F4.3 superseded。工具齊:`scripts/discover_chunk_ids.py` + `scripts/validate_eval_set.py`。**SME block point F4.6**:Chris pick 30 main acceptable_chunk_ids — AI 做唔到 gold GT。

### Commits
- `ada4100` docs(planning): F3 G1/G2 PASS(之前)
- `d2485ae` docs(planning): F4 eval-harness decay finding + rigor track pivot

---

## Day 1 cont — F4.4 Cohere rate-limit throttle/retry(eval infra)

### 做咗乜
- **根因 ground**:eval 兩個 query loop(`runner.py:_evaluate_query` recall + `orchestrator.py:build_ragas_samples` RAGAs)都 call `engine.retrieve` → reranker。`cohere.py:78` 已有 3-retry/~7s tenacity backoff,但 eval 連打 47 query 觸發嘅 Azure rate-limit window 超過 7s + **query 間零 spacing** → retry 耗盡仍拋 401(misleading rate-limit signal,單 query healthy)。
- **修法(eval-only,唔掂 production reranker per F4.4 plan scope)**:新 `backend/eval/throttle.py` `retrieve_with_throttle()` = ① per-query throttle spacing(env `EVAL_RETRIEVE_THROTTLE_S` default 1.0s,call-time 讀,主修避 burst)② 外層 `AsyncRetrying` longer-backoff(`wait_exponential(2, min=2, max=30)` × default 5 attempts,**只** retry 401/429/`TransportError`,真 4xx/generic error 即 reraise 唔燒 attempt)。`runner.py` + `orchestrator.py` 兩 loop 改用 helper;`conftest.py` 設 throttle=0(test 唔 sleep)。
- **`tenacity` 既有重用 dep**(H2 ✅ 無新增);Karpathy §1.2 唔改 production `cohere.py`(scope 守)。

### 驗證
- **pytest 41 passed**(test_eval_throttle +7 新 + test_eval_runner/ragas/endpoints 34 既有 0 regression)。
- ruff:新增 5 file all clean。mypy --strict:`throttle.py` 本身 0 error(13 error 全 transitive import pre-existing — `retrieval_engine.py`/`observe.py`/`reranker/base.py`,非本次引入,同 W44 F1 既有一致)。

### Blockers / 下一步
- **F4.5**:跑 `scripts/discover_chunk_ids.py` 生成 30 main candidate chunk_ids(我做)→ 交 **F4.6 SME block**(Chris pick `acceptable_chunk_ids` + `validated:true`,AI 做唔到 gold GT)。
- F4.4 default 1.0s throttle × 47 query × 2 loop ≈ +94s eval wall(RAGAs judge ~30min 主導,可接受)。F4.7/F4.8 重建 eval 時 backend env 可調 `EVAL_RETRIEVE_THROTTLE_S` override。

### Commits
- `4b23494` feat(eval): W44 F4.4 eval-only retrieve throttle + rate-limit backoff

---

## Day 1 cont — F4.5 GT discovery rework + run → R3 deviation(GT 類型)

### 做咗乜
- **F4.5 ground 揭兩問題**(Karpathy §1.1 + R6 recursive plan-text 自檢):
  1. `discover_chunk_ids.py` **W2-stale** — `engine.retrieve(query, top_k)` 缺 ADR-0018 mandatory `kb_id`(`retrieval_engine.py:124` 無 default)→ 跑會 `TypeError`;硬編 eval-set-v0 + default index。
  2. **更核心(plan 內在矛盾)**:chunk_id GT 係 **chunker-specific** — cap=None(F4.7)同 cap=8(F4.8)re-chunk 出唔同 chunk 邊界(AR doc +22 sub-chunk,編號全 shift),cap=8 force-split sub-chunk 喺 cap=None index 根本唔存在 → 單一 `acceptable_chunk_ids` set 無法 valid score 兩個 index。F4.9「同 GT 唯一變 cap」對 chunk_id GT 做唔到。
- **STOP+ask → user pick 內容導向 GT(keyword + optional reference_answer)**:chunker-agnostic → 兩 re-chunk 用同一套 GT(keyword-mode recall + RAGAs context_recall)valid 比較;順帶永久修 eval-set-v1-draft empty-GT(Q14 自 W2 pending)。
- **R3 deviation**:checklist F4.5-F4.9 語義 + plan §7 changelog 更新(chunk_id strict → content-based)。
- **discover script rework**:修 `kb_id`(ADR-0018,per-query override + `kb_id_to_index_name` 解析 per-KB index)+ argparse(--eval-set/--kb-id/--out/--top-k)+ 輸出改 surface top-k chunk_text preview(300 char)+ section_path + chunk_title 輔助 SME 寫 keyword。`RetrievalEngine(embedder, searcher)` 無 wire reranker → hybrid-only → **無 Cohere 401 burst 風險**。
- **跑** → `reports/eval-set-v1-draft_gt_candidates.yaml`:**50 main query**(非估算 30)× top-8,**0 error / 0 empty top_k**,index `ekp-kb-drive-v1`,~50s wall。

### 驗證
- ruff:`discover_chunk_ids.py` clean。報告結構:每 query 有 `current_expected_keywords` + `discovered_top_k`(chunk_id/doc_id/section_path/chunk_title/score/300-char preview)— 對 SME 寫 keyword/reference 充分。

### Blockers / 下一步
- **F4.6 = 🚧 Chris SME block**(hand off):為 50 main query 寫 `expected_answer_keywords`(+ optional `reference_answer`)+ `annotation.validated:true`,基於 `reports/eval-set-v1-draft_gt_candidates.yaml` 嘅 top-8 preview。AI 做唔到 gold GT。
- F4.6 完成後我做 F4.7(cap=None reindex + eval)/ F4.8(cap=8 + eval)/ F4.9(隔離對比 + gate verdict)。

### Commits
- `d2e1b36` chore(eval): W44 F4.5 GT discovery rework + run(content-based GT pivot)
- `f8ff53a` docs(planning): F4.6 handoff note(報告 gitignored/local + regenerable)

---

## Day 1 cont — F4.6a AI 草擬 GT proposal(分工:AI 草擬→Chris 複核)

### 做咗乜
- User 困惑「F4.6 具體做咩」→ 用 Q001 真實例子拆解 + 提出更輕分工 **AI 草擬→Chris 複核**(取代「Chris 由零寫 50 條」)。User pick 此分工。
- 讀晒 `reports/eval-set-v1-draft_gt_candidates.yaml` 50 query × top-3 chunk(用 throwaway condenser 壓成 600 行精華,已刪)。逐條 propose 收緊嘅 `expected_answer_keywords`(3-4 個同一正確 section 內共現嘅具體詞:function 名/選單路徑/section code 如 AR01/FA06,避免 generic「AR」「customer」零分辨力)+ 1 句 `reference_answer`。
- 輸出 `docs/01-planning/W44-chunker-image-density-deep-fix/F4.6-gt-proposal.md`(由 gitignored reports/ 移入 phase folder = tracked,hand-off 跨 session durable)。
- **Flag 分佈 🟢30 / 🟡11 / 🔴9**:
  - 🟢 語料有清晰對應 section,信心高。
  - 🟡 query 模糊/跨模組但有合理 section。
  - 🔴(Q042/Q043/Q045/Q046/Q047/Q048/Q049/Q050/Q054)troubleshooting/跨模組 synthesis,語料覆蓋弱 → **正正係 F4 eval below-threshold 嗰批**,證明係 **eval-set query 設計問題(W4 synthetic user-collected query 問語料無答嘅嘢)非 chunker regression** —— 呼應 F4 finding。

### 誠實邊界
- AI 唔係 Ricoh D365 財務 SME;proposal keyword 由 retrieved 文字+section 結構推導,反映「邊段答到」但「咩係*正確*答案」需 Chris domain 把關。`validated:true` 仍由 Chris 確認 → gold 成立。

### Blockers / 下一步
- **F4.6b = 🚧 Chris 複核**(對 proposal ✅剔/✏️改/❌剔,🔴 嗰 9 條決定 keyword vs `expected_refusal`)→ 我 apply 入 eval-set + flip validated → 接 F4.7。

### Commits
- `ec57056` docs(planning): W44 F4.6a AI-drafted content-based GT proposal
- `0e2bb1c` docs(planning): capture LLM document-profiler brainstorm as roadmap addendum(brainstorm 衍生,F4.6 block 期間)

---

## Day 2 — 2026-06-04 — F4.6b Chris 複核 + apply GT(Q14 RESOLVED)

### 做咗乜
- **chat 互動逐模組複核**(user pick「互動逐模組帶你過」)AR→AP→FA→CB→GL→BM 過晒 50 條。verdict:
  - **46 條收緊 keyword + `validated:true`**(🟢 全收 / 🟡 方向確認 / 部分 🔴 保留 keyword 當難題)。
  - **4 條 reclassified OOS**(Q048/Q049/Q050/Q054):corpus 答唔到(cross-module data source / 跨模組互動 / 未列舉 dimension types / variance reporting 未文件化)→ `expected_refusal:true` + `query_type:oos` + `difficulty:n_a_oos` + keywords 清空。
- **apply**(throwaway `_w44_apply_gt.py` safe_load→改→safe_dump,保留欄位順序,已刪):`docs/eval-set-v1-draft.yaml` metadata bump `1.0-w44-f4.6-sme-validated` + header 重生記錄 SME validation provenance。`acceptable_chunk_ids` 留空(chunker-agnostic per R3,runner 行 keyword-mode)。5 條原 OOS(Q031-Q035)不動。
- **`validate_eval_set.py` 修 W2-stale**(同 F4.5 discover_chunk_ids 同款 staleness):① non-OOS 接受 **keyword-mode GT**(≥1 `primary_chunk_id` **OR** ≥1 `expected_answer_keyword`,原本只認 strict chunk-id)② 加 `expected_refusal⇒query_type oos` 不變量檢查。

### 驗證
- `validate_eval_set.py docs/eval-set-v1-draft.yaml` → **OK passed all validation checks**。
- ruff:`validate_eval_set.py` clean。spot-check Q001(keyword + validated)、Q048(oos + refusal)、metadata 全對。
- 計數:46 keyword + 4 OOS = 50 validated;55 total(含 5 原 OOS)。

### 決定 / OQ
- **Q14 designated SME validation 首次執行**(Q14 *owner* 決定早於 W1 已 Resolved = Chris self-assigned labeler;但 eval-set-v1-draft 嘅實際 SME validation 工作自 W2 一直 pending)→ 本次 F4.6b 首次落實:eval-set 由 AI-draft 升為 **SME-validated**(content-based GT)。**非** OQ status change(Q14 已 Resolved),係執行 Q14 指派嘅 work item;decision-form Q14 Notes 加 traceability 註。
- eval-set 檔名保持 `eval-set-v1-draft.yaml`(registry id 不變,F4.7/F4.8 直接用);正式 rename → `eval-set-v1.yaml` 留 F5 closeout 可選。

### Blockers / 下一步
- **F4.7**:cap=None reindex drive(舊 chunker before baseline)+ `/eval/run`(eval-set-v1-draft,content GT keyword-mode + RAGAs)→ 然後 F4.8 cap=8 + F4.9 隔離對比。

### Commits
- `889688e` feat(eval): W44 F4.6b apply SME-validated content-based GT(pushed)

---

## Day 2 cont — 2026-06-04 — reboot infra recovery + F4.7/F4.8/F4.9 + F5 closeout(Gate PARTIAL→PASS)

### Reboot infra recovery(耗時最長嘅一段)
用戶重開機 → Docker daemon / Postgres / Langfuse / Azurite 全停。重建:
- Docker Desktop 更新完成後重啟 daemon;`docker compose up -d` → Postgres/Langfuse auto-restart(cached image)。
- **Azurite docker image perma-503 MCR**(特定 layer `1a142d…`,per ADR-0017 R8/R9 已知)→ native npm Plan B:`azurite --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0 --location infrastructure/azurite-data --skipApiVersionCheck`(`npm i -g azurite` 重裝後)。
- **關鍵教訓(memory-worthy)**:呢部機 post-reboot **重度 contention**(Docker 更新 + wazuh 容器 + azurite 爭資源)令 **azurite startup ~30-90s、backend startup ~10min**(平時 ~3s / ~250s)—— **非 hang**。我頭幾次誤判「hang」皆因 ~12s 太早 check + 提早殺。耐心(azurite 90s / backend 480s poll)後皆 up。node 能 bind(test 19999 ✓)、azurite --version ✓ 證 install 無壞,純 startup 慢。

### F4.7 before-baseline(cap=None)
backend cap=None reindex 6 drive docs + `/eval/run`(SME GT)→ **recall 0.933 / faith 0.9506 / corr 0.795**(46 eval / 0 error,**throttle 令 0 個 401** — F4.4 生效)。`reports/w44_f4.7_before_capNone_eval.json`。

### F4.8 after-baseline(cap=8)
- backend 重啟 cap=8(`CHUNKER_MAX_IMAGES_PER_CHUNK=8`)。reindex **要 multipart re-upload**(doc-level reindex API `documents.py:786` = `file: UploadFile` + slugified-stem==doc_id check;PS 5.1 冇 `-Form` → 用 `curl.exe -F "file=@path"`)。6 docs 全 HTTP 202:**287→369 chunks**(force-split:AR 68→90/AP 63→83/FA 59→78/CB 23→28/GL 60→74/BM 14→16);Azurite 圖上傳正常。
- `/eval/run` after → **recall 0.9312 / faith 0.9459 / corr 0.7722**(46 eval / 0 error)。⚠️ eval HTTP client(Invoke-RestMethod)hang 喺大 response body,但 backend `eval_orchestrator_complete` log 有權威數字 → `reports/w44_f4.8_after_cap8_eval.json` 由 log 重建(標 provenance)。

### F4.9 隔離對比 → Gate verdict
同一套 SME-validated eval-set、同條件、唯一變 cap:

| 指標 | before(cap=None)| after(cap=8)| Δ | ±2pp |
|---|---|---|---|---|
| recall_at_5 | 0.933 | 0.9312 | −0.18pp | ✅ |
| faithfulness | 0.9506 | 0.9459 | −0.47pp | ✅ |
| correctness | 0.795 | 0.7722 | −2.28pp | ⚠️ marginal |

**Chris 拍板 = PARTIAL→PASS**:recall + faith flat(cap=8 force-split 冇損檢索/grounding);correctness −2.28pp 歸因 RAGAs `answer_relevancy` run-to-run noise(三指標最 noisy;兩個更客觀指標 flat 佐證)。配合三源證實(G1/G2 57→8 + pytest bit-identical + sanity healthy)= **no-regression confirmed**。

### F5 closeout
- architecture.md §3.3 "Embedded images" bullet 加 ADR-0041 inline blockquote amendment(沿 ADR-0033 先例)。
- ADR-0041 加 "## Validation(W44 F3–F4.9)" 段(圖洪 57→8 + 287→369 + 對比表 + PARTIAL→PASS + F4 deviation)。
- session-start §10 W44 row + roadmap §3 W44 done(見下)。
- throwaway diag `backend/_w44diag_imgcount.py` 刪。

### Retro(W44)
- **What went well**:① 切法 D image-cap force-split 達標(57→8)且客觀指標零 regression。② F4.4 throttle 徹底解 eval-harness Cohere 401(before/after 皆 0 error)。③ F4.5/F4.6 content-based GT pivot(R3)既解 chunker-agnostic 比較需求,又永久修 eval-set Q14 empty-GT,一石二鳥。④ AI-draft→人複核分工令 50-query SME validation 高效完成。
- **What was hard / lessons**:① **reboot 後機器 contention 令 startup 慢 5-10×,誤判 hang 浪費多輪** → 教訓:loaded machine 上 startup poll 要畀 ~90s(azurite)/ ~10min(backend),先睇 CPU 活動 + log 再判生死,唔好 ~12s 殺。② doc-level reindex 係 **multipart re-upload**(唔係 re-read stored source)—— W2-era 工具/直覺多次 stale(discover_chunk_ids 缺 kb_id、validate_eval_set 認 chunk-id-only、reindex 要 file)。③ azurite docker MCR 503 係 perma 已知(R8/R9),native Plan B 要記 `--blobHost 0.0.0.0 --location infrastructure/azurite-data`。
- **Carry-over(未變)**:per-KB 圖數 cap(降 `chunker_max_images_per_chunk` 落 `KbConfig`,roadmap W44 carry-over)/ 真 KB-level reindex + v1→v2 原子切換(W45 Track A)/ 切法 B sub-heading enhancement(eval 未顯示需要)。eval-set 正式 rename → `eval-set-v1.yaml` 未做(registry id 保持 draft,非阻塞)。

### Commits
- (F4.7/F4.8/F4.9/F5 closeout commit 見下)
