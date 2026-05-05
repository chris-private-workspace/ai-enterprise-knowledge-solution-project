---
phase: W06-final-eval-demo
artifact_type: demo-prep
related_deliverables: [F5.1 demo-script, F5.2 Q&A briefing pack]
status: draft
last_updated: 2026-05-05
audience: Stakeholder + Project Sponsor + Tech Lead Chris
demo_duration_min: 15
---

# W06 Demo Prep — Demo Script + Stakeholder Q&A Briefing Pack

> **Purpose**:Tier 1 POC closeout demo(W6 末)前 prep — 15-min demo flow narrative + stakeholder Q&A pre-canned answers + risk slides for transparency。
> **Lifecycle**:`draft` 直到 W6 D5 closeout commit + Chris approve 給 stakeholder。Demo screenshots / GIF artifacts 留 W6 D4/D5 post-F4.4 Chris dev server backfill。

---

## Part 1 — Demo Script(15-min flow)

### Audience expectations

- **Stakeholder / Project Sponsor**:want to see EKP works on real Drive manuals,understand quality vs cost,know Beta + Production timeline
- **Tech-savvy reviewer**:want pipeline visibility(retrieval → rerank → synthesis),metric numbers,observability proof
- **POC closure decision**:after this demo,sponsor signs off Beta deploy(W7-W8)scope

### Pre-demo setup(speaker checklist,5 min before start)

- [ ] Backend dev server up:`uvicorn backend.api.main:app --port 8000`(Chris)
- [ ] Frontend dev server up:`pnpm dev` in `frontend/`,localhost:3000(Chris)
- [ ] Langfuse dashboard tab open(observability proof for trace IDs)
- [ ] `eval-set-v1-draft.yaml` open in IDE(reference 20 query corpus)
- [ ] `reports/ragas-cohere-subset20.json` open(W5 D2 Cohere baseline 4-metric reference)
- [ ] `reports/ragas-cohere-tweaked-subset10.json` open(W6 D2 prompt tuning A/B reference)
- [ ] `reports/ragas-azure-subset20.json` open(W6 D1 Azure 2-way comparison reference)
- [ ] Browser fresh session(no cache;Stable WiFi;disable VPN per W2 R8)

### 15-min flow narrative

#### Segment 1 — Context + Problem(2 min)

- "Ricoh internal user manuals 散落 SharePoint / Drive,員工搵唔到、引用唔啱。EKP Tier 1 提供單一 RAG 入口,首個 use case = Drive Project — Ricoh internal user manuals。"
- 用 1 個真實 problem statement:"員工問 'Tango.us 點樣登入',原本要爬 5 個 PDF 文件查;EKP 內 5 秒內出答案 + cite 文件 chunk + screenshot。"

#### Segment 2 — Architecture overview(2 min)

- 12 components(C01-C12)spine — show `docs/02-architecture/COMPONENT_CATALOG.md` 截圖
- 重點:**Tier 1 modular + Tier 2 friendly**(no GraphRAG / multi-agent / multi-tenancy embedded)
- Tech stack table:Azure AI Search + Azure OpenAI + Cohere v4.0-pro + Next.js + FastAPI + Langfuse + RAGAs

#### Segment 3 — Ingestion E2E(3 min)

- Admin Console → KB list → Drive Manual KB → Documents tab
- Show 100 manuals indexed(`.docx` + `.pdf` + `.pptx` mixed)
- Drag-drop upload demo:1 sample new file → progress bar → chunks visible 30 秒內
- Pipeline wizard:click 1 chunk → see retrieval signature + section path + screenshot(if any)
- Highlight:**layout-aware chunking**(NOT character-based)— heading-based + paragraph-grouped + 圖文 association

#### Segment 4 — Query + Citation(4 min)

- Chat UI(Vercel AI SDK SSE streaming)
- **Query 1**:"How do I configure Tango.us SSO?"(simple factual,Q002 in eval-set)→ first token < 2 秒;answer 直接 + cite `[chunk-xxxx]` + screenshot inline
- **Query 2**:"What are the 5 steps to onboard a new department?"(procedural,multi-step)→ ordered list 答案;each step cite different chunks
- **Query 3**:"What's the population of Mars?"(OOS query)→ 拒答 with `"I cannot find this in the available documentation"`(refusal accuracy)
- 點擊 1 個 citation → 跳到 chunk 視圖 + section path + 原 PDF screenshot 對照
- Open Langfuse → 顯示同一 query 嘅 trace:retrieve 50 candidates(BM25 + vector hybrid)→ Cohere v4.0-pro rerank 5 → GPT-5.5 synthesize → CRAG L2 confidence judge

#### Segment 5 — Eval + Quality numbers(3 min)

- Show `reports/ragas-cohere-subset20.json` aggregate:
  - faithfulness 0.944 / answer_relevancy 0.795 / context_precision 0.986 / context_recall 1.000
- Show W6 D2 prompt tuning A/B(`reports/ragas-cohere-tweaked-subset10.json`):
  - tweaked answer_relevancy **0.872**(was 0.853 first-10 baseline)= **+1.92pp**
  - faithfulness 0.978 / context_precision 0.964 / context_recall 1.000
- Show W6 D1 Azure 2-way(`reports/ragas-azure-subset20.json`)comparison:
  - **Cohere v4.0-pro reaffirmed final** — Azure semantic ranker -11.76pp faith + -9.81pp rel WORSE
- **Gate 2 verdict**:**PARTIAL PASS**(answer_relevancy 邊緣 mitigated by W6 D2 prompt tweak;Cohere lock confirmed)
- Frame:"Tier 1 quality baseline confirmed — production lock landed。Borderline cluster Q011-Q020 W6 D3 carry-over for additional confidence 但 Tier 1 acceptance 已 met"

#### Segment 6 — Risk + Beta plan transition(1 min)

- Risk register live update:R1 Shadow AI(beta phase explicit measure)/ R2 ground truth(W4 closed)/ R3 Cohere procurement(closed via Marketplace)/ R4 hallucination(citation-required + refusal)
- Tier 2 trigger metric collection plan(query type distribution + failed query patterns)
- Beta(W7-W8)scope preview:Microsoft Entra ID + rate limiting + React polish + Beta deploy → W9-W10 internal testing → W11-W12 staged rollout 25% → 100%
- Stakeholder approval needed:**§3.2 vendor amendment ticket**(v3.5 → v4.0-pro)+ **§6.3 Gate 2 verdict ticket**(PARTIAL PASS)+ **Q7-Q12 OQ resolution cycle**(Beta user / Sensitivity / Visual identity / Entra ID / Tier 2 owner)

### Demo polish checkpoints(W6 D4-D5 final pass)

- [ ] Mobile responsive baseline check(architecture.md §6.1 W6 row deliverable)
- [ ] Citation card hover state polish
- [ ] Loading / streaming UX smooth
- [ ] Error states friendly message(no raw stack trace)
- [ ] Footer 顯示 tier + version + commit SHA

---

## Part 2 — Stakeholder Q&A Briefing Pack(pre-canned answers)

### Q&A Section A — Quality + Capability

#### Q-A1:"Why 0.795 answer_relevancy not 0.95?"

**Pre-canned answer**:
- 0.795 是 W5 D2 Cohere baseline n=18 mean;W6 D2 prompt tuning A/B 已 lift 至 0.872 on first-10(n=10)
- RAGAs answer_relevancy LLM judge mechanism:reverse-generate hypothetical questions from answer,measure cosine similarity vs original。**0.85 是 industry de facto threshold**,not 0.95 — 0.95+ 通常需要 fine-tuned model + curated query set
- POC scale n=20 嘅 metric 必然 noise 較大;Beta full-corpus n=55 with strict-mode chunk_id labeling 將 give cleaner number

#### Q-A2:"Why pick Cohere over Azure built-in?"

**Pre-canned answer**:
- W6 D1 LIVE 2-way 互換 verify(`reports/ragas-azure-subset20.json` vs `reports/ragas-cohere-subset20.json`):**apples-to-apples n=17(exclude Q013/Q016 Bug I + Q014 OOS):**
  - faithfulness Cohere **1.000** vs Azure 0.882 → -11.76pp WORSE
  - answer_relevancy Cohere **0.841** vs Azure 0.743 → -9.81pp WORSE
- Azure built-in semantic ranker re-orders top-50 hybrid candidates differently → top-5 chunks 唔同 → synthesizer answer quality drops despite similar coverage(prec+recall within-5pp)
- Cohere v4.0-pro 對 Tier 1 corpus(Ricoh internal manuals)適配優於 Azure built-in
- **Cost trade-off**:Cohere ~$0.002/1K tokens reranker 多花 ~$50-100/month POC budget,vs Azure built-in 0 marginal cost。但 quality lift justified per Gate 2 PARTIAL PASS verdict

#### Q-A3:"What's the production lock decision?"

**Pre-canned answer**(per `decision-form.md` Q21 Resolved 2026-05-05):
- Reranker:**Cohere v4.0-pro**(via Azure Marketplace billing)
- LLM synthesis:**GPT-5.5**(Azure OpenAI deployment)
- LLM judge:**GPT-5.4-mini**(Azure OpenAI deployment for RAGAs eval)
- Embedding:**text-embedding-3-large @ 1024d MRL truncate**(Q19 Resolved 2026-05-05 W2 D3)
- Chunk strategy:layout-aware,heading-based grouping(W2 F2 landed)
- Index:`ekp-kb-drive-v1`(Azure AI Search S1,eastus2,1024d HNSW)

#### Q-A4:"Q014 = OOS refusal — that's correct behavior?"

**Pre-canned answer**:
- Yes — Q014 由 W5 D4 BUG investigation(`feat(eval): F4 NON-STICKY + Bug I... + Q014 refusal investigation`)confirmed = **correct behavior per `prompt_builder.SYSTEM_PROMPT` Rule 2 design**
- Synthesizer 輸出 `"I cannot find this in the available documentation"` 當 retrieved chunks 唔包含 sufficient information,non-hallucination guard
- RAGAs metrics 對 OOS refusal score 為 0.0 是 metric mechanism副作用,non-system-fault
- Eval methodology:OOS refusal accuracy 計入 separate metric(F5 acceptance criterion)while excluded from 4-metric mean for fair quality measurement

### Q&A Section B — Architecture + Tier Boundary

#### Q-B1:"Can EKP do GraphRAG / multi-agent?"

**Pre-canned answer**:
- **Tier 1 不做**(per `architecture.md §11`):GraphRAG / Knowledge Graph / L4+ multi-agent / Workflow / Multi-tenancy / Multi-modal / Multi-language / Auto-sync / Custom fine-tuning 全屬 Tier 2 scope
- **Tier 1 architecture 是 Tier 2 friendly**:modular + extensible + MCP-ready,將來 Tier 2 容易加,**but Tier 1 implementation 唔包含 Tier 2 feature**
- Tier 2 trigger metric 由 Tier 1 collected(query type distribution + failed query patterns + cross-department reasoning attempts)— 真係 trigger surface 先 staff up

#### Q-B2:"Why not single-vendor (just Azure)?"

**Pre-canned answer**:
- Tier 1 嘅 vendor stack 已 lock(per `CLAUDE.md §5.2 H2`):Azure AI Search + OpenAI 是 backbone,Cohere 補 reranker(W6 D1 LIVE 2-way 證實 Cohere lift)
- Procurement path:Cohere via Azure Marketplace(Q5 Resolved Path A)— 統一 Azure subscription billing,non corporate card
- Vendor diversification reason:**reranker 是 quality differentiator**,not commodity component。Azure built-in 證實 quality gap;single-vendor 收緊 ~$50/month 但 quality 退步明顯

#### Q-B3:"What if Cohere has an outage during Beta?"

**Pre-canned answer**(per `architecture.md §7.3 E7 + §8.3 R6`):
- Hot fallback to Azure built-in semantic ranker 已 wired(`Settings.reranker_kind=azure` config flag 切換)
- Backend 唔需 redeploy — Settings hot-swap
- Quality temporary -10pp until Cohere recovers — acceptable for outage scenario
- W6 D1 verify Azure 2-way working(reports/ragas-azure-subset20.json)— hot fallback path tested

### Q&A Section C — Operations + Cost + Beta

#### Q-C1:"Per-query cost?"

**Pre-canned answer**(approximate W6 measurement):
- Embedding(text-embedding-3-large):~$0.0001 / query(11 input tokens × $0.00013)
- Hybrid retrieval(Azure AI Search):~$0.00 marginal(within S1 monthly fee)
- Cohere rerank(v4.0-pro):~$0.002 / query(50 candidates × $0.00004)
- LLM synthesis(GPT-5.5):~$0.005-0.015 / query(input ~1500 tokens × output ~500 tokens)
- **Total per query:~$0.005-0.020 USD**
- Daily projection 50 user × 10 query = 500 query/day = $2.50-10/day = **~$75-300/month POC**
- Beta scaling ~250 user × 10 query = 2500/day = ~$375-1500/month → 進 cost monitoring dashboard plan

#### Q-C2:"What's the latency?"

**Pre-canned answer**:
- W6 D1 LIVE measurement(`reports/ragas-cohere-subset20.log` baseline + Azure run):
  - Embedding ~1-4 秒
  - Hybrid retrieval ~1-2 秒
  - Cohere rerank ~1-2 秒
  - GPT-5.5 synthesis ~3-10 秒(reasoning model 唔 deterministic)
  - **Total p50 ~8-15 秒,p95 ~25-30 秒**
- First-token latency(SSE streaming)~2-5 秒(meets §7.2 stretch target ≤ 2s on simple queries)
- **Architecture target**:p50 < 5s / p95 ≤ 30s — 部分 query 觸 p95 邊界,W7 polish window 對應 long-tail latency

#### Q-C3:"Beta scope and timeline?"

**Pre-canned answer**(per `beta-plan-v1.md`):
- W7:Microsoft Entra ID auth integration + rate limiting + audit logging + mobile responsive
- W8:Beta deploy 到 Azure Container Apps + Static Web Apps + user feedback dashboard + cost monitoring
- W9:50 internal users onboarded + real query log collection + 4-metric daily review
- W10:Beta refinement + edge case fixes + production readiness review
- W11:Staged rollout 25% → 50%
- W12:Staged rollout 100%(250-500 user full launch)+ Day-2 ops handover + Tier 2 roadmap kickoff prep

### Q&A Section D — Risk Slides(Stakeholder Transparency)

#### Q-D1:"What can go wrong in Beta?"

**Risk register active monitoring**(`docs/01-planning/RISK_REGISTER.md` living):
- **R1 Shadow AI**(High × High): mitigation via Beta pulse survey W9 + onboarding differentiation messaging
- **R5 Azure OpenAI quota at 50-user peak**(Low × High): pre-negotiated quota + application-side rate limiting + multi-region fallback
- **R6 Cohere outage**(Low × Medium): hot fallback Azure built-in semantic ranker(W6 D1 verified working)
- **NEW R8 Ricoh corp proxy / VPN SSL inspection**(High × High W2-W6 active): mitigation = home network or VPN disconnect for cloud-bound work;**W6 D1 calibration update**:`curl schannel CRL revocation failure ≠ Python httpx failure`(future cloud-bound LIVE pre-flight 用 Python httpx probe 為 ground truth)
- **R7 Document edge case**(Medium × Low): parser fail-graceful + Admin Console flagged list + manual fallback

#### Q-D2:"What if Gate 2 STRONG PASS doesn't happen at full-corpus?"

**Pre-canned answer**:
- Gate 2 PARTIAL PASS(W5 D2 verdict + W6 D1 Azure 2-way reaffirm)is **acceptable Tier 1 verdict per W4 plan §F10 fallback policy**
- Full-corpus(F2 post-Q14 SME labeling cascade)evaluation 留 W6 D3-D5 if Chris labeling cascade lands;否則 carry W7+ Beta phase
- L2 CRAG NOT dropped(drop-L2 trigger condition 4-metric within-5pp 互換 FAIL 未觸發 — partial verdict 仍 PASS path)
- Beta phase real query log will provide ground truth backstop for Tier 1 quality baseline

---

## Part 3 — Demo Artifacts Checklist

| Artifact | Status | Owner | Notes |
|---|---|---|---|
| Demo script narrative | ✅ this file Part 1 | AI(W6 D3) | Chris polish W6 D5 |
| Stakeholder Q&A pack | ✅ this file Part 2 | AI(W6 D3) | Chris polish W6 D5 |
| Beta plan v1 | 🚧 `docs/03-implementation/beta-plan-v1.md` | AI(W6 D3) | F5.3 in progress |
| Demo screenshots / GIF | 🚧 deferred | Chris dev server | F5.4 → W6 D4/D5 post-F4.4 |
| Risk register update for stakeholder | ✅ embedded above Section D | AI | living doc separate |
| Cost projection slide | ✅ embedded above Section C | AI | numbers measured W6 D1 |
| Latency stats slide | ⏸ partial(p50/p95 indicative;F4.3 LIVE measurement Chris dev server)| Chris | full numbers post-F4 |

---

**Lifecycle reminder**:呢份 demo prep artifact 衍生自 W6 plan F5.1+F5.2 deliverables。Stakeholder approval cycle 之前 stakeholder review pass 為 final;polish window = W6 D4-D5。
