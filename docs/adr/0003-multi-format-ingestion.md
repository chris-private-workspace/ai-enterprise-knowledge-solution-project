# ADR-0003: Multi-format ingestion (Word + PDF + PPT) — not single format

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.2(v5 frozen 2026-04-27)

## Context

V3 規格曾假設 source = Tango.us screenshots only(single format)。實際 Ricoh enterprise 文件 portfolio 必然係 mixed format(Word user manuals + PDF specs + PPT slide decks)。RAG 原則係**文件為本** — 假設 single format 等於假設 corpus,不切實際。

## Decision

EKP 從 Day 1 支援 **multi-format ingestion**:`.docx`(Docling)+ `.pdf`(Docling)+ `.pptx`(python-pptx)。每個 format 對應專屬 parser,emit unified `ChunkRecord` schema。

## Alternatives Considered

- **Tango.us screenshots only**(v3 假設)— Reject:Drive Project actual sample = 6 docx files,zero Tango。Source mismatch
- **PDF-only**(常見企業假設)— Reject:Word 係 author 工具,PDF 係 export 結果;source-of-truth 應該 ingest Word
- **Plain text export then ingest** — Reject:loses table structure / image references / heading hierarchy → kills layout-aware chunking(see ADR-0004)

## Consequences

- **Positive**:
  - Real-world corpus 可以 ingest 唔需要預處理 conversion
  - Future format(Excel / Markdown / HTML)可以加 parser 而 不改 ChunkRecord
  - W3 PPT parser 加入 = same orchestrator pattern,low integration cost
- **Negative**:
  - 3 個 parser 維護 burden(W2 docx + W3 pptx + future pdf)
  - Per-format edge case(Docling DrawingML / pptx EMF embedding / PDF table extraction quality)需要 individual handling
- **Neutral**:
  - All formats 統一 emit `ChunkRecord` per `architecture.md §3.5`,downstream pipeline format-agnostic

## References

- `architecture.md` §13.2 為何 Multi-format(source)
- `architecture.md` §3.3 Document Parser strategy(per-format parser registry)
- `architecture.md` §3.5 ChunkRecord unified schema
- `components/C01-ingestion.md`(parser implementation)
- ADR-0004 Layout-aware chunking(consumes parsers' structured output)
