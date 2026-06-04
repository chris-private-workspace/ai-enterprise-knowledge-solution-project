# W45 — Per-KB Ingest-Time Chunker Image Cap · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應一個 Day-N entry(R2)。

---

## Day 1 — 2026-06-04

### Context / kickoff
W44 closed(Gate PARTIAL→PASS,全域 chunker cap 8 落地)+ pushed(`708c091`)。用戶揀 W45 candidate = **per-KB 圖數 cap → KbConfig**(roadmap W44 carry-over)。

### 決策
- **H1 觸發 + 批准**:per-KB 圖數 cap 改 `architecture.md §3.3` chunker 參數化模型 + 加 `KbConfig` 欄 + ingest-time config-scope(ADR-0040 只 cover query-time)→ H1。Chris AskUserQuestion 批准「H1 + ADR-0042」。
- **None 語意**:Chris 揀「None=繼承,正整數=cap」(最簡;per-KB 不能設無 cap,只全域 level 設得到)。解決 W43 `None`=inherit 同 chunker `None`=無cap 嘅撞車。
- **R6 grep 驗證(plan kickoff)**:確認 `kb_config` 已 thread 到 ingest(`documents.py:556-582`,W20 F4.2),wiring 缺口只剩 chunker 全域 singleton 化 per-KB。避免 plan 估錯實際 surface。

### Done
- F0.1 ADR-0042 寫成 Accepted(`docs/adr/0042-per-kb-ingest-time-chunker-image-cap.md`)— 延伸 ADR-0040 到 ingest-time + ADR-0041 全域 cap 到 per-KB;factory wiring + inherit 路徑 reuse singleton;5 alternatives documented
- F0.2 ADR README index 加 0042 row + next available 0042 → 0043
- R1 phase 三件套建立(plan/checklist/progress)

### F1-F3 implementation(同日)
- **F1**:`KbConfig` 加 `chunker_max_images_per_chunk: int | None = None`(`backend/api/schemas/kb.py`)+ docstring 解 None=inherit / +int=cap / per-KB 不能設無 cap。經既有 `PATCH /kb/{kb_id}/settings`(`kb.py:219` full-replacement)自動可設,無新 endpoint。
- **F2 wiring**:
  - `server.py` 加 `_make_ingestion_chunker(cap)` factory → `app.state.make_ingestion_chunker`;全域 singleton `app.state.ingestion_chunker` 保留(inherit 路徑 + 既有 caller)
  - `documents.py` 加純 helper `_select_chunker(deps, kb_config)`:`cap_override=None`(或無 kb_config / 無 factory)→ singleton(零 construct);設值 → factory 砌 per-ingest chunker。`_IngestionDeps` 加 `make_chunker` 欄;`_run_ingest_pipeline` orchestrator construct 改用 `_select_chunker(deps, kb_config)`
  - route 同 concrete `LayoutAwareChunker` 解耦(只 call factory)
- **F3 tests**:`test_per_kb_image_cap.py` +5 test(None→singleton 且 factory 唔 call / 無 kb_config→singleton / per-KB cap→factory(N) 且 chunker.max_images_per_chunk==N / factory 缺→fallback singleton / KbConfig back-compat 缺 key→None)

### 驗證(三軸)
- pytest:新 5 passed;既有受影響 129 passed(test_chunker 48 / test_orchestrator / test_documents_route / test_kb_metadata_patch / test_effective_config / test_kb_management / test_documents_detail / test_kb_reindex)= **0 regression**
- ruff check + format:我改動 file 全 clean(test import 排序 + documents.py format 已修)
- mypy --strict(全 import 解析):我改動行(kb.py 欄 / server.py factory / documents.py 116-148 + call site / test)**零 new error**;132 pre-existing 散落 42 file(eval/ / crag.py / query.py / routes/kb.py:253 等)與我無關,唔掂(Karpathy §1.3)

### F4 doc-sync(同日)
- **F4.1** `architecture.md §3.3`「Embedded images」bullet 加 W45/ADR-0042 amendment blockquote(per-KB cap resolution + factory + re-index note;接 ADR-0041 blockquote 之後,doc-version held)
- **F4.2** `architecture.md §4.5` KbConfig schema example 加 per-KB tunable 欄註(W20 ADR-0028 / W43 ADR-0040 / W45 ADR-0042,code = source of truth)
- **F4.3** `ROADMAP-per-kb-tunable-config.md` §3 加 ✅ W45 per-KB cap row(收 W44 carry-over「per-KB 圖數 cap 降 KbConfig」)+ 原 UI「W45」row relabel「後續候選(原 W45)」(避免 false W45=UI reindex done 映射)+ 逐期重點 section 同步加 ✅ shipped bullet
- session-start.md §10 加 W45 closed row + W46+ rolling JIT(per-KB cap 從候選移走,其餘 carry)

### F5 closeout — Phase Gate
| # | Criterion | Target | 結果 | Verdict |
|---|---|---|---|---|
| G1 | KbConfig cap 欄 + back-compat | None→inherit bit-identical | `test_kbconfig_backcompat_missing_key_is_none` pass | ✅ PASS |
| G2 | per-KB cap=N → chunker force-split @ N | cap honoured | `test_per_kb_cap_builds_chunker_with_that_cap`(chunker.max_images_per_chunk==N)+ W44 已測 force-split 機制 | ✅ PASS |
| G3 | inherit(None)→ 全域 default 8 | singleton reuse | `test_none_cap_inherits_global_singleton`(factory 唔 call)| ✅ PASS |
| G4 | pytest + ruff + mypy clean + 0 regression | all green | 5 new + 129 affected pass / ruff clean / mypy 改動行零 new error | ✅ PASS |
| G5 | ADR-0042 Accepted + doc-sync | §3.3/§4.5 amended | ADR-0042 Accepted + README index + §3.3/§4.5 inline + roadmap synced | ✅ PASS |

**Phase Gate verdict:G1-G5 全 PASS** —— 乾淨 PASS(無 W44 嘅 PARTIAL caveat;本期係純 config-scope additive,reuse W20 已 thread 路徑 + W44 已測 chunker 機制,風險最低)。

### Retro
- **順利**:R6 grep 驗證(plan kickoff)即時揭 `kb_config` 已 thread 到 ingest(W20 F4.2)+ None 語意撞車,令 scope 收窄到「只欠 chunker 全域 singleton 化」+ 一個 design fork 上 surface 畀 Chris,避免估錯。`_select_chunker` 抽純 helper → isolation 測乾淨,唔使測整條 pipeline。
- **決策**:H1 + None 語意兩個 fork 一次 AskUserQuestion 解決,kickoff → ship 同日。
- **carry-over(roadmap W46+)**:UI 暴露 ingestion 配置 + 真 KB-level reindex(本期已開後端 foundation)/ v1→v2 原子切換(Track A)/ per-document scope / eval-set v1 rename / LLM-profiler(Tier 2)。
- **R4 未做(nice-to-have)**:live doc-level reindex 設 per-KB cap 實測 —— 需 Azure index + backend running。pytest 已覆蓋 resolution 邏輯 + W44 已測 chunker force-split,故 🚧 deferred(非 blocker)。

### Commits
- `af4b94d` F0 — ADR-0042 + phase kickoff(plan/checklist/progress)
- `f2c1f26` F1-F3 — KbConfig 欄 + ingest wiring + 5 test
- _(pending — F4 doc-sync + F5 closeout)_

### Blockers / carry-over
- 無 blocker。R4 live reindex verify 🚧 deferred(nice-to-have,需 Azure + backend;pytest 已覆蓋邏輯)。
