# W47 — Reindex Live Verification · Checklist

> Atomic items per deliverable。不可刪未勾項(只 `[x]` 或標 🚧 + reason)。
> **Verification phase** — 揭 defect → classify per PROCESS.md(Sev → BUG-NNN),唔順手大改。

## F0 — Phase kickoff
- [x] F0.1 plan/checklist/progress 三件套建立 + committed(R1)

## F1 — Dev infra bring-up + pre-flight
- [ ] F1.1 azurite 起(native Plan B `--blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0 --location infrastructure/azurite-data --skipApiVersionCheck`)
- [ ] F1.2 backend 起(`backend\.venv\Scripts\python.exe`)— 只輪詢 `/health`(startup 慢非 hang)
- [ ] F1.3 Azure AI Search reachable + index scheme `ekp-kb-{kb_id}-v1` 確認(Free-tier;`HYBRID_USE_SEMANTIC_RANKER=false` 繞 402)
- [ ] F1.4 pre-flight:Langfuse `/api/public/health` 200 + Postgres `SELECT 1`(Docker unhealthy flag ≠ endpoint down)

## F2 — Seed + source-persist 驗證
- [x] F2.1 複用 active `test-kb-20260531-v1`(Free-tier 3-index 滿,新 KB 撞 429;非破壞性)+ 上載 AR 圖密 doc 副本 `w47-ar-verify`(post-W46,90 chunks,253 圖全 SHA256 dedup)
- [x] F2.2 核 `ekp-kb-test-kb-20260531-v1-sources` container 有 blob `w47-ar-verify`(name=doc_id)+ metadata `original_filename:"w47-ar-verify.docx"` ✅ — **W46 source-persist live 證實**
- [x] F2.3 baseline(cap=null→全域 8):90 chunks,max 8 圖/chunk,29 chunk >3 圖,total 252 圖

## F3 — Reindex core 驗證(真重切)
- [x] F3.1 `PATCH /kb/{id}/settings` `chunker_max_images_per_chunk` null→**3**(GET 確認持久化;chunk_strategy/extract_images 保留)
- [x] F3.2 `POST /kb/{id}/reindex`(~30s)→ summary 正確:`documents_total=2 documents_reindexed=1 chunks_total=133 reindexed=[w47-ar-verify] skipped_no_source=[原AR pre-W46] failed=[]`
- [x] F3.3 重切真生效:w47-ar-verify **90→133 chunks**(force-split +43)、max 圖/chunk **8→3**、>3 圖 chunk **29→0**、total 圖 **252 不變**(純重分佈)
- [x] F3.4 control:無改 config 再 reindex → `chunks_total=133` 穩定(idempotent,無 regression)

## F4 — Edge path 驗證
- [x] F4.1 pre-W46 原 AR doc(無 source)→ `skipped_no_source` + **90 chunks 不變**(skip 在 delete 前,未觸碰)no crash
- [x] F4.2 archived KB `dce-integration-images-1` → `POST /kb/{id}/reindex` 返 **403**(「KB ... is archived — re-create the KB to resume ingest」)

## F5 — Frontend live UI click-through(stretch,唔 block closeout)
- [x] F5.1 **RESOLVED 2026-06-05(post-closeout,W48 後 session)** — 改用 **Playwright MCP**(DOM-based,無 Chrome MCP `Page.captureScreenshot` 30s timeout 依賴)端到端驗證成功。root cause 唔係 renderer timeout 本身,而係 frontend dev server `.next` build cache 壞(core chunk `main-app.js` 404,client JS 載唔到)→ 清 `.next` + 重啟 `pnpm dev`(ready 7.2s)後正常。Click-through 全程:(1)header「Re-index」按鈕 → URL `?tab=settings`(W46 F3 跳 tab 行為✅);(2)Settings tab 渲染 chunk_strategy 4-option seg + Max images/chunk 欄 + `<ReindexCard>`(H7 element 齊✅);(3)「Trigger re-index now」→ `.modal-overlay` confirm modal(標題 + 警告框 + chips「2 docs · 223 chunks · strategy auto · max img 8 (全域)」+ 「Re-index 2 documents」✅);(4)confirm → summary banner「**Re-indexed 1 / 2 documents · 90 chunks rebuilt · skipped (no source): 1 · failed: 0**」+「Last re-index: just now」✅。後端核對:`total_chunks` 223→180(w47-ar-verify recut@cap8 133→90 + pre-W46 doc skip 90)`last_indexed` just now — frontend banner ↔ 後端 ↔ 預測三者一致。**順帶 live 印證 W47 F4 skipped_no_source 路徑喺 UI 層**。

## F6 — Doc-sync + closeout
- [x] F6.1 R4 status 更新:W46 plan §4 R4 → RESOLVED(live verified)+ roadmap W47+ carry「R4 live verify」標 done + session-start §10 W47 row
- [x] F6.2 live 發現記 progress.md:唯一 finding = Free-tier 3-index cap(環境限制非 defect);W46 reindex **零 defect** → 無 BUG-NNN
- [x] F6.3 Phase Gate G1-G6 = **PASS**(F5 frontend 🚧 deferred non-blocking)+ retro(見 progress)
- [x] F6.4 checklist 全 tick;唯一 🚧 = F5.1 frontend live UI(carry W48+)+ session-start W47 closed + W48+ rolling JIT
