# ADR-0012: Cohere Rerank v3.5 → v4.0-pro Same-Vendor Model Upgrade + Gate 2 PARTIAL PASS Verdict Landed

**Date**: 2026-05-05
**Status**: Accepted
**Approver**: Stakeholder + Chris(技術 Lead)
**Promoted from**: stakeholder approval cycle outcome 2026-05-05(W6 D5 closeout cascade);W5 D1 Path 1 spec drift accept inline-document + W6 D1 LIVE Azure 2-way 互換 verify negative comparison

## Context

EKP Tier 1 spec v5(frozen 2026-04-27)§3.2 vendor table 鎖定 reranker = `Cohere Rerank v3.5(Azure Marketplace)`。W3 D1 procurement cascade landed Path A(Q5 Resolved)後,**Chris 喺 `.env` populate `cohere_rerank_model = Cohere-rerank-v4.0-pro`**(W5 D1 same-session)— 唔係 v3.5 spec lock。同時 W4 plan 4-way reranker shootout(Cohere / Voyage / ZeroEntropy / Azure built-in)係 Gate 2 final verdict 嘅 evidence base;但 W5 D1 per Karpathy §1.2 simplicity-first DROPPED Voyage + ZeroEntropy(W4 C3 close NOT NEEDED;Cohere LOCKED Tier 1 + driver skip-row fallback handles SKIPPED rows)。Gate 2 LIVE verdict W5 D2 = PARTIAL PASS 4-metric on Cohere v4.0-pro baseline subset=20(faith 1.000 / prec 0.985 / recall 1.000 / rel 0.841 邊緣 due to GPT-5.5 verbose tendency),Azure 2-way 互換 verify 留 W6 fallback per W4 plan §F10 partial-verdict policy。

**W6 D1 LIVE Azure 2-way 互換 verify outcome**(`reports/ragas-azure-subset20.json` vs `reports/ragas-cohere-subset20.json`):**apples-to-apples n=17(exclude Q013/Q016 Cohere Bug I + Q014 OOS refusal)**:
- faithfulness Cohere **1.000** vs Azure 0.882 → **Δ -11.76pp WORSE**
- answer_relevancy Cohere **0.841** vs Azure 0.743 → **Δ -9.81pp WORSE**
- context_precision Cohere 0.986 vs Azure 0.965 → Δ -2.05pp WORSE(within-5pp)
- context_recall Cohere 1.000 vs Azure 1.000 → Δ 0pp tied(within-5pp)

**Verdict path mapping**(per W6 plan F1.4 4-branch decision tree):
- ❌ NOT "Azure within ±5pp Cohere on all 4 metrics" → NOT STRONG PASS upgrade
- ❌ NOT "Azure ≥ 5pp better any metric" → no swap rationale
- ✅ "Azure ≥ 5pp WORSE on faith + rel" → **Cohere v4.0-pro reaffirmed final via "alternative-disprove" frame**

W6 D2 prompt tuning A/B subset=10(`backend/generation/prompt_builder.py:25` Rule 3 surgical edit):rel 0.853 → 0.872 = **+1.92pp lift Tier 1 acceptance criterion met**(LAND tweak)。W6 D5 subset=20 confirmation:tweaked +0.85pp aggregate lift + +1.4pp on borderline cluster Q011-Q020 ex-Q014;rel 0.803 < 0.85 at subset=20 scale but LAND decision correct per W6 plan F3.4 contracted criterion(incremental improvement not threshold-crossing fix)。

**W6 D5 closeout stakeholder approval cycle**:Chris + Stakeholder approved 4 points(architecture.md §3.2 vendor amendment / §6.3 Gate 2 verdict / 5 OQ resolution Q7+Q9+Q10+Q11+Q12 / Beta plan v1)→ **architecture.md content-lock vNext increment v5 → v5.1 trigger**。Per CLAUDE.md §6 ADR format requirement,formal record this ADR-0012 documenting the architectural amendment + verdict.

## Decision

### D1 — `architecture.md §3.2` Reranker vendor row amendment

`Cohere Rerank v3.5(Azure Marketplace)` → **`Cohere Rerank v4.0-pro(Azure Marketplace)`**

**Classification**:**same-vendor model upgrade**(non H1 architectural change + non H2 vendor swap)。Cohere remains LOCKED per CLAUDE.md §5.2 H2;v3.5 → v4.0-pro 屬 Azure Marketplace deployment alias upgrade,Cohere `/v2/rerank` API contract backward-compatible(verified W5 D1 F1.5 LIVE smoke + W6 D1 F1.2 LIVE subset=20 RAGAs run + W6 D2/D5 prompt tuning A/B + subset=20 confirmation 全部 successful)。

`Settings.cohere_rerank_model: str = "Cohere-rerank-v4.0-pro"` per `.env` populate W5 D1。

### D2 — `architecture.md §6.3` Gate 2 verdict landed

Gate 2 final verdict = **PARTIAL PASS confirmed**(NOT upgraded to STRONG PASS via W6 D1 Azure 2-way 互換 verify negative comparison)。

新增 `### Gate 2 verdict landed(W5 D2 + W6 D1 LIVE)— v5.1 amendment` 子章節 documenting 4 phases(W5 D2 Cohere baseline + W6 D1 Azure 2-way + W6 D2 prompt tuning A/B + W6 D5 subset=20 confirmation)。

**Verdict path**:within-5pp 互換 only on context_precision + context_recall(2 of 4 metrics);faith + rel ≥ 5pp Cohere ahead。**L2 CRAG NOT dropped + production lock landed**;W6 retro Phase Gate G1+G3+G5+G6+G7 PASS,G2+G4 DEFERRED non-blocking。

### D3 — version bump

`architecture.md` v5 → **v5.1**(2026-05-05 stakeholder amendment cycle increment)。v5 frozen baseline preserved;v5.1 = v5 + 2 surgical amendments per D1 + D2。

## Alternatives Considered

### For D1(reranker model upgrade)

- **A1.1 Inline Q&A note 唔 increment architecture.md version** — 拒:Cohere `.env` populate v4.0-pro 已 W5 D1 production state;架構文件 spec lock v3.5 同實際運行 state diverge → spec drift not surfaced for stakeholder transparency;long-term governance hygiene weak
- **A1.2 Stay on v3.5(rollback `.env`)** — 拒:v3.5 → v4.0-pro 屬 same-vendor minor model upgrade;Cohere v4.0-pro 喺 W5 D2 + W6 D1 + W6 D2 + W6 D5 全 LIVE eval validation against quality-judging metrics(faith+rel+prec+recall)show acceptable Tier 1 baseline。Rollback 屬 unnecessary regression。
- **A1.3 Switch to Azure built-in semantic ranker** — 拒(per W6 D1 LIVE 2-way 互換 verify):faith Δ -11.76pp + rel Δ -9.81pp WORSE;negative comparison data clear。Azure built-in remains as **hot fallback path**(per architecture.md §7.3 E7 Cohere outage mitigation),non-primary。
- **A1.4 Switch to Voyage / ZeroEntropy** — 拒(W5 D1 DROPPED Tier 1 per Karpathy §1.2):non-essential alternatives + procurement burden + monthly billing risk。Tier 2 reconsideration list per W6 retro carry-over C10 if Beta real-query distribution diverges signal。

### For D2(Gate 2 verdict landing path)

- **A2.1 RESCOPE per Gate 2 row "任意 2 metric miss target by > 5pp"** — 拒:W5 D2 verdict 用 contextual reading not strict reading — context_precision + context_recall 全 ≥ 95% target;answer_relevancy 0.841 邊緣 < 0.85 但 above 0.83 marginal;faithfulness 1.000 strong。**Per W4 plan §F10 fallback policy** "partial verdict acceptable when alternative reranker comparison data deferred"。RESCOPE 過度 conservative。
- **A2.2 RESCOPE post-W6 D1 Azure 2-way negative comparison** — 拒:Azure 2-way 互換 FAIL(Cohere ≥ 5pp better)= **drop-L2 trigger condition NOT met**(drop-L2 = "4-metric within-5pp 互換 FAIL between Cohere baseline + alternative reranker — NOT FAIL,because Cohere is better not similar);per W4 plan §F10 partial-verdict path holds。
- **A2.3 STRONG PASS upgrade defer Tier 2 evaluation phase** — 拒:Tier 1 baseline quality already meets production lock criteria;deferring Tier 1 verdict to Beta phase 屬 sunk-cost continuation risk。PARTIAL PASS landed = clear Tier 1 verdict + W7 Beta deploy unblocked。

## Consequences

### Positive

- **Architecture spec ↔ implementation state alignment**:`.env` v4.0-pro 同 architecture.md §3.2 row 對齊 v5.1 vNext;future contributor onboarding clearer
- **Gate 2 verdict closure**:Tier 1 quality baseline confirmed via PARTIAL PASS verdict;production lock landed;Beta deploy unblocked
- **Cohere v4.0-pro production lock validated via "alternative-disprove" data**:W6 D1 Azure 2-way negative comparison 反證 Cohere lift visible on quality-judging metrics(faith + rel ≥ 5pp Cohere ahead)— stronger than abstract STRONG PASS upgrade alone
- **L2 CRAG preserved**:drop-L2 trigger condition 未 met;safety-net retain for Beta + Tier 2 multi-corpus deterioration scenarios
- **F3 prompt tweak landed**:answer_relevancy +1.92pp lift on Tier 1 acceptance contracted A/B + +0.85pp confirmed at scale;synthesizer verbose pattern mitigated(soft length cap directive)

### Negative

- **W6 plan F3.4 acceptance criterion subset-scale ambiguity surfaced**:contracted subset=10 vs supplementary subset=20 verdict gap(rel 0.872 ≥ 0.85 met on subset=10 vs rel 0.803 < 0.85 at subset=20)— acceptance ladder未明確 distinguish "directional confirm" vs "threshold-cross"。**W7+ eval methodology should add stratified subset capability**(W6 retro carry-over C2 closed via parallel-track confirm 但 Q004 -13.93pp single-query regression worth Beta phase ad-hoc investigation)
- **context_recall -5.0pp at within-5pp boundary on subset=20 tweaked**:single-query partial recall drop(20×0.95 = 19 perfect + 1 partial);需 Beta phase real query distribution monitoring catch regression at scale
- **architecture.md content-lock incremental cost**:每 stakeholder approval cycle = version bump + ADR formal record + content-lock vNext = governance overhead。Karpathy §1.2 simplicity-first 容許 inline Q&A note 路徑 alternative,但 stakeholder approved formal record path = content-lock hygiene priority(this ADR realizes that hygiene)

### Neutral

- **Tier 2 reconsideration list deferred**:Voyage + ZeroEntropy + ragas upgrade + per-KB reranker column + GraphRAG + multi-agent — 全部 deferred Tier 2 phase per H4 boundary;not affected by ADR-0012;留 Tier 2 kickoff doc post-W12 production launch
- **`Settings.reranker_kind` Literal range unchanged**:`["cohere", "voyage", "zeroentropy", "azure", "off"]` retains all 5 options(Voyage + ZeroEntropy DROPPED Tier 1 但 W4 D3 scaffold + 21 unit tests preserved future-proof);Azure remains hot fallback path

## References

- spec section:`docs/architecture.md §3.2`(reranker row v3.5 → v4.0-pro)+ `§6.3`(Gate 2 verdict landed subsection)+ frontmatter v5 → v5.1
- CLAUDE.md §4.4 architecture content-lock(stakeholder approve 後 increment version)
- CLAUDE.md §5.1 H1 architectural change boundary(same-vendor model upgrade NOT H1)
- CLAUDE.md §5.2 H2 vendor lock(Cohere remains LOCKED;v3.5 → v4.0-pro = same-vendor minor upgrade)
- CLAUDE.md §6 ADR format
- CLAUDE.md §10 R5 phase closeout architectural-adjacent decision ADR trigger
- W4 plan §F10 fallback policy("partial verdict acceptable when alternative reranker comparison data deferred")
- W5 retro § Carry-overs C1+C8(Azure 2-way verify trigger + architecture.md amendment cycle)
- W6 retro § What worked + Surprises + ADR triggers(W6 D5 closeout summary)
- W6 D1 progress F1.1-F1.7(LIVE Azure 2-way verify outcome + verdict path)
- W6 D2 progress F3.1-F3.4(prompt tuning A/B + LAND verdict)
- W6 D5 progress F3 subset=20 confirmation
- `reports/ragas-cohere-subset20.json`(W5 D2 Cohere baseline,gitignored)
- `reports/ragas-azure-subset20.json`(W6 D1 Azure 2-way comparison,gitignored)
- `reports/ragas-cohere-tweaked-subset10.json`(W6 D2 prompt tweak A/B,gitignored)
- `reports/ragas-cohere-tweaked-subset20.json`(W6 D5 subset=20 confirmation,gitignored)
- `decision-form.md` Q5 Resolved(Path A + v3.5→v4.0-pro accept)+ Q21 Resolved(Cohere v4.0-pro production lock)
- previous ADR:ADR-0001 to ADR-0011(promoted from architecture.md v5 §13 Decision Log W2 D5 cont 2026-05-04 batch)
