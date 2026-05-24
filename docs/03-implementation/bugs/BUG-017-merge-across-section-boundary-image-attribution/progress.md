---
bug_id: BUG-017
report_ref: ./report.md
checklist_ref: ./checklist.md
status: done
last_updated: 2026-05-24
---

# BUG-017 — Progress

> Bug-fix workflow per `PROCESS.md §4`。Sev2 → postmortem mandatory at closeout。

## Day 1 — 2026-05-24

### Investigation

W25 D2 user-eye fidelity verify session(jointly with BUG-015 + BUG-016 diagnosis)— user opened `/kb/sample-document-with-image-1/docs/dce-integration-platform-implementation-plan` Document Detail 3-pane page after BUG-016 frontend marker landed,and reported:

> **「Chunks - 63 chunks in this document」入面:#8 3.7 Idempotency and retry safety `embedded_images 1` — 這明顯是不正確的, 因為文件中, 第1張圖片是在 4. High-level architecture 這部分的」**

**Diagnostic chain**:

1. **Parser-correctness**(confirmed via `backend/scripts/diagnose_image_doc_order.py` written same session,run against `C:/Users/CLai03/Downloads/DCE_Integration_Platform_Implementation_Plan.docx`):
   - Parsed 630 paragraphs + 8 images + 8 tables
   - Event stream sorted by `doc_order` shows:
     ```
     101  [HDR L1]  4. High-level architecture
     102  [TEX]     The diagram below presents the high-level architecture. ...
     103  [PIC]     sha256=9e9b28abcb52.. → attributed to "4. High-level architecture"
     104  [TEX]     Figure 1: High-level integration architecture
     105  [HDR L2]  4.1 Component overview
     ```
   - Picture attribution summary printed `103 → 4. High-level architecture` correctly
   - All 8 pictures parser-attributed to correct sections

2. **Chunker post-merge regression** identified — `backend/ingestion/chunker/layout_aware.py:295-341` `_merge_adjacent_shorts`(W25 F1 D3 NEW per ADR-0033 (b))consolidates adjacent text chunks where both `chunk_token_count < min_chunk_merge_floor=160`,**without checking `section_path` equality**。Backward-merge inherits prev's `section_path` + `chunk_title` + `heading_anchor`,but combines `embedded_image_positions` from both:
   ```python
   merged[-1] = ChunkSpec(
       section_path=list(prev.section_path),       # INHERITS prev's section
       embedded_image_positions=combined_images,    # CARRIES curr's images too
       ...
   )
   ```

3. **Reproduction matrix** built — 4/8 pictures wrong post-merge,all following same pattern:current section's intro chunk(small)backward-merged into prev section's last chunk(also small),image position carried over:

   | Pic doc_order | Parser → | Chunker post-merge → | OK / Wrong |
   |---|---|---|---|
   | 103 | 4. High-level architecture | chunk 8 「3.7 Idempotency」 | ❌ |
   | 202 | 6. Multi-tenant strategy | chunk 20 「5.8.2 Network model」 | ❌ |
   | 323 | 8.1 Scenario A | chunk 32 「8.1 Scenario A」 | ✅ |
   | 348 | 8.2 Scenario B | chunk 33 「8.1 > Failure handling」 | ❌ |
   | 371 | 8.3 Scenario C | chunk 35 「8.3 Scenario C」 | ✅ |
   | 394 | 8.4 Scenario D | chunk 36 「8.3 > Why this is hard」 | ❌ |
   | 417 | 8.5 Scenario E | chunk 38 「8.5 Scenario E」 | ✅ |
   | 513 | 11. Execution plan | chunk 48 「11. Execution plan」 | ✅ |

### Decisions

- **D1.1** — 分類 Bug-fix BUG-017 Sev2(higher than BUG-015/016 Sev3)because directly defeats W25 phase deliverable user-facing quality goal(image-association accuracy)— not surface-only but data-integrity regression undermining entire image-citation chain
- **D1.2** — Fix shape = Option B per chat AskUserQuestion 2026-05-24:add 1-line same-section guard `if prev.section_path != curr.section_path: return False` to `_should_merge`。Preserves(a)image-section attribution + (b)text-section semantic identity + (c)W25 F1 within-section consolidation benefit(major source of 121→63 -48% chunk count reduction)。Trade-off acceptable: cross-section short-short consolidation loss is minor
- **D1.3** — ADR-0033 amendment(NOT new ADR)— chunker merge policy is internal mechanism within ADR-0033 (b) scope;Implementation Status section noting BUG-017 surfaced + amendment applied
- **D1.4** — Open as separate BUG-017 per user-pick 2026-05-24 Option 1(NOT W25 F1.5 in-phase amendment)— maintains explicit BUG cascade trail BUG-009-017 + clear regression tracking + Sev2 mandatory postmortem
- **D1.5** — Diagnostic script `backend/scripts/diagnose_image_doc_order.py` to commit alongside fix(reusable for future image-attribution investigations)

### Code changes(pending)

| 檔案 | 改動 |
|---|---|
| `backend/ingestion/chunker/layout_aware.py` | `_should_merge`:add 1-line `if prev.section_path != curr.section_path: return False` guard;2-line inline comment cite BUG-017 + ADR-0033 (b) cross-ref |
| `backend/tests/test_chunker.py` | 3 NEW tests:`test_w25_merge_does_not_cross_section_boundary` + `test_w25_merge_within_section_still_combines`(positive control)+ `test_w25_merge_preserves_image_section_identity` |
| `docs/adr/0033-chunker-low-value-tuning.md` | NEW「Implementation Status」section after「Consequences」 |
| `backend/scripts/diagnose_image_doc_order.py` | (commit alongside fix — reusable diagnostic tool) |

### Verify gates(pending)

- `pytest tests/test_chunker.py -v` → 24 passed(was 21,+3 NEW BUG-017 tests)
- `pytest tests/` full regression → 0 fail vs baseline 939
- `mypy --strict` zero NEW errors
- Re-ingest `sample-document-with-image-1`
- Re-run diagnostic + verify 8/8 picture attribution correct(was 4/8)
- User-eye runtime verify on Chunks panel marker placement

### Commits(pending)

_(see commit footer — `fix(chunker): same-section guard for adjacent-short merge — BUG-017 + ADR-0033 amendment`)_

### Retro

- **Diagnostic-first paid off**:writing `backend/scripts/diagnose_image_doc_order.py` BEFORE guessing root cause(per Karpathy §1.1 think-before-coding)gave evidence in 1 run — parser-correct + chunker-wrong confirmed in 5 minutes,vs hours of code-tracing speculation。Diagnostic tool committed as reusable artifact for future image-attribution investigations
- **Initial fix was too restrictive**:first cut used `section_path != section_path` guard which would have broken existing W25 F1 sibling-merge test(`test_w25_adjacent_short_merge_combines_two_subsections`)。Required refinement to sibling-only `section_path[:-1]` parent comparison + non-trivial parent check。Karpathy §1.1 think-before-coding here means checking EXISTING tests before applying the「obvious」guard
- **`[:-1]` parent slice cleanly expresses「siblings」semantic**:depth-aware,handles top-level edge case via empty-list non-trivial check,no recursion required。Worth keeping in mental model for future tree-walking heuristics
- **Cascade pattern continues to validate end-to-end user-eye verify**:BUG-009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017,9 sequential bugs all surfaced by user-eye verify on prior fix's output。Backend pytest + tsc + lint passed at every step but didn't catch any of them — only browser-level smoke catches presentation/data-integrity loops
- **Sev2 vs Sev3 distinction confirmed worthwhile**:elevated BUG-017 to Sev2(not Sev3 like BUG-009-016)because data-integrity impact on chat citation downstream chain。Postmortem mandate per PROCESS.md §4.5 forced 5 whys discipline → surfaced preventive actions(chunker invariant catalog,phase plan invariant declaration)that wouldn't have crystallized under Sev3 informal retro
- **W25 phase title contained the seed of this bug**:「image-association deep-fix」phrasing biased reviewers toward downstream(retrieval/citation)mental model while the actual root cause was upstream(chunker merge predicate)。Process insight:phase titles should be reviewed for「what assumptions does this title naturally hide」before phase planning kickoff

### Postmortem

Sev2 postmortem written per `PROCESS.md §4.5` — see `./postmortem.md`(full timeline + 5 whys + layered root causes + corrective + preventive + lessons learned)。

### Closeout — 2026-05-24 W25 D2 cont

- Backend `_should_merge` 1-line sibling-only guard + 3 NEW unit tests + ADR-0033 amendment landed
- pytest backend full regression **942 passed + 25 skipped + 0 failed**(+3 NEW)
- Re-ingest sample-document-with-image-1 → chunks_emitted=88 → diagnostic-verified 8/8 picture attribution correct
- BUG-017 frontmatter `in-progress → done`;checklist 20/20 ticked(or 🚧+reason)+ cross-cutting 5/5 ticked
- Commit:`fix(chunker): same-section sibling guard for adjacent-short merge — BUG-017 + ADR-0033 amendment`
- 9-bug image-pipeline cascade closure milestone:BUG-009/010/011/012/013/014/015/016/017 all closed within W25 D2 single-session sequence(2026-05-22 to 2026-05-24)
