---
change_id: CH-005
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: in-progress
last_updated: 2026-05-25
---

# CH-005 — Progress

> Daily progress + 結尾 retro per PROCESS.md §3.4。
> Every commit must correspond to a Day-N entry mention(R2 binding rule)。

---

## Day 1 — 2026-05-24/25:CH-005 design + spec batched approval + implementation + verify

### Trigger

W25 D4 user-test 2026-05-24 surfaced NEW R14(Synthesizer overview-query refuse rate per `RISK_REGISTER.md` §3 R14):

- **Section-targeted query**「what is high level architecture ?」→ **2 citations + 1 with screenshot ✅**(F1+F3+F5 D1+F5 D2 Path III chain works)
- **Overview-aggregate query** Q-W25-I07「show me all the Integration scenarios」→ **0 citations + LLM refuse**「I cannot find this in the available documentation」

W25 closeout retro identified CH-005 as W26+ candidate;user (Chris) decided to tackle CH-005 same-session post-W25 closeout per W25 carry-over processing sequence(F7.5 sync done → mypy_strict_debt done → **CH-005 NOW**)。

### H1 boundary surface + Chris design pick(2026-05-24 AskUserQuestion 2-step)

**Investigation step** revealed Rule 2 in `backend/generation/prompt_builder.py:24` as direct refuse-emission source(LLM judgment「not enough information for FULL aggregate」→ emits REFUSAL_PHRASE);3 R14 mitigation candidates analyzed:

| Candidate | H1 trigger? | Diagnosis |
|---|---|---|
| **(i) Synthesizer prompt tuning** | ❌ NOT H1(prompt content per ADR-0011 W6 D2+D5 precedent)| Directly addresses root cause at refuse-emission site |
| **(ii) CRAG threshold 0.70→0.60** | ⚠️ Likely H1(`architecture.md §3.1` documented threshold)+ **stream path doesn't run CRAG → 唔解 chat refuse 問題** | Misses target;chat uses stream path |
| **(iii) F3 reformulator strengthening** | ❌ NOT H1(within ADR-0034 scope)| Retrieval-side 唔係 bottleneck(29 unique chunks already per W25 D3) |

**Chris design pick 2-step**:
1. **「Combined (i) + (iii) batched」** — comprehensive both-layer fix
2. **「Accept spec — proceed implementation」** — CH-005 spec status `draft → approved`

### Done

**1. CH-005 spec.md draft + approved**:

- `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/spec.md` v1.0(initial)
- §1 Context:R14 finding chain + Rule 2 root cause + 3-candidate analysis + Change(not Bug-fix)classification
- §2 Scope:(i) Rule 6 add + (iii) EXAMPLE 3 add + tests;Out-of-scope:CRAG / F4 LIVE / F6 full / frontend / model swap
- §3 Design Decisions:Rule 6 phrasing preserves refusal mechanism / "Based on available documentation:" framing / domain-specific EXAMPLE 3 / prompt-only changes
- §4 Acceptance Criteria 10 items
- §5 Implementation Plan with ~5h effort estimate + single-commit rollback
- §6 Risks 5 entries(R1 R4 regression / R2 ambiguous phrasing / R3 domain-vocab / R4 section-targeted regression / R5 test coverage gap)
- Status:draft → approved 2026-05-24

**2. Implementation**(2 file edits per Karpathy §1.3 surgical scope):

| File | Change |
|---|---|
| `backend/generation/prompt_builder.py` | `SYSTEM_PROMPT` add NEW **Rule 6** for overview/aggregate queries(「Based on available documentation:」framing + REFUSAL_PHRASE preserved for completely-off-topic only)+ CH-005 R14 mitigation attribution comment;Rules 1-5 preserved exactly |
| `backend/generation/query_reformulator.py` | `REFORMULATOR_SYSTEM_PROMPT` add NEW **EXAMPLE 3** covering「show me all the integration scenarios」decomposition(Good variants:domain-specific scenarios A-E;Bad variants:generic-rephrase anti-patterns);Examples 1-2 + decomposition rule + JSON contract preserved |

**3. NEW unit tests**(`backend/tests/test_prompt_content_ch005.py` 11 tests):

- 5 Synthesizer tests:Rule 6 keyword presence(overview/aggregate/show me all)+ partial-coverage framing(「based on available documentation」)+ refusal preserve for off-topic(REFUSAL_PHRASE in SYSTEM_PROMPT + "completely off-topic")+ Rules 1-5 preserve(citation markers / refusal phrase / 150 words / 繁體中文 + 日本語 / never fabricate chunk_ids)+ CH-005 R14 mitigation attribution
- 6 Reformulator tests:EXAMPLE 3 keyword + scenarios phrase / Good variants domain vocab(3 keywords)/ Bad variants anti-patterns(2 keywords)/ Examples 1-2 preserve(deployment + auth flows + Kubernetes + OAuth)/ Decomposition rule + SPECIFIC INSTANCES / JSON output contract

**4. Verify gates**:

| Gate | Result |
|---|---|
| `pytest tests/test_prompt_content_ch005.py -v` | **11/11 pass** in 2.59s |
| `pytest tests/` full regression | **1024 passed + 25 skipped + 0 failed**(pre-CH-005 baseline 1013 → **+11 net IMPROVED**) |
| `mypy --strict --explicit-package-bases generation/prompt_builder.py generation/query_reformulator.py` | **Zero new errors from CH-005**(stash verify confirmed 15 pre-existing errors unchanged — Karpathy §1.3 surgical envelope holds;captured as CO_CH005_mypy_debt for future W26+ batch) |
| `ruff check generation/prompt_builder.py generation/query_reformulator.py tests/test_prompt_content_ch005.py` | **All checks passed**(ruff auto-fix applied to test file import sort I001 — single blank-line adjustment) |

### Decisions(Day 1)

- **D1.1** — Combined (i) + (iii) batched approach over single-candidate per Chris AskUserQuestion pick:both layers address R14 from different angles;(i) at refuse-emission;(iii) at retrieval-recall;single commit boundary
- **D1.2** — Rule 6 phrasing preserves Rule 2 refusal mechanism for completely-off-topic — R4 hallucination guard at spec §3.2 level intact;Karpathy §1.3 surgical envelope
- **D1.3** — EXAMPLE 3 uses **domain-specific scenario vocab**(Customer Service / Saga-style / Event-driven flow Service Bus)matching Drive corpus actual content per Q14(D365 F&O ERP user manuals)— empirically grounded
- **D1.4** — Test approach **content-presence assertions** vs LLM-judge behavior tests:LLM-judge tests expensive(R8/Azure-key-bound umbrella per ADR-0017)+ would defeat dev-test feedback loop;content-presence catches accidental prompt regression;F6 manual user-test = empirical signal
- **D1.5** — Pre-existing 15 mypy errors(prompt_builder.py:35 `messages: list[dict]` + OpenAI SDK overloads in query_reformulator.py)NOT fixed this session per Karpathy §1.3 surgical envelope — captured as **CO_CH005_mypy_debt** future carry-over(mirror CO_W25_mypy_strict_debt pattern)
- **D1.6** — User-eye verify via running uvicorn restart deferred per session safety convention — user-execution OR explicit permission needed;R14 status flip 🔴 → 🟡 conditional on verify

### Blockers

無 functional blocker。User-eye verify against Q-W25-I07 requires uvicorn restart(prompt content reads at module load time;requires process restart to apply)— deferred per session safety convention。

### Actual vs Planned Effort

| Deliverable | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| Investigation 3-candidate analysis | 0 | ~0.3 | +0.3(R14 mitigation re-analysis)|
| CH-005 spec draft | ~0.4 | ~0.4 | 0 |
| Chris AskUserQuestion 2-step approval cycle | 0 | ~0.1 | +0.1 |
| Implementation 2 file edits(Rule 6 + EXAMPLE 3)| ~0.3 | ~0.2 | -0.1 |
| NEW unit tests 11 cases | ~0.5 | ~0.4 | -0.1 |
| ruff auto-fix import sort | 0 | ~0.05 | +0.05 |
| Stash verify pre-existing mypy errors | 0 | ~0.05 | +0.05 |
| Regression run + mypy + ruff | ~3.2 | ~2.5 | -0.7(pytest 133s faster than CH-003 D4 baseline 185s due to no async-heavy new tests)|
| CH-005 progress + checklist | ~0.3 | ~0.3 | 0 |

**Cumulative Day 1 effort**:~4.4h actual vs ~4.7h planned(consistent with CH-005 spec §5.2 ~5h estimate);**compression factor ~1.1×**(governance + verify gate add real time;backend prompt-only change keeps it lean)。

### Carry-overs to W26+

- 🚧 **C10 user-eye verify** against Q-W25-I07 via running uvicorn:**deferred — needs user permission to restart uvicorn process** OR user-execution via chat UI(W25 D4 precedent)→ R14 status flip 🔴 → 🟡 conditional on verify confirmation
- 🚧 **CO_CH005_mypy_debt** — 15 pre-existing mypy errors in `prompt_builder.py:35` + `query_reformulator.py` OpenAI SDK overloads(W26+ tech-debt batch,mirror CO_W25_mypy_strict_debt pattern)
- 🚧 **CO_W25_F6_expansion** — full 5-query manual user-test(W25 carry-over)— post-CH-005 verify if Rule 6 + EXAMPLE 3 effective on overview-aggregate distribution

### Commits

_(本 session 即將 commit)_:
- `feat(generation): CH-005 synthesizer overview-aggregate query handling + reformulator EXAMPLE 3 — R14 mitigation`(pending)

---

**End of Day 1 entry** — CH-005 implementation complete;commit + user-eye verify next。
