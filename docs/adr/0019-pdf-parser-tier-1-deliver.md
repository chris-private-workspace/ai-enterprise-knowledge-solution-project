# ADR-0019: PDF parser Tier 1 deliver via Docling DocLayNet(reaffirm ADR-0003 multi-format ingestion)

**Date**: 2026-05-09
**Status**: Accepted
**Approver**: Chris(技術 Lead)
**Trigger**: `docs/02-architecture/audit-W15-d5-vs-spec.md` Major Drift #1 — `backend/ingestion/parsers/pdf_parser.py` 不存在 despite ADR-0003 + architecture.md §3.3 + C01-ingestion.md §1 diagram 三個 spec source 都列 PDF support

---

## Context

### Spec promise(authoritative,frozen)

**ADR-0003**(`docs/adr/0003-multi-format-ingestion.md`,Accepted):
> Multi-format ingestion supports `.docx (Docling)` + `.pdf (Docling)` + `.pptx (python-pptx)` from Day 1

**architecture.md §3.3 Multi-Format Document Parsing Strategy**(lines 246-267,frozen v6):
- 3 個 format 一齊 list:Word + **PDF** + PPT
- Docling 作為 unified parser for Word + PDF(同一 vendor,無需要 separate library)

**components/C01-ingestion.md §1 diagram**(architectural reference):
```
parsers/
  ├── docx_parser.py   (Docling)
  ├── pdf_parser.py    (Docling)        ← 列出
  └── pptx_parser.py   (python-pptx)
```

### Code reality(verified spot-check 2026-05-09 audit)

```
backend/ingestion/parsers/
├── __init__.py
├── base.py
├── docx_parser.py    ✅
├── pptx_parser.py    ✅
└── pdf_parser.py     ❌ 不存在
```

**Strategies router**(`backend/ingestion/chunker/strategies.py:51`):
```python
elif doc_format == "pdf":
    return layout_aware  # routes to chunker, but no parser feeds it
```

→ User upload PDF 場景:系統 routing 去 layout_aware chunker,但 chunker 等 parser 餵 ParserResult 入嚟,**parser 不存在 = silent fail or upstream parser dispatch error**。

### C01 Component status drift

`components/C01-ingestion.md` status 標 `v2-stable 2026-05-06`,但 feature surface 對唔上 — **PDF 缺工但 status 虛報**。

### Drive corpus reality(W11 D2 cont stakeholder context)

Per `docs/03-implementation/drive-corpus-scope-clarification-W11-d2.md` §4.1:Drive Project corpus actual content = **D365 F&O ERP user manuals**,而非 MFP product manuals(原 eval-set-v0 placeholder assumption)。

D365 ecosystem documents 包括:
- Official Microsoft user manuals(經常 PDF format)
- Regulatory / compliance regulatory docs(規格表常見 PDF)
- Internal Ricoh-customized D365 procedures(可能 Word / PPT,但會 reference external PDF appendices)

→ **Drive corpus 真實內容包含 PDF documents**;Tier 1 launch 唔可以 silent fail。

---

## Decision

**1. 重申 ADR-0003**(reaffirm Day 1 multi-format ingestion stance — **NOT supersede**)

**2. Deliver `backend/ingestion/parsers/pdf_parser.py`** via Docling DocLayNet model:

### Implementation contract

- **File**:`backend/ingestion/parsers/pdf_parser.py`(estimated ~150 lines)
- **Mirror `DoclingDocxParser` pattern**:
  - Implement `Parser` Protocol from `parsers/base.py:107`
  - Use `docling.document_converter.DocumentConverter` with PDF input
  - Walk `doc.iterate_items()` to extract:
    - Paragraphs(map to `ParagraphItem` dataclass)
    - Tables(map to `Table` dataclass)
    - Images(map to `EmbeddedImage` dataclass)
  - Return `ParserResult` with shared `doc_order` monotonic index
  - Apply same `level >= 6` heading anomaly demote-to-text rule(consistency with docx_parser)
- **Dependency**:**No new vendor / dependency**(Docling already in `pyproject.toml` per W2 D2 docx parser implementation;PDF support 屬 Docling 內建 — H2 clear,no ADR vendor lock impact)
- **Tier 1 scope narrowing**(per below alternative consideration):**Text-extractable PDF only**;scanned PDF(OCR 觸發)+ encrypted PDF(decrypt 觸發)defer Tier 2

### Implementation timing

- **Phase 3 of P0 batch**(W16+ active flip post Track A IT cred populate event)
- **Estimated 1 day**:parser implementation ~4 hours + unit tests ~3 hours + integration verify ~1 hour
- **Sample PDF acquisition**:W16 D1 active flip 之前 from Chris(Drive Project 候選 sample PDF for parser dev test)
- **Stack with P0.1 Multi-KB(ADR-0018)** = ~3 days cumulative Phase 3

### Tier 1 scope clarification(narrow PDF support)

呢個 ADR 確認 Tier 1 PDF deliver 範圍 = **text-extractable PDF only**:
- ✅ Tier 1 in scope:Microsoft Word → PDF export;LibreOffice → PDF export;Adobe PDF with searchable text layer
- 🚧 Tier 2 deferred:Scanned PDF(image-only,需要 OCR)+ Encrypted PDF(需要 decryption)

→ Sub-decision rationale:Tier 1 Drive corpus(D365 manuals)dominantly text-extractable;OCR / decrypt complexity 屬 Tier 2 advanced ingestion scope per architecture.md §11 Tier 2 Roadmap。

---

## Alternatives Considered

### Option B — Defer PDF to Tier 2(ADR-0003 amendment)

**Action**:
- Amend ADR-0003 to defer PDF Tier 2
- architecture.md §3.3 移除 PDF row
- C01-ingestion.md §1 diagram 移除 `pdf_parser.py`
- `strategies.py:51` PDF route raise `NotImplementedError`
- `parsers/__init__.py` PDF guard
- W16+ Beta cohort onboarding 通知 stakeholder PDF 唔支援(manual convert to Word/PPT)

**Pros**:
- Lowest immediate work(0.5 day spec amendments + small code guard)
- Defer scope = less risk for W16+ Beta launch
- Clean signal:Tier 1 = Word + PPT only

**Cons**:
- **Drive corpus impact High** — D365 ERP user manuals 真係有 PDF;user 上傳 PDF 遭拒 = bad Beta UX
- ADR-0003 reversal — historical record governance debt
- Stakeholder communication burden:解釋為何 Tier 1 多 format promise 變兩 format only
- Future Tier 2 仍要做 PDF parser(no net saving;只係 deferred)
- Karpathy §1.4 goal-driven test:multi-format ingestion 係 EKP differentiator vs single-format competitors(e.g. Tango.us);defer 削弱 platform value

**Rejected because**:Drive corpus reality 真係有 PDF;Docling 已支援(無新 vendor/dep);1 day 工時 manageable;status truthfulness 立即 restored。

### Option C — Narrow Tier 1 PDF scope(text-extractable only;scanned/encrypted defer Tier 2)

**Note**:Option C 已 **incorporated 入 Decision** above 作為 sub-clarification,而非 separate alternative。Tier 1 scope = text-extractable PDF only;OCR + decryption defer Tier 2 — 兩個 sub-decision 一齊 land 喺 ADR-0019。

---

## Consequences

### Positive

- **ADR-0003 honored**(no governance debt;reaffirm not supersede)
- **Drive corpus reality 對齊**:D365 PDF documents Tier 1 launch ingestible
- **No new vendor / dependency**(Docling 已存在;H2 clear)
- **C01 component status truthfulness restored**:`v2-stable` claim 立即 valid post-implementation
- **EKP multi-format differentiator preserved**(vs Tango.us single-format competitors)
- **Stakeholder narrative consistent**:multi-format ingestion Day 1 promise 兌現
- **Implementation reuse**:parser ~150 lines mostly mirrors `docx_parser.py` pattern — low complexity + risk

### Negative

- **W16 schedule +1 day**(parser + tests + verify)
- **Sample PDF acquisition dependency**:W16 D1 active flip 之前 from Chris(Drive Project 候選 sample;低 risk 因為 stakeholder context 已 confirm corpus 包含 PDF — sample 應 readily available)
- **Tier 1 scope narrowing**:scanned + encrypted PDF defer Tier 2 — 對 user 嘅 Tier 1 PDF support 有限制(需 communication)

### Neutral

- **Phase 3 implementation timing**:可 batch with P0.1 Multi-KB 1.5-2 days = ~3 days cumulative Phase 3
- **Edge case test coverage**:scanned PDF + encrypted PDF Tier 1 declare unsupported = 需要 explicit test(assertion `NotImplementedError` raised);non-blocker
- **`strategies.py:51` PDF route已存在**:無需要 spec amendment 為 routing — parser file 一加 register 就 wire up

---

## References

- **Reaffirmed(NOT superseded)**:[ADR-0003 Multi-format ingestion](./0003-multi-format-ingestion.md)
- **Spec source**:`docs/architecture.md` §3.3 Multi-Format Document Parsing Strategy(lines 246-267,frozen v6)
- **Audit trigger**:`docs/02-architecture/audit-W15-d5-vs-spec.md` §1.2 C01 Major drift #1(2026-05-09 W15 D5 closeout)
- **Drive corpus reality**:`docs/03-implementation/drive-corpus-scope-clarification-W11-d2.md` §4.1(D365 F&O ERP user manuals 包含 PDF)
- **Code citations**:
  - `backend/ingestion/parsers/` directory listing(missing pdf_parser.py)
  - `backend/ingestion/chunker/strategies.py:51`(pdf route to layout_aware chunker but no parser feed)
  - `backend/ingestion/parsers/docx_parser.py`(reference pattern for new pdf_parser.py)
  - `backend/ingestion/parsers/base.py:107-122`(Parser Protocol + ParserResult dataclass)
- **Behavioral baseline**:Karpathy §1.2 simplicity-first(narrow Tier 1 scope:text-extractable only)+ §1.4 goal-driven(multi-format = EKP differentiator core)
- **Tier 2 deferral references**:architecture.md §11 Tier 2 Roadmap(advanced ingestion scope including OCR / decryption)
- **Sister ADRs**:ADR-0018(Multi-KB kb_id propagation)+ ADR-0020(Context Expander — pending P0.3 batch)

---

## Implementation Deliverables(W16+ Phase 3)

### Code changes(parser delivery)

- [ ] `backend/ingestion/parsers/pdf_parser.py` — NEW file ~150 lines mirroring `docx_parser.py` pattern
  - `class DoclingPdfParser` implementing `Parser` Protocol
  - Use `docling.document_converter.DocumentConverter` with PDF input
  - Walk `doc.iterate_items()` 抽 paragraphs / tables / images
  - Map to `ParagraphItem` / `Table` / `EmbeddedImage` dataclasses with shared `doc_order` index
  - Apply `level >= 6` heading anomaly demote-to-text rule(consistency with docx)
  - Return `ParserResult`
- [ ] `backend/ingestion/parsers/__init__.py` — register `DoclingPdfParser` export
- [ ] `backend/ingestion/orchestrator.py` — verify `select_parser(doc_format)` already routes pdf correctly(should be already correct;just verify)
- [ ] Tier 1 scope narrowing:OCR + decryption raise `NotImplementedError` with actionable message;defer Tier 2

### Tests

- [ ] Unit tests `backend/tests/test_pdf_parser.py`(~10 cases):
  - Sample PDF parse to ParserResult assertion
  - Heading hierarchy preservation
  - Table extraction
  - Image extraction
  - Empty PDF graceful handling
  - Multi-page document
  - Special character handling
  - Edge case:scanned PDF → NotImplementedError
  - Edge case:encrypted PDF → NotImplementedError
  - doc_order monotonic invariant

### Sample data

- [ ] Sample PDF acquisition from Chris(Drive Project candidate 1-2 representative D365 manual PDF)
- [ ] Sample PDF placement:`backend/tests/fixtures/sample_d365_manual.pdf` 或類似
- [ ] (Optional)1-2 PDF queries 加入 `eval-set-v0.yaml` for end-to-end PDF ingestion + retrieval verify

### Documentation

- [ ] `components/C01-ingestion.md` update(P1 Phase 4C):reflect PDF parser landed;status `v2-stable` reaffirmed truthful;§1 diagram pdf_parser.py 留(已 list);加 W16 D? entry to changelog
- [ ] `architecture.md §3.3` no amendment needed(spec already lists PDF;reality catch-up only)
- [ ] (Optional)`README.md` 或 user-facing doc:Tier 1 PDF support scope clarified(text-extractable only)

### Eval / observability

- [ ] PDF ingestion + retrieval round-trip verify(如果 sample PDF acquired):
  - Upload sample PDF via `/kb/{id}/documents` POST(once W16 F5 stub closes)
  - Verify ChunkRecord 產生
  - Verify Hybrid retrieval 揀到 PDF chunks
  - Verify Cohere rerank score
  - Verify generation citation reference PDF source
- [ ] Langfuse trace tag `doc_format = "pdf"`(per-format cost / latency attribution)

---

**Implementation timing**:W16 active flip Phase 3 deliverable post Track A IT cred populate event trigger(rolling JIT per CLAUDE.md §10 R1)。**Estimated 1 day work**;may share Phase 3 session with ADR-0018 Multi-KB kb_id wiring(stack ~3 days total for P0.1+P0.2)。

**Re-audit trigger**:Post-implementation audit re-run on §1.2 C01 specifically — verify PDF parser delivered(`pdf_parser.py` exists)+ Tier 1 scope narrowing assertions(scanned/encrypted PDF NotImplementedError)。

**Tier 2 carry-over**:Scanned PDF(OCR)+ Encrypted PDF(decryption)— Tier 2 advanced ingestion scope per architecture.md §11 Tier 2 Roadmap;trigger criteria:Beta cohort feedback signals real-world scanned PDF / encrypted PDF coverage gap。
