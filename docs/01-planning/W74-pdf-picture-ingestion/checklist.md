# W74 — PDF picture ingestion checklist

> Atomic items per `plan.md` §2。`[ ]`→`[x]`,唔可刪未勾項。

## F1 — parser + select_parser + wire

- [ ] `DoclingPdfParser.__init__(generate_picture_images: bool = False)` — True 用自訂 `PdfPipelineOptions` converter / False 維持預設(bit-identical)
- [ ] `select_parser(source, *, extract_images: bool = False)` — `.pdf` 傳 generate_picture_images
- [ ] `_run_ingest_pipeline`:kb_config 讀移前至 select_parser 之前 + `extract_images=kb_config.extract_embedded_images`
- [ ] mypy 0 + ruff 0
- [ ] 現有 parser_factory / documents / reindex test 全綠

## F2 — test(H6)

- [ ] `select_parser(extract_images=True)` → `.pdf` parser generate_picture_images=True
- [ ] `select_parser()` default / extract_images=False → generate_picture_images=False(production-preserve)
- [ ] `.docx`/`.pptx` 路徑 bit-identical(extract_images 無影響)
- [ ] 真 born-digital PDF ingest 抽圖(skipif sample,可選 integration)
- [ ] pytest 綠

## F3 — 收爐

- [ ] memory 更新(PDF picture 落地)
- [ ] closeout retro
- [ ] 段②d(方案 A)/ ③(UI)交棒記錄
- [ ] plan.md status → closed
