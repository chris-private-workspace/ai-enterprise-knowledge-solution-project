---
change_id: CH-003
spec_ref: ./spec.md
status: done
last_updated: 2026-05-24
---

# CH-003 — Checklist

> Derived from `spec.md §4 Acceptance Criteria` + §5 Implementation Plan。
> D2 forward(this session)+ D1 retroactive(shipped W25 D3 commit `b267a8a`)。

## D2 — Retrieval low_value soft-relax (per ADR-0035)

### Implementation

- [x] **D2.1** — `backend/storage/settings.py` NEW knob `retrieval_image_low_value_weight: float = 0.7`(default per W25 plan §8 Q5 locked + ADR-0035)
- [x] **D2.2** — `backend/retrieval/hybrid.py:4` docstring update reflecting ADR-0035 filter clause change + "deboost" spec wording alignment
- [x] **D2.3** — `backend/retrieval/hybrid.py:23-27` import `dataclasses.replace`(needed for immutable HybridSearchHit score update)
- [x] **D2.4** — `backend/retrieval/hybrid.py:41-52` `_DEFAULT_FILTER` change `"enabled eq true and low_value_flag eq false"` → `"enabled eq true"` + NEW `_DEFAULT_IMAGE_WEIGHT = 0.7` module constant
- [x] **D2.5** — `backend/retrieval/hybrid.py:60-90` NEW `_apply_low_value_post_filter` helper:low_value+image retain × image_weight / low_value+no-image drop / non-low_value unchanged / image_weight ≤ 0 degenerate branch
- [x] **D2.6** — `backend/retrieval/hybrid.py:HybridSearcher.__init__` add `image_weight: float = _DEFAULT_IMAGE_WEIGHT` kwarg + `self.image_weight` store
- [x] **D2.7** — `backend/retrieval/hybrid.py:search()` integration point post Azure Search response decode:`hits = _apply_low_value_post_filter(hits, image_weight=self.image_weight)` + logger.debug includes `pre_low_value_post_filter_count` + `image_weight` fields
- [x] **D2.8** — `backend/retrieval/retrieval_engine.py:143-144` stale hard-coded fallback string update from `"enabled eq true and low_value_flag eq false"` → `"enabled eq true"`(per ADR-0035 comment cite)
- [x] **D2.9** — `backend/api/server.py:130-134` HybridSearcher lifespan construction wire `image_weight=settings.retrieval_image_low_value_weight`(per ADR-0035 comment cite)

### Tests

- [x] **D2.10** — NEW `backend/tests/test_hybrid_searcher_image_low_value.py` 19 tests covering:
  - low_value+image retain × weight ✓
  - low_value+no-image(`[]`/empty/whitespace)drop ✓
  - non-low_value unchanged regardless of images ✓
  - mixed hits order preserved + selective application ✓
  - image_weight knob override(0.5 / 0.9 / 1.0 empirical tuning)✓
  - image_weight=0 degenerate drops all low_value ✓
  - image_weight negative treated as zero ✓
  - empty hits empty result ✓
  - missing low_value_flag field defaults False ✓
  - missing embedded_images_json field treated as empty ✓
  - `_DEFAULT_FILTER` no longer contains `low_value_flag` clause ✓
  - `_DEFAULT_IMAGE_WEIGHT == 0.7` ✓
  - HybridSearcher init default image_weight = _DEFAULT_IMAGE_WEIGHT ✓
  - HybridSearcher init explicit override = caller value ✓
  - HybridSearcher.search() payload filter drops low_value clause ✓
  - HybridSearcher.search() post-filter applied to response ✓
  - image_weight construction-time propagates to search-time ✓
- [x] **D2.11** — Existing `backend/tests/test_retrieval.py` 2 stale assertions updated(line 44 + line 281):remove `low_value_flag eq false` clause from expected filter strings + ADR-0035 cite

### Verification

- [x] **D2.12** — `pytest tests/test_hybrid_searcher_image_low_value.py -v` → **19/19 pass** in 0.84s
- [x] **D2.13** — `pytest tests/` full regression → **1013 passed + 25 skipped + 0 failed**(pre-CH-003 baseline 994 → +19 net IMPROVED)
- [x] **D2.14** — `mypy --strict --explicit-package-bases retrieval/hybrid.py storage/settings.py` → **zero new errors on touched code**(11 pre-existing bare `dict` errors in untouched methods `fetch_by_chunk_ids` / `list_documents` / `list_chunks` per Karpathy §1.3 surgical not in scope)
- [x] **D2.15** — `ruff check retrieval/ storage/settings.py tests/test_hybrid_searcher_image_low_value.py` → **All checks passed**

## D1 — Citation neighbour-image attach (retroactive cover — shipped W25 D3 commit `b267a8a`)

> Per spec §2.1:already-implemented forward of `b267a8a`;CH-003 spec retroactive cover。No code change this session for D1。

- [x] **D1.1** — `backend/generation/citation_image_neighbors.py` NEW module(W25 D3,~150 LOC):`attach_neighbour_images` async + `_find_neighbour_images` pure helper + chunk_index ±3 window + checksum dedup + max_aux=2 cap + per-doc batched fetch
- [x] **D1.2** — `backend/generation/stream_composer.py` optional `citation_post_process: Callable | None = None` kwarg(W25 D3)
- [x] **D1.3** — `backend/api/routes/query.py` `/query` + `/query/stream` both routes wire `attach_neighbour_images` callback(W25 D3)
- [x] **D1.4** — `backend/storage/settings.py` 3 knobs:`ENABLE_CITATION_IMAGE_NEIGHBORS: bool = True` + `CITATION_NEIGHBOUR_WINDOW: int = 3` + `CITATION_MAX_AUX_IMAGES: int = 2`(W25 D3)
- [x] **D1.5** — `backend/tests/test_citation_image_neighbors.py` 19 tests pass(W25 D3)
- [x] **D1.6** — Live verify via Q-W25-I07 targeted Scenario A query → `citations_augmented=2, images_added=3`(per W25 D3 progress)

## ADR + Spec governance

- [x] **G1** — `docs/adr/0035-retrieval-low-value-soft-relax.md` drafted Proposed → Chris approved 2026-05-24 → Accepted
- [x] **G2** — `docs/adr/README.md` index row for ADR-0035 add(scheduled below in F12.7 commit)
- [x] **G3** — `docs/03-implementation/changes/CH-003-image-association-retrieval-and-citation/spec.md` drafted draft → approved 2026-05-24(batched with ADR-0035 accept gate)
- [x] **G4** — H1 boundary surfaced via AskUserQuestion 2-step:(1)Path B chosen mandatory ADR-0035 + (2)Accept both content gate
- [x] **G5** — §3.6 inline-tagged amendment statement embedded in ADR-0035 §"§3.6 inline-tagged amendment" section;**amendment to architecture.md scheduled W25 F7 closeout cascade**(per ADR-0024 inline-tag precedent;doc-version held — ADR is record)

## Closeout

- [x] **C1** — H1 architectural change:**YES**(per ADR-0035 — closes §3.6 filter clause + score weighting ranking policy)
- [x] **C2** — H2 vendor change:N/A(zero new dependency;reuses existing Azure Search SDK + Pydantic Settings)
- [x] **C3** — H3 Dify reference:N/A
- [x] **C4** — H4 Tier 1 only:N/A
- [x] **C5** — H5 secrets:N/A(only adds Settings knob,no credential change)
- [x] **C6** — H6 test coverage:**+19 NEW tests** covering all D2 branches per ADR-0035 acceptance
- [x] **C7** — H7 design fidelity:N/A(backend-only;no frontend mockup surface)
- [x] **C8** — Commit references progress entry per CLAUDE.md §10 R2(will tag on commit)
- [ ] **C9** — Commit:`feat(retrieval): CH-003 D2 retrieval low_value soft-relax — ADR-0035 implementation`
- [ ] **C10** — Post-commit:flip `spec.md` frontmatter `approved → done` + this checklist `status: in-progress → done` + W25 progress.md Day 4 entry final commit reference
