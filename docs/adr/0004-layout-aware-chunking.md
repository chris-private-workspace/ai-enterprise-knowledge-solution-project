# ADR-0004: Layout-aware chunking — not character-based

**Date**: 2026-04-27
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Promoted from**: `architecture.md` §13.3(v5 frozen 2026-04-27)

## Context

Dify 預設 chunker 用 character-based split + `\n\n` delimiter。Image 5 reference 觀察示範:

- chunk-01 = 純 logo image
- chunk-02 = 純 Revision History table

兩個 chunk 都係 100% retrieval-noise(永遠唔應該 retrieved as relevant)。Character-based 唔識 semantic boundary,將 retrieval quality 推低。

## Decision

EKP 採用 **layout-aware chunking**:用文件天然結構(heading hierarchy、table boundary、list item、page break)作為 chunk boundary。每個 chunk 係 self-contained semantic unit。

實作:`backend/ingestion/chunker/layout_aware.py`。Per `architecture.md §3.5`:
- 每個 table = 1 chunk(non per-row split)
- Heading transition = chunk boundary
- Section path 從 heading hierarchy 推導
- Sub-token-target 用 `low_value_flag: true` 標 + retrieval filter excludes

## Alternatives Considered

- **Dify 預設 character-based**(`\n\n` 1024 char default)— Reject:已 documented 100% noise chunk(Image 5)
- **Sentence-based splitting**(e.g. spaCy)— Reject:loses table integrity;sentences 跨 table cells 無意義
- **Semantic chunking**(embedding similarity boundaries)— Reject:over-engineered for Tier 1;requires embed pass first → 2× cost
- **Fixed-size with overlap**(e.g. LangChain RecursiveCharacterTextSplitter)— Reject:同 character-based 同類問題;overlap 增 storage 唔解 noise

## Consequences

- **Positive**:
  - Retrieval noise 顯著下降(W2 D5 verified:329 chunks 對應 6 docs structured topics)
  - Each chunk grounded with `section_path`,citation-ready(see W3 D3 citation enrichment)
  - Tables intact for downstream LLM consumption(reduces R4 hallucination per `§8.2`)
- **Negative**:
  - Per-format parser 必須 surface structural metadata(heading level / table boundary)— Docling / python-pptx 都支援,但 future PDF parser 可能要 extra work
  - Chunk count 比 character-based 變動更大(W2 plan estimate 2000-3000 vs actual 329)→ planning 要 spec-aligned 而非 character-count proxy
- **Neutral**:
  - `low_value_flag` 67.2% rate(W2 D5)係 normal;default retrieval filter 排除佢哋

## References

- `architecture.md` §13.3 為何 Layout-aware Chunking(source)
- `architecture.md` §3.3 + §3.5 layout-aware chunker spec
- `components/C01-ingestion.md` chunker implementation
- W2 D2 chunker sanity report(observed chunk distribution)
- ADR-0003 Multi-format ingestion(provides structured input to chunker)
