# ADR-0059: Profile-only backfill — 對現有 doc 補跑 profiler(不重 chunk / embed / upsert)

**Date**: 2026-06-15
**Status**: Accepted — 用戶 2026-06-15 session confirm 候選 4 = (b) 輕量 profile-only backfill(非 (a) 完整 re-ingest);照 ① → ② → ③ 走
**Approver**: Chris(技術 Lead,H1 架構)+ Stakeholder(scope)

## Context

ADR-0056 層 A 段③ 把 profiling 由「engine + routing」推進到「真正畀用戶用嘅 read / write UI」:

- profiler engine(W72,`profiler.py`)→ routing 接入 `orchestrator.ingest()`(W73)→ read surface persist
  (`DocProfileStore`,W76)→ frontend 三層 UI(W78)→ profile 人手覆寫 write(W79,ADR-0058)。

**但 profiler 係 W73 先接入 ingest**,所以 **W73 之前 ingest 嘅現有 doc 冇 profile**:`DocProfileStore`
冇對應 row → L2 Documents 表 / L3 文件畫像 card 嘅 profile 欄全 null,Settings「文件分類規則」tab 只係 static
reference。等於 W78 整套 UI 喺真實 KB 上係空殼 —— 只能靠臨時 ingest 嘅 doc 驗。

需求:**令現有 doc 有 profile,而唔破壞已穩定嘅 retrieval**。drive-images-1 經 W59-W68 image-recall 弧調好
per-KB config(cap=80 / rerank=10 / max_aux=40);任何「重新 chunk / embed / upsert」嘅做法都有破壞已調
config + 改變 retrieval quality 嘅風險。

**既有基建(reuse,非重寫)**:

- `download_source_document`(`source_store.py`,W46 / ADR-0043)— ingest 時 best-effort persist 原始檔到
  blob,正為「日後 reindex 可 re-parse」。
- `run_kb_reindex`(`documents.py:948`,W46)— KB-level reindex loop:list doc → download source → re-parse
  → re-ingest。backfill = 呢個 loop 嘅輕量版。
- `_PROFILER.profile(parser_result, source_path)`(W72)— deterministic 純規則,輸入 `ParserResult` + 原始檔
  路徑(PDF text-layer probe 用)。
- profile persist + D6 守:`DocProfileInfo.from_result` + preserve `manual_override`(`documents.py:878-892`,
  W76 + ADR-0058)/ `_route_profile_preset`(`documents.py:905`,W73,D6 skip-if-manual)。

## Decision

新 endpoint **`POST /kb/{kb_id}/profiles/backfill`** — 對 KB 內每個已 index doc,**只補 profile**:

1. `engine.list_documents(kb_id)` 列 doc_ids(對齊 reindex 來源)。
2. 每 doc:**已有 profile → skip**(`skipped_has_profile`,idempotent)。
3. `download_source_document` 取原始檔 → None(W46 前 ingest)→ `skipped_no_source`(同 reindex 契約)。
4. 寫 tempfile → `select_parser` + `parse()` → `ParserResult` → `_PROFILER.profile(result, tmp_path)`。
5. persist:`DocProfileInfo.from_result` + **D6 守 preserve `manual_override`**(read 舊 row merge)→
   `doc_profile_store.upsert`;route preset `_route_profile_preset`(D6 skip-if-manual config)。
6. **拔掉** chunk / embed / Azure Search upsert / delete chunks / 動 KB counter → **零 retrieval 影響**。

回應 shape 對齊 reindex:`{status, kb_id, documents_total, profiled, skipped_has_profile, skipped_no_source,
failed, profiles}`。同步(Tier 1,< 1000 chunks,無 task queue)。

**唔做**(scope 收窄,YAGNI + 避免 H7):

- **UI 觸發 button** — 一次性 ops,用 API 觸發即可;加 mockup 冇嘅 button = H7 trigger(design-stage
  expansion)。日後 admin 自助需求 explicit trigger 走 H7 / ADR。
- **`?force=true` 全部重跑** — 預設 skip 已有 profile 已足;override 後 re-profile 用 W79 既有路徑。
- **per-KB / 全域 backfill** — per-KB only。
- **改 profiler / chunk strategy** — backfill 只補 profile,system detect 邏輯不變。

## Alternatives Considered

### A. 完整 re-ingest(對每 doc 重跑整條 ingest pipeline)
- **Reject**:重量(chunk + embed + Azure upsert);**繞過 ADR-0056 段②b 嘅 production-preserve D6 守**
  (嗰個守正係「唔 re-ingest 已 index doc」);風險破壞 drive-images-1 已調好嘅 per-KB config + 改變
  retrieval quality。為咗補一個 advisory annotation 去重跑重活 + 冒 retrieval 風險,不值。

### C. read-time lazy compute(list_documents / doc_detail 讀時即跑 profiler)
- **Reject**:read path 唔應做重 parse(每次 list 重算 N 個 doc);無 persist → override(W79)無處掛;
  違反 W76「profile 係 persisted system fact」分層。

### B.(採用)profile-only backfill endpoint
- **Accept**:surgical(只補 profile,零 retrieval 影響);reuse 最多基建(download_source / profiler /
  persist / route);idempotent + D6 守保 override;一次過令 W78 UI 喺真實 KB 生效。

## Consequences

**Positive**:
- 現有 doc 補 profile → W78 三層 UI + W79 override 喺真實 KB 真正生效(唔再淨係臨時 doc 驗)。
- 零 chunk / embed / upsert / counter 改動 → **零 retrieval 影響 + 零破壞已調 per-KB config**。
- reuse `run_kb_reindex` structure + download_source + profiler + persist + route — 新 code 最少。

**Negative**:
- **W46(2026-06-04)之前 ingest 嘅 doc 冇 source blob** → `skipped_no_source`(要 doc-level reindex
  re-upload 先有 source 可 backfill;同現有 reindex limitation)。
- backfill 要 re-parse(Docling parse 成本),但**無** embed / upsert 重活 — 仍遠輕於完整 re-ingest。

**Neutral**:
- UI 觸發 button 唔做(一次性 ops + 避 H7);用 API 觸發。
- idempotent skip 已有 profile — 重複 call 安全;override(`manual_override`)經 D6 守 preserve。

## References
- 前置 ADR:ADR-0056(層 A profiling — D6 守)/ ADR-0043(W46 source blob + KB reindex)/ ADR-0050
  (per-doc config)/ ADR-0058(override + `manual_override` annotation 守)
- 基建:`backend/ingestion/profiler.py`(W72)/ `backend/ingestion/source_store.py` `download_source_document`
  (W46)/ `backend/kb_management/doc_profile_store.py`(W76)/ `documents.py` `run_kb_reindex` +
  `_route_profile_preset` + profile persist block(W73 + W76 + ADR-0058)
- 約束:CLAUDE.md §5.1 H1(architectural — 新 endpoint)/ §5.6 H6(backend route test)/ §5.4 H4(層 A,無
  Tier 2)
- 用戶 vision:memory `project_per_kb_tunable_config_vision`(現有 doc 有 profile = profiling pipeline 接到生產數據)
