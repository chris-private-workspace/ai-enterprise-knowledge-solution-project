---
bug_id: BUG-025
report_ref: ./report.md
checklist_ref: ./checklist.md
progress_ref: ./progress.md
postmortem_version: 1.0
authored: 2026-05-25
authored_by: Claude (assisted) + Chris (review)
status: published
---

# BUG-025 — Sev2 Postmortem

> **Mandatory per PROCESS.md §4** — Sev1 / Sev2 bugs require postmortem analysis covering root cause + detection gap + preventive controls。

## §1 Incident Summary

ADR-0035「retrieval low_value soft-relax」(landed W25 D4,2026-05-24)introduced an **asymmetric drop branch** in `_apply_low_value_post_filter`(`backend/retrieval/hybrid.py:66-97`):

- `low_value + image` → retain × 0.7 ✅(matches spec「deboost」intent)
- `low_value + no-image` → **DROP** ❌(violates spec「deboost」intent for text-only subset)

**Effect**:Text-only overview/aggregate queries(e.g. Q-W25-I07「show me all the Integration scenarios」)on KBs with low_value-flagged enumeration sections silently lose all retrieval candidates → synthesizer receives 0 chunks → returns REFUSAL_PHRASE。Regression vs **pre-W25 baseline** which returned partial results(scenarios A + B,text-only)。

**Discovery**:2026-05-25 same-session as CH-005(R14 mitigation attempt)ship;Chris user-eye chat UI retry post uvicorn restart confirmed Q-W25-I07 still refuses → AI investigation traced through 5-layer chain → confirmed retrieval-side asymmetric drop as root cause。

**Severity**:Sev2(silent regression,pre-Beta caught,query-class scope,no production user impact yet)。

**Fix landed**:Path A symmetric deboost(`low_value` 一律 retain × `image_weight` regardless of image presence)via ADR-0035 amendment(NOT supersede)+ single atomic commit per Chris pick。

---

## §2 Timeline

| Time | Event |
|---|---|
| **2026-05-23** | Investigation memo + W25 plan kickoff;Path III chosen by Chris(close image-text association gap)|
| **2026-05-23 W25 D2** | ADR-0035 drafted with **asymmetric drop branch** for text-only low_value(rationale per ADR §73-74:「preserve W2 exclusion for TOC / version-statement style chunks」)|
| **2026-05-23 W25 D2** | `_apply_low_value_post_filter` implemented per ADR-0035 spec;`test_hybrid_searcher_image_low_value.py` 19 tests written **asserting drop behavior**(test design encoded the spec assumption error)|
| **2026-05-24 W25 D4** | Chris user-test 2 queries:**Q-W25-I02** ✅(D4 milestone「2 cites + 1 screenshot」)+ **Q-W25-I07** ❌(0 cites + refuse)— mis-diagnosed as「synthesizer overview-refuse」R14 finding |
| **2026-05-24 W25 closeout** | R14 recorded in session-start.md §11 + RISK_REGISTER as「synthesizer-side R14」;W25 phase gate PASS WITH F4/F6 LIVE-EVAL-DEFERRED CAVEAT |
| **2026-05-25 morning** | CH-005 ship(commit `8418b57`)— Rule 6 + EXAMPLE 3 prompt change as R14 mitigation;11 NEW tests + 1024 regression all green |
| **2026-05-25 post-ship** | Chris uvicorn restart + chat UI retry → Q-W25-I07 still refuses → CH-005 ineffective(synthesizer-side fix doesn't help when retrieval already empty) |
| **2026-05-25 investigation** | AI `Grep` `_apply_low_value_post_filter` + `enable_query_expansion` settings inspection → confirmed asymmetric drop branch as true root cause(NOT synthesizer over-refuse)|
| **2026-05-25 H1 surface** | AI surface 3 mitigation candidates + STOP and ask Chris → Path A symmetric deboost pick + Amend ADR-0035 + Single atomic commit |
| **2026-05-25 fix landed** | BUG-025 report + checklist + progress + postmortem + ADR-0035 amend + code rewrite + tests revise + RISK_REGISTER R14 flip + R15 entry + CH-005 spec frontmatter superseded → single atomic commit |

**Latency**:**~24h** from W25 D4 first sighting → root cause identified(2026-05-24 → 2026-05-25)。Mis-diagnosed framing(synthesizer-side R14)delayed correct attribution by ~1 day。

---

## §3 Root cause(5 whys per report §2.5)

1. **Why did Q-W25-I07 return 0 citations?** → Synthesizer received empty chunks list。
2. **Why was the chunks list empty?** → ADR-0035 `_apply_low_value_post_filter` dropped all retrieved Integration-scenarios chunks。
3. **Why were Integration-scenarios chunks low_value + no-image?** → ADR-0033 chunker flagged them low_value due to short token count;chunks have no embedded images(text-only enumeration)。
4. **Why does the post-filter drop text-only low_value?** → ADR-0035 design assumed text-only low_value = TOC/version-statement noise(per ADR §73-74 alternatives analysis)— assumption errored for scenario-enumeration content。
5. **Why was the assumption not validated empirically before W25 closeout?** → W25 F4 LIVE eval deferred(R8/Azure-key-bound)+ F6 manual user-test sample size 2/8 → coverage gap allowed mis-diagnosed framing(R14 synthesizer-side)to land。

**Causal chain**:
```
ADR-0035 design assumption error (text-only low_value = noise)
  → asymmetric drop branch implemented as spec'd
    → tests written asserting drop = correctness encoding the wrong spec
      → ADR-0033 floor 100→60 + adjacent-short-merge increases low_value flag rate for some content
        → text-only short-structured chunks (scenario enumerations) caught in low_value net
          → silently dropped at retrieval
            → synthesizer receives empty chunks
              → REFUSAL_PHRASE emitted (Rule 2)
                → user sees「I cannot find this in the available documentation」
```

---

## §4 Detection gap analysis

### What went wrong in detection

| Gap | Description |
|---|---|
| **G1** Test design encoded spec assumption error | `test_low_value_without_images_dropped` + 2 sibling tests **assert drop behavior** — tests confirmed implementation matched spec but **spec itself was wrong** for text-only low_value subset。Unit tests cannot catch spec/implementation alignment errors when both are aligned to a wrong assumption。 |
| **G2** F4 LIVE RAGAs eval deferred | `eval-set-v0-w25-supplement.yaml` 13 queries(including Q-W25-I07)blocked by R8/Azure-key-bound umbrella per ADR-0017 → 30+ query coverage gap → wrong assumption not stress-tested |
| **G3** F6 manual user-test sample size insufficient | Only 2/8 queries run pre-closeout(Q-W25-I02 ✅ + Q-W25-I07 ❌)— too small to surface query-class pattern(image-bearing OK / text-only refuse)。Q-W25-I07 result mis-diagnosed as「synthesizer over-refuse」rather than「retrieval-side pruning」 |
| **G4** Mis-diagnosed framing locked in retrospect | W25 D4 retro labeled R14「synthesizer overview-refuse」without investigating retrieval-side chunks_retrieved count → memory landed + W26+ CH-005 candidate framed off wrong attribution → CH-005 implemented + shipped before re-investigation |
| **G5** Pre-W25 baseline comparison missing | No automated「A+B scenarios still returned post-W25 changes?」regression check;pre-W25 baseline result lived only in user memory not in automated regression suite |
| **G6** Spec wording ambiguity | `architecture.md §3.5「deboost」`spec literal wording NOT honored by ADR-0035 implementation for text-only low_value subset;divergence not flagged by ADR review。 |

### What went right(saved Sev1 escalation)

- **W6 D5 Chris pre-identified Beta cohort** = RAPO internal + 1-2 友好部門(small, friendly,direct chat feedback channel)→ Q-W25-I07 surface caught at W25 D4 pre-Beta gate not post-rollout
- **Chris immediate re-test post CH-005 ship** → caught CH-005 ineffectiveness in same session not weeks later
- **W25 phase gate PASS WITH F4/F6 LIVE-EVAL-DEFERRED CAVEAT** explicitly flagged the eval coverage gap → R14 finding recorded for follow-up not silent
- **CLAUDE.md §5.1 H1 boundary discipline** triggered AskUserQuestion for ADR amendment vs supersede framing → Chris-in-the-loop fix attribution decision

---

## §5 Preventive controls

| Control | Description | Owner | Effective from |
|---|---|---|---|
| **PC1** Retrieval-policy change → ≥ 5-query manual user-test across query class taxonomy before W{N}-closeout | Any future change to `_DEFAULT_FILTER` / `_apply_low_value_post_filter` / reranker logic / RRF fusion / score-mutation paths must run **at minimum** 5-query manual user-test covering:(1)image-bearing targeted / (2)image-bearing overview / (3)text-only targeted / (4)text-only overview-aggregate / (5)non-existent topic refuse-control。Sub-5/5 pass = phase gate `PASS WITH … DEFERRED CAVEAT` not `PASS`。Captured in CH-006 W26+ candidate「retrieval-policy change verification checklist」 | AI(propose)+ Chris(approve) | W26+ |
| **PC2** Test naming honest about spec assumptions | Tests asserting drop / filter / exclusion behavior must include rationale comment cross-referencing ADR section + acknowledging「if spec wording is ambiguous, this test encodes the strict interpretation」→ catches assumption errors at review time。Example BAD:`test_low_value_without_images_dropped`(asserts drop without rationale)→ GOOD:`test_low_value_without_images_dropped_per_adr_0035_b2_assumes_text_only_low_value_is_noise_TODO_validate`(rationale + TODO flagging assumption) | AI(propose at test-write time) | W26+ |
| **PC3** ADR review checkpoint for「assumption」language | Any ADR introducing「preserve X exclusion」/「assume Y is noise」/「treat Z as low-priority」wording must include **empirical evidence** OR **falsifiable test plan** in the Decision / Consequences section。Soft assumptions absent evidence = STOP-and-ask trigger。Captured as preventive review item in CLAUDE.md §6 ADR template extension W26+ candidate | AI(ADR drafter)+ Chris(approver) | W26+ |
| **PC4** Pre-W25-baseline regression query set | Capture「pre-W{N} known-good queries」into automated regression set with expected behavior(citation count ≥ N / specific chunk_id retrieval)→ next-phase changes auto-flag regressions。BUG-025 caught only by user memory of pre-W25 partial A+B return — should have been captured at W25 kickoff as「pre-W25 control set」for delta measurement。Captured as CH-007 W26+ candidate「pre-phase regression baseline capture protocol」 | AI(propose at phase kickoff)+ Chris(approve)| W26+ |
| **PC5** R14-style mis-diagnosed framing trigger | When 2/8 manual user-test = ≤ 25% query coverage,closeout retro **must** explicitly flag「<3/8 = MIS-DIAGNOSED RISK」instead of locking framing。R14 entry in session-start.md §11 should have included「retrieval-side bottleneck not yet ruled out」caveat — W25 D4 R14 framing should have read「PENDING further investigation」not「Synthesizer overview-refuse」 | AI(retro-writer)| W26+(immediate apply to current R14 mis-diagnosed flip)|
| **PC6** Spec-implementation divergence detector | Document review pass at phase closeout:grep all `architecture.md §3.X` wording → cross-ref active code paths → flag mismatches(`deboost` wording vs `hard exclude` implementation;BUG-025 root)→ catches ADR-0035-style divergence at closeout not next-phase regression。Captured as CH-008 W26+ candidate | AI(propose at phase closeout)| W26+ |

---

## §6 References

- BUG-025 report `./report.md`
- BUG-025 checklist `./checklist.md`
- BUG-025 progress `./progress.md`(Day 1 entry)
- ADR-0035 amendment `docs/adr/0035-retrieval-low-value-soft-relax.md`(post-amendment state)
- ADR-0033 sibling `docs/adr/0033-chunker-low-value-tuning.md`(chunker flagging semantics unchanged by BUG-025)
- CH-005 mis-diagnosed mitigation attempt `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/`(spec frontmatter:approved → superseded-by-bug-025;commit `8418b57` retained)
- W25 plan `docs/01-planning/W25-image-association-deep-fix/plan.md`(F4/F6 deferral cite)
- W25 progress `docs/01-planning/W25-image-association-deep-fix/progress.md`(Day 4 R14 mis-diagnosed entry)
- `architecture.md §3.5` line 258 "deboost" spec intent
- `architecture.md §3.6` line 384(re-amended per BUG-025)
- `backend/retrieval/hybrid.py:66-97`(implementation locus pre + post amendment)
- `backend/tests/test_hybrid_searcher_image_low_value.py`(test design error fix locus)
- Session-start.md §11 R14 entry(framing to be re-amended per PC5)
- RISK_REGISTER R14(flip)+ R15(NEW)
- CLAUDE.md §5.1 H1 architectural-adjacent decision discipline
- PROCESS.md §4 Bug-fix workflow + Sev1/Sev2 mandatory postmortem rule
- Chris chat 2026-05-25 user-eye verify feedback verbatim「現在連一些的內容也返回不了;而 query: what is high level architecture 反而沒有問題」
