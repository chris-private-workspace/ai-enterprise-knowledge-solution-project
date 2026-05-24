---
bug_id: BUG-017
title: "Chunker `_merge_adjacent_shorts` (W25 F1 ADR-0033 NEW) merges across section boundaries → 4/8 picture-owning chunks attributed to wrong section (off-by-one to previous section's last chunk)"
severity: Sev2
status: done
reported: 2026-05-24
reporter: "Chris(chat 2026-05-24 W25 D2 — user-eye verify on Document Detail showed chunk 8 'section 3.7 Idempotency' marked owning Figure 1 which actually belongs to section '4. High-level architecture'; parser diagnostic via `backend/scripts/diagnose_image_doc_order.py` confirmed Docling parser attributes pic doc_order=103 to section 4 correctly, but chunker's `_merge_adjacent_shorts` consolidation pulls small section-4-intro chunk backward into section-3.7 last chunk + carries image with it)"
affects_components: [C01]    # Ingestion Pipeline — layout-aware chunker
spec_refs:
  - architecture.md §3.3     # Layout-aware chunker
  - architecture.md §3.5     # ChunkRecord schema (embedded_images attribution)
  - docs/adr/0033-chunker-low-value-tuning.md    # W25 F1 ADR — introduced the regression
related: [BUG-009, BUG-010, BUG-011, BUG-012, BUG-013, BUG-014, BUG-015, BUG-016]
---

# BUG-017 — Chunker merge-adjacent-shorts crosses section boundary, mis-attributes images

> **Report version**:1.0(initial)
> **Triage approver**:AI self-triaged Sev2(higher than BUG-015/016 Sev3 because it directly defeats W25 phase「image-association deep-fix」core target — even with retrieval+citation infra perfectly wired, chat synthesis would surface wrong-section images);Chris chat-acknowledged via 2026-05-24 W25 D2 evidence-based diagnostic confirm。

## 1. Symptom

User-eye verify on `/kb/sample-document-with-image-1/docs/dce-integration-platform-implementation-plan` Chunks panel(BUG-016 marker just landed)showed:

```
#8 "3. Architectural principles > 3.7 Idempotency and retry safety" [embedded_images 1]
```

But the source DOCX has Figure 1 inside section「4. High-level architecture」(Spryker + APIM + Azure diagram caption「Figure 1: High-level integration architecture」)。User reported via chat:「**這明顯是不正確的, 因為文件中, 第1張圖片是在 4. High-level architecture 這部分的**」。

Parser-level diagnostic via `backend/scripts/diagnose_image_doc_order.py` against the source DOCX confirmed Docling attribution is **correct**(pic doc_order=103 → section "4. High-level architecture"),so the bug is in chunker downstream。

## 2. Reproduction Steps

1. Ingest any DOCX with `extract_embedded_images=True` whose sections have varying lengths(some sections small enough to fall below `_MIN_CHUNK_MERGE_FLOOR=160` per ADR-0033)
2. `GET /kb/{kb_id}/docs/{doc_id}` enriched + chunks listing
3. Cross-reference each chunk's `embedded_image_count > 0` against the actual source DOCX section the image visually belongs to
4. **Expected**:image-owning chunk's `section_path` matches the source DOCX section the picture appears in
5. **Actual**:if the image's section was small(eg pure intro paragraph + caption around the figure)and adjacent to a longer previous section,the image-bearing chunk's section identity gets overwritten by the previous section via `_merge_adjacent_shorts` backward-merge

**Sample doc reproduction matrix** for `sample-document-with-image-1`(8 pictures):

| Pic doc_order | Parser-correct section | Chunker actual (post-merge) | OK / Wrong |
|---|---|---|---|
| 103 | 4. High-level architecture | chunk 8 「3.7 Idempotency」 | ❌ off-by-1 |
| 202 | 6. Multi-tenant strategy | chunk 20 「5.8.2 Network model」 | ❌ off-by-1 |
| 323 | 8.1 Scenario A | chunk 32 「8.1 Scenario A」 | ✅ correct |
| 348 | 8.2 Scenario B | chunk 33 「8.1 > Failure handling」 | ❌ off-by-1 |
| 371 | 8.3 Scenario C | chunk 35 「8.3 Scenario C」 | ✅ correct |
| 394 | 8.4 Scenario D | chunk 36 「8.3 > Why this is hard」 | ❌ off-by-1 |
| 417 | 8.5 Scenario E | chunk 38 「8.5 Scenario E」 | ✅ correct |
| 513 | 11. Execution plan and phases | chunk 48 「11. Execution plan」 | ✅ correct |

**4/8 wrong** — all wrong cases follow same pattern:current section's intro/diagram chunk was small enough to trigger merge,backward-merged into prev section's last chunk,carrying image position with it。

**Reproduction reliability**:deterministic for any DOCX where the image's containing section is small relative to the W25 F1 `_MIN_CHUNK_MERGE_FLOOR=160`。

## 3. Expected vs Actual

| 範疇 | Expected | Actual |
|---|---|---|
| Chunker merge policy | Within-section consolidation only — adjacent short chunks of same `section_path` may merge | Cross-section merge — adjacent shorts of any `section_path` may merge,inheriting prev's section identity |
| Image-section attribution | Image attached to chunk whose `section_path` matches parser's correct attribution | Image follows the merged-target's section_path,which may differ from parser attribution if merge crossed a section boundary |
| Chat citation downstream | Chat answer 引用 chunk → citation 帶 chunk 嘅 image → image 同 chunk 的 section 一致 | Chat answer 引用 chunk(eg 5.8.2 Network model)→ citation 帶 chunk's image → image 其實屬於 section 6,user 見到「Network model citation 配 Multi-tenant strategy 嘅圖」 mismatch |

## 4. Impact

**Critical for W25 phase deliverable**:`W25-image-association-deep-fix` 嘅整個 phase target 就係解決圖文關聯;呢個 bug 喺 W25 F1 自己 introduce,直接 defeat phase 目的:
- 即使 W25 F3 D4 query expansion + F5 D2 retrieval relax + F5 D1 citation post-process 全部完美 implement,citation image 仍然會係錯 section 嘅圖
- 6-bug image-pipeline cascade closure(BUG-009-016)所有 frontend rendering + URL plumbing + UI marker 都得 — 但 underlying data 錯,所以「chat 圖文引用準確性」呢個 user-facing quality 永遠唔會 ship

**Affected users / scenarios**:every chat query that cites an image-bearing chunk in any ingested doc(Drive corpus 全部 docx 都含圖)
**Workaround available?**:Re-ingest with `min_chunk_merge_floor=0` disables merge entirely → restores parser-correct attribution but loses W25 F1 chunk-count consolidation benefit(121→63 -48% reverts to ~121)
**Data loss / corruption?**:None — parser data correct,Azure Search has correct `embedded_images_json` for the wrong-section chunks(data 仍 retrievable,只係 association wrong)
**Security implication?**:None
**Cost implication?**:None directly;but re-ingest needed for any KB ingested post-W25-F1-deploy to get correct chunks

## 5. Severity Justification

**Sev2** per `PROCESS.md §4.5`:**directly defeats W25 phase deliverable's user-facing quality goal**(image-association accuracy)— not just a UI affordance(Sev3)but a data-integrity regression that undermines the entire image-citation chain。Higher than BUG-015/016 because those are surface-only;this corrupts ingestion-time chunk record's section ↔ image mapping。

Postmortem required per `PROCESS.md §4.5` Sev2 rule — root cause analysis on how W25 F1 ADR-0033 was reviewed + tested without catching this regression(test_chunker.py 9 NEW tests didn't include cross-section image-attribution verification)。

## 6. Initial Diagnosis(root cause confirmed via diagnostic script)

**Diagnostic chain**:

1. **Parser correctness**(confirmed)— `backend/scripts/diagnose_image_doc_order.py` against source DOCX dumped event stream sorted by `doc_order`;pic event at doc_order=103 lands inside the open accumulator for `[HDR L1]` event at doc_order=101("4. High-level architecture"),before `[HDR L2]` at doc_order=105("4.1 Component overview")flushes acc。Picture attribution summary printed `103 → 4. High-level architecture` correctly。

2. **Chunker pre-merge correctness**(inferred)— if chunker's main loop emitted chunks before `_merge_adjacent_shorts`,each section's intro chunk would have its own `section_path` + `embedded_image_positions=["img@103"]` correctly。

3. **Chunker post-merge regression**(root cause)— `_merge_adjacent_shorts`(line 295-341 `layout_aware.py`,W25 F1 D3 NEW per ADR-0033 (b))consolidates **adjacent text chunks where BOTH fall below `min_chunk_merge_floor`**,**without checking `section_path` equality**。Merge always `backward into prev`(line 326-338),inheriting prev's `section_path` + `chunk_title` + `heading_anchor`,but **combining `embedded_image_positions` from both**:

   ```python
   merged[-1] = ChunkSpec(
       section_path=list(prev.section_path),       # ← INHERITS prev's section
       chunk_title=prev.chunk_title,
       ...
       embedded_image_positions=combined_images,    # ← BUT carries curr's images too
   )
   ```

   When section N+1's intro chunk is small + section N's last chunk is small → backward-merge fires → result chunk takes section N identity but carries section N+1's images。Per `_should_merge`(line 343-353):

   ```python
   def _should_merge(self, prev: ChunkSpec, curr: ChunkSpec) -> bool:
       if prev.chunk_kind != "text" or curr.chunk_kind != "text":
           return False
       if prev.chunk_token_count >= self.min_chunk_merge_floor:
           return False
       if curr.chunk_token_count >= self.min_chunk_merge_floor:
           return False
       return True
   ```

   **No `section_path` boundary guard**。Only kind + token-count checks — silently allows cross-section merge。

**Fix shape**(Option B from chat AskUserQuestion 2026-05-24):add same-section guard to `_should_merge`:

```python
def _should_merge(self, prev: ChunkSpec, curr: ChunkSpec) -> bool:
    if prev.chunk_kind != "text" or curr.chunk_kind != "text":
        return False
    if prev.chunk_token_count >= self.min_chunk_merge_floor:
        return False
    if curr.chunk_token_count >= self.min_chunk_merge_floor:
        return False
    # BUG-017 — never merge across section boundaries; preserves both
    # image-section attribution AND text-section semantic identity
    if prev.section_path != curr.section_path:
        return False
    return True
```

1-line guard。Preserves:
- ✅ Image-section attribution(image stays with its source section)
- ✅ Text-section semantic identity(merged chunk doesn't mix「3.7 Idempotency text + 4. High-level body」into one bag with section 3.7 title)
- ⚠️ Slight reduction in merge effectiveness(cross-section short-shorts no longer merge)— but the W25 F1 benefit(121→63 -48%)was primarily from within-section sub-subsection merge(e.g. 3.1 + 3.2 + 3.3 all under「3. Architectural principles」),which is unaffected

**Constraint adjacency**:non-architectural(merge policy internal to chunker)→ no H1 trigger;no new vendor → no H2 trigger;ADR-0033 amended with Implementation Status section noting regression + fix(per CLAUDE.md §10 R5 ADR-before-implement applied for the AMENDMENT cycle,not new ADR)。

## 7. Acceptance for Fix(checklist preview)

- [ ] Root cause confirmed via diagnostic script run on source DOCX(`backend/scripts/diagnose_image_doc_order.py`)
- [ ] **Fix** — `backend/ingestion/chunker/layout_aware.py` `_should_merge`:add 1-line `if prev.section_path != curr.section_path: return False` guard
- [ ] **Tests** — `backend/tests/test_chunker.py`:add `test_w25_merge_does_not_cross_section_boundary` proving short chunks from different `section_path` don't merge
- [ ] **ADR amendment** — `docs/adr/0033-chunker-low-value-tuning.md`:add Implementation Status section noting BUG-017 surfaced 2026-05-24 W25 D2 + same-section guard amendment
- [ ] Verify gates — `pytest tests/test_chunker.py -v` 22 passed(was 21,+1 NEW);`pytest tests/` full regression 939 pass(or +1 if NEW test counted in suite)
- [ ] **Re-ingest** — `sample-document-with-image-1` KB re-ingest via `DELETE /kb/{id}` + `POST /kb` + `POST /kb/{id}/documents` cycle(or in-place doc re-ingest)
- [ ] **Diagnostic verify** — re-run `backend/scripts/diagnose_image_doc_order.py` + cross-reference chunks listing:all 8 picture doc_orders should attribute to their correct parser section(0 wrong, was 4/8 wrong)
- [ ] Runtime verify — user reload `/kb/sample-document-with-image-1/docs/dce-integration-platform-implementation-plan` → Chunks panel `[embedded_images N]` markers land on correct-section chunks(eg section 4's chunk has Figure 1 instead of section 3.7)

## 8. Alternatives Considered

| # | Alternative | Pros | Cons | Verdict |
|---|---|---|---|---|
| 1 | Skip merge only when `curr.embedded_image_positions` non-empty(image-presence guard only)| Surgical — only blocks image-tainted merges | Cross-section text-only merges still produce mixed-section-content chunks(text semantic identity loss);only fixes image case | Rejected — incomplete |
| 2 | Skip merge if either prev/curr has images | Slightly broader than #1 | Same text-semantic-identity issue as #1 | Rejected — incomplete |
| 3 | **Skip merge if `prev.section_path != curr.section_path`**(this report,user-pick Option B 2026-05-24)| Surgical(1 line);correct for both image AND text semantic;preserves W25 F1 within-section consolidation benefit | Slight merge effectiveness reduction for cross-section short-shorts | **Selected** |
| 4 | Forward-merge into curr when curr has images(swap merge direction conditionally)| Preserves curr's section identity for image-bearing chunks | Asymmetric merge direction complicates `chunk_index` ordering invariants(re-index loop assumes contiguous);increases mental model load | Rejected — over-clever |
| 5 | Strip `embedded_image_positions` from prev during merge(retain only curr's) | Doesn't change merge eligibility | Still wrong — merged chunk text body mixes cross-section content,just images don't compound | Rejected — partial |
| 6 | Disable `_merge_adjacent_shorts` entirely(revert W25 F1 D3 (b)) | Restores parser-correct attribution at chunker level | Loses 48% chunk-count reduction benefit;sub-subsection sprawl returns | Rejected — undoes W25 F1 intent |

## 9. Report Changelog

| Date | Change | Reason | Approver |
|---|---|---|---|
| 2026-05-24 | Initial triage(Sev2)— W25 D2 user-eye verify session diagnostic-confirmed via `backend/scripts/diagnose_image_doc_order.py` script | W25 F1 ADR-0033 regression directly defeats W25 phase deliverable | Chris(chat-confirm via Option 1 BUG-017 separate path pick 2026-05-24)|

---

**Lifecycle reminder**:Sev2 → `postmortem.md` mandatory(per `PROCESS.md §4.5`)— root cause + 5 whys analysis on how the regression escaped W25 F1 test coverage(test_chunker.py 9 NEW tests covered low_value flag transitions + merge mechanics but didn't include cross-section image-attribution invariants);write post BUG-017 fix lands + verified。
