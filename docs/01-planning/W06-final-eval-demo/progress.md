---
phase: W06-final-eval-demo
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active     # flipped from draft 2026-05-05 W6 D1 per Chris kickoff sign-off
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

## Day 2 — _(pending)_

---

## Day 3 — _(pending)_

---

## Day 4 — _(pending)_

---

## Day 5 — _(pending)_

---

## Retro(填於 W6 D5 末)

### What worked
_(W6 D5 末 fill)_

### What didn't work / unexpected friction
_(W6 D5 末)_

### Surprises / discoveries
_(W6 D5 末)_

### Carry-overs to W07-beta-deploy
_(W6 D5 末)_

### ADR triggers
_(W6 D5 末 — ADR-0012 reserved for(a)F1 Azure ≥ 5pp better → reranker pick revisit OR(b)architecture.md §3.2 amendment formal record(v3.5 → v4.0-pro))_

### Phase Gate result(per plan.md §3 + architecture.md §6.3)
- G1-G7:_(W6 D5 末)_
- **Gate 2 final verdict**:_(W6 D5 末)_ → STRONG PASS upgrade OR PARTIAL PASS confirmed

### Phase status
- Closeout commit:_(W6 D5 末)_
- Frontmatter status flipped to `closed`:_(W6 D5 末)_
- Phase W07 kickoff trigger:_(W6 D5 末 — W7 plan = Microsoft Entra ID + rate limiting + React polish + Beta deploy per architecture.md §6.1 W7 row)_

---
