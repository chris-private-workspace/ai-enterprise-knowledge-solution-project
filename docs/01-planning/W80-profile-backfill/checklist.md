# W80 checklist — Profile-only backfill(ADR-0059)

> tick 規則:完成 `→ [x]`;延後 `[ ]` + 🚧 + reason + target(不可刪)。每 commit 對應 ≥1 項(R2)。

## F1 — backend profile-only backfill endpoint

- [ ] F1.1 新 endpoint `POST /kb/{kb_id}/profiles/backfill` + helper `run_kb_profile_backfill`(`_verify_kb_or_404` + `_refuse_if_archived` + `engine.list_documents` 列 doc + `doc_profile_store` None → 503)
- [ ] F1.2 per-doc loop(復用 reindex structure 拔重活):已有 profile → `skipped_has_profile` / `download_source_document` None → `skipped_no_source` / parse + `_PROFILER.profile` + persist(D6 守 preserve `manual_override`)+ `_route_profile_preset`(D6 skip-if-manual);單 doc 失敗 → `failed` 不 abort batch;tempfile finally 清理;**無** chunk/embed/upsert/counter
- [ ] F1.3 回應 shape `{status, kb_id, documents_total, profiled, skipped_has_profile, skipped_no_source, failed, profiles}`
- [ ] F1.4 test `test_doc_profile_backfill.py`(H6)— 補 profile + skip 已有 + skip 無 source + per-doc 容錯 + D6 preserve manual_override + route preset + 無 populator call(不動 retrieval);ruff 0 + mypy 新 code clean + pytest 無 regression

## F2 — 對現有 KB 觸發 backfill + browser 驗

- [ ] F2.1 起全套 infra(pre-flight)+ `POST /kb/drive-images-1/profiles/backfill` → 確認 `profiled` > 0(若全 `skipped_no_source` → surface 畀用戶)
- [ ] F2.2 browser(playwright)驗 L2 Documents 表 profile 欄 + L3 文件畫像 card 真實顯示 profile(非 null);零臨時污染

## F3 — 驗證 + closeout

- [ ] F3.1 backend pytest 全綠 + ruff + mypy;frontend 不改(確認)
- [ ] F3.2 closeout:plan closed + progress retro + ADR-0059 README index + memory append
