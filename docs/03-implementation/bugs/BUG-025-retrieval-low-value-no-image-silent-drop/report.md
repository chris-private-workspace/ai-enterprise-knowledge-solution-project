---
bug_id: BUG-025
title: "ADR-0035 `_apply_low_value_post_filter` asymmetric drop branch silently 誤殺 text-only low_value chunks — Q-W25-I07 「show me all the Integration scenarios」0 citations regression vs pre-W25 baseline"
severity: Sev2
status: done
reported: 2026-05-25
closed: 2026-05-25
reporter: "Chris(chat 2026-05-25 post CH-005 uvicorn restart user-eye verify;reported Q-W25-I07 仍 refuse 但「what is high level architecture」正常 → re-test cycle surfaced retrieval-side regression vs pre-W25 baseline 嘅 partial A+B scenarios return)"
affects_components: [C04]    # Retrieval Engine
spec_refs:
  - architecture.md §3.5    # "deboost" spec intent (line 258)
  - architecture.md §3.6    # ADR-0035 inline-tagged amendment locus (line 384)
  - docs/adr/0035-retrieval-low-value-soft-relax.md  # ADR being amended
  - docs/adr/0033-chunker-low-value-tuning.md  # sibling — adjacent-short-merge interaction
  - docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/  # mis-diagnosed framing,superseded by BUG-025
  - CLAUDE.md §5.1 H1       # architectural-adjacent decision → ADR amendment required
related: [CH-005, ADR-0035, ADR-0033]
---

# BUG-025 — Retrieval low_value + no-image silent drop regression(ADR-0035 asymmetric drop branch)

> **Report version**:1.0(initial)
> **Triage approver**:AI + Chris AskUserQuestion 2026-05-25 → **Sev2** consensus(silent regression,no user-visible error stack;affects text-only overview/aggregate query class;degraded but not broken — control query「what is high level architecture」仍 work)。
> **Fix approach lock**:Chris 2026-05-25 AskUserQuestion pick **Path A — symmetric deboost**(`low_value` 一律 retain × `image_weight`,remove asymmetric drop branch)+ **Amend ADR-0035**(NOT supersede)+ **Single atomic commit**(docs + code + tests)。

## 1. Symptom

### 1.1 User-observed

Chat UI(`localhost:3001/chat`)on KB「sample document with image 1」(121 chunks · 0 screenshots per UI badge):

| Query | Pre-W25 baseline | Post-W25 closeout(2026-05-24 D4)| Post-CH-005 ship(2026-05-25)|
|---|---|---|---|
| **Q-W25-I07** "show me all the Integration scenarios" | ✅ Returns scenarios A + B(text-only,no images per user feedback) | ❌ 0 citations + refuse | ❌ 0 citations + refuse(CH-005 prompt change `8418b57` 無效)|
| **Q-W25-I02** "what is high level architecture"(control) | ✅ Returns text + screenshot | ✅ 2 citations + 1 with screenshot ✅(D4 milestone) | ✅ Still cites + screenshot,no regression |

User feedback verbatim(chat 2026-05-25):
> 「現在連一些的內容也返回不了;而 query: what is high level architecture 反而沒有問題,很正常地返回了文字和圖片內容」

### 1.2 Backend symptom

LLM response always:
```
I cannot find this in the available documentation
```
0 citations returned。Synthesizer pre-ship CH-005 Rule 6 emits Rule 2 REFUSAL_PHRASE because **chunks list arriving at synthesizer is empty**(not because of「LLM refuses to synthesize partial coverage」)。

---

## 2. Root cause(post-investigation 2026-05-25)

### 2.1 Code locus

`backend/retrieval/hybrid.py:66-97` `_apply_low_value_post_filter` per ADR-0035 W25 F5 D2:

```python
if not hit.fields.get("low_value_flag", False):
    result.append(hit)              # NOT low_value → keep ✅
    continue
images_json = str(hit.fields.get("embedded_images_json", "") or "")
if images_json.strip() not in ("", "[]"):
    result.append(replace(hit, score=hit.score * image_weight))   # low_value + image → retain × 0.7 ✅
# else: low_value + no-image → SILENTLY DROPPED  ← BUG-025 culprit
return result
```

### 2.2 5-layer chain analysis

| Layer | Behavior | Effect on Integration scenarios chunks |
|---|---|---|
| **ADR-0033 chunker re-tune** | `_TOKEN_LOW_VALUE_FLOOR` 100→60 + adjacent-short-merge | Integration scenarios 章節結構通常係:section heading + 多個短 bullet/numbered scenarios A,B,C,D + 短描述。即使 floor 100→60(intended *減少* low_value count),adjacent-short-merge logic 可能令鄰近細 chunks merge → cluster 嘅 token 提升但 **某些 chunks 仍被 flag low_value**(尤其結構碎散嘅 list-like content)|
| **ADR-0035 server-side filter shift** | `_DEFAULT_FILTER = "enabled eq true"`(removed `low_value_flag eq false`) | Azure Search 返回 includes low_value chunks(intent:讓 client-side post-filter selective retain) |
| **ADR-0035 client-side post-filter `_apply_low_value_post_filter`** | **Asymmetric drop**:low_value + image → retain × 0.7;**low_value + no-image → DROP** | Integration scenarios 多數係 **text-only(無 embedded image)→ silently dropped** at this layer。Synthesizer 收到 empty list → refuse |
| **CH-003 F5 D1 citation neighbour-image attach** | `attach_neighbour_images` chunk_index ±3 window | 唔 trigger — synthesizer 都冇 cite 任何 chunk,neighbour attach 冇 anchor |
| **CH-005 Rule 6 synthesizer overview-aggregate handling** | `Based on available documentation:` framing | 唔 trigger — 因為 documentation list empty,Rule 2 REFUSAL_PHRASE prevails |

### 2.3 ADR-0035 spec intent divergence

`architecture.md §3.5 line 258` literal wording:「Soft floor:chunk text < 100 tokens flag `low_value_chunk`(index 但 **deboost** retrieval)」— **deboost** = 降分但保留於 retrieval pool。

ADR-0035 implementation:
- ✅ Image-bearing low_value:retain × 0.7 deboost(match spec intent)
- ❌ Text-only low_value:**drop**(violates spec「deboost」intent for image-less subset)

ADR-0035 Context section line 73-74 self-justified text-only drop:「preserve W2 exclusion semantics for non-image low_value(TOC entries / version statements 真係不應該 surface)」— **assumption errored**:assumed text-only low_value = TOC/version-statement noise,but empirically includes legitimate content like **scenario enumeration sections**。

### 2.4 Why W25 verification missed this

- **F4 LIVE RAGAs eval** deferred(R8/Azure-key-bound per ADR-0017 umbrella)→ 30+ query coverage gap
- **F6 manual user-test** partially ran 2/8 queries(W25 D4「what is high level architecture」+ Q-W25-I07 first sighting)→ surfaced R14 finding but **mis-diagnosed as synthesizer-side over-refuse**(because partial-A+B-pre-baseline 對比被 elide 喺 D4 retro)
- **`test_hybrid_searcher_image_low_value.py` 12/19 tests** asserted「low_value + no-image → dropped」expected behavior — **tests 確認咗 wrong behavior**(spec interpretation error in test design,not implementation bug)

### 2.5 5 Whys

1. **Why did Q-W25-I07 return 0 citations?** → Synthesizer received empty chunks list。
2. **Why was the chunks list empty?** → ADR-0035 `_apply_low_value_post_filter` dropped all retrieved Integration-scenarios chunks。
3. **Why were Integration-scenarios chunks low_value + no-image?** → ADR-0033 chunker flagged them low_value due to short token count;chunks have no embedded images(text-only enumeration)。
4. **Why does the post-filter drop text-only low_value?** → ADR-0035 design assumed text-only low_value = TOC/version-statement noise(per ADR §73-74 alternatives analysis)— assumption errored for scenario-enumeration content。
5. **Why was the assumption not validated empirically before W25 closeout?** → W25 F4 LIVE eval deferred + F6 manual user-test sample size 2/8 → coverage gap allowed mis-diagnosed framing(R14 synthesizer-side)to land。

---

## 3. Severity rationale(Sev2)

| Criterion | Assessment |
|---|---|
| **User-visible severity** | Silent regression — query returns refuse text not error stack;user thinks「documentation 真係冇」when actually retrieval-pruned |
| **Affected query class** | Text-only overview/aggregate queries on KB containing low_value-flagged enumeration sections — non-trivial subset |
| **Workaround available** | None at user level(no UI knob);Backend `image_weight ≤ 0` degenerate is wrong direction |
| **Production impact** | Pre-Beta — caught W25 closeout user-test cycle before W16+ rollout |
| **Spec divergence** | ADR-0035 implementation **violates own spec intent**(§3.5 "deboost" wording)for text-only low_value subset |
| **Regression direction** | **Pre-W25 partial work**(A+B return)→ **post-W25 complete refuse** — net negative for this query class |

→ **Sev2** consensus(per PROCESS.md §4 severity matrix):**Sev1** reserved for production-down / data-loss / Beta-cohort-affecting;**Sev2** = significant degradation,pre-Beta caught,mandatory postmortem。

---

## 4. Fix scope(Chris pick 2026-05-25 — Path A symmetric deboost)

### 4.1 Code change

`backend/retrieval/hybrid.py:66-97` `_apply_low_value_post_filter` — **remove asymmetric drop branch**;low_value 一律 retain × `image_weight`(symmetric deboost):

```python
def _apply_low_value_post_filter(hits, *, image_weight):
    """Post-filter low_value chunks per ADR-0035 W25 F5 D2 + BUG-025 W25.5 amendment.

    Symmetric deboost (post BUG-025 — matches architecture.md §3.5 "deboost" spec intent):
    - low_value_flag=True → retain with score × image_weight (regardless of image presence)
    - low_value_flag=False → keep unchanged
    - image_weight ≤ 0 degenerate → drop all low_value (A/B measurement branch preserved)
    """
    if image_weight <= 0:
        return [h for h in hits if not h.fields.get("low_value_flag", False)]
    result = []
    for hit in hits:
        if hit.fields.get("low_value_flag", False):
            result.append(replace(hit, score=hit.score * image_weight))
        else:
            result.append(hit)
    return result
```

Karpathy §1.3 surgical envelope:single function ~10 LOC + module-header comment update。No other code touch needed in `hybrid.py`(server-side filter `_DEFAULT_FILTER = "enabled eq true"` unchanged;`image_weight` field unchanged;callers unchanged)。

### 4.2 Tests update

`backend/tests/test_hybrid_searcher_image_low_value.py` — invert drop-expectations to retain-expectations(test design error fix per §2.4):

| Existing test | Action |
|---|---|
| `test_low_value_with_images_retained_with_weight` | **Preserved unchanged**(symmetric behavior covers this case)|
| `test_low_value_without_images_dropped` | **Rename + invert** → `test_low_value_without_images_retained_with_weight_per_bug_025` + assert retained × weight |
| `test_low_value_empty_string_images_dropped` | **Rename + invert** → `test_low_value_empty_string_images_retained_per_bug_025` |
| `test_low_value_whitespace_images_dropped` | **Rename + invert** → `test_low_value_whitespace_images_retained_per_bug_025` |
| `test_non_low_value_unchanged_regardless_of_images` | **Preserved unchanged** |
| `test_mixed_hits_preserve_order_and_apply_selectively` | **Revise**:5 hits → expected 5 retained(was 4),low_value+empty now retained × 0.5 = 0.35 |
| `test_image_weight_knob_override_empirical_tuning` | **Preserved unchanged** |
| `test_image_weight_zero_degenerate_drops_all_low_value` | **Preserved unchanged** — degenerate path drops all low_value as A/B branch |
| `test_image_weight_negative_treated_as_zero` | **Revise**:single low_value+image hit assert dropped(degenerate negative branch — symmetric drop-all)|
| `test_empty_hits_returns_empty` | **Preserved unchanged** |
| `test_missing_low_value_field_treated_as_false` | **Preserved unchanged** |
| `test_missing_embedded_images_json_treated_as_empty` | **Rename + invert** → `test_missing_embedded_images_json_treated_as_low_value_retained_per_bug_025` |
| `test_default_filter_no_longer_contains_low_value_clause` | **Preserved unchanged** |
| `test_default_image_weight_matches_plan_locked_default` | **Preserved unchanged** |
| `test_hybrid_searcher_default_image_weight` | **Preserved unchanged** |
| `test_hybrid_searcher_explicit_image_weight_override` | **Preserved unchanged** |
| `test_hybrid_search_payload_filter_drops_low_value_clause` | **Preserved unchanged** |
| `test_hybrid_search_applies_post_filter_to_response_low_value` | **Revise** integration expect:3 retained(was 2)— text-only low_value now retained × 0.7 |
| `test_hybrid_search_image_weight_override_at_search_time` | **Preserved unchanged** |

→ **4 inverted + 2 revised + 13 preserved = 19 total**(net count unchanged;assertion semantics revised in 6 tests)。

### 4.3 ADR-0035 amendment

Per Chris pick 2026-05-25「amend ADR-0035」(precedent ADR-0017 5 amendments):

- Add **NEW section** "Amendment 2026-05-25 W25.5 BUG-025 — symmetric deboost"
- Explain Sev2 BUG-025 trigger + design assumption error(§2.3)+ symmetric deboost evolution
- Update §3.6 inline-tagged amendment text in `architecture.md`(remove asymmetric drop wording)
- Update Decision section (b) code block to symmetric deboost
- Update Consequences section if needed

### 4.4 Out of scope(NOT touched)

- ADR-0033 chunker low-value flagging logic(unchanged — `low_value_flag` semantics remain at chunker;BUG-025 only changes **retrieval policy** on the flag)
- ADR-0034 query expansion + RAG-Fusion(unchanged)
- CH-003 citation neighbour-image attach(unchanged — `attach_neighbour_images` will now fire more often as more chunks reach synthesizer's citation pool)
- CH-005 prompt content(`prompt_builder.py` Rule 6 + `query_reformulator.py` EXAMPLE 3 retained — reasonable improvements for overview/aggregate framing semantics,functionally orthogonal to retrieval-side fix)
- Reranker / Cohere / Embedding model(unchanged)
- Frontend(unchanged)
- Per-KB knob promotion(out of scope per ADR-0035 Alternative D — speculative for Tier 1)

---

## 5. Acceptance Criteria

1. `_apply_low_value_post_filter` symmetric deboost implementation matches §4.1 code spec
2. `test_hybrid_searcher_image_low_value.py` 19 tests pass(6 revised semantics + 13 preserved)
3. `pytest tests/` full regression pass(1024 baseline preserved)
4. `mypy --strict --explicit-package-bases retrieval/hybrid.py` zero new errors
5. `ruff check retrieval/hybrid.py tests/test_hybrid_searcher_image_low_value.py` clean
6. ADR-0035 amended with NEW section + Decision (b) code block update + §3.6 inline-tag in architecture.md updated
7. RISK_REGISTER updated:R14 flip to「Mis-diagnosed」status;NEW R15 entry with Sev2 → Mitigated
8. CH-005 spec frontmatter updated:status approved → superseded-by-BUG-025(retention rationale documented)
9. **Live user-eye verify**:Q-W25-I07「show me all the Integration scenarios」on KB「sample document with image 1」returns citations(target ≥ 2 — A+B scenarios at minimum,matching pre-W25 baseline);control「what is high level architecture」no regression
10. Sev2 mandatory postmortem written in `postmortem.md`(per PROCESS.md §4)

---

## 6. Risks + Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1** Path A symmetric retain reintroduces TOC/version-statement chunks pollution at top_k | Medium | Medium(rank distortion possible — push 走 relevant chunks)| Score × 0.7 deboost should keep low_value chunks ranked **below** non-low_value;F6 manual verify will catch if image-bearing low_value crowds top_k(R7 W25 pre-existing risk preserved)|
| **R2** Test count drift(19 tests preserved but 6 revised)complicates regression count tracking | Low | Low | Update commit message + progress.md explicit「19 tests preserved,6 semantics revised」note;pytest count remains 1024 baseline |
| **R3** Postgres `messages.citations` JSONB persisted with low_value chunks from pre-BUG-025 retrieval state may now surface different citation set when user reloads conversation | Low | Low | Conversation history shows pre-stored citations(server returns from `messages` table);new chat sessions get new retrieval state;no backward-incompat |
| **R4** ADR amendment instead of supersede may confuse future readers about decision boundary | Low | Low | NEW section "Amendment 2026-05-25 W25.5 BUG-025" + status flip "Accepted; amended 2026-05-25" makes evolution explicit;precedent ADR-0017 5 amendments validates pattern |
| **R5** Sev2 postmortem 5-whys may surface 系統性 governance gap re W25 F4/F6 deferral coverage | Medium | Medium(preventive control needed)| Postmortem will catalog detection gap + recommend「any retrieval-policy change requires ≥ 5-query manual user-test across query class taxonomy(image-bearing + text-only overview/aggregate + targeted)before W{N}-closeout」as preventive control |

---

## 7. Timeline

- **2026-05-24 W25 D4** — Q-W25-I07 first sighting + R14 mis-diagnosed framing recorded in session-start.md §11
- **2026-05-25 same-session as CH-005 ship** — Chris user-eye verify post uvicorn restart → confirmed CH-005 ineffective → AI investigation surfaced R15 retrieval-side root cause + Chris pick Path A + amend ADR-0035 + single commit
- **2026-05-25 NOW** — BUG-025 report + checklist + progress + postmortem drafting → code + tests change → verify gates → user-eye retry → commit

---

## 8. References

- ADR-0035 `docs/adr/0035-retrieval-low-value-soft-relax.md`(being amended)
- ADR-0033 `docs/adr/0033-chunker-low-value-tuning.md`(sibling — chunker flagging logic unchanged)
- ADR-0017 `docs/adr/0017-r8-corp-proxy-mitigation.md`(amendment precedent — 5 amendments validated pattern)
- CH-005 `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/`(superseded by BUG-025 but commit `8418b57` retained per Chris pick)
- W25 plan `docs/01-planning/W25-image-association-deep-fix/plan.md` §2 F5 + §7 R6 D0 finding (iii) + §8 Q5 locked default × 0.7 weight
- W25 progress `docs/01-planning/W25-image-association-deep-fix/progress.md` Day 4 R14 finding entry
- `backend/retrieval/hybrid.py:66-97`(implementation locus)
- `backend/tests/test_hybrid_searcher_image_low_value.py`(test design error)
- `architecture.md §3.5` line 258 "deboost" spec intent
- `architecture.md §3.6` line 384(ADR-0035 inline-tagged amendment locus — to be re-amended)
- Session-start.md §11 R14 entry(framing to be revised to「mis-diagnosed → R15」)
- CLAUDE.md §5.1 H1 architectural-adjacent decision discipline
- PROCESS.md §4 Bug-fix workflow + Sev2 mandatory postmortem rule
