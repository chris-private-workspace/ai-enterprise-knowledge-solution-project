---
deliverable: F3 — Path A Setting tune + multi-run reproducibility verify
phase: W29-reformulator-diagnose
date: 2026-05-26
inputs: [f1-1, f1-2, f1-3, f1-4, f1-5, f2-root-cause]
fix_path: Path A surgical (per_variant_overfetch + rrf_k env override)
---

# W29 F3 — Path A Tune Evidence

## Iteration matrix

| Iter | `per_variant_overfetch` | `query_expansion_rrf_k` | Result |
|------|------------------------:|------------------------:|--------|
| **baseline (pre-W29)** | 4 (env) / 2 (Settings default) | 60 (Settings default) | citations=1, ZERO §8.x walkthrough in top-5 |
| **v1**                | 8 (env override)               | 30 (env override)       | citations=2, §8.4 walkthrough cited(single run) |
| **v2** (more aggressive) | 12 (env override)            | 15 (env override)       | citations=1, REGRESSION(too aggressive RRF k=15 → top-rank-in-each-variant 過重 → intro-chunk dominance restored)|
| **v1 reverted**        | 8 (env override)               | 30 (env override)       | 5-run reproducibility test below |

## v1 5-run reproducibility evidence

Backend reloaded via `touch backend/storage/settings.py` + WatchFiles auto-reload。 5 curl POST /query Q-W25-I07 back-to-back:

| Run | Citations | Walkthrough cited | §8.x in top-5 | Top-5 IDs (chunk-NNNN) | Cited IDs |
|----:|----------:|------------------:|--------------:|-------------------------|-----------|
| 1   | 1         | 0                 | 0             | 0044/0036/0008/0017/0038 | 0044 |
| 2   | 2         | **1 (§8.4)**      | 1             | 0044/0008/0039/0036/**0051** | 0044/**0051** |
| 3   | 1         | 0                 | 0             | 0044/0008/0036/0018/0017 | 0044 |
| 4   | 1         | 0                 | 0             | 0044/0008/0036/0039/0042 | 0044 |
| 5   | 1         | 0 (§8.4 surfaced top-5 but synthesizer 未 cite) | 1 | 0044/0008/0036/**0051**/0042 | 0044 |

## Aggregate stats(5 runs v1)

| Metric | Pre-W29 baseline | W29 F3 v1 | Delta |
|---|---|---|---|
| Walkthrough chunk surfaced top-5 | 0/N (estimate 0%) | **2/5 = 40%** | **+40pp** retrieval-side improvement ✅ |
| Walkthrough chunk cited | 0/N (estimate 0%) | **1/5 = 20%** | **+20pp** synthesizer-side improvement(marginal)|
| Citations count avg | 1.0 | 1.2 | +0.2 |
| refused | True (W25 D4 baseline) | False 5/5 | already closed W25.5+W26-W28 |

## G1 PRIMARY gate evaluation(per plan §3)

G1 acceptance: ≥ 2 distinct A-E walkthrough citations(exclude chunk-0044 intro / chunk-0001 TOC / chunk-0008 / chunk-0036 by-system)。

**Result**:**0/5 runs achieved G1 strict** — Run 2 cited 1 walkthrough(§8.4)but G1 requires ≥ 2 distinct walkthrough chunks。

| G1 tier | Pass rate |
|---|---|
| **G1 strict (≥ 2 distinct §8.x walkthrough cited)** | 0/5 = **0% FAIL** |
| G1 relaxed (≥ 1 §8.x walkthrough cited) | 1/5 = 20% marginal |
| G1 relaxed^2 (any §8.x surfaced top-5) | 2/5 = 40% confirmed |

→ **G1 strict FAIL** → trigger PARTIAL closeout per Q4 measurement-experiment-fail-policy + path (ii) elevate W30+ per user pre-chosen fallback。

## Bottleneck shift analysis

Pre-W29 baseline:
- **Retrieval-side**:0% §8.x walkthrough top-5 surface
- **Synthesizer-side**:0% §8.x walkthrough citations(因 retrieval 唔 surface)

W29 F3 v1 post-tune:
- **Retrieval-side**:40% §8.x walkthrough top-5 surface(per_variant_overfetch=8 + rrf_k=30 successfully diversified RRF pool)
- **Synthesizer-side**:20% §8.x walkthrough citations(50% of top-5 surfaced events get cited — Run 2 cited / Run 5 NOT cited)

**Bottleneck shifted**:from「§8.x doesn't surface」(retrieval layer)to「synthesizer inconsistently cites §8.x even when surfaced」(synthesizer prompt layer)。

Run 5 is critical evidence:**§8.4 chunk-0051 喺 top-5 position 3,但 synthesizer 只 cite chunk-0044 intro** — chunk-0051 was AVAILABLE for citation but LLM chose not to cite。 此屬 path (i) synthesizer prompt territory(W29 Surgical scope OUT)。

## F3 Setting decision

`per_variant_overfetch=8 + rrf_k=30` **PRESERVE as .env env override** for W29 phase + W30+ baseline。

**Not flipping Settings.py default**(per Q4 measurement-experiment-fail-policy):
- 40% retrieval improvement YES + synthesizer cite improvement marginal NO
- Result does NOT meet「clear measurable production win」threshold for default flip
- Same condition as W28 `enable_parent_doc_retrieval=False` preserved despite parent-doc Setting tune progress(W28 G3 borderline)
- `Settings.query_expansion_per_variant_overfetch = 2`(default)+ `Settings.query_expansion_rrf_k = 60`(default)remain UNCHANGED
- `.env` env override values surface in dev environment only

## W30+ candidate path (i) elevate

NEW W19+ candidate **(i') synthesizer system prompt tune** elevated to HIGHEST priority post-W29 PARTIAL closeout:

- **Surgical mechanism**(per memory `project_synthesizer_overview_refuse_w25_d4.md` path (i)):
  - Option A:add「synthesize from collective context rather than refuse」instruction
  - Option B:relax cite-confidence threshold(若 chunk content overlap with answer paragraph > X% → cite)
  - Option C:explicit「prefer specific section chunks (e.g. §X.Y individual walkthroughs) over general overview chunks (e.g. §X intro)」directive
- Evidence base:Run 5 chunk-0051 §8.4 surfaced top-5 但 synthesizer 未 cite → synthesizer cite-decision layer 係 unmitigated bottleneck
- Estimated effort:~2-3 days(synthesizer prompt iteration + Q-W25-I07 5-run cite rate measurement)
- Risk:synthesizer prompt change may regress 其他 query 嘅 cite quality;需要 sanity check eval-set-v0-w25-supplement 13 queries

W30+ candidate (i') > (ii') CRAG threshold trial(H1 boundary,higher risk)。

## Conclusion

W29 F3 Path A 部分成功 — **retrieval-side bottleneck cleared**(40% §8.x top-5 surface,+40pp vs baseline)but G1 strict acceptance criteria FAIL because **synthesizer-side citation behavior is the remaining cap**(only 20% cite rate even when §8.x retrieved)。

Per user 預先 fallback pick:F4 closeout PARTIAL + path (i) synthesizer prompt elevate W30+(redirected from original path (ii) CRAG threshold per Run 5 evidence — synthesizer prompt surgical vs CRAG threshold systemic)。
