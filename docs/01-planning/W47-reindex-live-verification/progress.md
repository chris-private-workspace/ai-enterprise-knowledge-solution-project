# W47 — Reindex Live Verification · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應 Day-N entry(R2)。

---

## Day 1 — 2026-06-05

### Context / kickoff
W46 closed + pushed(`5b4920a`,origin sync)。用戶揀 W47 = **R4 live reindex 端到端驗證**(W46 唯一 carry;收 roadmap W47+ candidate)。Verification phase — 實機證 W46 reindex(`source_store` + `run_kb_reindex` + `<ReindexCard>`)end-to-end work,pytest/vitest 只覆蓋邏輯。

### F0 — kickoff
- plan/checklist/progress 三件套建立(R1:plan committed 先 implement)
- Phase Gate G1-G6 定義(G5 frontend live UI = stretch 唔 block);R1-R5 phase risk(azurite MCR 503 → native Plan B / startup 慢非 hang / Free-tier 402 / live 揭 defect → BUG-NNN / venv 雙進程坑)

### F1 — infra bring-up(同日)
- azurite native Plan B 起(pid 23252,blob 10000 listening)— docker 無用,native 直起
- backend `backend\.venv\Scripts\python.exe -m api.server`(port 8000,Windows SelectorEventLoop per BUG-008;startup ~96s)— `/health` 200 全綠:azure_search / azure_openai / cohere / langfuse / postgres 全 ok
- pre-flight:Langfuse `/api/public/health` **200**(docker `unhealthy` flag = timing artifact,endpoint 健康,印證 PC-W34-1)+ Postgres `SELECT 1` OK
- frontend 已在(pid 996,port 3001)→ F5 stretch 可用

### F2 finding — Azure Search Free-tier 3-index cap(live)
GET /kb = 9 KB metadata(多數 archived);建 fresh `test-w47-reindex` → **502 / index_create_failed 429**:「Free tier caps at 3 indexes... KB record rolled back. Delete an unused index or upgrade (Standard S1)」。3 個 live index 由 active KB 佔:`drive_user_manuals`(6 doc/369 chunk)/ `test-kb-20260530-1` / `test-kb-20260531-v1`。
- **決策**:刪 index = destructive(需 user OK,且 archived KB 已無 live index 可刪)→ 改**非破壞性**:複用 active `test-kb-20260531-v1`(已有 446 screenshots,圖片抽取已啟),上載 AR 圖密 doc(post-W46 → source persist)。其既有 pre-W46 doc(2026-05-31 < W46 2026-06-04,無 source)順帶作 F4.1 skipped_no_source 驗證。
- 印證 memory `project_azure_search_tier_semantic_billing`:Free SKU 限制 = IT cost + stakeholder approval（Standard S1 per architecture.md §3.2 H2）。

### F2 — source-persist live 驗證(同日)— **PASS**
- 複用 active `test-kb-20260531-v1`(已有 446 screenshots)+ 上載 AR 圖密 doc 副本 `w47-ar-verify`(post-W46 ingest,~31s,90 chunks,images_uploaded=0/images_deduped=253 — 跨 doc SHA256 dedup 命中現有 AR blob)
- azurite blob DB grep:`ekp-kb-test-kb-20260531-v1-sources` container 有 blob `"name":"w47-ar-verify"`(name=doc_id)+ metadata `original_filename":"w47-ar-verify.docx"` ✅
- baseline(cap=null→全域 8):90 chunks / max 8 圖/chunk / 29 chunk >3 圖 / total 252 圖

### F3 — reindex core live 驗證(同日)— **PASS**
- `PATCH /settings` cap null→3(GET 確認;chunk_strategy=auto + extract_images=true 保留)
- `POST /kb/test-kb-20260531-v1/reindex`(~30s):`status=reindexed documents_total=2 documents_reindexed=1 chunks_total=133 reindexed=[w47-ar-verify] skipped_no_source=[原 AR pre-W46] failed=[]` ✅
- 重切真生效:w47-ar-verify **90→133 chunks**(force-split +43)/ max 圖 **8→3** / >3 圖 chunk **29→0** / total 圖 **252 不變**(純 force-split 重分佈,confirm 新 config ingest-time 生效)
- F3.4 control:無改 config 再 reindex → `chunks_total=133` 穩定(idempotent)

### F4 — edge path live 驗證(同日)— **PASS**
- F4.1:原 AR pre-W46 doc(無 source)→ `skipped_no_source` + **90 chunks 不變**(skip 在 delete 前)no crash ✅
- F4.2:archived KB `dce-integration-images-1` → `POST /reindex` 返 **403**「KB ... is archived — re-create the KB to resume ingest」✅

### F5 — frontend live UI(stretch)— 🚧 deferred → ✅ **RESOLVED 2026-06-05(post-closeout,W48 後 session)**
原 deferred:Chrome MCP 連上 Browser 1 + navigate 成功,但 loaded machine + next dev on-demand 編譯令 renderer 兩次 `Page.captureScreenshot` 30s timeout(plan §4 R2 場景)。

**Resolution(同日稍後,機冇咁忙時重試)**:
- **Root cause 重新定性**:唔係 renderer timeout 本身,而係 **frontend dev server `.next` build cache 壞** — HTML 引用 `/_next/static/chunks/main-app.js` 等 core chunk 全部 **404**,client JS 載唔到 → 頁面卡喺 SSR placeholder(「Loading…」/「Signing in…」)。`/` 500、`/dashboard`+`/kb` server-side 200 但 client 死。
- **Fix**:kill frontend tree(pnpm dev PID 21864 + next dev 2212 + worker 996,per `project_backend_venv_dual_process` 雙進程紀律連子樹清)→ 刪 `frontend/.next` → 重啟 `pnpm dev`(**Ready 7.2s**,clean rebuild)→ chunk 404 消失。
- **改用 Playwright MCP**(DOM-based,唔靠 Chrome MCP `Page.captureScreenshot`)行 click-through,完全避開 timeout 依賴。
- **端到端驗證(KB `test-kb-20260531-v1`)**:
  1. header「Re-index」按鈕 → URL 變 `?tab=settings`(**W46 F3 跳 tab 行為** ✅)
  2. Settings tab 渲染 **chunk_strategy 4-option seg**(heading_aware/layout_aware/slide_based/auto)+ **Max images/chunk 欄** + `<ReindexCard>`(H7 element 齊,hint 文字對齊 ✅)
  3. 「Trigger re-index now」→ `.modal-overlay` confirm modal:標題「Re-index this knowledge base?」+ 「Save config changes first」警告框 + chips「**2 docs · 223 chunks · strategy auto · max img 8 (全域)**」+ Cancel / 「Re-index 2 documents」(對齊 mockup ✅)
  4. confirm → summary banner「**Re-indexed 1 / 2 documents · 90 chunks rebuilt**」+「**skipped (no source): 1 · failed: 0**」+「**Last re-index: just now · current version v1**」✅
- **後端核對(GET /kb/test-kb-20260531-v1)**:`total_chunks` **223→180**(w47-ar-verify recut@saved-config cap=8 → 133→90 + pre-W46 doc skip 維持 90)、`total_documents=2`、`last_indexed=2026-06-05T10:13:16Z`(just now)— **frontend banner ↔ 後端狀態 ↔ 預測三者一致**。
- **bonus**:同時 live 印證 W47 F4 `skipped_no_source` 路徑喺 **UI 層**(pre-W46 無 source doc 被 graceful skip,UI banner 正確顯示 skip count)。
- **附帶觀察(非 F5,W48 範圍)**:config-test 面板 footer 文字「對 RAGAs 盲 → presentation counters 為第二軸」喺 `page.tsx:2211` 同 mockup `ekp-page-kb.jsx:942` **一致**(非 H7 drift),但 W48 已喺兩處加咗 faithfulness RAGAs 質素軸 headline → footer copy 變自相矛盾。留 W48 copy-staleness follow-up 候選,待用戶決定。

### Cleanup
- `test-kb-20260531-v1` cap PATCH 還原 null(恢復 W43 保守 standing config,memory `project_per_kb_tunable_config_vision`)。**不刪** `w47-ar-verify`(其 253 圖全 dedup 自原 AR doc 共享 blob,刪可能誤刪共享 blob 損原 doc → 安全保留)。最終:2 docs / 223 chunks(原 90 + w47-ar-verify recut 133)。
- infra 起咗未停:azurite(pid 23252)+ backend(port 8000)+ frontend(pid 996)— session 後可留 / 用戶決定停。

### Phase Gate G1-G6 — **PASS**(F5 frontend UI 🚧 deferred,non-blocking per G5)

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| G1 | dev infra up + pre-flight | ✅ PASS | azurite native(10000)+ backend /health 200 全綠 + Langfuse 200 + Postgres SELECT 1 |
| G2 | 原始檔 live persist 落 `-sources` | ✅ PASS | azurite blob `w47-ar-verify` + metadata original_filename(F2.2)|
| G3 | reindex 真重切 + summary 正確 | ✅ PASS | 90→133 / max 圖 8→3 / total 252 不變;summary 數字啱(F3.2-F3.4)|
| G4 | skip(no-source)+ 403(archived) | ✅ PASS | 原 doc skipped + 90 chunks 不變;archived 403(F4.1-F4.2)|
| G5 | live 發現全部 triage | ✅ PASS | Free-tier 3-index cap finding(非 defect,環境限制)；W46 reindex **零 defect** |
| G6 | R4 doc-sync RESOLVED + closeout | ✅ PASS | W46 plan §4 R4 → RESOLVED + roadmap + session-start sync(F6)|

**判決:Phase Gate 通過(PASS)**。W46 reindex feature live end-to-end 證實**零 defect**;唯一 finding = Azure Search Free-tier 3-index cap(已知環境限制,memory `project_azure_search_tier_semantic_billing`,非 code defect)。F5 frontend UI click-through 🚧 deferred(loaded machine renderer timeout,non-blocking — vitest + backend live 已覆蓋實質)。

### Retro
- **R4 carry-over 收咗**:W46 啱 ship 嘅 reindex 喺真 Azure + 真圖密文件下行得通,且**精準**(cap 8→3 → 圖數重分佈 252 不變、chunk +43、max 圖嚴格 ≤3)。pytest 證邏輯,live 證真效果 — 兩層互補。
- **非破壞性 verification 設計**:Free-tier index 滿 → 唔刪 index(destructive,需 user OK)→ 複用 active KB 上載副本 doc。順帶用其 pre-W46 doc 一次過驗 F4.1 skipped + 證 skip 唔觸碰既有 chunk。
- **memory 三則 runtime 約束全部命中**:azurite native Plan B(MCR 503)/ backend venv startup ~96s 慢非 hang / Free-tier 402+index cap — 早讀 memory 慳返 trial-and-error。
- **共享 dedup blob 刪除風險**:cleanup 時識別「刪 w47-ar-verify 可能誤刪原 AR doc 共享 blob」→ 保守保留(Karpathy §1.3 — 唔製造新 mess)。
- **Watch**:F5 frontend live UI carry W48+(或用戶手動);Free-tier 3-index cap 持續限制多 KB 並存測試(Standard S1 = Track A)。

### Carry-overs → W48+(rolling JIT)
- ~~🚧 F5 frontend reindex UI live click-through~~ → ✅ **RESOLVED 2026-06-05**(post-closeout 同日 session,Playwright MCP 端到端證 + 後端核對一致;見上 F5 entry)
- Free-tier 3-index cap → 並存測試受限(Standard S1 Track A)
- (W46 carry 不變)per-document scope / production v1→v2 / heading_aware footgun / config-test ingestion 軸

### Commits
- F0 kickoff `7f18f13`;F1-F6 verification 無 code change(只 progress/checklist/doc-sync)→ closeout commit pending

### Blockers / carry-over
- 無 blocker。infra 風險已喺 plan §4 + memory(`project_loaded_machine_startup_infra_recovery` / `project_backend_venv_dual_process` / `project_azure_search_tier_semantic_billing`)留底。
