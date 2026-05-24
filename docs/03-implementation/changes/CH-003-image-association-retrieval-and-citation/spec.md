---
change_id: CH-003
title: "Image-association retrieval policy relax + citation neighbour-image enrichment"
status: approved           # draft | proposed | approved | active | done | cancelled
created: 2026-05-24
approved: 2026-05-24       # Chris batched accept with ADR-0035 chat 2026-05-24 「Accept both — proceed implementation」
completed: TBD
target_completion: 2026-05-25  # W25 D4 same-session per AI compression precedent
affects_components: [C04, C05]    # C04 Retrieval Engine + C05 Generation Pipeline
spec_refs:
  - architecture.md §3.5 line 258      # "deboost" spec intent (soft floor semantics)
  - architecture.md §3.6 line 384      # filter clause inline-tagged amendment landing W25 F7
  - W25 plan §2 F5                     # D2 + D1 combined deliverable
  - W25 plan §7 R6 D0 finding (iii)    # H1 boundary trigger upfront
  - W25 plan §8 Q5                     # × 0.7 weight locked default
  - ADR-0035                           # co-shipped — retrieval low_value soft-relax (Path B mandatory per Chris pick chat 2026-05-24)
  - CLAUDE.md §5.1 H1                  # architectural change governance
related:
  - ADR-0033                           # W25 F1 sibling — chunker low-value tuning (closes H1 at ingestion)
  - ADR-0034                           # W25 F3 sibling — query expansion + RAG-Fusion (closes H2 at recall-side)
  - ADR-0035                           # this Change co-ships — retrieval filter shift (closes H1 at retrieval-side)
  - W25 F5 D1                          # citation neighbour-image attach (already shipped W25 D3 commit b267a8a)
  - Investigation memo                 # docs/03-implementation/image-chunk-retrieval-investigation-2026-05-23.md
---

# CH-003 — Image-association retrieval policy relax + citation neighbour-image enrichment

> **Spec version**:1.0(initial)
> **Owner**:AI(implementer)/ Chris(approver)
> **Approved by**:Chris(batched accept with ADR-0035 chat 2026-05-24「Accept both — proceed implementation」)

---

## 1. Context (Why)

### 1.1 Trigger

W25-image-association-deep-fix phase Path III scope F5 deliverable boundary。F1(ADR-0033 chunker)+ F3(ADR-0034 query expansion)兩條 closure 後,image association rate 仍未達 G1 hard gate(≥ 5/8 per W25 plan)。F5 = retrieval policy + citation delivery 兩條 surface 同 ship:

- **D2(retrieval low_value soft-relax)** — close `architecture.md §3.5/§3.6` 「deboost」spec intent vs W2 baseline「hard exclude」實作機制 mismatch;image-bearing low_value chunks 由 hard-drop → score × 0.7 retain;non-image low_value preserved excluded
- **D1(citation neighbour-image attach)** — close LLM cite 旁邊 non-image chunk 時 citation 仍 attach 唔到 image 嘅 delivery gap;chunk_index ±3 window 揾 neighbour chunks 嘅 `embedded_images_json` 入 citation;已 shipped W25 D3 commit `b267a8a`(本 spec retroactive cover D1 + forward cover D2)

### 1.2 Why a Change(not Bug-fix)

- **D2 + D1 屬 spec-level mechanism change**(per ADR-0035 H1 trigger):filter clause shift + ranking policy injection + citation pipeline 加 post-process step
- **PROCESS.md §1 classification**:`"modify Z" / "add Y option"` signals = Change(D2 modifies filter mechanism + adds Settings knob;D1 added post-process callback to stream composer)
- 唔係 fix 一個 broken behavior(W2 baseline 一直 work as designed,只係 spec-implementation divergence);係 enhancement 對齊 spec intent + close functional gap

### 1.3 Why bundled into single CH-003(not split D2 / D1)

- D1 + D2 兩條都 target image-association 嘅 same root cause chain — D2 ensures image chunks 進入 LLM context;D1 ensures cited chunks attach neighbour images
- W25 plan §2 F5 explicit framing「D2 + D1 combined CH-003」— D0 design decision
- Test surface naturally combined:`test_hybrid_searcher_image_low_value.py`(D2)+ `test_citation_image_neighbors.py`(D1,already exists)+ end-to-end integration 一齊 measure G1 image hit rate
- Karpathy §1.2 simplicity:one Change folder per W25 F5 deliverable boundary,not two

---

## 2. Scope

### 2.1 In scope

**D2 — Retrieval low_value soft-relax**(per ADR-0035):

- `backend/retrieval/hybrid.py:41` — `_DEFAULT_FILTER` server-side OData clause `low_value_flag eq false` 移走(改為 `_DEFAULT_FILTER = "enabled eq true"`)
- `backend/retrieval/hybrid.py` — NEW `_apply_low_value_post_filter` helper:client-side Python post-filter;low_value+image retain × weight,low_value+no-image drop,non-low_value keep unchanged
- `HybridSearcher.search()` integration point:Azure Search response decode 後、return list 之前 apply helper(consumes `settings.retrieval_image_low_value_weight`)
- `backend/storage/settings.py` — NEW knob `retrieval_image_low_value_weight: float = 0.7`(per W25 plan §8 Q5 + ADR-0035)

**D1 — Citation neighbour-image attach**(已 shipped W25 D3 — retroactive cover):

- `backend/generation/citation_image_neighbors.py`(NEW module W25 D3,commit `b267a8a`)— `attach_neighbour_images` async + `_find_neighbour_images` pure helper
- `backend/generation/stream_composer.py` — `compose_query_stream` 加 optional `citation_post_process` callback(applied to citation list before emit)
- `backend/api/routes/query.py` — both `/query` + `/query/stream` 兩條 route wire `attach_neighbour_images` as post-process
- `backend/storage/settings.py` — NEW knobs(已 shipped W25 D3):`ENABLE_CITATION_IMAGE_NEIGHBORS: bool = True` + `CITATION_NEIGHBOUR_WINDOW: int = 3` + `CITATION_MAX_AUX_IMAGES: int = 2`

**Tests**:

- `backend/tests/test_hybrid_searcher_image_low_value.py`(NEW per W25 plan §2 F5.5 + ADR-0035):
  - low_value=True + has images → retain with score × 0.7
  - low_value=True + no images → drop
  - low_value=False → keep unchanged regardless of images
  - Empty `embedded_images_json="[]"` 視為 no images(drop)
  - Settings knob override(× 0.5 / × 0.8 empirical tuning behavior)
- `backend/tests/test_citation_image_neighbors.py`(已 shipped W25 D3,19 tests pass)— D1 retroactive cover
- Integration smoke:end-to-end `/query` against dev-KB `sample-doc-with-image-1` post-D2+D1 → citations 帶 image expected ≥ 1 per image-bearing query

### 2.2 Out of scope

- **F4 verify gate**(LIVE Azure RAGAs eval-set-v0-w25-supplement run 13 queries + image lift measurement)— separate W25 plan F4 deliverable;CH-003 implementation done 後 F4 verify gate runs
- **F6 manual user-test**(5 image-bearing queries via `/chat` UI)— separate W25 plan F6 deliverable;needs F4 gate clean first
- **Chunker tuning**(ADR-0033 W25 F1 — already landed)
- **Query expansion**(ADR-0034 W25 F3 — already landed)
- **`<ImageGallery>` frontend rendering change** — D1 attach extends existing `embedded_images` field per F5.1.4 plan rationale;frontend 零改動(images appended via Pydantic `model_copy` preserve shape)
- **Production KB re-ingest**(per W25 plan Q2 — dev-only scope)
- **Per-KB `KbConfig.image_low_value_relax` flag** — global `Settings` knob sufficient Tier 1;Tier 2 / W26+ if multi-KB needs per-KB tuning(per ADR-0035 §Alternatives D)

---

## 3. Design Decisions

### 3.1 D2 weight × 0.7 default(per W25 plan §8 Q5 locked)

`Settings.retrieval_image_low_value_weight = 0.7` baseline;empirical adjust per F6 manual verify if needed(R7 risk mitigation per W25 plan):
- Too aggressive(× 0.7 太重 deboost)→ image chunks 仍 排太後 vs non-image chunks → bump to 0.8 / 0.9
- Too lenient(× 0.7 太輕 deboost)→ TOC-style low_value image chunks 排太前 push 走 relevant non-image → drop to 0.5 / 0.6

### 3.2 D2 server-side filter shift not split per-KB(per ADR-0035 §Alternatives D)

Single global `Settings` knob;唔做 per-KB `KbConfig.image_low_value_relax`(Karpathy §1.2 simplicity)。若 multi-KB Tier 2 expansion 需要 per-KB tuning,可以 W26+ future Change promote `Settings` → `KbConfig` field。

### 3.3 D1 attach into existing `embedded_images` field(per W25 plan §2 F5.1.3 + Karpathy §1.2)

`Citation.embedded_images: list[ImageRef]` 已存在 W17 F4.1 baseline;D1 attach 機制將 neighbour chunks 嘅 `embedded_images_json` parsed images 直接 append 入 `embedded_images` 而 NOT 新 field `aux_embedded_images`:

- **Frontend 零改動**:`<ImageGallery>` 自動 render extended list
- **Pydantic shape preserved**:`Citation.model_copy(update={"embedded_images": merged})` immutable pattern
- **Dedup mechanism**:`checksum_sha256` set across own + neighbour images(per F5.1.2 acceptance)
- **Cap mechanism**:`CITATION_MAX_AUX_IMAGES: int = 2` per citation(avoid 圖洪水 per F5.1.3)

### 3.4 Settings knobs split D2 vs D1

| Knob | Module | Default | Purpose |
|---|---|---|---|
| `retrieval_image_low_value_weight` | D2 | 0.7 | Score weighting for image+low_value retention(per ADR-0035) |
| `ENABLE_CITATION_IMAGE_NEIGHBORS` | D1 | True | Master flag for citation post-process(W25 D3 shipped) |
| `CITATION_NEIGHBOUR_WINDOW` | D1 | 3 | `chunk_index ±N` window for neighbour search(W25 D3 shipped) |
| `CITATION_MAX_AUX_IMAGES` | D1 | 2 | Cap on neighbour images per citation(W25 D3 shipped) |

D2 default-on(`0.7` > 0 即 active);D1 default-on(`True`)。

---

## 4. Acceptance Criteria

Per W25 plan §2 F5 acceptance criteria + G1 hard gate alignment:

1. **CH-003 spec approved by Chris**(batched with ADR-0035 accept)
2. **ADR-0035 status `Proposed → Accepted`**(per Chris batched approval)
3. **`backend/retrieval/hybrid.py` change landed per ADR-0035 Decision (a)+(b)+(c)**:
   - `_DEFAULT_FILTER = "enabled eq true"`(low_value clause removed)
   - NEW `_apply_low_value_post_filter` helper
   - `HybridSearcher.search()` consumes `settings.retrieval_image_low_value_weight`
4. **`backend/storage/settings.py` NEW knob** `retrieval_image_low_value_weight: float = 0.7`
5. **D1 citation post-process already shipped W25 D3**(retroactive cover by this Change spec — no new code change for D1)
6. **`backend/tests/test_hybrid_searcher_image_low_value.py` NEW** with ≥ 5 unit tests covering D2 behavior(low_value+image / low_value+no-image / non-low_value / empty json / knob override)
7. **Regression**:full `pytest tests/` baseline preserved(pre-CH-003 = 994 passed + 25 skipped per W25 D3 progress;post-CH-003 expected ≥ 994 passed,strictly net + N tests)
8. **mypy `--strict`**:zero new errors on `backend/retrieval/hybrid.py` + `backend/storage/settings.py`
9. **ruff**:clean(no new warnings;pre-existing line 1673 `<img>` warning unrelated)
10. **CH-003 progress.md Day-N entries**:document implementation log per PROCESS.md §3.4

**Out-of-scope deferred to F4 / F6**:image association rate measurement(G1 hard gate)+ G2/G3 RAGAs regression + G4 latency budget。

---

## 5. Implementation Plan

### 5.1 Sequence

1. **CH-003 + ADR-0035 batched approval**(Chris chat 2026-05-24)
2. **ADR-0035 status `Proposed → Accepted`** + `docs/adr/README.md` index row
3. **Implementation `backend/retrieval/hybrid.py`** + `backend/storage/settings.py` per ADR-0035 Decision
4. **NEW unit tests** `backend/tests/test_hybrid_searcher_image_low_value.py`
5. **Regression verify**:`pytest tests/` + `mypy --strict backend/retrieval/hybrid.py backend/storage/settings.py` + `ruff check backend/`
6. **CH-003 + W25 progress entry** + commit `feat(retrieval): CH-003 D2 retrieval low_value soft-relax — ADR-0035 implementation`
7. **§3.6 inline-tagged amendment** scheduled W25 F7 closeout cascade(per ADR-0035 §3.6 amendment section)— not part of CH-003 commit

### 5.2 Effort estimate

- ADR-0035 + CH-003 spec drafting:done(this session)
- Implementation `backend/retrieval/hybrid.py` + Settings:~1-1.5h(localized change,one helper + filter clause edit + Settings field)
- Unit tests:~1.5-2h(5+ tests covering all branches)
- Regression run + mypy + ruff:~0.5h
- CH-003 progress + W25 D4 progress.md entry:~0.5h
- Total:~4-5h(consistent with W25 plan §2 F5 D2 portion estimate)

### 5.3 Rollback plan

Single-commit rollback:revert `backend/retrieval/hybrid.py` + `backend/storage/settings.py` + delete test file → returns to W2 baseline hard-exclude;Settings knob removal trivial(default consumers fall back per `getattr` if needed)。

D1(already shipped W25 D3)separately revert-able via reverting `b267a8a`;independent rollback boundary。

---

## 6. Risks (Change-Specific)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **× 0.7 weight 太進取**(image+low_value 仍排太後 vs non-image normal)| Med | Med | F6 manual verify catch + empirical adjust knob to 0.8 / 0.9 |
| R2 | **× 0.7 weight 太保守**(image+low_value 排太前 push relevant non-image chunks走)| Low-Med | Low | F6 manual verify catch + empirical adjust knob to 0.5 / 0.6 |
| R3 | **Empty `embedded_images_json="[]"` edge case** mis-classified as has-images → retained when should drop | Low | Low | Unit test cover `[]` literal + whitespace variants |
| R4 | **Hit volume change**(post-filter retains more chunks → top-K saturation may change downstream Cohere reranker input shape)| Low | Low | Cohere v4.0-pro accepts up to 1000 docs per request — top-K typically 20-50,well within budget |
| R5 | **§3.6 inline-tagged amendment timing**(landed W25 F7 closeout vs CH-003 commit)| Low | Low | ADR-0035 documents amendment statement;F7 closeout commit applies inline-tag amendment to `architecture.md` |

---

## 7. References

- ADR-0035 — Retrieval low-value soft-relax(co-shipped — `docs/adr/0035-retrieval-low-value-soft-relax.md`)
- ADR-0033 — Chunker low-value tuning(W25 F1 sibling)
- ADR-0034 — Query expansion + RAG-Fusion(W25 F3 sibling)
- W25 plan `docs/01-planning/W25-image-association-deep-fix/plan.md` §2 F5 + §7 R6 D0 finding (iii) + §8 Q5
- W25 D3 progress entry — D1 implementation log(commit `b267a8a`)
- `backend/retrieval/hybrid.py`(W2 baseline pre-amendment + W25 F5 D2 implementation locus)
- `backend/generation/citation_image_neighbors.py`(D1 module shipped W25 D3)
- `backend/generation/stream_composer.py`(D1 callback wiring)
- `backend/api/routes/query.py`(D1 + D2 integration point)
- Investigation memo `docs/03-implementation/image-chunk-retrieval-investigation-2026-05-23.md`
- CLAUDE.md §5.1 H1 + §6 ADR format
- PROCESS.md §3 Change lifecycle
