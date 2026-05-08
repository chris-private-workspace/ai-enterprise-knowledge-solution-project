# Drive Project Corpus Scope Clarification — W11 D2 Discovery

**Date**: 2026-06-10(W11 Day 2)
**Discovered by**: Chris Lai — W11 D2 Path A `/query` smoke test against personal Azure dev tier(`ekp-dev-backend--0000007`,bound to Drive KB index `ekp-kb-drive-v1`)
**Filed under**: `docs/03-implementation/`(governance memo,non-arch,non-bug,non-change per CLAUDE.md §2 routing)
**Status**: Active — clarification recorded;eval-set-v1 design refresh pending W11+ cohort traffic accumulation
**Owner**: Chris Lai

---

## 1. 發現

W11 D2 Path A `/query` smoke test 對 personal Azure dev tier ACA backend 執行 corpus-aligned query。Top retrieved chunks **全部來自** 一份 doc:

```
DRIVE_User_Manual_0605_GL_FNA-General_Ledger_Management
```

呢份 doc 內容係 **Microsoft Dynamics 365 Finance & Operations**(D365 F&O)嘅 General Ledger / Allocation Rules / 員工操作指引 — Ricoh **內部使用** D365 F&O 處理 ERP workflow 嘅 user manual,**唔係** Ricoh MFP(Multi-Function Printer)product manual。

## 2. 與 eval-set-v0 placeholder 假設嘅 mismatch

`docs/eval-set-v0.yaml` line 7-8 + 53-58 自我 disclaim PLACEHOLDER 假設:

```yaml
# 1. 所有 query 由 architect 基於 generic「Ricoh MFP user manual」假設 synthesize
#    出嚟,並未對應實際 100 份 manual 內容。

domain_assumption:
  primary: "Ricoh MFP (Multi-Function Printer) — print/copy/scan/fax operations"
  confidence: "low — based on generic Ricoh product family,not actual corpus inspection"

validation_status: "UNVALIDATED — all queries are placeholders awaiting SME review"
```

W6 D5 final eval baseline(Recall@5=0.9722 / Faithfulness=0.927 / Answer Relevancy=0.876 / Latency p95=4.2s)係喺 **synthetic placeholder query** 之上 measure pipeline mechanism correctness。**真實 D365 F&O domain SME-labeled query distribution** 後 metric 會自然 variance(上下浮動屬 reasonable Beta cohort signal range)。Mechanism baseline **依然 valid** — 測量嘅係 retrieval pipeline + reranker + synthesizer mechanism correctness,不是 domain answer ground truth。

## 3. 與 architecture.md 嘅 reconciliation(NO frozen spec violation)

`docs/architecture.md`(v5 frozen)§1.4 + §3.5 + §4.3 寫:

- §1.4:「Drive Project — Ricoh internal user manuals」
- §3.5:「100 份 Ricoh manuals onboarded as first KB」
- §4.3:「KB 1: drive_user_manuals (first use case)」

呢啲 wording 屬 **generic framing**。**D365 F&O 員工操作指引** 屬「Ricoh internal user manuals」嘅其中一個 sub-category — **Ricoh 員工內部使用 D365 F&O 處理 ERP workflow 嘅 user manual**。**唔違反** frozen spec content lock(per CLAUDE.md §4.4)— 只係 clarification of WHICH Ricoh internal manuals 屬 first use case scope。

**No architectural change**;**no H1 trigger**;**no ADR required**(per CLAUDE.md §5.1)。

## 4. Implication

### 4.1 Q14 SME labeling scope(decision-form.md Q14 仍 Resolved)

- **Labeler**:Chris Lai(`chris.lai@rapo.com.hk`,self-assigned 2026-05-01)— **unchanged**
- **Domain knowledge requirement clarification**:Chris 對 D365 F&O 員工操作指引域 familiarity 屬 implicit assumption(原 explicit assumption MFP product family);若需要 deeper D365 F&O domain 校驗,可 escalate 到 D365 F&O power user as fallback labeler(Tier 2 fallback path,non-blocking)
- **中期 fallback unchanged**:LLM-judge first pass + Chris verify(R2 risk mitigation per architecture.md §8.1)
- **Q14 status**:`Resolved` 保留(labeler decision unchanged;corpus scope clarification 屬 implementation detail,non-decision)

### 4.2 Eval-set-v0 lifecycle

- Current placeholder queries(MFP-assumed 35 條 / 30 main + 5 OOS)**保留 as is** — header self-disclaim PLACEHOLDER + UNVALIDATED + confidence: low 已 explicit
- W6 D5 final eval baseline mechanism-level validity unchanged
- 後續 SME 標註 redo on real D365 F&O queries 屬 W11+ cohort traffic-fed iteration scope
- **eval-set-v0.yaml file 不動** — placeholder warning header 已足夠(line 7 generic「Ricoh MFP user manual」假設 wording remains accurate descriptor of original 假設,不需 retroactive edit)

### 4.3 Eval-set-v1 design refresh

- Real cohort queries(W11+ cohort traffic 累計)會自然 surface D365 F&O domain query distribution
- W12 EoW 預計 cohort signal volume sufficient(per W11 plan F5.1 Q15 weekly signal report cycle)
- Eval-set-v1 draft(`docs/eval-set-v1-draft.yaml`)refresh timing:**W11+ rolling**,non-blocking governance
- **No W11 D2 action** — discovery surfaced,refresh 屬 W12+ cohort signal-fed iteration

### 4.4 Beta plan v1 §2 SME labeling task

- Scope adjustment:domain alignment note 加 D365 F&O reference 喺 SME guideline 細節
- **Carry-over consolidation**:W11 D5 retro consolidation territory per CLAUDE.md §10 R5(non-blocking;不喺 W11 D2 提前 modify Beta plan v1)

### 4.5 Architecture.md §1.4 generic framing

- 「Ricoh internal user manuals」wording **保留 unchanged** — sub-category clarification 屬 implementation detail,non-arch,non-frozen-spec-affecting
- Beta phase 100 docs onboarding(architecture.md §1.5)實際 100 docs 屬 D365 F&O 員工指引 family(per W2 D2 sanity report 6 sample docs Word style consistency confirmed across `FNA-AR/AP/FA/CB/GL/BM` family)

## 5. Open carry-over(W11 D5 retro consolidation territory)

- **Eval-set-v1 draft refresh**:post W11+ cohort traffic accumulation;W12 EoW signal review cycle gate
- **Beta plan v1 §2 SME labeling guideline**:domain alignment note(D365 F&O reference)— W11 D5 retro batch
- **W11 D2 progress.md cross-ref**:已 anchor 喺 §3 governance findings #1(per anchor edit 2026-06-10)
- **W11 D5 retro item #2**:已 consolidate 入 W11 D5 retro carry-over list(Drive Project corpus = D365 F&O Q14 SME labeling scope clarification)

---

## 6. Cross-reference index

| Reference | Path | Section |
|---|---|---|
| Frozen spec generic framing | `docs/architecture.md` | §1.4 + §3.5 + §4.3 |
| Eval-set-v0 placeholder header | `docs/eval-set-v0.yaml` | line 1-27 + 53-60 |
| W11 D2 discovery raw entry | `docs/01-planning/W11-staged-rollout-25/progress.md` | Day 2 §3 governance findings #1 |
| Q14 SME labeler decision | `docs/decision-form.md` | Q14 row |
| W2 D2 sanity report docs family | `docs/01-planning/W02-multi-format-ingestion/progress.md` | Day 2 sanity sub-block |
| W11 D5 retro carry-over list | `docs/01-planning/W11-staged-rollout-25/progress.md` | Day 2 末段 carry-over consolidated |

---

**Memo lifecycle**:呢份 clarification memo 唔 evolve;若 corpus scope 再變化(e.g. Tier 2 expand to MFP product manuals as second use case),寫新 memo cross-ref 呢份。

**End of memo**
