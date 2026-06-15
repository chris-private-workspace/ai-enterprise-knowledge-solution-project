# W80 progress — Profile-only backfill(ADR-0059)

## Day 1 — 2026-06-15(kickoff)

**Context**:W72-W79 建齊 profiling pipeline,但 profiler 由 W73 先接入 ingest → **W73 之前 ingest 嘅現有
doc 冇 profile**(read surface 全 null,W78 UI 喺真實 KB 係空殼)。用戶 2026-06-15 揀候選 4 = **(b) 輕量
profile-only backfill**(非 (a) 完整 re-ingest),照 ① → ② → ③ 走。

**Ground(plan kickoff,R6 5-step)**:讀 `profiler.py`(input = `ParserResult` + `source_path`)/ `orchestrator.py`
(W73 profiler 接入點)/ `documents.py` `_run_ingest_pipeline`(profile persist 878-892 + route 905)+
`run_kb_reindex`(948,KB-level loop:download source → re-parse → re-ingest)+ `source_store.py`
`download_source_document`(W46)。**結論**:backfill = `run_kb_reindex` loop **拔掉 chunk/embed/upsert** 嘅
輕量版;原始檔由 W46 / ADR-0043 source blob 取得(W46 前 ingest 冇 → skipped_no_source)。

**ADR-0059 Accepted**(本 session):profile-only backfill endpoint。Alternatives:A 完整 re-ingest(reject —
重量 + 繞過 production-preserve D6 守 + retrieval 風險)/ C read-time lazy compute(reject — read path 唔應
重 parse + 無 persist)/ B(採用)backfill endpoint(surgical + reuse 最多基建)。

**設計決定**:
- endpoint `POST /kb/{kb_id}/profiles/backfill`(KB-level,對齊 reindex pattern)。
- idempotent:已有 profile → skip(`skipped_has_profile`);冇 source → `skipped_no_source`。
- D6 守:preserve `manual_override`(re-profile system fact 但唔失人手覆寫)+ `_route_profile_preset`
  skip-if-manual config。
- deps:**唔用** `_ingestion_deps_or_503`(嗰個 require embedder/populator 否則 503);只 `_engine_or_503`
  (列 doc)+ `doc_profile_store` + `doc_config_store` + blob connection string + standalone parser/profiler。
- UI button **唔做**(一次性 ops + 避 H7,mockup 冇呢個 button);用 API 觸發。

**已 flag 限制(upfront)**:W46(2026-06-04)前 ingest 嘅 doc 冇 source blob → backfill skip;F2 browser
驗時確認 drive-images-1 嘅 `profiled` > 0,若全 skip 即 surface 畀用戶(要先 doc-level reindex re-upload)。

**紀律自檢**:H1 ✅(ADR-0059 Accepted)/ H2 ✅(零新 dep)/ H4 ✅(層 A)/ H6 ✅(F1.4 route test)/ H7 ✅
(backend-only,UI button non-goal)/ Karpathy ✅(reuse run_kb_reindex/download_source/profiler/persist 守)。

**Plan 落地**:W80 folder + plan.md(active)+ checklist.md(F1-F3)+ progress.md + ADR-0059 + README index。

**Commits**:
- (kickoff)docs(planning): W80 kickoff + ADR-0059 — profile-only backfill
