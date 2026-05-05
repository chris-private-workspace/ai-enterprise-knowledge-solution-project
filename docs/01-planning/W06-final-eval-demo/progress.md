---
phase: W06-final-eval-demo
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed     # flipped active→closed 2026-05-05 W6 D5 closeout per Chris approve same-session execution
---

# Phase W06 — Progress

> Daily progress + 結尾 retro。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。
> Status:`active` 自 2026-05-05 W6 D1 Chris kickoff sign-off。

---

## Day 0 — 2026-05-04: Kickoff prep(W5 D5 末 closeout 同 session)

**Action**:Phase W06 kickoff prep(per PROCESS.md §2.3 rolling-JIT lifecycle + W5 D5 closeout 同 session per CLAUDE.md §10 R5)

- Folder `docs/01-planning/W06-final-eval-demo/` created
- `plan.md` filled with status=`draft`(6 deliverables F1-F6:Azure 2-way 互換 verify + final eval full-corpus + synthesizer prompt tuning + W4/W5 carry-overs LIVE smoke + demo prep + Beta plan + Gate 2 closeout retro)
- `checklist.md` derived from plan deliverables(~30 atomic items)
- `progress.md` Day 0 entry initialized(this file)
- **Carry-over candidates from W05-optimization**(per W5 retro § Carry-overs C1-C10):
  - C1 Azure 2-way verify → **F1**(Gate 2 STRONG PASS upgrade path)
  - C2 Bug I LIVE re-verify → **F1.5**(same trigger as F1.2 — single subset=20 run)
  - C3 RAGAs evaluator REFUSAL_PHRASE skip enhancement → optional W6 polish
  - C4 answer_relevancy GPT-5.5 verbose mitigation → **F3**
  - C5 F3 L3 routing conditional → defer post-F1 STRONG PASS landing
  - C6 W4 carry-overs LIVE smoke remainder → **F4**(Chris dev server bound)
  - C7 Q14 SME labeling cascade → **F2**(Chris async)
  - C8 architecture.md §3.2 amendment stakeholder cycle → **F6.1**
  - C9 Plan estimate calibration LIVE-heavy 1.5x / static-heavy 0.3-0.5x → applied W6 plan §2 effort estimates
  - C10 Tier 2 reconsideration list → Tier 2 kickoff doc(post W6)
- **Gate 2 STRONG PASS upgrade context**:Per architecture.md §6.3,Gate 2 STRONG PASS = 4-metric within-5pp 互換 between Cohere baseline + Azure 2-way alternative reranker。當前 Gate 2 PARTIAL PASS(W5 D2 verdict — Cohere baseline robust;Azure 2-way deferred per W4 plan §F10 fallback);F1 LIVE Azure 2-way verify 觸發 STRONG PASS upgrade path。
- **POC closeout context**:W6 closes Tier 1 12-week sprint POC phase(W1-W6 portion);W7-W8 = Beta deploy(Microsoft Entra ID + rate limiting + React polish);W9-W10 = Beta internal testing;W11-W12 = staged rollout 25% → 100% production launch per architecture.md §6.1 timeline。

**Status update will follow at W5 D5 closeout commit**(W5 frontmatter `in-progress → closed` + Chris approve W6 kickoff trigger → W6 status `draft → active`)。

---

## Day 1 — 2026-05-05: F1 Azure 2-way LIVE verify(Gate 2 STRONG PASS upgrade trigger)

**Action**:Chris W6 kickoff approve → W6 plan/checklist/progress lifecycle flip `draft → active` + dates re-anchor(原 tentative 2026-05-29 → 實際 2026-05-05;W5 closed 2026-05-04 actual);F1 Azure 2-way verify trigger Gate 2 STRONG PASS upgrade path

### Pre-flight check(R8 mitigation procedural per-session)

| Item | Status |
|---|---|
| `.env` Azure OpenAI + Cohere cred | ✅ populated(API key + endpoint + Cohere v4.0-pro deployment present)|
| `Settings.azure_semantic_config_name = "ekp-semantic-config"` | ✅ W5 D1 fix landed(was `ekp-semantic-default` typo)|
| `Settings.reranker_kind` default `cohere` | ✅ F1.1 swap target = `azure`(.env override `RERANKER_KIND=azure` 此 run only)|
| Bug I floor `max_completion_tokens=4096` | ✅ `scripts/run_ragas_eval.py:178` `min_max_completion_tokens = 4096` landed |
| `_patch_for_gpt5` monkey-patch | ✅ `_DROP_PARAMS` defensive(temperature + logprobs + top_logprobs)+ `max_tokens → max_completion_tokens` rename + 4096 floor |
| Azure OpenAI cloud reachability(curl schannel) | ⚠️ HTTP 000 + CRYPT_E_NO_REVOCATION_CHECK — corp proxy CRL/OCSP block;**curl-level only** |
| Azure OpenAI cloud reachability(Python httpx + truststore) | ✅ **HTTP 200 + valid 1024d embedding vector** — real Azure backend response |
| Azure Search semantic ranker LIVE | ✅ **HTTP 200 + `@search.rerankerScore: 2.51`** — `ekp-semantic-config` valid + built-in reranker active |

**R8 calibration update**:`curl schannel CRL revocation failure ≠ Python httpx failure`。Python OpenSSL stack(via truststore Windows cert store)by default 唔做 strict CRL/OCSP check;curl schannel **does**。W2 R8 mitigation 之前過於保守(用 curl probe 推斷 Python 都 fail)。Calibration 留 W6 retro carry-over,但 F1.2 LIVE run **UNBLOCKED** 直接可以跑。

### Plan deviation(R3)

- W6 plan dates re-anchored:`start_date 2026-05-29 → 2026-05-05`,`end_date 2026-06-04 → 2026-05-09`(plan changelog row added 2026-05-05)
- 原 tentative dates 起源 Option-A 2-day-shift heuristic obsolete(W5 D5 closed 2026-05-04 same-session,W6 D1 = today actual)

### Decisions / OQ

- Q21 status hold `Tentatively Resolved`(Cohere v4.0-pro;待 F1.4 verdict 决定 STRONG PASS upgrade upgrade OR reaffirm OR ADR-0012 trigger)
- Q5 status hold `Resolved`(Path A + v3.5→v4.0-pro accept addendum;F1.6 W6 D1 末 incremental update post-LIVE)

### F1.1 — Settings.reranker_kind=azure swap(.env override "this run only")

- `.env` append `RERANKER_KIND=azure` + comment block;`get_settings.cache_clear()` + Settings probe confirmed `reranker_kind=azure` + `azure_semantic_config_name=ekp-semantic-config`(W5 D1 fix landed)
- Post F1.2 revert applied(.env grep `RERANKER_KIND` empty + Settings cache reload `reranker_kind=cohere` default restored)

### F1.2 — RAGAs subset=20 LIVE Azure pipeline run

- Driver:`backend/.venv/Scripts/python.exe -m scripts.run_ragas_eval --eval-set docs/eval-set-v1-draft.yaml --output reports/ragas-azure-subset20.json --subset 20`
- Wall clock 11m 38s(`started_at 16:29:01 → finished_at 16:40:39 UTC`);`total_latency_ms 698433`(W5 D2 Cohere baseline 640406 — Azure +9% latency overhead)
- LIVE log signatures(`reports/ragas-azure-subset20.log`):`azure_semantic_rerank candidates_in=50 results_out=5 semantic_config=ekp-semantic-config`(Azure built-in reranker firing per query)+ `reranker_call_path=azure`
- Output:`reports/ragas-azure-subset20.json`(20/20 evaluated,0 errored)

### F1.3 — Cross-reference Cohere vs Azure(apples-to-apples)

| Metric | Cohere n=17 | Azure n=17 | Δ pp | within-5pp? | Direction |
|---|---|---|---|---|---|
| faithfulness | 1.000 | 0.882 | **-11.76pp** | ❌ | WORSE |
| answer_relevancy | 0.841 | 0.743 | **-9.81pp** | ❌ | WORSE |
| context_precision | 0.986 | 0.965 | -2.05pp | ✅ | WORSE |
| context_recall | 1.000 | 1.000 | 0.00pp | ✅ | tied |

n=17 = exclude Q013+Q016(Cohere Bug I errored W5 D2)+ Q014(OOS refusal — synthesizer prompt design correct behavior;both pipelines refused identically)
Official aggregates(Cohere n=18 / Azure n=20)show similar pattern with Δ -14.44pp / -13.11pp / -4.94pp / -5.00pp respectively

### F1.4 — Verdict landed

- ❌ NOT STRONG PASS upgrade(faith + rel ≥ 5pp WORSE — Azure 唔 within-5pp 互換 Cohere baseline)
- ❌ Azure ≥ 5pp better any metric — false(全 4 metric Azure WORSE 或 tied)
- ✅ **Azure ≥ 5pp WORSE faith + rel → Cohere v4.0-pro reaffirmed final;ADR-0012 reservation released**(neither drop-L2 / STICKY / Azure-swap trigger fired)
- **Gate 2 PARTIAL PASS confirmed**(NOT upgraded to STRONG PASS — W5 D2 verdict holds)
- Interpretation:Azure built-in semantic ranker re-orders top-50 hybrid candidates differently → top-5 chunks include slightly different content → synthesizer produces less faithful + less relevant answers despite similar coverage(prec+recall within-5pp)。Cohere v4.0-pro 嘅 Tier 1 corpus 適配優於 Azure built-in。

### F1.5 — Bug I LIVE re-verify ✅ PASS

- W5 D2 Cohere baseline:18/20 evaluated(Q013+Q016 errored — pre-floor `max_completion_tokens` ~1024 limit hit on long judge LLM responses)
- W6 D1 Azure run:**20/20 evaluated,0 errored**(`scripts/run_ragas_eval.py:178` `min_max_completion_tokens = 4096` floor confirmed)
- 7 unit tests `backend/tests/test_run_ragas_eval_patch.py` 已 W5 D4 landed verify floor logic structurally;W6 D1 LIVE 結構性 + behavioral confirmation

### F1.6 — decision-form.md Q21 + Q5 sync(R4)

- Q21 status `Tentatively Resolved` → **`Resolved`**(Cohere v4.0-pro production lock;W6 D1 LIVE Azure 2-way reaffirm via Δ deltas)
- Q5 Decision row appended W6 D1 LIVE Azure verify outcome paragraph;Date `2026-05-05` added;Status remains `Resolved`(Cohere baseline reaffirmed)
- Status Dashboard Q21 row updated:`2026-05-04 → 2026-05-05`,reason " W6 D1 LIVE Azure 2-way reaffirm — faith Δ -11.76pp + rel Δ -9.81pp WORSE → Cohere baseline final"

### F1.7 — architecture.md §3.2 + §6.3 amendment narrative(stakeholder approval cycle)

- §3.2 vendor row "Reranker baseline" amendment ticket:`Cohere Rerank v3.5 → Cohere Rerank v4.0-pro`(W5 D1 path 1 spec drift accept;W6 D1 LIVE Azure 2-way 互換 verify reaffirms Cohere lock)
- §6.3 Gate 2 verdict row amendment ticket:`Gate 2 PARTIAL PASS — answer_relevancy 0.841 (n=17 excluding Q014 OOS refusal) borderline mitigation deferred to F3 synthesizer prompt tuning W6 D2;Azure 2-way negative comparison data preserved in reports/ragas-azure-subset20.json supports Cohere v4.0-pro production lock`
- **Both amendment tickets reserved for stakeholder approval cycle**(per CLAUDE.md §4.4 architecture content-lock — AI 不單方面 edit;narrative ready for vNext increment)
- ADR-0012 reservation **released**(no architectural-adjacent decision triggered;same-vendor model upgrade + corpus-fit data already inline-documented per CLAUDE.md §10 R5 boundary)

### Pre-flight calibration update(R8 mitigation refinement,W6 retro carry-over)

- Original W2 R8 mitigation conservatively used `curl probe HTTP 000 + CRYPT_E_NO_REVOCATION_CHECK` as VPN-disconnect trigger;W6 D1 verified **curl schannel CRL revocation failure ≠ Python httpx failure**:Python OpenSSL stack(via `truststore` Windows cert store inject)by default 唔做 strict CRL/OCSP check
- W6 D1 LIVE 證實 Python truststore stack 透過 corp proxy 可達 cloud:Azure OpenAI embedding probe HTTP 200 + valid 1024d vector;Azure Search semantic probe HTTP 200 + `@search.rerankerScore`
- **Calibration carry-over**:future cloud-bound LIVE work pre-flight 應該以 Python httpx probe 為 ground truth(`backend/.venv/Scripts/python.exe -c "import truststore; truststore.inject_into_ssl(); import httpx; ..."`)而非 curl schannel,curl 失敗只表示 schannel revocation strict mode hit but Python 唔 affected
- 留 W6 retro 完整 narrate;W7+ 文件化(若 risk register active)

### Decisions / OQ summary

- **Q21**:`Resolved` — Cohere v4.0-pro final(2026-05-05 W6 D1 LIVE Azure 2-way reaffirm)
- **Q5**:`Resolved` 不變 — W6 D1 outcome appended Decision paragraph + Date row
- **Gate 2**:PARTIAL PASS confirmed(W5 D2 verdict 不變 — STRONG PASS upgrade NOT triggered)
- **ADR-0012 reservation**:released(no trigger fired)
- **F3 synthesizer prompt tuning(W6 C4)**:仍是 W6 D2 candidate(answer_relevancy 0.841 borderline → 0.85 mitigation 嘅唯一 lever — Cohere baseline reaffirmed後 only level remaining)

### Open / blocked

- ⏸ F2 final eval full-corpus 等 Chris SME chunk_id labeling cascade(W6 C7 Chris async)
- ⏸ F4 W4/W5 carry-overs LIVE smoke remainder 等 Chris dev server availability
- ⏸ F5 Demo prep + Beta plan stakeholder cycle(W7-W8 prep)
- ⏸ architecture.md §3.2 + §6.3 amendment ticket 等 stakeholder approval cycle(F1.7 narrative scaffold ready)

### Commit reference

- _(W6 D1 closeout commit pending — will reference all F1.1-F1.7 ticked + .env revert + decision-form Q21+Q5 sync)_

---

## Day 2 — 2026-05-05: F3 synthesizer prompt tuning A/B(answer_relevancy borderline mitigation)

**Action**:F3 W5 retro carry-over C4(answer_relevancy 0.841 borderline mitigation)— prompt tweak A/B subset=10 on Cohere v4.0-pro pipeline。

### F3.1 — Per-query answer_relevancy distribution analysis

W5 D2 Cohere baseline(n=18,exclude Q014 OOS):11/17 BORDERLINE 0.7-0.85 / 6/17 ≥ 0.85 / mean 0.841
W6 D1 Azure(n=17 fair):4 BAD < 0.7 / 10 BORDERLINE / 5 ≥ 0.85 / mean 0.743(W5 D2 reaffirmed Cohere baseline)
**Pattern**:**systematic verbose tendency**,not outlier。Output_tokens evidence(W6 D1 Azure log Q002-Q005):528/760/558/1103 tokens per non-refused answer — **2-4x verbose vs typical concise 100-300 tokens**。

### F3.2 — Prompt tweak design(single surgical Rule 3 change per Karpathy §1.3)

`backend/generation/prompt_builder.py:25` Rule 3:
- **Before**:`Be concise and well-structured. Use ordered lists / steps when answering procedural questions.`
- **After**:`Lead with a direct one-sentence answer to the user's question; then provide supporting details only as needed (target <= 150 words total). Use ordered lists / steps when answering procedural questions.`

Tweak rationale:RAGAs answer_relevancy LLM judge mechanism uses LLM to reverse-generate hypothetical questions from the answer + measure cosine similarity vs original question;verbose answers produce hypothetical questions that drift from original → similarity drops。"Lead with direct answer" + soft length cap directly targets the metric mechanism。Existing structure preservation("ordered lists / steps when procedural")unchanged 唔 break multi-step instructions。

Pre-flight:`backend/tests/` synthesizer 14/14 pass(non-regression structural confirm)。

### F3.3 — A/B subset=10 LIVE run

- Driver:`backend/.venv/Scripts/python.exe -m scripts.run_ragas_eval --eval-set docs/eval-set-v1-draft.yaml --output reports/ragas-cohere-tweaked-subset10.json --subset 10`
- Wall clock 8m 02s;LIVE log signature:Cohere v4.0-pro reranker firing per query(`reranker_call_path=cohere`)
- Output:`reports/ragas-cohere-tweaked-subset10.json`(10/10 evaluated,0 errored)
- Tweaked output_tokens raw:Q001=580 / Q002=439 / Q003=460 / Q004=376 / Q005=495 / Q006=476 / Q007=420 / Q008=917 / Q009=523 / Q010=466 → **mean 515 tokens**
- Indirect reference(W6 D1 Azure log Q002-Q005 baseline subset):mean ~737 tokens → **tweak ~30% verbosity reduction**(cross-pipeline reference;not apples-to-apples but directional signal aligned)

### F3.4 — Decision: LAND tweak ✅

| Metric | First-10 baseline(W5 D2 extracted)| Tweaked subset=10 | Δ pp | Within-5pp? | Direction |
|---|---|---|---|---|---|
| faithfulness | 1.000 | 0.978 | -2.20pp | ✅ | mild regress |
| **answer_relevancy** | **0.8528** | **0.8719** | **+1.92pp** | ✅ | **BETTER** |
| context_precision | 0.9837 | 0.964 | -1.97pp | ✅ | mild regress |
| context_recall | 1.000 | 1.000 | 0pp | ✅ | tied |
| errored | 0 | 0 | tied | ✅ | tied(Bug I floor 仍 active)|

**Per W6 plan F3.4 acceptance ladder**:
- ✅ **Tier 1 met**:`tweaked rel ≥ 0.85`(0.8719)→ **LAND tweak**
- ✅ faith / prec mild regression all within-5pp(non-blocking)
- ✅ recall + errored tied

**Per-query tweaked rel distribution**(ascending):
- Q010: 0.7317 BORDERLINE(was W5 D2 0.8538 — single clear regression in tweak)
- Q003: 0.8041 / Q004: 0.8271 / Q005: 0.8770 / Q008: 0.8776 / Q007: 0.8892 / Q006: 0.8896 / Q009: 0.9155 / Q001: 0.9269 / Q002: 0.9799
- 6/10 queries ≥ 0.85(was 4/10 baseline)+ mean lift +1.92pp despite Q010 single outlier regression
- Net positive lever signal — mean shifted up despite ceiling effect on first-10(Q001 baseline 0.8058 → tweaked 0.9269 = +12pp single-query lift)

**Verdict** = **LAND tweaked SYSTEM_PROMPT**;`backend/generation/prompt_builder.py` retains tweak(no rollback)。

**Caveats**:
- First-10 baseline already 0.8528 above 0.85 threshold(ceiling area);tweaked impact stronger on borderline cluster(Q011-Q020)is plausible but **not directly verified**(W6 D2 budget 限 subset=10 per W6 plan)
- W6 D3 carry-over candidate(optional,if stakeholder review wants stronger evidence):rerun subset=20 tweaked vs W5 D2 baseline → confirm borderline cluster lift同 first-10 一致
- Tier 1 acceptance criteria already met by F3.4 — caveat 唔 block W6 closeout

### Decisions / OQ

- F3 W5 carry-over C4 → **closed**(LAND verdict)
- No OQ status change(no OQ directly tied to F3 prompt tuning;C04 Generation component design refinement 屬 architectural-adjacent inline-documented per CLAUDE.md §10 R5 boundary)
- ADR boundary check:**non-ADR**(prompt content tweak 屬 implementation detail of `backend/generation/prompt_builder.py`,not §3+§4 component change;Karpathy §1.3 surgical change preserves existing component interface)

### Open / blocked

- ⏸ F2 final eval full-corpus(Chris SME chunk_id labeling cascade async)
- ⏸ F4 W4/W5 carry-overs LIVE smoke remainder(Chris dev server)
- ⏸ F5 Demo prep + Beta plan stakeholder cycle
- ⏸ F3 subset=20 tweaked confirmation(optional W6 D3 carry-over)
- ⏸ architecture.md §3.2 + §6.3 amendment ticket(F1.7 narrative ready;stakeholder approval cycle)

### Commit reference

- _(W6 D2 closeout commit pending — will reference F3.1-F3.4 ticked + prompt_builder.py:25 tweak + reports/ragas-cohere-tweaked-subset10.json comparison data gitignored)_

---

## Day 3 — 2026-05-05: F5 Demo prep + Beta plan(static-heavy AI-doable solo)

**Action**:Candidate readiness scan → F2 BLOCKED(SME labeling 3/55 not cascaded)+ F4 BLOCKED(Chris dev server not up)+ F3 optional cost($15-25)→ **F5 selected(zero-cost,4 artifact outputs,no external dep)**

### Pre-flight readiness scan

| Candidate | Readiness signal | Status |
|---|---|---|
| F2 SME labeling | `validated:true` count = 3/55(target ≥ 45);last commit 2026-05-04 W4 D2 — no recent SME activity | 🛑 BLOCKED Chris async |
| F3 subset=20 | optional ~$15-25 USD;Tier 1 acceptance W6 D2 already met | 🟡 OPTIONAL — defer D4 if stakeholder approves extra spend |
| F4 W4/W5 carry-overs | `curl localhost:8000` failed — dev server not running | 🛑 BLOCKED Chris dev server |
| F5 Demo prep | static-heavy + no external dep + 4 artifact outputs | ✅ SELECTED |

### F5.1 + F5.2 — Demo prep artifact bundled

- File:`docs/01-planning/W06-final-eval-demo/artifacts/demo-prep.md`(net-new)
- Part 1 Demo script:15-min flow narrative(Context+Problem 2min / Architecture 2min / Ingestion E2E 3min / Query+Citation 4min / Eval+Quality numbers 3min / Risk+Beta transition 1min)+ Pre-demo setup checklist + Demo polish checkpoints W6 D4-D5
- Part 2 Stakeholder Q&A pack:**14 pre-canned answers** organized 4 sections:
  - Section A Quality+Capability(Q-A1 0.795 rel / Q-A2 Cohere over Azure / Q-A3 production lock / Q-A4 Q014 OOS refusal)
  - Section B Architecture+Tier Boundary(Q-B1 GraphRAG / Q-B2 single-vendor / Q-B3 Cohere outage)
  - Section C Operations+Cost+Beta(Q-C1 per-query cost ~$0.005-0.020 / Q-C2 latency p50 8-15s p95 25-30s / Q-C3 Beta scope+timeline)
  - Section D Risk Slides(Q-D1 active risks + R8 calibration / Q-D2 Gate 2 STRONG PASS fallback)
- Part 3 Demo Artifacts Checklist(7 artifact items + status + owner)
- Bundling rationale:Karpathy §1.2 simplicity-first + 易 stakeholder review(single file vs 2 split)

### F5.3 — Beta plan v1 draft

- File:`docs/03-implementation/beta-plan-v1.md`(net-new per W6 plan F5.3 path)
- 7 sections:Executive Summary / Phase Breakdown W7-W12 / OQ Dependencies(Q7+Q9+Q10+Q11+Q12)/ Risk Register Beta-specific(R-B1 to R-B8 inherited)/ Day-2 Readiness Checklist / Stakeholder Approval Triggers / Changelog
- W7 critical path:**Q11 Entra ID tenant** must resolve W7 D1(blocks W7.F1)— IT 配合 dependency
- Out-of-scope explicit list(per CLAUDE.md §5.4 H4 Tier 1 boundary)— GraphRAG / multi-agent / multi-tenancy / multi-modal / multi-language / auto-sync / fine-tuning / workflow
- 8 Beta-specific risks(R-B1 to R-B8)including W6 D1 calibration carry-over R8(Python httpx probe ground truth)

### F5.4 — DEFERRED demo screenshots / GIF artifacts

- Per F4.4 Chris dev server bottleneck — defer W6 D4/D5 post-F4(若 dev server 起得起來)
- 若 W6 closeout still bound on dev server → carry-over to W7 polish window
- Non-blocking F6 Gate 2 closeout retro

### Decisions / OQ summary

- F2 cascade Q14 SME labeling — Chris async dependency unchanged
- F3 subset=20 confirmation — optional W6 D4 candidate(if stakeholder approves $15-25 extra spend for borderline cluster lift validation)
- F4 carry-overs — Chris dev server bound;non-blocking
- No new ADR triggers;no new OQ status change(F5 deliverables 屬 stakeholder approval cycle prep,not direct OQ resolve)

### Open / blocked

- ⏸ F2 final eval(Chris SME labeling cascade async)
- ⏸ F4 W4/W5 LIVE smoke remainder(Chris dev server)
- ⏸ F5.4 demo screenshots(tied to F4)
- ⏸ F3 subset=20 confirmation(optional,W6 D4 if stakeholder approves)
- ⏸ architecture.md §3.2 + §6.3 amendment ticket(F1.7 narrative ready;stakeholder approval cycle vNext increment)

### Commit reference

- _(W6 D3 closeout commit pending — references F5.1+F5.2+F5.3 ticked + F5.4 deferred + 2 net-new artifact files)_

---

## Day 4 — 2026-05-05: F6 closeout prep early-start(retro 7 sections draft + W07 phase folder kickoff)

**Action**:Per Karpathy §1.2 simplicity-first + 為 D5 buffer 解壓 — F6 prep early-start(static-heavy zero-cost zero-risk)。F2 / F4 Chris-async blocked unchanged;F3 subset=20 optional deferred D5 if stakeholder approves。

### F6.2 — Retro 7 sections draft(see Retro section below)

- 7 sections backfilled per W5 retro template structure(章節 / detail level consistent per CLAUDE.md "起草新 plan/checklist 必先讀「最近一個 closed phase」樣板")
- What worked / What didn't / Surprises / Carry-overs to W7-W8 / ADR triggers / Phase Gate result / Phase status
- Status:`draft` — D5 polish + verdict finalize + commit

### F6.3 — W07-beta-deploy phase folder kickoff(rolling JIT)

- New folder:`docs/01-planning/W07-beta-deploy/{plan,checklist,progress}.md`
- W7 scope per architecture.md §6.1 W7 row + beta-plan-v1.md W7 breakdown:Microsoft Entra ID auth + rate limiting + audit logging + error handling polish + mobile responsive
- Plan deliverables F1-F6 derived(scope + acceptance + OQ deps Q11 critical path + risks + day-by-day breakdown)
- Checklist:atomic items per deliverable
- Progress:Day 0 kickoff prep entry(this batch),status `draft` until W6 D5 closeout sign-off + W7 D1 Chris kickoff approval

### Decisions / OQ summary

- No new OQ status change(W6 D4 prep work,not direct OQ resolve — OQ Q11 critical path identified W6 D3 F5.3 Beta plan,formal resolve trigger留 W7 D1)
- No new ADR triggers
- Phase status remains `active` until W6 D5 closeout commit flip `closed`

### Open / blocked

- ⏸ F2 final eval(Chris SME labeling cascade async)
- ⏸ F3 subset=20 confirmation(optional W6 D5 if stakeholder approves $15-25 spend)
- ⏸ F4 W4/W5 carry-overs(Chris dev server)
- ⏸ F5.4 demo screenshots(tied to F4)
- ⏸ architecture.md §3.2 + §6.3 amendment ticket(stakeholder approval cycle vNext increment)

### Commit reference

- _(W6 D4 closeout commit pending — references F6.2 + F6.3 partial ticked + retro draft + W07 phase folder net-new)_

---

## Day 5 — 2026-05-05: W6 closeout(retro polish + F3 subset=20 confirmation parallel-track)

**Action**:Per recommended option (b) parallel-track — D5 multi-thread:
- LIVE F3 subset=20 confirmation(close W6 retro carry-over C2;~$15-25 USD;~12-15 min wall clock;targets borderline cluster Q011-Q020 directly addressing W6 retro "What didn't work" first-10 ceiling effect critique)
- Parallel retro polish + Phase Gate verdict tighten + closeout commit prep

### Pre-flight(Step 1)

- Azure OpenAI HTTP 200 + Cohere v4.0-pro HTTP 200(Python httpx truststore stack)— same pattern as W6 D2 LIVE pre-flight
- `Settings.reranker_kind = cohere`(W6 D1 reverted state preserved;F3 subset=20 runs on Cohere v4.0-pro pipeline + tweaked prompt)
- `backend/generation/prompt_builder.py:25` retains W6 D2 tweaked prompt(no re-edit needed)

### F3 subset=20 LIVE outcome ✅ landed

- `reports/ragas-cohere-tweaked-subset20.json`(LIVE artifact gitignored)+ `reports/ragas-cohere-tweaked-subset20.log`
- Wall clock ~16 min(`total_latency_ms 951031`);20/20 evaluated 0 errored(Bug I floor confirmed at scale + cross-day consistency)

| Metric | W5 D2 baseline n=18 | W6 D5 tweaked n=20 | Δ pp | within-5pp | Direction |
|---|---|---|---|---|---|
| faithfulness | 0.9444 | 0.9478 | +0.34pp | ✅ | BETTER |
| **answer_relevancy** | **0.7947** | **0.8032** | **+0.85pp** | ✅ | **BETTER** |
| context_precision | 0.9863 | 0.9796 | -0.67pp | ✅ | mild regress |
| context_recall | 1.0000 | 0.9500 | -5.00pp | boundary | regression |
| errored | 2/20 | 0/20 | Bug I floor active | — | improved |

**Per-query winners + losers split**:
- **7 winners**(≥ +5pp lift):Q011 +13.83pp / Q005 +12.13pp / Q001 +9.74pp / Q002 +7.95pp / Q007 +7.87pp / Q012 +7.00pp / Q020 +5.96pp
- **5 losers**(≥ -5pp regression):Q004 -13.93pp / Q008 -11.41pp / Q017 -9.81pp / Q010 -7.09pp / Q006 -6.46pp
- **3 ties**(|Δ| < 1pp):Q014 OOS / Q018 / Q019
- **2 Bug I beneficiaries**(W5 D2 errored,W6 D5 evaluated):Q013(0.7830)+ Q016(0.7970)— pull mean slightly down vs first-10-only sample

**Borderline cluster Q011-Q020 ex-Q014 outcome**:tweaked mean ~0.839 vs baseline ~0.825 = **+1.4pp lift**(comparable to overall +0.85pp;**消除 W6 D2 "ceiling effect" 質疑** — tweak helps borderline cluster too,not first-10-only artefact)

### Critical nuance — verdict refinement

- W6 D2 first-10 verdict("rel 0.872 ≥ 0.85 Tier 1 acceptance met → LAND tweak")**stands**(decision correct;tweak真係 net-positive lift confirmed at scale)
- **BUT Tier 1 strict-acceptance "rel ≥ 0.85 over full subset" 仍未 cross**(0.803 < 0.85 at subset=20 scale)— tweak = **incremental improvement**(consistent +0.85pp lift)**not threshold-crossing fix**
- High per-query variance(7 winners + 5 losers + 3 ties)indicates **tweak has uneven impact** — Q004 -13.93pp regression worth investigating(possibly query where verbose answer was actually correct + tweak truncated quality)
- context_recall -5.0pp at within-5pp boundary — single-query regression(20 query × 0.95 = 19 perfect + 1 partial);worth monitoring for Beta phase real query distribution
- **LAND decision STILL CORRECT** — tweak retains in `backend/generation/prompt_builder.py`;W7+ optional further mitigation candidate

### Decisions / OQ

- **F3 verdict refined**:LAND tweak confirmed at scale + W7+ further mitigation candidate(per-query winners+losers analysis)
- **W6 retro carry-over C2 closed**(W6 D5 LIVE confirmation outcome integrated this Day 5 entry + Retro Surprises)
- No new OQ status change(F3 subset=20 evidence-strengthening,not Q-resolve trigger)
- No new ADR triggers(prompt tweak structural decision unchanged;refinement narrative inline-documented per CLAUDE.md §10 R5 boundary)
- Phase status W6 `active → closed` in this commit batch

### Open / blocked

- ⏸ W7+ optional further answer_relevancy mitigation(若 stakeholder priority post-Beta real query data signal regression)
- ⏸ Q004 -13.93pp single-query regression investigation(W7+ ad-hoc if surfaces in real query distribution)

### Commit reference

- _(W6 D5 closeout commit pending — references Day 5 entry + Retro Surprises augment + C2 closure + F6.4 frontmatter flip + plan changelog increment + W7 status remains `draft` awaiting kickoff trigger)_

### Retro polish notes(parallel)

- Section "What worked" item 6:rephrase "LIVE eval data has reuse value" → emphasize **evaluator stack version match required**(judge LLM + ragas version + monkey-patch wrapper version equal)
- Section "What didn't work" item 3 "first-10 ceiling effect":will be **addressed/closed by F3 subset=20 outcome**(subset=20 covers Q011-Q020 borderline cluster directly)— pending verdict
- Section "Carry-overs to W7-W8" C2:**F3 subset=20 confirmation outcome will close OR explicit defer this carry-over** in W6 closeout commit
- Section "Phase Gate result G3":F3 verdict 已 W6 D2 LAND;subset=20 outcome 屬 evidence-strengthening,not verdict revision

### Decisions / OQ

- No new OQ status change(F3 subset=20 屬 evidence-strengthening,not Q-resolve trigger)
- No new ADR triggers(prompt tweak structural decision unchanged)
- Phase status W6 `active → closed` in this commit batch

### Open / blocked

- ⏸ F3 subset=20 LIVE in-progress(monitor armed)
- ⏸ Final closeout commit pending F3 verdict integration

### Commit reference

- _(W6 D5 closeout commit pending — references retro polish + F3 subset=20 verdict + F6.4 frontmatter flip + plan changelog increment + W7 status remains `draft`)_

---

## Retro(W6 D4 early-start draft;W6 D5 polish + finalize)

### What worked

- **W6 D1 R8 mitigation calibration via Python httpx probe**:original W2 R8 conservatively used `curl probe HTTP 000 + CRYPT_E_NO_REVOCATION_CHECK` as VPN-disconnect trigger,但 W6 D1 verified `curl schannel CRL revocation failure ≠ Python httpx failure`(Python OpenSSL via truststore Windows cert store does not do strict CRL/OCSP check by default)。**Saved ~1-2 hours dev cycle** vs over-broad VPN disconnect requirement;Python httpx probe ground truth pattern carry W7+ permanent SOP。Lesson:**probe at the actual TLS stack you'll use,not a generic curl proxy** — schannel-strict failure semantics ≠ OpenSSL semantics
- **F1.4 verdict path pre-mapped 4-branch decision tree pays off W6 D1**:Azure 2-way comparison outcomes 預先 4-branch outcome map(STRONG PASS upgrade / Cohere reaffirmed / Azure ≥ 5pp better swap / mixed)→ apples-to-apples n=17 comparison 直接 fall into "Azure ≥ 5pp WORSE on faith+rel → Cohere v4.0-pro reaffirmed" branch。Verdict articulation 預先準備 = tight execution,no post-hoc justification needed。**Same pattern pays W5 D2 Cohere baseline + W6 D1 Azure 2-way + W6 D2 prompt tuning A/B** — pre-decision tree 已成 LIVE-eval driver methodology
- **W6 D2 prompt tweak surgical single-rule change vs full rewrite**(per Karpathy §1.3):Rule 3 single-line edit `backend/generation/prompt_builder.py:25` 添 "Lead with a direct one-sentence answer" + soft length cap "<= 150 words";preserve "ordered lists / steps when procedural"。**14/14 synthesizer tests pass non-regression confirmed structurally;rel +1.92pp lift behaviorally landed**。Lesson:**prompt-side tuning lever 對 RAGAs answer_relevancy 機制(LLM-judge reverse-generated hypothetical question similarity)直接有效**;single-line surgical change > full prompt rewrite — minimal blast radius,fast A/B verdict
- **F5 bundling demo-script + Q&A pack into single artifact**(per Karpathy §1.2 simplicity-first):W6 plan F5.1 + F5.2 originally 2 deliverables;bundled into `artifacts/demo-prep.md` single file Part 1+2+3。Less file proliferation + easier stakeholder review + still satisfies plan acceptance。Lesson:**plan deliverable count ≠ artifact count** — bundle when audience + lifecycle aligned
- **F6 closeout prep early-start D4 vs D5 cramming**:per CLAUDE.md §10 R1 binding rolling JIT。D4 zero-cost / zero-LIVE-risk static work(retro draft + W7 phase folder kickoff)reduces D5 closeout commit pressure。Lesson:**closeout polish quality scales with buffer days** — leave D5 純 verdict finalize + status flip + commit,而非 retro 從零開始
- **W6 D2 reuse W5 D2 baseline data for A/B comparison**:`reports/ragas-cohere-subset20.json` first-10 entries directly extracted as A/B baseline(vs running 2 fresh subset=10 runs)。**Saved ~$5-8 USD + ~6-8 min wall clock**;W5 D2 baseline 1 day fresh + same evaluator stack(judge LLM + ragas 0.4.3 + monkey-patch wrapper version)= equivalent comparison rigor。Lesson:**LIVE eval data is reusable for follow-on A/B if evaluator stack version matches exactly**(judge LLM + ragas + wrapper);cost-efficient methodology vs always-fresh baseline,but stack drift voids reuse

### What didn't work / unexpected friction

- **F1 Azure 2-way 互換 verify outcome NOT STRONG PASS**:Azure built-in semantic ranker -11.76pp faith + -9.81pp rel WORSE vs Cohere v4.0-pro on apples-to-apples n=17。**Gate 2 PARTIAL PASS confirmed,NOT upgraded to STRONG PASS**。Original W4 plan §F10 fallback policy 預期 partial verdict acceptable but stakeholder narrative 仍要解釋 "why not full PASS"。Lesson:**vendor lock decision data valuable independent of "did we hit STRONG PASS"** — the negative comparison data 反證 Cohere lift visible on quality-judging metrics;nuance worth preserving in stakeholder Q&A pack(see `artifacts/demo-prep.md` Q-A2)
- **F3 prompt tweak Q010 single-query regression**:tweaked rel 0.7317(was W5 D2 0.8538)on Q010 specifically — single regression amid 6/10 lift。Possibly "lead with direct answer" directive caused over-truncation on Q010 procedural query that needs more contextual elaboration。Net positive 仍 hold(mean +1.92pp;Tier 1 acceptance met)but signals **prompt tuning has variance that's not uniform-positive**。Lesson:**A/B retrospective 必須 surface per-query winners + losers**,not just aggregate;single regressions can compound at scale
- **First-10 baseline ceiling effect on F3 A/B clarity**:W6 plan F3.3 spec'd subset=10 but baseline first-10 already 0.8528(near 0.85 threshold)→ "is the lift real or ceiling-bias?" question remained for borderline cluster post-D2。**Mitigated W6 D5 via F3 subset=20 confirmation parallel-track**(cost ~$15-25 USD;closes carry-over C2;outcome integrated this retro)。Lesson:**A/B subset selection should target the actual problem cluster,not first-N convenience** — W7+ eval methodology 應加 "stratified subset" capability(borderline-cluster targeted vs head-of-list convenience)
- **F2 + F4 Chris-async blocked throughout W6**:F2 SME chunk_id labeling cascade 唔 progressed(3/55 still W2 D5 baseline);F4 dev server availability 唔 trigger(W6 D3 curl localhost:8000 failed)。Both inherited from W5 carry-overs C6+C7 unchanged。Lesson:**Chris-async dependencies need W7 D1 sync-point**(若 Beta 階段仍 carry,需要 explicit blocker conversation 而非 silent defer cascade)
- **F5.4 demo screenshots tied to F4 cascade**:W6 plan F5.4 originally W6 D4-D5 deliverable but F4 dev server bound → F5.4 deferred W7 polish window。Demo deck 缺 visual artifacts on stakeholder presentation。Lesson:**F-deliverable dependency chains across deliverables should be explicit in plan §2 acceptance criteria**(F5.4 implicitly depends on F4.4 — should be diagrammed)
- **W6 D3 readiness scan revealed 3/4 candidates blocked simultaneously**:F2(SME)+ F4(dev server)+ F5.4(tied to F4)= D3 morning 3 of 4 candidates dead-end。**F5 selection saved D3 productivity but underscored "Tier 1 closeout phase has high external-dep concentration"**。Lesson:**closeout sprint plan should pre-stage Chris-async deliverables 1 phase earlier**(W5 D5 / W6 D1 dev server smoke + SME labeling kick) so W6 D3-D5 純 internal work
- **R8 calibration learning surfaced AFTER W6 D1 LIVE run started**:had I curl-probed and concluded "VPN disconnect required" → would have asked user disconnect VPN unnecessarily → friction。Saved by impulse to verify with Python httpx,but **cost was emotional (false-positive STOP) more than clock**。Lesson:**when probe fails for known-pattern(curl schannel CRL),verify via the actual stack you'll use BEFORE escalating to user action**

### Surprises / discoveries

- **Azure semantic ranker reorders top-50 producing different top-5 → different synthesizer outcome despite similar coverage**:context_precision Δ -2.05pp + context_recall 0pp tied(Azure n=17 fair compare)but faithfulness Δ -11.76pp + answer_relevancy Δ -9.81pp WORSE。**Retrieval coverage ≈ similar(prec+recall),but chunk relevance ranking matters huge for downstream synthesis quality**。This is a non-trivial insight:**reranker quality 不 captured in coverage metrics;surfaces on quality-judging downstream metrics**。Lesson:future reranker shootouts must include quality-judging downstream metric(faith+rel)not just coverage(prec+recall)
- **W6 D1 GPT-5.5 output_tokens 528-1103 per non-refused answer reveal systematic verbose pattern**:not single-query outlier;**structural pipeline characteristic** consistent across W5 D2 + W6 D1 + W6 D2 baseline subset。Identifies prompt-side lever as primary mitigation(F3 confirmed lever works +1.92pp lift on first-10)。Lesson:**output_tokens telemetry is leading indicator for answer_relevancy aggregate** — instrument observability to surface this trend over time
- **F3 prompt tweak ~30% verbosity reduction(515 vs ~737 indirect Azure baseline reference)**:not directly measured against W5 D2 Cohere baseline output_tokens(那次 log 唔 retained per-query data systematically)but cross-pipeline reference suggests **soft length cap directive translates to ~30% reduction even without hard truncation**。Lesson:**LLM-prompt soft directives can produce measurable behavior shift if directive is mechanism-aligned**(this case:RAGAs metric mechanism explicitly favors direct-answer + concise → "lead with one sentence" directive aligned)
- **R8 Ricoh corp proxy SSL inspection failure semantic split between curl and Python**:curl schannel does strict CRL/OCSP check by default;Python OpenSSL(via truststore inject)does not。**Saved this learning earlier would have changed W2-W5 R8 mitigation cost**(VPN disconnect not always required for cloud-bound work)。Lesson:**TLS stack-specific failure semantics deserve documentation in RISK_REGISTER R8 mitigation entry** — "curl schannel HTTP 000 ≠ Python httpx HTTP failure" for future contributors
- **Q21 Resolved `Cohere v4.0-pro` via "negative comparison data" not "positive Strong PASS"**:typical Q-resolution cycle expects positive evidence("X is best");this case Q21 closed via "alternative is worse" frame。Both resolution paths valid but stakeholder Q&A narrative differs。Lesson:**OQ resolution Q&A briefing must distinguish between "winner via outperform" vs "winner via alternative-disprove"** — Q-A2 in demo-prep.md captures this nuance
- **F3 subset=20 W6 D5 confirmed tweak lifts borderline cluster + scale-down lift magnitude**:W6 D2 first-10 +1.92pp lift(rel 0.853 → 0.872)on ceiling-area sample;W6 D5 subset=20 confirmed +0.85pp lift overall(rel 0.795 → 0.803)+ +1.4pp on borderline cluster Q011-Q020 ex-Q014。**Both directional findings true but magnitude smaller at scale** — first-10 sample over-estimated lift due to ceiling head-room interaction with high-variance per-query distribution。Lesson:**A/B effect sizes from small-n samples need confirmation at full scale before announcing magnitude in stakeholder narrative**;directional confirmation is robust(both samples agree tweak helps),magnitude estimation needs n ≥ 20
- **Tweak per-query high variance — winners + losers + ties split**:7 winners(≥ +5pp;largest Q011 +13.83pp)+ 5 losers(≥ -5pp regression;largest Q004 -13.93pp)+ 3 ties + 2 Bug I beneficiaries。**Net positive but uneven impact**;tweak isn't a uniform improvement but rather a redistribution toward "lift on long answers" + "trim on already-direct answers"。Q004 -13.93pp suggests "lead with direct answer" directive **truncated ground-truth-aligned content** on a query where the verbose answer was actually correct。Lesson:**prompt directive impact is non-uniform across query distribution;per-query winners+losers analysis essential before claiming improvement** — aggregate +0.85pp masks 5 substantial regressions
- **F3 subset=20 still below 0.85 Tier 1 strict-acceptance threshold but LAND decision correct**:rel 0.803 at subset=20 scale < 0.85 threshold;but **W6 plan F3.4 acceptance criterion was "tweak rel ≥ 0.85" on the A/B sample**(W6 D2 first-10 = 0.872 ≥ 0.85 ✅ met);subset=20 evidence is supplementary not contractually binding。**Tweak retains as incremental improvement,not threshold-crossing fix**;Tier 1 full-scale strict-acceptance needs further mitigation。Lesson:**plan acceptance criteria must specify subset-scale**(W6 plan F3.3 said "subset=10";should add "and confirm at subset=20" if scale-confirmation desired);**W7+ acceptance ladder should distinguish "directional confirm" from "threshold-cross"**

### Carry-overs to W07-beta-deploy

W6 D5 末 batch(W6 carry-overs):

1. **W6 C1** F2 final eval full-corpus(post Chris SME chunk_id labeling cascade strict-mode RAGAs)— Chris async dependency unchanged;留 W7-W8 background polish if labeling lands;若 W12 production launch 前唔 cascade → strict-mode eval 屬 Tier 2 evaluation phase
2. **W6 C2** F3 subset=20 borderline cluster confirmation — **closed W6 D5** ✅(parallel-track LIVE within closeout same-session;outcome:tweak +0.85pp aggregate lift confirmed at scale + +1.4pp borderline cluster lift Q011-Q020 ex-Q014;7 winners + 5 losers high per-query variance;rel 0.803 still below 0.85 Tier 1 strict-acceptance at subset=20 but LAND decision correct because W6 plan F3.4 acceptance criterion met on subset=10 A/B sample;**W7+ optional further mitigation candidate** if stakeholder/Beta-real-query-data signals continued borderline cluster pressure)
2a. **W6 C2-followup** F3 Q004 -13.93pp single-query regression investigation — W7+ ad-hoc trigger if Q004-class queries surface in Beta real query distribution(possibly query where verbose answer was ground-truth-aligned + tweak truncated quality)
3. **W6 C3** F4 W4/W5 LIVE smoke remainder(C7 PPT E2E + C8 GPT-5.5 latency baseline + Chat UI screenshots)— Chris dev server bound;W7 D1 sync-point candidate(若 Beta deploy stage 必 measure latency baseline → defer to W7 polish window for proper measurement;W6 D5 demo deck 暫用 indicative numbers per Q-C2)
4. **W6 C4** F5.4 demo screenshots / GIF artifacts — tied to F4 dev server cascade;W7 polish window post-Chris dev server availability
5. **W6 C5** architecture.md §3.2 + §6.3 amendment ticket — F1.7 narrative ready in `artifacts/demo-prep.md` Part 2 Section A;stakeholder approval cycle vNext increment(per CLAUDE.md §4.4 architecture content-lock — AI 不單方面 edit)
6. **W6 C6** RAGAs evaluator REFUSAL_PHRASE skip enhancement(W5 C3 inherit)— `Q014 OOS pattern faith=0/rel=0/prec=1/recall=1` 仍 pollute aggregate;detect REFUSAL_PHRASE substring in answer + auto-skip faith/rel for refusal queries 屬 evaluator polish;W7+ optional W6 carry-forward
7. **W6 C7** R8 mitigation update entry to `RISK_REGISTER.md` — Python httpx probe pattern 為 ground truth verifier per W6 D1 calibration;curl schannel CRL revocation failure ≠ Python failure documentation;W7 D1 早期 housekeeping
8. **W6 C8** F3 L3 routing conditional(W5 C5 inherit)— Gate 2 STRONG PASS upgrade trigger 唔 fire(W6 D1 Cohere reaffirmed,not STRONG PASS upgrade)→ L3 routing **continue defer Tier 2** per architecture.md §6.1 W5 row "L3 conditional"
9. **W6 C9** Q-deps for Beta:Q7(Beta user source)/ Q9(Sensitivity / CMK)/ Q10(Visual identity)/ Q11(Entra ID tenant **W7 critical path**)/ Q12(Tier 2 owner)— stakeholder approval cycle for W7-W8 kickoff trigger;Q11 IT 配合 critical
10. **W6 C10** Plan estimate calibration(W5 C9 carry-forward refined):**W6 actual variance** — D1 LIVE-heavy 1.5x calibration accurate(F1 wall clock 11m 38s + cross-ref + verdict ~3h actual vs 1.5h plan estimate);D2 LIVE-heavy similar(F3 8m 02s + analysis ~2h vs 1h plan);D3 static-heavy 1.0x(F5 ~3h actual vs 2h plan,bundling helped);D4 static-heavy 0.7x(F6 prep ~3h on retro+W07,well within budget)。**W7 plan calibration**:LIVE deploy days 2x(IT coordination overhead);static days 0.5x。Lesson:**LIVE work 嘅 1.5x buffer 適用 LIVE-eval but not necessarily LIVE-deploy(IT coordination 多 layers)** — W7 D1 kickoff 重新 calibrate per Beta context

### ADR triggers

- **None this phase**。F1 Cohere v4.0-pro reaffirmed via Azure 2-way comparison — ADR-0012 trigger conditions(a)F1 Azure ≥ 5pp better OR(b)architecture.md §3.2 amendment formal record stakeholder approval requires ADR — **neither fired**:
  - (a)Azure ≥ 5pp WORSE not BETTER → no swap rationale;ADR-0012 reservation released for current phase
  - (b)architecture.md §3.2 amendment narrative ready in `artifacts/demo-prep.md` Part 2 + W6 D1 progress;**stakeholder approval cycle outcome decides ADR trigger**(若 stakeholder requires formal vendor lock revision in §3.2 → write ADR-0012 then;若 inline accepted as Q&A note → no ADR needed)
- W6 D2 prompt tweak — **non-ADR**(prompt content 屬 C05 generation component implementation detail per Karpathy §1.3 surgical change preserves component interface;no §3+§4 architectural change per CLAUDE.md §10 R5 boundary)
- W6 D1 R8 calibration update — **non-ADR**(infrastructure/risk-register entry,not architectural component change;living `RISK_REGISTER.md` update per W6 C7 carry-over)
- **ADR-0012 仍 reserved for 將來 trigger**:
  - (a)architecture.md §3.2 amendment formal record(stakeholder approval cycle outcome — final decision pending W6 D5 / W7 D1 stakeholder review)
  - (b)Tier 2 per-KB reranker column STICKY(future multi-corpus / multi-tenancy)
  - (c)Tier 2 reranker swap if real-query distribution diverges from synthetic eval(W9-W10 Beta real query log signal)

### Phase Gate result(per plan.md §3 + architecture.md §6.3)

- **G1**(F1 Azure 2-way 互換 verify landed):**✅ landed W6 D1** — verdict path = "Cohere v4.0-pro reaffirmed final"(Azure ≥ 5pp WORSE on faith+rel;ADR-0012 reservation released);**Gate 2 PARTIAL PASS confirmed** NOT upgraded to STRONG PASS;Q21 final = `Resolved` Cohere v4.0-pro
- **G2**(F2 final eval ≥ 45/55 evaluable):⏸ **DEFERRED — Chris SME labeling cascade async unchanged**(3/55 validated baseline);per W6 plan §3 G2 row "No(strict-mode partial OK)" — non-blocking W7;留 W7-W8 polish window
- **G3**(F3 synthesizer prompt tuning decision landed):**✅ LAND tweak W6 D2** — rel 0.8719 ≥ 0.85 Tier 1 acceptance met on A/B subset=10 sample;`backend/generation/prompt_builder.py` retains tweak;14/14 synthesizer tests pass + 215/215 backend total。**W6 D5 subset=20 confirmation refinement**:tweak +0.85pp aggregate lift + +1.4pp borderline cluster lift confirmed at scale;rel 0.803 still below 0.85 Tier 1 strict-acceptance at subset=20(LAND decision correct per W6 plan F3.4 acceptance criterion met on contracted subset=10);high per-query variance(7 winners + 5 losers + 3 ties)→ W7+ optional further mitigation candidate
- **G4**(F4 W4/W5 LIVE smoke remainder closed):⏸ **DEFERRED — Chris dev server availability bound unchanged**;per W6 plan §3 G4 row "No(carry W7+ if Chris dev server bottleneck)" — non-blocking
- **G5**(F5 Demo prep + Beta plan committed):**✅ landed W6 D3** — `artifacts/demo-prep.md`(Demo script + Q&A pack)+ `docs/03-implementation/beta-plan-v1.md`(7 sections + W7-W12 phase breakdown + 5 OQ deps + 8 Beta-specific risks + Day-2 readiness)
- **G6**(Backend ruff + frontend lint + type-check 0 errors):**✅ 215/215 backend tests pass + ruff E402 baseline parity**(prompt_builder.py clean;68 pre-existing scripts/ truststore early-init pattern unchanged from W5 D5)
- **G7**(OQ Q21 final Resolved):**✅ Resolved W6 D1**(Cohere v4.0-pro production lock — `Tentatively Resolved → Resolved`)+ Q5 Decision paragraph + Date row appended W6 D1 outcome

**Phase Gate verdict**:**PASS(structural)+ PARTIAL PASS(Gate 2 LIVE confirmed)+ DEFERRED(non-blocking carry-overs)** — G1+G3+G5+G6+G7 green;G2+G4 explicitly carry-over W7+ per plan §3 non-blocking rows + Chris-async constraint。**L2 CRAG 不 drop**(drop-L2 trigger 條件未觸發;PARTIAL PASS 仍 PASS path per W4 plan §F10 fallback)。**No ADR-0012 trigger fired in W6**(reservation released for current phase;remains reserved for stakeholder approval cycle outcome OR Tier 2 future)。Phase status flip `active → closed` D5。

**Gate 2 final verdict**:**PARTIAL PASS confirmed**(NOT upgraded to STRONG PASS via W6 D1 Azure 2-way 互換 verify negative comparison)。Verdict path:within-5pp 互換 only on context_precision + context_recall(2 of 4 metrics);faith + rel ≥ 5pp differ。Verdict supports Cohere v4.0-pro production lock decision via "alternative-disprove" frame per Q-A2 stakeholder narrative。

### Phase status

- Closeout commit:_pending W6 D5 closeout commit(this retro polish + plan changelog + W07 phase folder kickoff finalize + progress.md frontmatter flip + W06 status `active → closed`)_
- Frontmatter status flipped to `closed`:_pending W6 D5 closeout commit_
- Phase W07 kickoff trigger:`docs/01-planning/W07-beta-deploy/{plan,checklist,progress}.md` 落地 W6 D4 same batch(per PROCESS.md §2.3 lifecycle + CLAUDE.md §10 rolling JIT)— scope:Microsoft Entra ID auth integration + rate limiting + audit logging + error handling polish + mobile responsive complete(per architecture.md §6.1 W7 row + beta-plan-v1.md W7 breakdown)。Q11 Entra ID tenant access **W7 critical path**(blocks W7.F1)— IT 配合 dependency。

---
