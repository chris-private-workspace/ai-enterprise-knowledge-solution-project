# ADR-0035: Retrieval low-value soft-relax — server-side filter shift + client-side score weighting policy

**Date**: 2026-05-24(initial)+ amended 2026-05-25 W25.5 per Sev2 BUG-025
**Status**: Accepted; amended 2026-05-25 W25.5 per Sev2 BUG-025
**Approver**: Chris(chat 2026-05-24 AskUserQuestion 2-step:(1)「Path B — CH-003 + co-ADR-0035 mandatory(Recommended)」H1 boundary pick;(2)「Accept both — proceed implementation(Recommended)」content accept gate);amendment approver Chris(chat 2026-05-25 AskUserQuestion 2-step:(1)「Path A symmetric deboost」mitigation pick;(2)「Amend ADR-0035(Recommended)」+「Single atomic commit(Recommended)」governance shape pick)
**Phase context**: `W25-image-association-deep-fix` F5 D2 deliverable + CH-003 co-shipped
**Related**:
- ADR-0033 chunker low-value tuning(W25 F1 sibling — closes H1 60% low_value ratio at chunker-side)
- ADR-0034 query expansion + RAG-Fusion(W25 F3 sibling — closes H2 vocab-overlap at retrieval-side)
- ADR-0022 auth-transport hardening(precedent — mechanism change with semantics preserved → ADR required)
- W25 plan `docs/01-planning/W25-image-association-deep-fix/plan.md` §2 F5 + §7 R6 D0 finding (iii) + §8 Q5 locked default × 0.7 weight
- CH-003 spec `docs/03-implementation/changes/CH-003-image-association-retrieval-and-citation/spec.md`(co-shipped)
- Investigation memo `docs/03-implementation/image-chunk-retrieval-investigation-2026-05-23.md`

---

## Context

**Trigger**(W25 Path III phase-level full optimization,F5 D2 deliverable):

W25 F1(ADR-0033 chunker re-tune `_TOKEN_LOW_VALUE_FLOOR` 100 → 60 + adjacent-short-merge)+ F3(ADR-0034 query expansion + RAG-Fusion)兩條已 landed;F5 D1 citation neighbour-image attach 已 shipped W25 D3(`backend/generation/citation_image_neighbors.py`)。但兩條 root-cause path 仍然 leak:

- **F1 chunker fix 後** dev-KB `sample-doc-with-image-1` chunks 由 121 → 63(-48% via adjacent-short-merge),但 chunker 仍會 emit short orphan(token < 60)→ image-bearing chunk 仍可能 trigger `low_value_flag=True`
- **F3 query expansion 後** RRF fusion surface 29 unique chunks(vs single hybrid retrieve 5),但 user real-world query Q-W25-I07「Show me all the Integration scenarios」**synthesizer 仍 refuse**(0 citations returned)— retrieval 已 surface 但 LLM 唔 cite

**Empirical signal**:F5 D1 attach 機制 work(`backend/generation/citation_image_neighbors.py` `citations_augmented=2, images_added=3` 喺 targeted Scenario A query verified),**但條件係 synthesizer 要 emit citations**;一旦 low_value-flagged 嘅 image chunk 連 retrieval pool 都入唔到,F5 D1 嘅 ±3 window 都揾唔到 neighbour images。

**Spec-implementation divergence**(per W25 plan §7 R6 D0 finding (iii)):

| Source | Wording / mechanism |
|---|---|
| **`architecture.md §3.5` line 258** | "Soft floor:chunk text < 100 tokens flag `low_value_chunk`(index 但 **deboost** retrieval)" |
| **`architecture.md §3.6` line 384** | "**Query 時 filter**:`enabled eq true and low_value_flag eq false`(default **deboost** low value chunks)" |
| **W2 baseline implementation**(`backend/retrieval/hybrid.py:4 + :41`)| `_DEFAULT_FILTER = "enabled eq true and low_value_flag eq false"`(Azure Search server-side OData — **hard exclude**,not deboost)|

Spec 兩處用 "**deboost**" 字眼(語義 = 降分但保留於 retrieval pool),但 W2 baseline 實作做咗 **hard exclude**(Azure Search server-side OData filter 完全唔 retrieve)。呢個 mismatch 係 **W2 phase pragmatic shortcut**:OData filter clause 簡單一行寫得到,Python post-filter 要寫多幾十行;當時 image-text association 唔係 Tier 1 Critical scope,take the shortcut。

**H1 boundary determination**(per CLAUDE.md §5.1 + W25 plan §7 R6 D0 finding (iii) + Chris Path B pick chat 2026-05-24):

- `architecture.md §3.6 line 384` 係 content-locked v6 spec(§1-§14 content lock per CLAUDE.md §4.4)嘅 normative filter clause statement
- Changing the literal filter clause = changing §3.6 documented behavior → 觸 H1「改 §3 component」
- Score modification(× 0.7 weight injection)= ranking policy 改動,屬 §3.6 retrieval spec scope
- Precedent symmetry:ADR-0022(auth-transport mechanism change with semantics preserved → ADR 寫咗)+ ADR-0033(W25 F1 chunker `low_value_floor` 100→60 — internal chunker tuning 但 ADR 寫咗)→ governance asymmetry 唔可以發生

---

## Decision

**Two-pronged change to retrieval low-value filter policy**(per W25 plan §8 Q5 locked default × 0.7):

### (a) Server-side OData filter shift

```python
# backend/retrieval/hybrid.py:41
- _DEFAULT_FILTER = "enabled eq true and low_value_flag eq false"
+ _DEFAULT_FILTER = "enabled eq true"
```

`low_value_flag` clause 由 server-side filter 移走 → Azure Search response 會 include all enabled chunks regardless of low_value status。`kb_id eq` clause(per ADR-0018 Phase 3 multi-KB invariant)preserved unchanged。

### (b) Client-side Python post-filter override

```python
# backend/retrieval/hybrid.py — NEW helper applied after Azure Search response
# AMENDED 2026-05-25 W25.5 per Sev2 BUG-025 — symmetric deboost (was asymmetric drop)
def _apply_low_value_post_filter(
    hits: list[HybridSearchHit],
    *,
    image_weight: float = 0.7,
) -> list[HybridSearchHit]:
    """Post-filter low_value chunks per ADR-0035 W25 F5 D2 (amended 2026-05-25 BUG-025).

    Symmetric deboost (matches architecture.md §3.5 "deboost" spec literal intent):

    - low_value_flag=True → retain with score × image_weight (regardless of image presence)
    - low_value_flag=False → keep unchanged

    image_weight ≤ 0 is degenerate path (drops all low_value — A/B branch preserved).
    """
    if image_weight <= 0:
        return [h for h in hits if not h.fields.get("low_value_flag", False)]

    result: list[HybridSearchHit] = []
    for hit in hits:
        if hit.fields.get("low_value_flag", False):
            result.append(replace(hit, score=hit.score * image_weight))
        else:
            result.append(hit)
    return result
```

> **Original (pre-BUG-025) asymmetric drop branch** — see "Amendment 2026-05-25 W25.5 BUG-025 — symmetric deboost" section below for evolution rationale。

Integration point:`HybridSearcher.search()` 之 Azure Search response decode 後、return list[HybridSearchHit] 之前。

### (c) Configurable threshold via Settings

```python
# backend/storage/settings.py — NEW knob
retrieval_image_low_value_weight: float = 0.7  # per ADR-0035 W25 F5 D2; empirical adjust per F6 verify if needed
```

`HybridSearcher.search()` consumes `settings.retrieval_image_low_value_weight` as `image_weight` parameter,allowing empirical tuning per F6 manual verify(R7 risk mitigation per W25 plan)without code change。

---

## Alternatives Considered

### A — Keep W2 baseline(do nothing)

**Rejected**:0/8 image hit rate persists post-F1+F3+F5 D1;contradicts user Path III explicit framing「我需要的是完整地解決圖片和文字內容的關聯問題」chat 2026-05-23 + AskUserQuestion 揀 Path III。

### B — Hard retain all low_value with full score(no × weight)

**Rejected**:H2 vocab-overlap empirical signal(TOC chunks beat image chunks via density)suggests image+low_value chunks need **deboost** not **retain-at-full**;TOC chunks plus retain-at-full 會排前壓走相關 chunks;weight × 0.7 = balanced retain。

### C — Server-side OData OR clause with helper field

**Rejected**:Azure Search OData filter 唔支援 direct check 喺 `Edm.String` field 嘅 emptiness(eg. `embedded_images_json ne '[]'` 唔可 safely evaluate at filter syntax level);workaround = add helper `has_images: Edm.Boolean` index field → requires schema migration + full re-ingest(production KB cost prohibitive,屬 W16+ Track A IT cred scope);Python post-filter avoids re-ingest。

### D — Per-KB `KbConfig.image_low_value_relax` flag

**Rejected**:Over-engineered for W25 phase scope per Karpathy §1.2 simplicity-first;`Settings.retrieval_image_low_value_weight` global knob sufficient — current Tier 1 only `drive_user_manuals` + dev KBs,per-KB knob speculative。若 future multi-KB Tier 2 expansion 需要 per-KB tuning,可以 promote `Settings` → `KbConfig` field via future Change(W26+)。

### E — Eliminate `low_value_flag` entirely(chunker no longer flags)

**Rejected**:Cross-cutting break to W2 baseline + ADR-0033 just landed;`low_value_flag` 仍 needed for non-image low_value handling(TOC entries / version statements 真係不應該 surface)。D2 only changes **retrieval policy** on `low_value_flag`,not the **flagging semantics** at chunker。

### F — Move low_value handling entirely to reranker(Cohere v4.0-pro per-document instruction prompt)

**Rejected**:Cohere Rerank v4.0-pro API 唔 accept per-document weight in request(only query + documents + top_k);workaround = pre-fetch all candidates then send to reranker for global re-scoring increases latency budget(P95 budget already 5s with F3 query expansion);cost + token overhead unjustified for low-impact correction(score × 0.7 weight)。

---

## Consequences

### Positive

- **Spec intent strengthened literally**:implementation now matches §3.5/§3.6「deboost」wording;W2 baseline pragmatic shortcut(hard exclude)was a code-spec divergence 默默 accumulating since W2(2026-05-04)— this ADR closes the divergence at the F5 deliverable boundary
- **Image-bearing chunks retain ranking position** when token-floor flagged(addresses H1 60% low_value empirical signal at retrieval-side,complementary to F1 chunker fix at ingestion-side)
- **Configurable via `Settings.retrieval_image_low_value_weight`** for empirical tuning per F6 manual verify(R7 risk mitigation captured in W25 plan)
- **F5 D1 citation neighbour-image attach mechanism**(already shipped W25 D3 commit `b267a8a`)now has more chances to fire — D2 ensures image chunks reach LLM's citation pool;D1 ensures cited chunks attach neighbour images
- **No re-ingest required** — Python post-filter applies at query time on existing index;avoids W16 Track A IT cred dependency(critical because W25 phase explicit AI-controllable backlog per plan §6)

### Negative

- **Behavioral shift visible at retrieval API surface** vs W2 baseline — `HybridSearcher.search()` response ordering changes for any KB containing image-bearing low_value chunks;test suite needs to assert score weighting behavior(per W25 plan §2 F5.5 acceptance criteria `test_hybrid_searcher_image_low_value.py`)
- **Server-side filter overhead reduced by 1 clause but client-side post-filter adds Python loop** — net latency cost negligible(ms-scale for top-50 hits;benchmarked against P95 5s hard cap per ADR-0034 — within budget)
- **Score modification non-zero ranking change** — empirical adjust may be needed if F6 surfaces edge cases(eg. weight 0.7 too aggressive → image chunks排太前 push 走 relevant non-image chunks;captured under R7 risk W25 plan)— configurable knob enables 0.5 / 0.8 empirical iteration without code change

### Neutral

- **F5 D1 already shipped W25 D3**(`b267a8a`)— D2 = retrieval enabling complement;both 屬 same F5 deliverable boundary per W25 plan §2 F5
- **W25 F4 verify gate**(LIVE Azure RAGAs eval on `eval-set-v0-w25-supplement.yaml` 13 queries including Q-W25-I07)will measure final image association lift attributable to D2 — pre-D2 baseline 0/8 → post-D2+D1 expected ≥ 5/8 per W25 plan G1 hard gate
- **F1 ADR-0033 + F3 ADR-0034 + F5 D2 ADR-0035 trilogy** completes the Path III scope — chunker(ingestion)+ retrieval expansion(retrieval-side recall)+ retrieval relax(retrieval-side filter)+ citation enrichment(generation-side delivery)

---

## §3.6 inline-tagged amendment

Per W25 plan §2 F7 cross-doc sync + ADR-0024 precedent for inline-tagged amendment(doc-version held — ADR is record per W17 precedent):

**Original `architecture.md §3.6 line 384`**(pre-W25):
> **Query 時 filter**:`enabled eq true and low_value_flag eq false`(default deboost low value chunks)

**Re-amended 2026-05-25 W25.5 per Sev2 BUG-025**(supersedes 2026-05-24 W25 D4 wording):
> **Query 時 filter**:`enabled eq true`(server-side OData)+ **client-side symmetric deboost post-filter**:`low_value_flag=True` → retain with score × 0.7(regardless of image presence;matches §3.5 "deboost" spec literal intent);`low_value_flag=False` → unchanged(per ADR-0035 W25 F5 D2 amended W25.5 BUG-025;doc-version held)

---

## Amendment 2026-05-25 W25.5 BUG-025 — symmetric deboost

### Trigger

Sev2 BUG-025 surfaced 2026-05-25 same-session as CH-005 ship:Q-W25-I07「show me all the Integration scenarios」regression vs pre-W25 baseline(0 citations + refuse vs partial A+B return)。CH-005 R14 synthesizer-side mitigation attempt(commit `8418b57`)proven functionally ineffective because synthesizer receives empty chunks list — root cause is **retrieval-side asymmetric drop branch in ADR-0035 implementation**,not synthesizer-side over-refuse。

See:
- `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/report.md`(symptom + 5-whys + acceptance criteria)
- `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/postmortem.md`(Sev2 mandatory postmortem + 6 preventive controls PC1-PC6)

### Assumption error identified

Original ADR-0035 Decision (b) + Alternative E rationale assumed:**「text-only low_value chunks = TOC/version-statement noise — should be dropped to preserve W2 exclusion semantics」**。

Empirical signal post-W25 closeout shows assumption errored:**text-only low_value chunks legitimately include scenario-enumeration content**(short list-like sections with valuable content,not noise)。ADR-0033 chunker re-tune(`_TOKEN_LOW_VALUE_FLOOR` 100→60 + adjacent-short-merge)increases the population of legitimate text-only low_value chunks,amplifying impact of the asymmetric drop branch。

### Decision evolution

**Pre-BUG-025 asymmetric drop**(W25 D4 landed):
- `low_value=True + image` → retain × 0.7 ✅
- `low_value=True + no-image` → **DROP** ❌(violates §3.5 "deboost" intent for text-only subset)
- `low_value=False` → unchanged ✅

**Post-BUG-025 symmetric deboost**(W25.5 landed):
- `low_value=True` → retain × `image_weight`(regardless of image presence — matches §3.5 "deboost" spec literal intent)
- `low_value=False` → unchanged
- `image_weight ≤ 0` degenerate path preserved as A/B measurement branch(drops all low_value — useful for empirical comparison between asymmetric / symmetric / drop-all behaviors)

### Why amendment not supersede

Chris pick 2026-05-25 AskUserQuestion:**「Amend ADR-0035(Recommended)」**over「NEW ADR-0036 supersede」。Rationale:
- Precedent ADR-0017 5 amendments(R8 corp-proxy mitigation pattern)— amendment validated pattern for behavioral evolution within same decision family
- Same decision family(retrieval low-value handling)— supersede ADR would fragment decision narrative
- ADR sequence stays lean — NEW ADRs reserved for materially separate decisions
- Preserve W25 D4 timeline context within single ADR(asymmetric → symmetric is a behavioral refinement, not a new decision class)

### What does NOT change

- Server-side OData filter `_DEFAULT_FILTER = "enabled eq true"`(Decision (a)— preserved)
- `Settings.retrieval_image_low_value_weight: float = 0.7` default knob(Decision (c)— preserved)
- `low_value_flag` chunker flagging semantics(out of scope — ADR-0033 chunker logic unchanged)
- CH-003 F5 D1 citation neighbour-image attach(unchanged — will now fire more often as more low_value chunks reach synthesizer's citation pool)
- F4 LIVE RAGAs eval scope(deferred W26+;BUG-025 fix surfaces independent of LIVE eval)
- F6 manual user-test 5-query taxonomy(captured as preventive control PC1 in postmortem)

### Consequences of amendment

**Positive**:
- Closes Q-W25-I07-class regression(text-only overview/aggregate queries now retrieve chunks instead of silent drop)
- Implementation literal-matches §3.5「deboost」spec wording(removes the residual spec-implementation divergence that survived original W25 D4 landing)
- Test design corrected:`test_low_value_without_images_dropped` 系列 inverted to `test_low_value_without_images_retained_with_weight_per_bug_025` — tests now encode correct spec interpretation

**Negative**:
- Slightly increases top_k chunk count (some text-only low_value now ranked × 0.7 deboost instead of dropped)— may push some non-low_value chunks slightly down;F6 manual verify will catch if image-bearing low_value crowds top_k(R7 preserved)
- ADR-0035 footprint grows(Status + Decision (b) + §3.6 inline-tag + NEW Amendment section + References)— ADR-0017-style amendment fan-out

**Neutral**:
- Decision (b) code-block update preserves degenerate `image_weight ≤ 0` path → A/B branch still available for empirical measurement(asymmetric was implicitly removable by `image_weight=0`;now both behaviors selectable via knob)
- BUG-025 single atomic commit per Chris pick `(d) Single atomic commit (Recommended)` — docs + code + tests bundled in one commit

---

## References

- `architecture.md §3.5` line 258 "deboost" wording(spec intent — soft floor semantics)
- `architecture.md §3.6` line 384(inline-tagged amendment landing W25 F7)
- `backend/retrieval/hybrid.py:4 + :41`(W2 baseline implementation locus pre-amendment)
- `backend/storage/settings.py`(NEW `retrieval_image_low_value_weight: float = 0.7` knob)
- ADR-0022 — auth-transport hardening precedent(mechanism change with semantics preserved → ADR required pattern)
- ADR-0033 — chunker low-value tuning(W25 F1 sibling — closes H1 at chunker-side)
- ADR-0034 — query expansion + RAG-Fusion(W25 F3 sibling — closes H2 at retrieval-recall-side)
- W25 plan `docs/01-planning/W25-image-association-deep-fix/plan.md` §2 F5 + §7 R6 D0 finding (iii) + §8 Q5 locked default × 0.7 weight
- CH-003 spec `docs/03-implementation/changes/CH-003-image-association-retrieval-and-citation/spec.md`(co-shipped)
- Investigation memo `docs/03-implementation/image-chunk-retrieval-investigation-2026-05-23.md`
- W25 progress `docs/01-planning/W25-image-association-deep-fix/progress.md` Day 4 entry(ADR-0035 active flip + D2 implementation log)
- BUG-025 report `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/report.md`(Sev2 + 5-whys + acceptance criteria — driver for 2026-05-25 W25.5 amendment)
- BUG-025 postmortem `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/postmortem.md`(Sev2 mandatory § 1-6 + 6 preventive controls PC1-PC6)
- CH-005 `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/`(mis-diagnosed R14 mitigation,functionally ineffective;commit `8418b57` retained as reasonable prompt improvement,frontmatter superseded-by-bug-025)
- ADR-0017 — amendment precedent(5 R8 occurrence amendments validate pattern)
