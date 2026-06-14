# W74 — PDF picture ingestion progress

## Day 1 — 2026-06-14 — Phase kickoff(ADR-0057 Accepted)

### 做咗咩
- 用戶開段②c → **STOP(H1)**:D8 PDF picture = ingestion behavior + storage layout change + ADR-0056 D8 明文「stakeholder 要知 + 獨立 ADR」+ re-index 成本。
- AskUserQuestion 兩決策:① generate_picture_images 開法 → **per-KB(thread `extract_embedded_images`)** ② re-index 策略 → **按需(用戶手動)**。
- 寫 **ADR-0057**(Accepted,`docs/adr/0057-pdf-picture-ingestion-per-kb.md`)+ README index entry + bottom-note next NNNN 修正(stale 0047 → 0058)。
- 建 phase folder `W74-pdf-picture-ingestion/` + plan(active,locked)+ checklist。

### 關鍵 grounding(ADR 階段做齊)
- `select_parser(path)` 只食 path(無 kb_config)→ 要加 keyword-only `extract_images`。
- `KbConfig.extract_embedded_images`(預設 False)= 現有 per-KB image toggle,可 thread 統一控制 PDF 抽圖 + extraction。
- `_run_ingest_pipeline`:kb_config 讀喺 `select_parser` 之後 → 要**移前**。
- 自訂 converter:`PdfPipelineOptions(generate_picture_images=True)` + `DocumentConverter(format_options=...)`(Docling 自帶零新 dep)。
- 成本 +19%(只 extract_embedded_images=True PDF);scan bad_alloc robustness = ADR-0056 D8 上游另議。

### 決策
- per-KB thread `extract_embedded_images`(對齊現有語意,零新旋鈕,production-preserve)。
- 按需 re-index(reindex reuse `_run_ingest_pipeline` 自動繼承 thread)。

### Commits
- (本 entry 對應 kickoff commit:ADR-0057 + README + W74 plan/checklist/progress)

### Next(F1)
- `DoclingPdfParser.__init__(generate_picture_images)` + `select_parser(extract_images)` + `_run_ingest_pipeline` wire。

### Blockers / carry-overs
- 無 blocker。段②d(方案 A)/ ③(UI)= 後續,本段唔掂。
