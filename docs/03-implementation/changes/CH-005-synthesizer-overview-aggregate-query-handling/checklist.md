---
change_id: CH-005
spec_ref: ./spec.md
status: complete
last_updated: 2026-05-25
---

# CH-005 — Checklist

> Derived from `spec.md §4 Acceptance Criteria` + §5 Implementation Plan。
> (i) Synthesizer prompt tuning + (iii) F3 reformulator prompt strengthening,bundled per AskUserQuestion 2026-05-24 user pick「Combined (i) + (iii) batched」+ batched accept gate「Accept spec — proceed implementation」。

## (i) Synthesizer prompt tuning — Rule 6 add(per R14 mitigation candidate (i))

### Implementation
- [x] **i.1** — `backend/generation/prompt_builder.py:SYSTEM_PROMPT` add NEW **Rule 6** for overview / aggregate queries:「synthesize what IS available even if coverage is partial;use 'Based on available documentation:' framing;refuse phrase only for completely-off-topic chunks」+ CH-005 R14 mitigation attribution comment
- [x] **i.2** — Rules 1-5 preserved exactly(citation markers / refusal phrase / direct answer + 150 words / multi-language / never fabricate chunk_ids)
- [x] **i.3** — `REFUSAL_PHRASE` module constant unchanged(R4 hallucination guard mechanism preserved)

### Verification
- [x] **i.4** — `pytest tests/test_prompt_content_ch005.py -v` → **5 synthesizer tests pass**(Rule 6 overview/aggregate / partial-coverage framing / refusal preserve for off-topic / Rules 1-5 preserved / CH-005 attribution comment)

## (iii) F3 Reformulator prompt strengthening — EXAMPLE 3 add(per R14 mitigation candidate (iii))

### Implementation
- [x] **iii.1** — `backend/generation/query_reformulator.py:REFORMULATOR_SYSTEM_PROMPT` add NEW **EXAMPLE 3** covering「show me all the integration scenarios」decomposition:
  - Good variants(domain-specific):「customer service request submission API integration」/「Saga-style multi-system orchestration pattern」/「inbound event-driven flow Service Bus」
  - Bad variants(anti-patterns):「all integration scenarios」/「every integration pattern」/「list integration use cases」
- [x] **iii.2** — Examples 1-2 preserved exactly(deployment options + authentication flows)
- [x] **iii.3** — Decomposition rule (2) + STRICTLY JSON output contract preserved

### Verification
- [x] **iii.4** — `pytest tests/test_prompt_content_ch005.py -v` → **6 reformulator tests pass**(EXAMPLE 3 keyword / Good variants domain vocab / Bad variants anti-patterns / Examples 1-2 preserved / decomposition rule / JSON contract)

## Tests + Verify gates

- [x] **T1** — NEW `backend/tests/test_prompt_content_ch005.py` **11 tests** covering all CH-005 spec §4 acceptance items 2-4(SYSTEM_PROMPT Rule 6 + Rules 1-5 preserve;REFORMULATOR_SYSTEM_PROMPT EXAMPLE 3 + 1-2 preserve)
- [x] **T2** — `pytest tests/test_prompt_content_ch005.py -v` → **11/11 pass** in 2.59s
- [x] **T3** — `pytest tests/` full regression → **1024 passed + 25 skipped + 0 failed**(pre-CH-005 baseline 1013 → **+11 net IMPROVED**)
- [x] **T4** — `mypy --strict --explicit-package-bases generation/prompt_builder.py generation/query_reformulator.py` → **zero new errors from CH-005**(15 pre-existing tech debt errors unchanged — `prompt_builder.py:35 messages: list[dict]` bare dict + OpenAI SDK overload errors,Karpathy §1.3 surgical envelope holds — captured as CO_CH005_mypy_debt for future W26+ batch)
- [x] **T5** — `ruff check generation/prompt_builder.py generation/query_reformulator.py tests/test_prompt_content_ch005.py` → **All checks passed**(ruff auto-fix applied to test file import sort I001 — single blank-line adjustment)

## ADR + governance

- [x] **G1** — H1 boundary analysis surfaced per CH-005 spec §1 + Investigation step pre-AskUserQuestion → **NOT H1 trigger**(prompt content tuning per ADR-0011 W6 D2+D5 precedent;Rule 2 REFUSAL_PHRASE mechanism preserved;EXAMPLE 3 within ADR-0034 scope envelope)
- [x] **G2** — Chris batched accept gate 2026-05-24 AskUserQuestion 2-step:(1) Combined (i)+(iii) candidate pick;(2) Accept spec — proceed implementation
- [x] **G3** — CH-005 spec.md status flow:draft → approved 2026-05-24
- [x] **G4** — Zero new dependency(H2 vendor lock preserved)
- [x] **G5** — `RISK_REGISTER.md` R14 update:Living status 🔴 Open → 🟡 Mitigated(pending user-eye verify confirmation per C9 below)— **deferred to C9 post-verify step**

## Closeout

- [x] **C1** — H1 architectural change:**N/A**(prompt content tuning per ADR-0011 precedent)
- [x] **C2** — H2 vendor change:N/A(zero new dep)
- [x] **C3** — H3 Dify reference:N/A
- [x] **C4** — H4 Tier 1 only:N/A
- [x] **C5** — H5 secrets:N/A(prompt content only)
- [x] **C6** — H6 test coverage:**+11 NEW tests** covering Rule 6 + EXAMPLE 3 + Rules 1-5 preserve + Examples 1-2 preserve
- [x] **C7** — H7 design fidelity:N/A(backend-only)
- [x] **C8** — Commit references progress entry per CLAUDE.md §10 R2(will tag on commit)
- [x] **C9** — Commit:`feat(generation): CH-005 synthesizer overview-aggregate query handling + reformulator EXAMPLE 3 — R14 mitigation`(pending this commit)
- [ ] **C10** — User-eye verify against Q-W25-I07 via running uvicorn dev backend:**deferred — needs user permission to restart uvicorn process** OR user-execution via chat UI(W25 D4 precedent)→ R14 status flip 🔴 → 🟡 conditional on verify confirmation
- [x] **C11** — CH-005 progress.md Day 1 entry + spec.md frontmatter approved → done(post-commit)
