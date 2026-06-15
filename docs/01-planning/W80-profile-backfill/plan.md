# W80 plan — Profile-only backfill(現有 doc 補跑 profiler,ADR-0059 落地)

**Status**: active
**Kickoff**: 2026-06-15
**Phase 類型**: backend feature(H1 architectural — 新 endpoint;ADR-0059 已 Accepted)
**ADR**: ADR-0059(profile-only backfill — 用戶 confirm scope = (b) 輕量,非 (a) 完整 re-ingest)

---

## §1 Context / 緣起

profiler 由 W73 先接入 `orchestrator.ingest()`,所以 **W73 之前 ingest 嘅現有 doc 冇 profile**:
`DocProfileStore` 冇 row → W78 三層 UI(L2 表 profile 欄 / L3 文件畫像 card)喺真實 KB 全 null,只能靠
臨時 ingest 嘅 doc 驗。候選 4 = 令現有 doc 有 profile,**而唔破壞已穩定 retrieval**(drive-images-1 W59-W68
調好 cap=80 等 per-KB config)。用戶 2026-06-15 confirm 用 **(b) 輕量 profile-only backfill**(非 (a) 完整
re-ingest)。

**落點 grounding(plan kickoff,R6 5-step)**:
- `run_kb_reindex`(`documents.py:948`,W46)= KB-level reindex loop:list doc → `download_source_document`
  → re-parse → re-ingest。backfill = 呢個 loop **拔掉 chunk/embed/upsert** 嘅輕量版。
- `download_source_document`(`source_store.py:85`,W46)取原始檔;None = W46 前 ingest 冇 source。
- `_PROFILER.profile(parser_result, source_path)`(`profiler.py:107`)deterministic 純規則。
- profile persist + D6 守:`documents.py:878-892`(`DocProfileInfo.from_result` + preserve `manual_override`)
  + `_route_profile_preset`(`documents.py:905`,D6 skip-if-manual config)。
- deps:backfill **唔用** `_ingestion_deps_or_503`(嗰個強制 require embedder/populator/chunker 否則 503);
  只需 `_engine_or_503`(列 doc)+ `doc_profile_store`(W76 accessor `documents.py:125`)+ `doc_config_store`
  (`getattr` app.state)+ `settings.azure_blob_connection_string` + standalone `select_parser` / `_PROFILER`。

---

## §2 Scope / Deliverables

### F1 — backend profile-only backfill endpoint
- **F1.1** 新 endpoint `POST /kb/{kb_id}/profiles/backfill` + helper `run_kb_profile_backfill`:
  - `_verify_kb_or_404` + `_refuse_if_archived`(對齊 reindex write-path guard;backfill 寫 profile/config)。
  - `engine.list_documents(kb_id)` 列 doc_ids;`doc_profile_store` None → 503(無處 persist,backfill 無意義)。
- **F1.2** per-doc loop(復用 reindex structure,拔重活):
  - 已有 profile → `skipped_has_profile`(idempotent skip)。
  - `download_source_document` → None → `skipped_no_source`。
  - 寫 tempfile → `select_parser`(`extract_images=kb_config.extract_embedded_images`,對齊正常 ingest 嘅
    img_density 信號)→ `parse()` → `_PROFILER.profile(result, tmp_path)`。
  - persist:`DocProfileInfo.from_result` + **D6 守 preserve `manual_override`**(read 舊 row merge)→
    `doc_profile_store.upsert`;`_route_profile_preset`(D6 skip-if-manual)。
  - **唔做**:chunk / embed / Azure upsert / delete chunks / 動 counter。
  - 單 doc 失敗 → `failed.append`,**唔 abort batch**(對齊 reindex per-doc 容錯)。
  - tempfile `finally` 清理。
- **F1.3** 回應 shape:`{status:"profiled", kb_id, documents_total, profiled, skipped_has_profile,
  skipped_no_source, failed, profiles}`(`profiles` = `{doc_id: profile_label}`)。
- **F1.4** test `test_doc_profile_backfill.py`(H6 backend route)— profile 補上 + skip 已有 profile +
  skip 無 source + per-doc 容錯 + D6 preserve manual_override + route preset + 不動 retrieval(無 populator call)。
- **acceptance**:mypy --strict 新 code 0 + ruff 0 + pytest pass + 無 regression。

### F2 — 對現有 KB 觸發 backfill + browser 驗
- 起全套 infra(pre-flight)→ `POST /kb/drive-images-1/profiles/backfill` → 確認 `profiled` > 0(若全
  `skipped_no_source` → surface 畀用戶:現有 KB 冇 source blob,要先 doc-level reindex re-upload)。
- browser(playwright)驗 L2 Documents 表 profile 欄 + L3 文件畫像 card 真實顯示 profile(非 null)。
- **acceptance**:真實 KB 嘅 doc 喺 UI 見到 profile;零臨時污染。

### F3 — closeout
- type-check / lint / build(若改 frontend — 預期不改)+ pytest 全綠;plan closed + progress retro +
  ADR-0059 README index + memory append。

---

## §3 設計原則(ADR-0059)

1. **surgical** — backfill 只補 profile,**零** chunk/embed/upsert → 零 retrieval 影響 + 零破壞已調 config。
2. **reuse 最多基建** — `run_kb_reindex` loop / `download_source_document` / `_PROFILER` / persist + route。
3. **idempotent** — skip 已有 profile;重複 call 安全。
4. **D6 守** — preserve `manual_override`(re-profile system fact 但唔失人手覆寫)+ skip-if-manual config。

---

## §4 Non-goals(明確唔做)
- **完整 re-ingest**(方案 A)— reject per ADR-0059(重量 + 繞過 production-preserve 守 + retrieval 風險)。
- **UI 觸發 button** — 一次性 ops 用 API 觸發;加 mockup 冇嘅 button = H7 trigger,日後 explicit。
- **`?force=true` 全部重跑** — 預設 skip 已有 profile 足夠;override 用 W79 路徑。
- **per-KB / 全域 backfill / 改 profiler / chunk strategy**。

---

## §5 Risks
- **R1 現有 KB 冇 source blob**(W46 前 ingest)→ 全 `skipped_no_source`,backfill 對該 KB 無效。緩解:
  F2 browser 驗確認 `profiled` > 0;若全 skip → surface 畀用戶(要先 doc-level reindex re-upload)。
- **R2 re-parse 信號 vs 正常 ingest 不一致** — 緩解:`select_parser` 用同 `kb_config.extract_embedded_images`,
  令 profiler 睇到嘅 img_density 對齊正常 ingest。
- **R3 backfill 覆蓋 user 已 override** — 緩解:D6 守 preserve `manual_override` + skip-if-manual config
  (F1.4 test cover);已有 profile 預設 skip,override doc 唔會被重 profile。

---

## §6 紀律自檢(kickoff)
- **H1** ✅ architectural(新 endpoint)— ADR-0059 已 Accepted(用戶 confirm (b) scope)。
- **H2** ✅ 零新 dep(reuse psycopg / 現有 store / pypdfium2 已 Docling 自帶)。
- **H4** ✅ 層 A backfill,無 Tier 2 feature。
- **H6** ✅ backend route test(F1.4)。
- **H7** ✅ 預期不改 frontend(backend-only;UI button non-goal 避 H7)。
- **Karpathy** ✅ reuse 基建(run_kb_reindex / download_source / profiler / persist)、surgical(拔重活)、
  goal(每 F acceptance + F2 真實 KB 驗)、think-before(ground 落點 5-step + ADR-0059 alternatives surface +
  W46-before source 限制 upfront flag)。

---

## §7 Changelog
- 2026-06-15 kickoff — plan active,F1-F3 scope locked;ADR-0059 Accepted(用戶 confirm (b) 輕量 backfill);
  落點 ground(run_kb_reindex 輕量版 + W46 source blob 限制 flag)。
