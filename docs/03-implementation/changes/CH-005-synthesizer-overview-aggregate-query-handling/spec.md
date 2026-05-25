---
change_id: CH-005
title: "Synthesizer overview-aggregate query handling — Rule 6 + F3 reformulator prompt strengthening (R14 mitigation — MIS-DIAGNOSED, superseded by BUG-025)"
status: superseded-by-bug-025  # draft | proposed | approved | active | done | cancelled | superseded-by-X
created: 2026-05-24
approved: 2026-05-24       # Chris batched accept gate chat 2026-05-24「Accept spec — proceed implementation」
superseded: 2026-05-25     # post user-eye verify proved synthesizer-side fix functionally ineffective; root cause re-attributed to retrieval-side R15 per BUG-025
target_completion: 2026-05-24  # W25 carry-over same-session per AI compression precedent
supersedes_status_note: |
  Implementation commit `8418b57` (Rule 6 SYSTEM_PROMPT add + EXAMPLE 3 REFORMULATOR_SYSTEM_PROMPT add)
  RETAINED per Chris pick 2026-05-25 — prompts are reasonable improvements for overview/aggregate
  framing semantics independent of retrieval-side root cause. CH-005 R14 framing mis-diagnosed
  (synthesizer-side over-refuse) — true root cause was C04 retrieval-side `_apply_low_value_post_filter`
  asymmetric drop (low_value + no-image → silent drop) which produced empty chunks list at synthesizer,
  bypassing Rule 6 trigger condition (need ≥1 chunk to "Based on available documentation: synthesize").
  See `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/` for root cause
  analysis + Sev2 postmortem + 6 preventive controls PC1-PC6. CH-005 spec content + tests preserved
  for audit trail; R14 entry in RISK_REGISTER flipped to "Mis-diagnosed, superseded by R15".
affects_components: [C05]    # C05 Generation Pipeline (both Synthesizer + F3 Query Reformulator live in C05)
spec_refs:
  - architecture.md §3.1               # Query pipeline + Synthesizer + L2 CRAG (Reformulator already inline-tagged per ADR-0034)
  - architecture.md §3.2               # R4 hallucination mitigation pattern (citation-required prompt + refusal threshold)
  - RISK_REGISTER.md R14               # Synthesizer overview-query refuse pattern (W25 D4 NEW finding)
  - CLAUDE.md §1.2                     # Karpathy simplicity-first (prompt content edit only)
  - CLAUDE.md §1.3                     # Karpathy surgical (touch only the 2 prompt files)
related:
  - ADR-0011                           # W6 D2+D5 prompt tweak +0.85pp lift was NOT ADR-tracked (prompt content = implementation detail precedent)
  - ADR-0034                           # F3 reformulator + REFORMULATOR_SYSTEM_PROMPT scope (CH-005 strengthens within ADR-0034 scope)
  - Memory project_synthesizer_overview_refuse_w25_d4.md  # W25 D4 finding catalogue
---

# CH-005 — Synthesizer overview-aggregate query handling

> **Spec version**:1.0(initial)
> **Owner**:AI(implementer)/ Chris(approver)
> **Approved by**:Chris(batched accept gate chat 2026-05-24「Accept spec — proceed implementation」per CH-003 precedent)

---

## 1. Context (Why)

### 1.1 Trigger

W25 D4 user-test 2026-05-24 surfaced **NEW R14**(`RISK_REGISTER.md` §3 R14):

| Query shape | Result post-W25 Path III ship | Diagnosis |
|---|---|---|
| **Section-targeted**(eg.「what is high level architecture」)| **2 citations + 1 with screenshot ✅**(first-ever post-W25 milestone)| F1+F3+F5 D1+F5 D2 complete chain works |
| **Overview-aggregate**(eg. Q-W25-I07「show me all the Integration scenarios」)| **0 citations + LLM refuse**「I cannot find this in the available documentation」 | **Synthesizer-side strictness untouched 5th layer**(synthesizer Rule 2 emits REFUSAL_PHRASE despite retrieval surface contains scenario A-E chunks)|

**Empirical evidence chain**:
- F1 chunker fix(ADR-0033)closes H1 at chunker-side(low_value 60% → ~lower ratio)
- F3 query expansion + RAG-Fusion(ADR-0034)surfaces **29 unique chunks** for Q-W25-I07(vs single hybrid retrieve 5)
- F5 D2 retrieval relax(ADR-0035)retains image-bearing low_value chunks with × 0.7 weight
- F5 D1 citation neighbour-image attach(W25 D3 shipped)attaches ±3 window images

**But synthesizer Rule 2**(per `backend/generation/prompt_builder.py:24`):
> "If the retrieved chunks do not contain enough information, reply with exactly the phrase 'I cannot find this in the available documentation' — do NOT hallucinate."

**LLM judgment for overview-aggregate queries**:看到 mix of meta/intro chunks(eg. §X-summary「five end-to-end scenarios covering...」)+ scenario A-E partial chunks → **judges「not enough information for the FULL aggregate」 → emits REFUSAL_PHRASE**。

### 1.2 Why a Change(not Bug-fix)

- **NOT a regression**:R4 hallucination guard(citation-required + refusal threshold)working as designed per spec §3.2;Rule 2 emits REFUSAL_PHRASE correctly given current prompt content
- **Behavior refinement**:overview-aggregate queries deserve「partial synthesize + note gaps」instead of full refuse;modify prompt to teach LLM the distinction
- **PROCESS.md §1 classification**:「modify Z」signal = **Change**(not Bug-fix);R14 documented as「**CH-005 candidate**」at W25 closeout per RISK_REGISTER

### 1.3 Why NOT Bug-fix or Trivial classification

- **Not Bug-fix** — refuse-on-low-confidence is **intentional** R4 mitigation per spec §3.2;Rule 2 working as designed
- **Not Trivial** — spec-level behavior refinement;needs spec.md + acceptance criteria + risks documentation per PROCESS.md §3 binding R1

---

## 2. Scope

### 2.1 In scope

**(i) Synthesizer prompt tuning**(`backend/generation/prompt_builder.py`):

- Add **NEW Rule 6** to `SYSTEM_PROMPT` for overview/aggregate query handling:
  > 「For overview / aggregate queries(e.g. 'show me all X', 'list all Y', 'describe the integration scenarios'),synthesize what IS available from the chunks even if coverage is partial;explicitly note any gaps via 'Based on available documentation:' framing rather than refusing entirely. Only emit the refusal phrase(Rule 2)when chunks are **completely off-topic** — not when partial coverage exists.」
- Existing Rules 1-5 preserved exactly:citation-required(1)+ refusal phrase(2)+ direct one-sentence answer(3)+ language match(4)+ no fabricated chunk_ids(5)

**(iii) F3 reformulator prompt strengthening**(`backend/generation/query_reformulator.py`):

- Add **NEW EXAMPLE 3** to `REFORMULATOR_SYSTEM_PROMPT` covering scenario/business-process patterns:
  > EXAMPLE 3:
  > Original: "show me all the integration scenarios"
  > Good variants: ["customer service request submission API integration", "Saga-style multi-system orchestration pattern", "inbound event-driven flow Service Bus"]
  > Bad variants: ["all integration scenarios", "every integration pattern", "list integration use cases"]
- Existing Examples 1-2(deployment options + auth flows)preserved
- F3 D4 RAG-Fusion + RRF k=60 mechanism unchanged

**Tests**:

- `backend/tests/test_prompt_builder.py`(NEW or extend existing):assert SYSTEM_PROMPT contains Rule 6 keyword「overview / aggregate」+ Rule 2 REFUSAL_PHRASE preserved
- `backend/tests/test_query_reformulator.py`:assert REFORMULATOR_SYSTEM_PROMPT contains「EXAMPLE 3」keyword + scenarios pattern
- Regression:full pytest baseline preserved(1013 pre-CH-005 → 1013+ post-CH-005 expected;prompt content changes don't affect 19 reformulator tests + existing chat tests)

### 2.2 Out of scope

- **CRAG threshold lowering**(candidate (ii)per R14)— DEFERRED per AskUserQuestion design pick(stream path doesn't run CRAG;唔 affect chat refuse experience;possible H1 trigger needs separate ADR-0037)
- **F4 LIVE RAGAs eval verify** — separate W25 CO_W25_F4 carry-over(R8/Azure-key-bound;CH-005 acceptance verified via dev-backend chat user-test)
- **F6 full 5-query manual user-test** — separate CO_W25_F6_expansion carry-over;CH-005 verify via 2-query control(Q-W25-I07 refuse target + 「high level architecture」preserve-cite control)
- **`<ImageGallery>` frontend rendering change** — backend prompt-only change;frontend 零改動 expected
- **Synthesizer model swap** — Azure OpenAI GPT-5.5 vendor unchanged per H2

---

## 3. Design Decisions

### 3.1 Rule 6 phrasing — preserve refusal mechanism

**Decision**:Rule 6 instructs **partial synthesize** for overview/aggregate queries,**but** explicitly preserves Rule 2's REFUSAL_PHRASE for completely-off-topic chunks(R4 hallucination guard intact at spec §3.2 level)。Refuse mechanism NOT removed;only refined emission condition。

**Why**:Per CLAUDE.md §5.1 H1 boundary analysis,prompt content tuning per ADR-0011 W6 D2+D5 prompt tweak precedent(was NOT ADR-tracked)= implementation detail。Rule 2 mechanism preservation 保持 spec §3.2 R4 mitigation interface stable。

### 3.2 「Based on available documentation:」framing prefix

**Decision**:Rule 6 specifies「Based on available documentation:」prefix when synthesizing partial coverage。

**Why**:
- Signals to user that response is partial-coverage(transparency)
- Prevents LLM from confidently overstating coverage when chunks are incomplete
- Aligns with citation-required Rule 1(every fact cited)— gaps are made explicit alongside cited content

### 3.3 EXAMPLE 3 scenario keywords — domain-specific

**Decision**:F3 reformulator EXAMPLE 3 uses scenario-specific vocabulary(「Customer service request submission API integration」/「Saga-style multi-system orchestration」/「inbound event-driven flow Service Bus」)matching Drive corpus actual content per Q14 corpus clarification W11 D2(D365 F&O ERP user manuals;Integration scenarios = Customer Service / Saga / Event-driven patterns)。

**Why**:
- Teaches LLM to decompose「all the X」into **specific instances** with domain vocab
- Avoids「list all X / every X / show X options」weak variants(already covered by Example 1's bad-variants section)
- Empirically grounded(matches actual `sample-doc-with-image-1` content per W25 D3 user observation)

### 3.4 Prompt-only changes — no module signature change

**Decision**:Both edits are **string content** changes — `SYSTEM_PROMPT` constant in `prompt_builder.py` + `REFORMULATOR_SYSTEM_PROMPT` constant in `query_reformulator.py`。Zero signature change to PromptMessages dataclass / build_prompt() / QueryReformulator class。

**Why**:Karpathy §1.3 surgical envelope holds tightly — single attribute edit per file;no caller change;existing tests don't break。

---

## 4. Acceptance Criteria

Per PROCESS.md §3 acceptance + R14 mitigation candidate (i)+(iii)目標:

1. **CH-005 spec approved by Chris**(batched accept gate post-review)
2. **`backend/generation/prompt_builder.py:SYSTEM_PROMPT`** add NEW Rule 6 per §2.1 (i)spec — Rules 1-5 preserved
3. **`backend/generation/query_reformulator.py:REFORMULATOR_SYSTEM_PROMPT`** add NEW EXAMPLE 3 per §2.1 (iii)spec — Examples 1-2 preserved
4. **NEW or extended unit tests**:
   - assert SYSTEM_PROMPT contains「overview / aggregate」keyword + REFUSAL_PHRASE preserved
   - assert REFORMULATOR_SYSTEM_PROMPT contains「EXAMPLE 3」keyword + scenarios pattern
   - existing 19 reformulator tests + chat tests preserved
5. **Regression**:full `pytest tests/` baseline preserved(post-CH-005 expected ≥ 1013 passed,strictly net + N tests)
6. **mypy `--strict`**:zero new errors on touched files
7. **ruff**:clean
8. **User-test verify**(F6 partial):via running uvicorn dev backend:
   - **Q-W25-I07**「show me all the Integration scenarios」expected behavior:**NOT refuse**;synthesize partial coverage with「Based on available documentation:」framing + citations to chunks
   - **Control**「what is high level architecture ?」expected behavior:**still works**(2 citations + 1 with screenshot preserved per W25 D4 baseline);no regression on section-targeted queries
9. **CH-005 progress.md Day-N entries**:document implementation log per PROCESS.md §3.4
10. **CH-005 status flow**:draft → approved(batched accept gate)→ active → done(post-commit)

---

## 5. Implementation Plan

### 5.1 Sequence

1. **CH-005 spec.md drafted** ← this artifact
2. **Chris batched accept gate**(AskUserQuestion post-spec-review per CH-003 precedent)
3. **Implementation**:
   - `backend/generation/prompt_builder.py` — SYSTEM_PROMPT Rule 6 add
   - `backend/generation/query_reformulator.py` — REFORMULATOR_SYSTEM_PROMPT EXAMPLE 3 add
4. **NEW or extended unit tests**:
   - `backend/tests/test_prompt_builder.py`(NEW)— assert Rule 6 + REFUSAL_PHRASE preserved
   - `backend/tests/test_query_reformulator.py` extend — assert EXAMPLE 3 keyword
5. **Regression verify**:`pytest tests/` + `mypy --strict` + `ruff check`
6. **CH-005 progress + checklist + W25 carry-over close mention**
7. **CH-005 commit** `feat(generation): CH-005 synthesizer overview-aggregate query handling + reformulator EXAMPLE 3 — R14 mitigation`
8. **User-eye verify** via running uvicorn dev backend(Q-W25-I07 refuse target + control query)— document result in progress
9. **RISK_REGISTER R14 status update** `Living status: 🔴 Open → 🟡 Mitigated`(per CH-005 ship + user-test verify)

### 5.2 Effort estimate

- Spec drafting(this session):~0.4h
- Implementation 2 prompt edits:~0.3h
- NEW unit tests:~0.5h
- Regression run + mypy + ruff:~3.2h(full pytest 185s dominates)
- CH-005 progress + checklist:~0.3h
- User-eye verify via running uvicorn:~0.3h
- **Total ~5h**(consistent with CH-003 D4 ~5.7h pattern;governance-heavy with full regression run)

### 5.3 Rollback plan

Single-commit rollback:revert `backend/generation/prompt_builder.py` + `backend/generation/query_reformulator.py` → returns to W25 closeout baseline behavior(REFUSAL_PHRASE emission on overview queries restored)。

Test files rollback independent if needed。Settings knobs unchanged(no new feature flag for Rule 6 — direct prompt embedding per Karpathy §1.2 simplicity)。

---

## 6. Risks (Change-Specific)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **R4 hallucination regression** — Rule 6 too permissive → LLM synthesizes from completely-off-topic chunks(violates R4 mitigation pattern §3.2)| Low-Med | **High** | Rule 6 explicit「Only emit refusal phrase Rule 2 when chunks are COMPLETELY off-topic — not when partial coverage exists」+ user-test verify with off-topic control query if needed |
| R2 | **Rule 6 phrasing ambiguous** — LLM interprets「partial coverage」inconsistently across query distribution | Med | Med | Empirical adjust via prompt tweak iteration(per W6 D2+D5 prompt tweak precedent);R14 mitigation candidate (ii) CRAG threshold fallback if Rule 6 alone insufficient |
| R3 | **EXAMPLE 3 vocab too domain-specific** — F3 reformulator over-fits to Customer Service / Saga / Event-driven pattern → poor variants for non-D365 corpora | Low | Low | Tier 1 scope = Drive corpus(D365 F&O per Q14)— matches EXAMPLE 3 vocab;Tier 2 multi-corpora may need per-KB prompt template(out of W25 scope) |
| R4 | **Section-targeted query regression** — Rule 6 instruction confuses LLM on simple targeted queries(eg.「what is X」)→ unnecessarily applies「Based on available documentation:」framing | Low | Low | Rule 6 explicit「For overview/aggregate queries」trigger phrase signals LLM to gate behavior;control query「what is high level architecture」verifies preserve via user-test |
| R5 | **Test coverage gap** — prompt content tests verify keyword presence only,not actual LLM behavior(LLM-judge tests too expensive)| Med | Low | F6 manual user-test 2-query verify(Q-W25-I07 + control)= empirical signal;F4 LIVE RAGAs eval W26+ measures full metric impact |

---

## 7. References

- ADR-0011 W6 D2+D5 prompt tweak precedent(W6 prompt tweak +0.85pp lift was NOT ADR-tracked — prompt content = implementation detail per CLAUDE.md §5.1 H1 analysis)
- ADR-0034 query expansion + RAG-Fusion(F3 reformulator scope — EXAMPLE 3 strengthens within ADR-0034 envelope;no new ADR)
- `backend/generation/prompt_builder.py:18-27` Synthesizer SYSTEM_PROMPT current state
- `backend/generation/query_reformulator.py:47-81` Reformulator SYSTEM_PROMPT current state
- `RISK_REGISTER.md` R14 entry — Synthesizer overview-query refuse rate(W25 D4 NEW finding)
- Memory `project_synthesizer_overview_refuse_w25_d4.md` — pattern catalogue + 3 mitigation candidates documented at W25 closeout
- W25 plan §1.1 Path III scope(retrieval + delivery layer 4-pronged;synthesizer-side untouched 5th layer surfaced post-ship)
- W25 progress.md Day 5 retro section — CO_W25_R14 carry-over framing
- CLAUDE.md §5.1 H1 boundary(prompt content tuning NOT triggering H1 per ADR-0011 precedent)
- CLAUDE.md §1.2 simplicity-first + §1.3 surgical(2 file edits + 2 tests in scope)
- PROCESS.md §3 Change lifecycle
