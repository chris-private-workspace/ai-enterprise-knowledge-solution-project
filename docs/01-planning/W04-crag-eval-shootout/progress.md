---
phase: W04-crag-eval-shootout
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: draft     # draft → in-progress → closed
---

# Phase W04 — Progress

> Daily progress + 結尾 retro。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。
> Status:`draft` 直到 W3 D5 closeout sign-off + W4 kickoff approval。

---

## Day 0 — 2026-05-04: Kickoff prep(W3 D5 末 closeout 同 session)

**Action**:Phase W04 kickoff prep(per PROCESS.md §2.3 rolling-JIT lifecycle + W3 D5 closeout 同 session per CLAUDE.md §10 R5)

- Folder `docs/01-planning/W04-crag-eval-shootout/` created
- `plan.md` filled with status=`draft`(10 deliverables F1-F10:CRAG L2 + RAGAs eval automation + 4-way reranker shootout + 20-query eval expansion + Cohere/GPT-5.5/SSE live verify + design note bumps + PPT orchestrator wire + Gate 2 verdict)
- `checklist.md` derived from plan deliverables(~70 atomic items)
- `progress.md` Day 0 entry initialized(this file)
- **Carry-over candidates from W03-chat-retrieval-citation**(per W3 retro § Carry-overs C1-C8):
  - C1 Cohere live verify → **F5**(Marketplace endpoint procurement Chris async)
  - C2 GPT-5.5 latency baseline → **F6**(Chris dev server smoke)
  - C3 SSE live verify → **F7**(Chris dev server smoke)
  - C4 Frontend dev server smoke(Chris responsibility — every-day implicit;non explicit deliverable)
  - C5 Reranker per-KB field reconsideration → post **F3** shootout outcome
  - C6 PPT orchestrator wire → **F9**
  - C7 F8 wizard polish → W7+ Beta polish window(unchanged from W3)
  - C8 plan estimates calibration → W4 plan applies 0.5x heuristic(每 deliverable 1.5-2h baseline,vs W3 plan 4-6h estimates)— see plan §2 effort
- **Gate 2 critical context**:Per architecture.md §6.3,Gate 2 4-metric within 5pp 互換 between Cohere baseline + winning shootout reranker = PASS。FAIL = drop L2 CRAG;W5 转 baseline-only scope。This is the most important quality gate of Tier 1
- **Procurement dependencies surfaced for W4 D1**:
  - Cohere Marketplace endpoint(7-14d turnaround from 2026-05-04)
  - Voyage rerank-2.5 API key(direct,non-Azure path)
  - ZeroEntropy zerank-1 API key(direct,non-Azure path)
  - Azure semantic ranker(built-in S1 SKU,no procurement)

**Status update will follow at W3 D5 closeout commit**(W3 frontmatter `active → closed` + Chris approve W4 kickoff → W4 status `draft → active`)。If W3 G2/G3 hard gates FAIL → W4 plan **does not flip active**;HALT POC per architecture.md §6.3,foundation iteration loop replaces W4。

---

## Day 1 — _(pending W4 active flip)_

_(F1 CRAG core + F8 design notes + F9 PPT orchestrator wire — see plan §5 D1)_

---

## Day 2 — _(pending)_

---

## Day 3 — _(pending)_

---

## Day 4 — _(pending)_

---

## Day 5 — _(pending)_

---

## Retro(填於 W4 D5 末)

### What worked
_(W4 D5 末 fill)_

### What didn't work / unexpected friction
_(W4 D5 末)_

### Surprises / discoveries
_(W4 D5 末)_

### Carry-overs to W05-optimization
_(W4 D5 末)_

### ADR triggers
_(W4 D5 末 — ADR-0012 reserved for Gate 2 FAIL outcome OR per-KB reranker column decision per W3 C5 carry)_

### Phase Gate 2 verdict(per plan.md §3 + architecture.md §6.3)
- G1-G6:_(W4 D5 末)_
- **Gate 2 4-metric within 5pp**:_(W4 D5 末)_ → PASS continues Tier 1 W5+ optimization;FAIL drops L2 CRAG → baseline-only

### Phase status
- Closeout commit:_(W4 D5 末)_
- Frontmatter status flipped to `closed`:_(W4 D5 末)_
- Phase W05 kickoff trigger:_(W4 D5 末 — W5 plan scope contingent on Gate 2 verdict)_

---

**End of W04 progress**(Day 0 prep stage,daily entries to follow W4 D1 onwards pending W3 D5 closeout sign-off + Chris W4 kickoff approval)
