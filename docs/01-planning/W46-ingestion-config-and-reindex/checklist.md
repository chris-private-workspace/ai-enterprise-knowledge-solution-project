# W46 — UI Ingestion Config + Real KB-Level Reindex · Checklist

> Atomic items per deliverable。不可刪未勾項(只 `[x]` 或標 🚧 + reason)。
> **F3 frontend GATED on F0 H7 design 確認**(§5.7)。

## F0 — ADR-0043 + H7 design gate
- [x] F0.1 ADR-0043 寫成 Accepted(H1 backend 方向)
- [x] F0.2 ADR README index 加 0043 row + next available → 0044
- [x] F0.3 H7 mockup design 確認(Chris 批准:unlock `chunk_strategy` + 圖數 cap + Reindex UX;`embedding_model` 維 locked)→ F3 解鎖

## F1 — Source-document blob 儲存(backend)
- [x] F1.1 `storage/kb_naming.py` 加 `kb_id_to_source_container(kb_id)` → `ekp-kb-{kb_id}-sources`
- [x] F1.2 ingest 成功後 best-effort upload 原檔(blob name `doc_id` + metadata `original_filename`);失敗 log warning 唔 fail
- [x] F1.3 既有 upload / doc-reindex 行為不變(只多 best-effort step;106 既有 test 0 regression)
- [x] F1.4 mypy --strict clean

## F2 — Pipeline refactor + 真 KB-level reindex(backend)
- [x] F2.1 復用 `_run_ingest_pipeline`(BytesIO-UploadFile adapter `_bytes_to_upload_file`,零 signature refactor 風險;比抽 core 更 surgical)
- [x] F2.2 `POST /kb/{kb_id}/reindex` stub → 真(`run_kb_reindex` iterate list_documents → download source → delete+re-ingest;kb.py route delegate + archived guard + 移除 stub orphan `uuid`)
- [x] F2.3 同步 summary `{status, documents_total, documents_reindexed, reindexed, skipped_no_source, failed, chunks_total}`
- [x] F2.4 pre-W46 無 source 嘅 doc skip + report(唔 crash)
- [x] F2.5 mypy --strict clean(2 type fix:`int(object)` → isinstance guard;`-> dict` → `dict[str, object]`)

## F3 — Frontend:Settings unlock + Reindex UX(GATED on F0.3)
- [x] F3.1 mockup `ekp-page-kb.jsx` Settings tab 更新:unlock `chunk_strategy`(seg 移除 disabled/opacity)+ NEW Max images / chunk 欄位 + Re-indexing 卡 explainer align W46 in-place 現實 + warning modal(`.modal-overlay` per DESIGN_SYSTEM §4.5)+ summary banner
- [x] F3.2 frontend `kb/[id]/page.tsx` SettingsTab 100% match 更新後 mockup(H7 fidelity):chunkStrategy/maxImages state + configDirty + buildConfigBody + Cancel reset + header Re-index 按鈕 enabled→導去 settings tab
- [x] F3.3 wire `POST /kb/{kb_id}/reindex`(`kbApi.reindex` + `KbReindexSummary` type)+ NEW `<ReindexCard>` 元件(modal confirm → mutation → summary banner;failed→banner-warning)
- [x] F3.4 `embedding_model` 維持 locked(disabled select 不動)
- [x] F3.5 tsc --noEmit clean + next lint clean(唯一 pre-existing chat `<img>` warning 無關)+ `[oklch`=0 preserved

## F4 — Tests(H6)
- [x] F4.1 source-storage test(`test_source_store.py` +6:naming / upload success+fail-best-effort / download present+absent+filename-fallback)
- [x] F4.2 KB-reindex test(`test_kb_reindex.py` 更新 stub→503 + 3 個 `run_kb_reindex` unit:skip-no-source / reingest / failed-doc report)
- [x] F4.3 既有 106 test(test_kb_reindex / test_documents_route / test_documents_detail / test_orchestrator / test_screenshots / test_kb_management)0 regression
- [x] F4.4 frontend Vitest(`kb-settings-reindex.test.tsx` +3:chunk_strategy 解鎖+圖數cap欄位 / Save 送完整 config 含 chunk_strategy+chunker_max_images_per_chunk / Re-index modal→confirm→summary;kb-settings-tuning 3 regression 0 fail = 6 pass)
- [x] F4.5 ruff clean(check + format)

## F5 — Doc-sync
- [x] F5.1 architecture.md inline ADR-0043 amendment:§3.4(原始檔 `-sources` container + 真 reindex,落 §3.4 非 §3.5 因 chunk schema 不變)+ §4.4 #19 row(count 18→19)+ §4.6 Re-sync logic(in-place vs v1→v2 Track A)+ §5.5.5 Settings note(unlock + Reindex UX)
- [x] F5.2 roadmap §3「後續候選(原 W45)」→ ✅ W46(本期)shipped;「W46 per-document」relabel「後續候選 — per-document」避免 double-W46 false-done;§4 依賴樹同步。DESIGN_SYSTEM modal pattern **已存在 §4.5 直接復用**,無需新增
- [x] F5.3 session-start §10 W46 row(local-only,gitignored)— 併入 F6.3 closeout 一次處理

## F6 — Closeout
- [x] F6.1 Phase Gate G1-G6 評估 + verdict = **PASS**(全 6 gate 通過;R4 live-verify 🚧 deferred,見 progress Day 2)
- [x] F6.2 progress.md retro(R6 連環 catch / Karpathy surgical / design-first / double-W46 relabel)+ carry-overs(R4 / per-document / v1→v2 Track A / heading_aware footgun)
- [x] F6.3 session-start §10 W46 closed row + W47+ rolling JIT row(local-only,gitignored)+ plan.md status→closed + changelog
- [x] F6.4 checklist 全 tick;唯一 🚧 = R4 live reindex UI verify(carry W47+,pytest+vitest 已覆蓋邏輯)
