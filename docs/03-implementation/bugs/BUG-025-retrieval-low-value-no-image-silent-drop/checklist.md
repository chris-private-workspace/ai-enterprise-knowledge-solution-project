---
bug_id: BUG-025
report_ref: ./report.md
status: done
last_updated: 2026-05-25
---

# BUG-025 — Checklist

> Derived from `report.md §4 Fix scope` + §5 Acceptance Criteria。
> Chris pick 2026-05-25:Path A symmetric deboost + Amend ADR-0035 + Single atomic commit。

## Implementation

- [x] **I1** — `backend/retrieval/hybrid.py:66-97` `_apply_low_value_post_filter` symmetric deboost rewrite(remove asymmetric drop branch;low_value 一律 retain × image_weight)
- [x] **I2** — Module header comment + module-level constant block update(lines 4-7 + 45-48 — remove「preserves W2 exclusion」wording,replace with symmetric deboost rationale + BUG-025 cross-ref)
- [x] **I3** — Function docstring revise to reflect symmetric deboost behavior;preserve `image_weight ≤ 0` degenerate documentation

## Tests

- [x] **T1** — `test_low_value_without_images_dropped` → rename `test_low_value_without_images_retained_with_weight_per_bug_025` + assert retained × 0.7
- [x] **T2** — `test_low_value_empty_string_images_dropped` → rename `test_low_value_empty_string_images_retained_per_bug_025` + assert retained
- [x] **T3** — `test_low_value_whitespace_images_dropped` → rename `test_low_value_whitespace_images_retained_per_bug_025` + assert retained
- [x] **T4** — `test_mixed_hits_preserve_order_and_apply_selectively` revise:5 hits expected 5 retained(was 4),low_value+empty now × 0.5 = 0.35 retained
- [x] **T5** — `test_image_weight_negative_treated_as_zero` revise to assert dropped(degenerate negative branch preserved as symmetric drop-all)
- [x] **T6** — `test_missing_embedded_images_json_treated_as_empty` → rename `test_missing_embedded_images_json_treated_as_low_value_retained_per_bug_025` + assert retained × 0.7
- [x] **T7** — `test_hybrid_search_applies_post_filter_to_response_low_value` integration test revise:3 retained(was 2)— text-only low_value now × 0.7
- [x] **T8** — Module-level docstring(lines 1-14)revise to reflect symmetric deboost behavior + BUG-025 cross-ref
- [x] **T9** — 13 other tests preserved unchanged(`test_low_value_with_images_retained_with_weight` / `test_non_low_value_unchanged_regardless_of_images` / `test_image_weight_knob_override_empirical_tuning` / `test_image_weight_zero_degenerate_drops_all_low_value` / `test_empty_hits_returns_empty` / `test_missing_low_value_field_treated_as_false` / `test_default_filter_no_longer_contains_low_value_clause` / `test_default_image_weight_matches_plan_locked_default` / `test_hybrid_searcher_default_image_weight` / `test_hybrid_searcher_explicit_image_weight_override` / `test_hybrid_search_payload_filter_drops_low_value_clause` / `test_hybrid_search_image_weight_override_at_search_time`)

## Documentation amendments

- [x] **D1** — `docs/adr/0035-retrieval-low-value-soft-relax.md` amend:Status「Accepted」→「Accepted; amended 2026-05-25 W25.5 per Sev2 BUG-025」;Decision (b) code block update;NEW section "Amendment 2026-05-25 W25.5 BUG-025 — symmetric deboost";References block add BUG-025 cross-ref
- [x] **D2** — `docs/architecture.md §3.6` line 384 inline-tagged amendment text update(remove asymmetric drop wording — replace with symmetric × 0.7 deboost description)
- [x] **D3** — `docs/01-planning/RISK_REGISTER.md` R14 entry status update:「🔴 Open」→「⛔ Mis-diagnosed,superseded by R15 per BUG-025」+ NEW R15 entry「ADR-0035 asymmetric drop regression → mitigated by BUG-025 Path A symmetric deboost」Sev2
- [x] **D4** — `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/spec.md` frontmatter:`status: approved` → `status: superseded-by-bug-025`;add changelog note explaining commit `8418b57` retained per Chris pick(prompts reasonable improvements but functionally orthogonal to root cause)
- [x] **D5** — `docs/12-ai-assistant/01-prompts/01-session-start.md` §11 R14 entry framing update(Mis-diagnosed → R15 per BUG-025);add W25.5 BUG-025 closeout row to §10 sprint timeline

## Verification gates

- [x] **V1** — `pytest tests/test_hybrid_searcher_image_low_value.py -v` → **19/19 pass**(6 revised semantics + 13 preserved)
- [x] **V2** — `pytest tests/` full regression → **1024 baseline preserved**(no new fail;test count unchanged)
- [x] **V3** — `mypy --strict --explicit-package-bases retrieval/hybrid.py` → zero new errors
- [x] **V4** — `ruff check retrieval/hybrid.py tests/test_hybrid_searcher_image_low_value.py` → clean
- [x] **V5** — Restart uvicorn(`backend/.venv` Python + `--reload`)+ `/health` 200 confirm
- [x] **V6** — User-eye chat UI Q-W25-I07 retry → expect ≥ 2 citations(scenario A+B at minimum;matching pre-W25 baseline);control「what is high level architecture」no regression
- [x] **V7** — User-eye verify confirmation reported in chat → AI flips R14 + R15 status + closes Task #208

## Postmortem

- [x] **P1** — `postmortem.md` written per PROCESS.md §4 Sev2 mandatory structure:**§1 Incident summary** + **§2 Timeline** + **§3 Root cause(5 whys)** + **§4 Detection gap analysis** + **§5 Preventive controls**(retrieval-policy change requires ≥ 5-query manual user-test across query class taxonomy before W{N}-closeout)+ **§6 References**

## Governance

- [x] **G1** — H1 boundary trigger surfaced(per CLAUDE.md §5.1)— retrieval policy change → ADR amendment(not new code without ADR)→ ADR-0035 amend per Chris pick D1 above
- [x] **G2** — Chris batched accept gate 2026-05-25 AskUserQuestion 2-step:(1)Path A symmetric deboost mitigation pick;(2)Amend ADR-0035 + single atomic commit shape pick
- [x] **G3** — BUG-025 spec.md status flow:in-progress → done(post V7 user-eye verify)
- [x] **G4** — Zero new dependency(H2 vendor lock preserved)— code-level change only on existing modules
- [x] **G5** — H5 secrets:N/A(retrieval policy code only,no env / Azure key touch)
- [x] **G6** — H6 test coverage:retrieval critical pipeline ≥ 80% preserved(19 tests + integration cover changed code paths)

## Closeout

- [x] **C1** — Commit:`fix(retrieval): BUG-025 Sev2 — symmetric deboost low_value chunks regardless of image presence (amend ADR-0035)`(single atomic commit per Chris pick)
- [x] **C2** — Commit references this checklist progress entry per CLAUDE.md §10 R2(progress.md Day 1 entry)
- [x] **C3** — BUG-025 frontmatter:`status: in-progress` → `status: done`(post V7 user-eye verify)
- [x] **C4** — Verify Task #203 completed status retained;Task #204-#209 all flip completed
- [x] **C5** — Update Task #209 with postmortem completion + RISK_REGISTER update confirmation
