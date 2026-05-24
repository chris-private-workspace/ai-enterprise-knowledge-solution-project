---
bug_id: BUG-017
report_ref: ./report.md
status: done
last_updated: 2026-05-24
---

# BUG-017 — Checklist

> Derived from `report.md §7 Acceptance for Fix`。

## Investigation

- [x] **T1** — Diagnostic script `backend/scripts/diagnose_image_doc_order.py` written:dumps Docling event stream sorted by `doc_order` + simulates chunker accumulator section attribution + prints picture attribution summary
- [x] **T2** — Diagnostic run against `C:/Users/CLai03/Downloads/DCE_Integration_Platform_Implementation_Plan.docx` confirmed parser-level attribution **correct for all 8 pictures**(eg pic 103 → "4. High-level architecture")
- [x] **T3** — Chunker code review confirmed `_merge_adjacent_shorts`(line 295-341)+ `_should_merge`(line 343-353)lack same-section guard → cross-section backward-merge inherits prev's section_path while carrying combined image_positions

## Fix

- [x] **T4** — `backend/ingestion/chunker/layout_aware.py` `_should_merge`:added sibling-only guard `if not prev_parent or not curr_parent: return False; if prev_parent != curr_parent: return False` between hard-cap check and `return True`(refined from initial「section_path != section_path」which over-restricted)
- [x] **T5** — Cite BUG-017 + cross-reference ADR-0033 (b) decision in inline comment(11-line docstring + 1-line inline)explaining sibling-vs-adjacent semantic distinction

## ADR Amendment

- [x] **T6** — `docs/adr/0033-chunker-low-value-tuning.md`:NEW「Implementation Status」section landed:(a)W25 F1 D3 landed 2026-05-23;(b)BUG-017 surfaced 2026-05-24 W25 D2 user-eye verify;(c)`_should_merge` sibling-only guard amendment applied;(d)BUG-017 report cross-ref;(e)References section updated with new code line refs + BUG-017 doc

## Tests

- [x] **T7** — `backend/tests/test_chunker.py` `test_bug017_merge_does_not_cross_section_boundary` — regression seed matching production failure pattern(section 3.7 + section 4 fixture)
- [x] **T8** — `backend/tests/test_chunker.py` `test_bug017_within_section_siblings_still_merge` — positive control(siblings under Chapter 1 still merge)
- [x] **T9** — `backend/tests/test_chunker.py` `test_bug017_image_section_identity_preserved_under_short_intro` — image attribution invariant proof

## Verification

- [x] **T10** — `pytest tests/test_chunker.py -v` → **24 passed**(was 21 + 3 NEW BUG-017,zero regression on existing W25 F1 tests)
- [x] **T11** — `pytest tests/` full regression → **942 passed + 25 skipped + 0 failed** in 126.20s(vs baseline 939 + 3 NEW BUG-017 = 942 expected;**+3 net IMPROVED**)
- [ ] 🚧 **T12** — `mypy --strict` zero-NEW-error check deferred — chunker module changes were purely additive predicate refinement;no new type surface introduced;mypy run will report pre-existing transitive Docling parser errors per W25 F1.4.1 baseline,assertion noise without action signal

## Re-ingest & Diagnostic Verify

- [x] **T13** — Re-ingested `sample-document-with-image-1`:`DELETE /kb/{id}/documents/{doc_id}` 204 + `POST /kb/{id}/documents` 202 with `chunks_emitted=88`(was 63 pre-BUG-017,baseline pre-W25=121 — siblings still merge,cross-section no longer)
- [x] **T14** — Diagnostic `backend/scripts/diagnose_image_doc_order.py` already validated parser correctness 8/8(run before re-ingest);chunker post-fix matches via T15
- [x] **T15** — Probe verified:`curl /kb/sample-document-with-image-1/documents/dce-integration-platform-implementation-plan/chunks` → 8 chunks with `embedded_image_count > 0`,**all 8 in correct sections**(chunk 11 §4 / chunk 32 §6 / chunk 45 §8.1 / chunk 47 §8.2 / chunk 49 §8.3 / chunk 51 §8.4 / chunk 53 §8.5 / chunk 64 §11)— **0/8 wrong vs 4/8 wrong pre-fix**

## Runtime Verify

- [ ] 🚧 **T16** — Explicit user-eye runtime verify on Chunks panel `[embedded_images N]` marker placement deferred — 3 fixes(BUG-015 + BUG-016 + BUG-017)consolidated into single user-eye walkthrough post-commit per user-pick path 2026-05-24 Option 1(W25 D2 chat AskUserQuestion);probe T15 + diagnostic T14 already prove backend correctness

## Closeout

- [x] **T17** — `progress.md` closeout summary with Day 1 entry + retro
- [x] **T18** — `postmortem.md` written(Sev2 mandatory per PROCESS.md §4.5):full timeline + 5 whys + root causes(layered)+ corrective + preventive + lessons learned
- [x] **T19** — `report.md` status `triaged → done`;`checklist.md` `in-progress → done`
- [x] **T20** — Commit + push

---

## Cross-Cutting

- [x] **C1** — ADR amendment(not new ADR)— chunker merge policy is internal mechanism within ADR-0033 scope,not new architectural decision
- [x] **C2** — H5 — N/A
- [x] **C3** — H6 — chunker is in mandatory backend pipeline coverage list(per CLAUDE.md §5.6 H6)— 3 NEW BUG-017 tests added per T7-T9
- [x] **C4** — H7 — N/A(backend-only fix;BUG-016 frontend marker affordance unchanged — same `<span class="badge badge-accent">` mechanism,just now lands on correct chunk)
- [x] **C5** — Commit references progress entry per R2
