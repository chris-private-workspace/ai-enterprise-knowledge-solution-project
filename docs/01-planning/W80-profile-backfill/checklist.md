# W80 checklist — Profile-only backfill(ADR-0059)

> tick 規則:完成 `→ [x]`;延後 `[ ]` + 🚧 + reason + target(不可刪)。每 commit 對應 ≥1 項(R2)。

## F1 — backend profile-only backfill endpoint

- [x] F1.1 新 endpoint `POST /kb/{kb_id}/profiles/backfill`(kb.py `backfill_kb_profiles`,對齊 `reindex_kb` 的 404/archived guard)+ helper `run_kb_profile_backfill`(documents.py,`_engine_or_503` 列 doc + `_doc_profile_store` None → 503)
- [x] F1.2 per-doc loop(復用 reindex structure 拔重活)+ `_backfill_one_doc_profile` helper:已有 profile → `skipped_has_profile` / `download_source_document` None → `skipped_no_source` / parse + `_PROFILER.profile`(documents.py module-level singleton)+ persist(D6 守 preserve `manual_override`)+ `_route_profile_preset`(D6 skip-if-manual);單 doc 失敗 → `failed` 不 abort batch;tempfile finally 清理;**無** chunk/embed/upsert/counter
- [x] F1.3 回應 shape `{status:"profiled", kb_id, documents_total, profiled, skipped_has_profile, skipped_no_source, failed, profiles}`
- [x] F1.4 test `test_doc_profile_backfill.py`(H6)8 tests — 補 profile + skip 已有 + skip 無 source + per-doc 容錯 + D6 route skip-if-manual + `_backfill_one_doc_profile` preserve manual_override + 無 ingestion services(不動 retrieval)+ 503;**ruff 0 + mypy 新 code clean(剩 line 120 `_engine_or_503` pre-existing baseline)+ pytest 16 passed(backfill 8 + override 8 regression)**

## F2 — 對現有 KB 觸發 backfill + API 驗(用戶揀「重啟 backend + API 驗」,非 browser)

- [x] F2.1 pre-flight(backend 200 / endpoint 404 = 舊 code / azurite ✅ / Postgres healthy)→ 殺 W79 dual-process(56632/56768)+ 重啟 backend(W80 code,health 200 ~42s)→ `POST /kb/drive-images-1/profiles/backfill`(Bearer dev-token)→ **202 `profiled: 6`**(全 6 docs P1_sop_imgdense;`skipped_has_profile`/`skipped_no_source`/`failed` 全空 → 證 6 docs 之前全 null + source blob 都在)
- [x] F2.2 GET `/kb/drive-images-1/documents` 驗 read surface(L2 effective):6 docs 全 profile=P1_sop_imgdense + confidence 0.95(高信心非 fallback)+ `total_chunks` 不變(78/74/28/16/90/83)= **零 retrieval 影響**。frontend render 不重驗(W78 已驗 + W80 零 frontend 改動)

## F3 — 驗證 + closeout

- [x] F3.1 backend pytest 全綠(backfill 8 + override 8 + documents_route 41,含 W74 fixture fix 15 回綠)+ ruff 0 + mypy 新 code clean;frontend 不改(確認)
- [x] F3.2 closeout:plan closed + progress retro + ADR-0059 README index + memory append
