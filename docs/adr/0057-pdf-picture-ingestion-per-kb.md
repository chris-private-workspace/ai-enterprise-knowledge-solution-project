# ADR-0057: PDF picture ingestion — per-KB `generate_picture_images` + 按需 re-index

**Date**: 2026-06-14
**Status**: Accepted — 用戶 2026-06-14 session 確認(AskUserQuestion 揀 per-KB thread `extract_embedded_images` + 按需 re-index + 接受 +19% parse 成本)
**Approver**: Chris(技術 Lead,H1 ingestion behavior + storage layout)+ Stakeholder(re-index 成本)— 用戶 2026-06-14 session 一併確認

---

## Context

### 緣起:ADR-0056 D8 坐實嘅 PDF 圖入庫缺口

ADR-0056 D8 坐實:`backend/ingestion/parsers/pdf_parser.py:54` 用預設 `DocumentConverter()`
(`generate_picture_images=False`)→ born-digital PDF 嘅 embedded picture **全部抽唔到入庫**。
`scripts/explore_pdf_picture_flag.py` 對照 `AI-Governance-Procedure.pdf`(15 頁含 10 圖):
flag off 10 張 PICTURE 抽 **0** / flag on 抽 **10/10**。

**後果**(比偵測信號缺口更廣):
- ADR-0056 層 A 嘅 PDF 圖類 profile(`P1_sop_imgdense` / `P3_slide_imgdense` 對 PDF)經 W73
  routing 套嘅 preset(高 cap / neighbour / inline marker)**空轉** —— render 不出根本冇入庫嘅圖。
- ADR-0055 inline image marker 對 PDF **失效**(marker 靠 embedded image position,圖冇入庫就冇 marker)。

ADR-0056 D8 明文把呢件標為「**PDF 圖類 profile 落地嘅前置阻擋**……(非本 ADR 即時 scope,
但 stakeholder 要知)」+「修復 = 開 `generate_picture_images=True`(代價:parse 時間 +~19% +
記憶體 + **要 re-index 所有現有 PDF KB**)」。本 ADR 兌現呢個前置 + 拍板成本範圍。

### Grounding(2026-06-14)

- `select_parser(source)`(`parsers/__init__.py:23`)只食 path,由 extension dispatch →
  `DoclingPdfParser()`,**無 `kb_config`** → 現時無法 per-KB 控制抽圖。
- **關鍵發現**:`KbConfig.extract_embedded_images`(預設 `False`,`schemas/kb.py:41`)已係
  **現有 per-KB image toggle**(W20 F4.2 / ADR-0028,控制 orchestrator `ScreenshotExtractor`
  step)。可 thread 落 parser 層,**統一**控制「parser 抽 PDF 圖」+「orchestrator extract /
  upload」,唔使新增旋鈕。
- 成本(`explore_pdf_picture_flag.py` 實測):born-digital text PDF parse **+19%**
  (49.5s → 58.8s);scan PDF 更高 + `std::bad_alloc` robustness(ADR-0056 D8 已標,Docling
  layout 預處理階段)。
- re-index 機制:W46 / ADR-0043 `POST /kb/{kb_id}/reindex`(source container → re-parse →
  re-ingest;需 source document 存在,W46 前 ingest 嘅 PDF 冇 source → `skipped_no_source`)。

---

## Decision

### D1. per-KB `generate_picture_images`(thread 現有 `extract_embedded_images`)

把 `KbConfig.extract_embedded_images` thread 落 parser 層:
- `DoclingPdfParser.__init__(generate_picture_images: bool = False)` — 預設 False(production-preserve)。
- `select_parser(source, *, extract_images: bool = False)` — `.pdf` 分支傳
  `DoclingPdfParser(generate_picture_images=extract_images)`。
- `_run_ingest_pipeline` 傳 `select_parser(tmp_path, extract_images=kb_config.extract_embedded_images)`。

**語意統一**:一個 per-KB toggle(`extract_embedded_images`)同時控制「parser 抽 PDF 圖」+
「orchestrator `ScreenshotExtractor` extract / upload」。圖類 KB(`extract_embedded_images=True`)
對 PDF 抽圖;text-only PDF KB(`False`)零成本。

### D2. 按需 re-index(唔強制)

- **新 PDF ingest 即有圖**(`extract_embedded_images=True` 的 KB)。
- **現有 PDF doc** 由用戶按需手動 re-index(W46 `POST /kb/{kb_id}/reindex`,需 source)先補圖。
- 本 ADR / 本段 **唔自動 / 唔強制** re-index 任何現有 KB — 零強制成本,只做 ingestion capability。

### D3. production-preserve

現有 `extract_embedded_images=False` 的 KB(預設)→ PDF parse `generate_picture_images=False`
**bit-identical** 不變。現有圖類 docx KB(如 `drive-images-1`,FNA manuals 係 docx 非 PDF)不受
影響。改動只觸 PDF parse 路徑 + 只當 `extract_embedded_images=True`。

### D4. scope 邊界

- **本 ADR 只做 born-digital PDF embedded picture 抽取**(`generate_picture_images`)。
- **scan PDF(P4)純 page-raster + OCR 唔在本 ADR scope**(ADR-0019 Tier 2 defer;ADR-0056 P4
  偵測已做,P4 gallery render 屬後續)。
- **方案 A section 級錨定**(段②d)= 另一件 net-new,不在本 ADR。

---

## Alternatives Considered

### A. 全局 `generate_picture_images=True`(所有 PDF 抽圖)
- **Reject**:所有 PDF KB 付 +19% parse 成本(連 text-only PDF KB)+ 現有 text PDF KB
  re-ingest 行為變;唔對齊 per-KB 成本控制。

### B. 本段強制 re-index 所有 PDF KB
- **Reject**:re-index 成本即時付 + 要識別 / 遍歷所有有 PDF doc 的 KB + W46 前 ingest 嘅 PDF
  冇 source 會 `skipped_no_source`;成本同範圍遠大過按需。

### C. 唔做(維持 PDF 圖入唔到庫)
- **Reject**:PDF 圖類 profile preset(W73)+ inline marker(ADR-0055)對 PDF 永遠空轉,違背
  ADR-0056 多文件類型支援核心。

### D.(採用)per-KB thread `extract_embedded_images` + 按需 re-index
- **Accept**:精準成本(只圖類 KB 付)+ 對齊現有 image-toggle 語意(零新旋鈕)+ production-preserve
  + 按需 re-index 零強制成本。

---

## Consequences

**Positive**:
- born-digital PDF 圖入庫 → PDF 圖類 profile preset(W73)+ inline marker(ADR-0055)對 PDF 生效。
- per-KB 精準成本:只 `extract_embedded_images=True` 的 KB 付抽圖成本。
- 對齊現有 `extract_embedded_images` 語意,唔新增旋鈕種類。

**Negative**:
- `extract_embedded_images=True` 的 PDF KB parse **+19%**(scan 更高 + `std::bad_alloc`
  robustness 待 ingestion 處理 — ADR-0056 D8 標,Docling layout 階段,非本 ADR 即解)。
- 現有 PDF doc 要**手動** re-index 先補圖(按需,唔自動);W46 前 ingest 嘅 PDF 冇 source
  會 `skipped_no_source`(要重新上載)。

**Neutral**:
- text-only PDF KB(`extract_embedded_images=False`)零影響,bit-identical。
- `select_parser` signature 加 keyword-only `extract_images`(default False)→ 現有 caller
  (test / populate)唔傳 = 不變。

---

## References

- ADR-0056 D8(PDF picture ingestion 缺口坐實 + 前置依賴標明)
- `scripts/explore_pdf_picture_flag.py`(flag off→on:0→10/10 + +19% 成本實測)
- `backend/ingestion/parsers/pdf_parser.py:54`(`DocumentConverter()` 預設)/
  `parsers/__init__.py:23`(`select_parser`)/ `api/schemas/kb.py:41`(`extract_embedded_images`)
- W46 / ADR-0043(原始檔 blob 儲存 + KB-level reindex 機制)
- ADR-0055(inline image marker — 對 PDF 靠 embedded image position)/ W73(PDF 圖類 preset)
- 約束:CLAUDE.md §5.1 H1(ingestion behavior + storage layout change)
