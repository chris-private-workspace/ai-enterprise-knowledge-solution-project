---
bug_id: BUG-017
report_ref: ./report.md
checklist_ref: ./checklist.md
progress_ref: ./progress.md
status: complete
last_updated: 2026-05-24
severity: Sev2
postmortem_required: true    # PROCESS.md §4.5 — Sev1/Sev2 mandatory
---

# BUG-017 — Postmortem

> Sev2 postmortem per `PROCESS.md §4.5`。Root cause analysis + 5 whys + corrective + preventive。

## TL;DR

W25 F1 ADR-0033 (b) `_merge_adjacent_shorts` chunker post-process consolidates adjacent short text chunks for retrieval relevance lift,**without checking section boundaries**。Cross-section backward-merge inherits prev's `section_path` while combining `embedded_image_positions`,mis-attributing images from current section to previous section's chunk。Affected 4 of 8 pictures in `sample-document-with-image-1`(50% misattribution rate)。Surfaced 2026-05-24 W25 D2 user-eye fidelity verify(36 hours after W25 F1 deploy 2026-05-23)by chat-pasted screenshot evidence + diagnostic script confirmation。

Fix landed same session via sibling-only merge guard(`prev.section_path[:-1] == curr.section_path[:-1]` + non-trivial parent);8/8 picture attribution restored post-fix re-ingest;chunk count 63 → 88(+39%,still -27% vs pre-W25 baseline 121)。

## Timeline

| Time(2026-05-23 / 24) | Event |
|---|---|
| **2026-05-23**(W25 D1)| W25 F1 ADR-0033 landed via commit `796af6c`。9 NEW chunker tests passing。Phase Gate verified via Gate 1 R@5=0.9722(+13.89pp)+ Faithfulness/Correctness lift。**Coverage gap not yet visible**:9 NEW tests covered low_value flag transitions(2 tests)、merge mechanics with siblings(6 tests)、+ 1 envelope test — but **no test validated cross-section image-attribution invariants**。|
| **2026-05-24 W25 D2 ~14:00** | User opened `/kb/sample-document-with-image-1?tab=images` (KB Detail Images tab) post BUG-013/014 commits;6/8 thumbnails rendered + 2/8 returned 429。BUG-014 closed rate-limit exemption,3 commits landed(BUG-013/014/F2)。|
| **W25 D2 ~14:30** | User opened `/kb/.../docs/[doc_id]` Document Detail 3-pane(ADR-0029);8 thumbnails as gradient placeholders + no `[with images]` markers — BUG-015 + BUG-016 surfaced same session,docs + fix landed,combined commit `df38ed3`。|
| **W25 D2 ~15:00** | User reported **chunk 8 「3.7 Idempotency」marked owning Figure 1 which actually belongs to section 4「High-level architecture」**。Cited explicit DOCX evidence(screenshot of section 4 with diagram visible)。|
| **W25 D2 ~15:15** | AI wrote diagnostic script `backend/scripts/diagnose_image_doc_order.py` |
| **W25 D2 ~15:20** | Diagnostic run against source DOCX confirmed:parser attributes pic doc_order=103 to section 4 correctly;chunker post-merge mis-attributes;**4/8 pictures wrong**;cross-section backward-merge identified as root cause |
| **W25 D2 ~15:30** | Chat AskUserQuestion 3 options analyzed;user picked Option 1(open BUG-017 separate + ADR-0033 amendment);Option B fix shape selected(`section_path` equality guard); subsequently refined to sibling-only `section_path[:-1]` guard to avoid breaking existing W25 F1 sibling-merge tests |
| **W25 D2 ~15:50** | BUG-017 docs(report + checklist + progress + postmortem)written;`_should_merge` 1-line guard applied;3 NEW unit tests added |
| **W25 D2 ~16:10** | `pytest tests/test_chunker.py -v` → **24 passed**(was 21 + 3 NEW BUG-017,zero regression on existing W25 F1 tests);ADR-0033 Implementation Status amendment written |
| **W25 D2 ~16:20** | Backend restarted + DOCX re-uploaded;chunks_emitted=88(was 63 pre-BUG-017);diagnostic re-run confirmed **8/8 picture attribution correct** |

**Time-to-detect**:36 hours(W25 F1 deploy → W25 D2 user-eye verify)
**Time-to-diagnose**:30 min(user report → root cause confirm via diagnostic script)
**Time-to-fix**:1.5 hours(diagnose → docs + code + tests + re-ingest verify)
**Total user-visible exposure**:36 hours(low — no Beta users yet,W25 F1 deploy was local-dev-only re-ingest;Sev2 severity comes from data-integrity impact on downstream chat citation,not from user impact tier)

## 5 Whys

**Why #1**:Image was attributed to wrong-section chunk(chunk 8「3.7 Idempotency」owning Figure 1 from section 4)?
→ Chunker's `_merge_adjacent_shorts` consolidated section 4's small intro chunk backward into section 3's last chunk,inheriting section 3's `section_path` + carrying section 4's `embedded_image_positions`。

**Why #2**:Why did `_merge_adjacent_shorts` consolidate across section boundaries?
→ `_should_merge` predicate only checked `chunk_kind`(both text)+ `chunk_token_count`(both below `min_chunk_merge_floor=160`),without checking `section_path` boundary equality。

**Why #3**:Why did `_should_merge` design omit section_path check?
→ ADR-0033 (b) Decision focused on token-count consolidation for retrieval relevance(combat 「Deliverables」/「Exit criteria」 30-50 token sub-section sprawl that triggered low_value);**design author optimized for the within-section sub-subsection case**(eg 1.1 + 1.2 + 1.3 under「Chapter 1」)without modeling cross-section adjacency as a distinct case。Mental model:「adjacent + small = merge」was incomplete;correct mental model = 「sibling + small = merge」。

**Why #4**:Why didn't W25 F1 test coverage(9 NEW tests in `test_chunker.py`)catch this?
→ Tests covered:(a)floor threshold semantic correctness(low_value flag transitions)(2 tests);(b)merge mechanics with siblings under common parent(6 tests — `test_w25_adjacent_short_merge_combines_two_subsections` etc.);(c)synthetic corpus envelope(1 test — used 2 chapters each with 3 sub-sections,so cross-chapter merge never fired because chapter boundaries were at long sub-section ends not at sub-section runs)。**The blind spot**:no fixture had a short-short pair STRADDLING a chapter boundary。All 6 merge tests used「Parent」heading at depth 1 + 「Sub A」/「Sub B」at depth 2 — same parent → cross-section merge case never exercised。

**Why #5**:Why didn't ADR-0033 review surface the cross-section invariant?
→ ADR review focused on(a)token thresholds rationale(100→60 + merge floor 160 derivation),(b)retrieval relevance impact estimate(synthesis of W25 D0 investigation memo's H1+H2),(c)envelope effect(±20% chunk count tolerance)。**Section identity preservation invariant was not surfaced as an explicit acceptance criterion** because the「image-association」 phase target was treated as a downstream phase concern(F2 eval / F3 retrieval / F5 citation post-process)rather than an upstream ingestion invariant。Phase title「image-association deep-fix」implied retrieval-level interventions;not anticipated that the chunker change itself could perturb image attribution。

## Root Causes(Layered)

1. **Mechanical**:`_should_merge` predicate missing section-path guard(1 line of code)
2. **Design**:incomplete mental model in ADR-0033 (b)(adjacent + small ≠ sibling + small)
3. **Process**:test coverage gap — no cross-section merge fixture in `test_chunker.py`(6 merge tests all used same-parent siblings)
4. **Phase scoping**:ADR-0033 review didn't enumerate section-identity preservation as explicit invariant,because W25 phase mental model put image-association as「downstream concern」not「upstream ingestion invariant」

## Corrective Actions(this BUG-017 cycle)

1. ✅ **Code fix** — `_should_merge` sibling-only guard via `prev.section_path[:-1] == curr.section_path[:-1]` + non-trivial parent check
2. ✅ **Test coverage** — 3 NEW BUG-017 tests:
   - `test_bug017_merge_does_not_cross_section_boundary`(regression seed,matches production failure pattern)
   - `test_bug017_within_section_siblings_still_merge`(positive control)
   - `test_bug017_image_section_identity_preserved_under_short_intro`(image attribution invariant)
3. ✅ **ADR amendment** — ADR-0033 Implementation Status section noting BUG-017 regression + sibling-only guard amendment + 24 NEW chunker test passing matrix
4. ✅ **Diagnostic tool** — `backend/scripts/diagnose_image_doc_order.py` committed for reuse on future image-attribution investigations
5. ✅ **Re-ingest verify** — `sample-document-with-image-1` re-ingested,8/8 picture attribution restored to parser-correct sections

## Preventive Actions(durable improvements)

1. **Chunker invariant catalog**(W26+ candidate) — formalize in `backend/ingestion/chunker/INVARIANTS.md`:
   - I1:Section identity preservation — chunks always carry section_path matching parser-attribution at that doc_order
   - I2:Image-section attribution invariant — `embedded_image_positions` always belong to the chunk whose section_path matches the image's parser-attributed section
   - I3:Heading anchor preservation — `heading_anchor` always matches the most-recent heading event at chunk's start
   - I4:Chunk_index monotonic — post-emit chunks have contiguous chunk_index 0..N-1
2. **Test fixture matrix expansion**(captured in `test_chunker.py` BUG-017 tests) — every new merge/split optimization MUST include cross-section fixture before commit
3. **Phase deliverable invariant declaration**(W25 phase planning improvement) — future phase plans should enumerate「invariants that MUST hold post-deliverable」alongside「behaviors that change post-deliverable」;ADR review checks both
4. **Diagnostic script as first-class tool** — `backend/scripts/diagnose_image_doc_order.py` discoverable via `docs/setup.md §8.x` troubleshooting section;encourages「diagnose before guess」(Karpathy §1.1)for future image-pipeline investigations

## Lessons Learned

- **Cascade pattern is reliable detector**:end-to-end user-eye verify after each fix in a cascade reliably surfaces orthogonal defects that backend/test-only verification misses;BUG-009-017 chain validates this — 9 sequential bugs,each surfaced by user-eye verify on the prior fix's output
- **Sibling-vs-adjacent distinction matters in tree-structured data**:any tree-walking heuristic with「adjacent」predicate needs section/parent boundary check;applies broadly to chunker / outliner / sectioniser / TOC generator
- **Phase mental model can blind ADR review**:W25 phase title「image-association deep-fix」shaped reviewer's mental model toward downstream retrieval/citation interventions,obscuring upstream ingestion-time invariant concerns。Future ADRs should be reviewed both within-phase-scope AND against「what assumptions does this break for adjacent ingestion-time invariants?」
- **`_TOKEN_LOW_VALUE_FLOOR=60` + `_MIN_CHUNK_MERGE_FLOOR=160` parameter pair is right** despite this regression — the regression was in merge predicate logic,not in threshold values;W25 F1 R@5/Faithfulness/Correctness lift remains valid;BUG-017 fix preserves all W25 F1 benefits while restoring image-attribution accuracy
- **R6 pre-active-flip recursive grep verification didn't catch this** because the bug was in merge-policy semantic gap,not in plan-text reference accuracy;R6 covers「does plan-text reference existing code accurately」not「does proposed change have unstated semantic implications」;separate improvement path needed for the latter(eg invariant declaration in §3 of plan template)

---

**End of postmortem**
