---
change_id: CH-003
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: in-progress
last_updated: 2026-05-24
---

# CH-003 — Progress

> Daily progress + 結尾 retro per PROCESS.md §3.4。
> Every commit must correspond to a Day-N entry mention(R2 binding rule)。

---

## Day 1 — 2026-05-24:CH-003 + ADR-0035 batched approval + D2 implementation + verify

### Trigger

W25-image-association-deep-fix phase F5 D2 deliverable boundary。F1(ADR-0033 chunker)+ F3(ADR-0034 query expansion)+ F5 D1(citation neighbour-image attach,W25 D3 commit `b267a8a`)three已 shipped;F5 D2 = retrieval-side complement closing `architecture.md §3.5/§3.6` 「deboost」spec wording vs W2 baseline「hard exclude」divergence + addressing H1 60% low_value flagged image-chunk exclusion(per W25 plan §1 + investigation memo 2026-05-23)。

### H1 boundary surfaced + Chris pick

Per W25 plan §7 changelog R6 finding (iii) Day 0 catch + D0.4 decision:F5 D2 mechanism change(server-side OData filter → server-side filter + client-side Python post-filter with score weighting)可能觸 H1 boundary。

**AskUserQuestion 2-step batched approval**(chat 2026-05-24):

| # | Question | Chris pick | Outcome |
|---|---|---|---|
| 1 | H1 boundary 點 call?(Path A CH-003 alone vs Path B CH-003 + co-ADR-0035 mandatory) | **Path B** | ADR-0035 mandatory;CH-003 + ADR-0035 batched |
| 2 | Review ADR-0035 + CH-003 spec.md 內容 — Accept both proceed? | **Accept both** | ADR-0035 Proposed → Accepted;CH-003 spec.md draft → approved;proceed implementation |

### Done

**1. ADR-0035 draft + Accepted**:

- `docs/adr/0035-retrieval-low-value-soft-relax.md` written:Context(spec-implementation divergence H1 trigger + W25 phase F5 D2 deliverable boundary)+ Decision 3-pronged(server-side filter shift + Python post-filter override + Configurable Settings knob)+ 6 Alternatives evaluation + Consequences(positive / negative / neutral)+ §3.6 inline-tagged amendment statement + References cross-link
- Status:Proposed → Accepted(Chris 2-step AskUserQuestion approval cycle)

**2. CH-003 spec.md draft + approved**:

- `docs/03-implementation/changes/CH-003-image-association-retrieval-and-citation/spec.md` written:1.0 initial spec covering D2 forward(per ADR-0035)+ D1 retroactive(shipped W25 D3 commit `b267a8a`)
- Scope:D2 retrieval relax + D1 citation post-process bundled per W25 plan §2 F5 explicit「combined CH-003」design
- Acceptance criteria 10 items + Out-of-scope(F4 / F6 / chunker / query expansion / production KB re-ingest / per-KB flag)
- 5 Change-specific risks documented(R1-R5)
- Status:draft → approved 2026-05-24(Chris batched accept gate)

**3. D2 implementation**(4 backend file edits per Karpathy §1.3 surgical):

- `backend/storage/settings.py`:NEW `retrieval_image_low_value_weight: float = 0.7` knob with 9-line docstring citing ADR-0035 + architecture.md §3.5 divergence
- `backend/retrieval/hybrid.py`:
  - Module docstring update(lines 4-9)reflecting ADR-0035 filter mechanism + "deboost" spec alignment
  - Import `dataclasses.replace`(line 26)needed for immutable HybridSearchHit score update
  - `_DEFAULT_FILTER`(line 41-46):`"enabled eq true and low_value_flag eq false"` → `"enabled eq true"`(low_value clause移走 to client-side post-filter)
  - NEW `_DEFAULT_IMAGE_WEIGHT = 0.7` module constant(line 47-50)+ docstring cite W25 plan §8 Q5
  - NEW `_apply_low_value_post_filter` helper(lines 60-90):3-branch logic(low_value+image retain × weight / low_value+no-image drop / non-low_value unchanged)+ image_weight ≤ 0 degenerate handling
  - `HybridSearcher.__init__`(lines 95-115):add `image_weight: float = _DEFAULT_IMAGE_WEIGHT` kwarg + `self.image_weight` store
  - `HybridSearcher.search()`(~lines 230-245):after Azure Search response decode + before return,apply `hits = _apply_low_value_post_filter(hits, image_weight=self.image_weight)` + logger.debug includes `pre_low_value_post_filter_count` + `image_weight` fields
- `backend/retrieval/retrieval_engine.py:143-144`:stale hard-coded fallback `"enabled eq true and low_value_flag eq false"` → `"enabled eq true"` with ADR-0035 cite comment
- `backend/api/server.py:130-134`:`HybridSearcher` lifespan construction add `image_weight=settings.retrieval_image_low_value_weight` kwarg(propagates Settings knob to runtime)

**4. NEW unit tests**:

- `backend/tests/test_hybrid_searcher_image_low_value.py` 19 tests covering all D2 branches:
  - 12 `_apply_low_value_post_filter` unit tests(low_value+image / low_value+no-image variants `[]`/empty/whitespace / non-low_value / mixed hits order preservation / image_weight knob 0.5/0.9/1.0 / image_weight=0 degenerate / image_weight negative / empty hits / missing low_value_flag field / missing embedded_images_json field)
  - 2 module-level constants(`_DEFAULT_FILTER` no `low_value_flag` clause / `_DEFAULT_IMAGE_WEIGHT == 0.7`)
  - 5 `HybridSearcher` integration tests(default image_weight / explicit override / payload filter shape / end-to-end post-filter on response / construction-time propagation to search-time)
- `pytest tests/test_hybrid_searcher_image_low_value.py -v` → **19/19 pass** in 0.84s

**5. Existing test updates**:

- `backend/tests/test_retrieval.py:44` — `test_hybrid_search_payload_shape_matches_spec` 2-line assertion update + ADR-0035 cite comment:expected filter `"kb_id eq 'drive_user_manuals' and enabled eq true and low_value_flag eq false"` → `"kb_id eq 'drive_user_manuals' and enabled eq true"`
- `backend/tests/test_retrieval.py:281` — `test_retrieval_engine_default_filter_clause_applied` 1-line assertion + cite:`"enabled eq true and low_value_flag eq false"` → `"enabled eq true"`

**6. Verify gates**:

| Gate | Result |
|---|---|
| `pytest tests/test_hybrid_searcher_image_low_value.py -v` | **19/19 pass** in 0.84s |
| `pytest tests/` full regression | **1013 passed + 25 skipped + 0 failed** in 185s(pre-CH-003 baseline 994 → +19 net IMPROVED) |
| `mypy --strict --explicit-package-bases retrieval/hybrid.py storage/settings.py` | **zero new errors on touched code**(11 pre-existing bare `dict` errors in untouched methods per Karpathy §1.3 surgical out of scope) |
| `ruff check retrieval/ storage/settings.py tests/test_hybrid_searcher_image_low_value.py` | **All checks passed** |

### Decisions(Day 1)

- **D1.1** — H1 boundary Path B(ADR-0035 mandatory)over Path A(CH-003 alone):governance symmetry with ADR-0022 / ADR-0033 + risk asymmetry favor explicit ADR for spec interface change(per Chris AskUserQuestion pick)
- **D1.2** — D2 + D1 bundled in single CH-003(not split):per W25 plan §2 F5 explicit design;same root cause chain + same test surface
- **D1.3** — `image_weight` plumbed via HybridSearcher constructor kwarg(not search() per-call param):aligns with W2 baseline pattern(Settings injection at lifespan)+ simpler caller API
- **D1.4** — `image_weight = 0.7` baseline value(per W25 plan §8 Q5 locked):empirical adjust knob available via Settings if F6 surfaces tuning need
- **D1.5** — §3.6 inline-tagged amendment scheduled W25 F7 closeout cascade(NOT in CH-003 commit scope):per ADR-0024 inline-tag precedent + doc-version held — ADR is record;keeps CH-003 commit focused
- **D1.6** — Stale W2 baseline filter strings in `retrieval_engine.py:143-144` + `test_retrieval.py:44/281` updated as part of CH-003 commit(not separate refactor commit):4-line edit total + 100% deterministic content change driven by ADR-0035 — Karpathy §1.3 surgical envelope holds

### Blockers

無。

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| ADR-0035 draft | 2 | ~0.4 | -1.6(template + W25 R6 D0 catch + ADR-0033 sibling reference all reduced draft effort)|
| CH-003 spec draft | 1 | ~0.3 | -0.7(plan §2 F5 effectively pre-drafted spec content)|
| Chris approval cycle(AskUserQuestion 2-step)| 0 | ~0.05 | 0 |
| D2 implementation(4 file edits)| 1.5 | ~0.4 | -1.1(localized scope per Karpathy §1.3)|
| NEW unit tests | 1.5-2 | ~0.6 | -1 |
| Existing tests update | 0.25 | ~0.1 | -0.15 |
| Regression run + mypy + ruff | 0.5 | ~3.2 | +2.7(full pytest 185s runtime dominates;mypy/ruff < 5s)|
| CH-003 progress + checklist + W25 D4 entry | 0.5 | ~0.4 | -0.1 |

**Cumulative ~5.5h actual vs ~7-8h planned**(consistent with W25 plan F5 D2 portion estimate);**compression factor ~1.3-1.5×**(typical for governance-heavy phase with H1 ADR overhead — lower compression than W22-W24 frontend rebuild ~5-10× because backend reasoning + verify gates add real time)。

### Commits

_(本 session 即將 commit;commit footer 會 reference 本 entry)_:
- `feat(retrieval): CH-003 D2 retrieval low_value soft-relax — ADR-0035 implementation`(planned)

### Out-of-CH-003-scope reminders

- §3.6 inline-tag amendment landed W25 F7 closeout cascade(per ADR-0035 amendment section;NOT this commit)
- F4 LIVE RAGAs eval verify gate measurement(13-query eval-set-v0-w25-supplement;G1 hard gate ≥ 5/8)— needs LIVE Azure key environment
- F6 manual user-test ≥ 4/5 image-bearing queries — needs F4 gate clean first
- Production KB re-ingest留 W16 Track A IT cred populate event(per W25 plan Q2 dev-only scope)

---

**End of Day 1 entry** — CH-003 implementation complete;commit + W25 D4 entry next。
