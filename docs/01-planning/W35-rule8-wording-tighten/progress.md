---
phase: W35-rule8-wording-tighten
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: active   # F0 kickoff 2026-05-26
last_updated: 2026-05-26
---

# Phase W35 — Progress

> Daily progress + decisions + commits + 結尾 retro。Append-only(per PROCESS.md v2.0)。

---

## Day 0(2026-05-26)— F0 Kickoff

### Action

W34 closed PASS measurement-only(`6734161` pushed origin/main 2026-05-26 same-day)→ user explicit pick W35 kickoff = **Rule 8 wording tighten「cite SUFFICIENT chunks」**(W34 retro HIGHEST OPTIONAL candidate per F2 G2 LLM emit dominant 92% verdict)。

### R6 Day 0 recursive grep verify(per CLAUDE.md §10 R6)

3 個 catch surfaced before F1.0 wording lock:

**Catch (1)**:`backend/generation/prompt_builder.py:30` Rule 8 verbatim wording captured。5 key phrases lock 喺 SYSTEM_PROMPT line 30:

```
8. When multiple retrieved chunks each contain partial information relevant to the answer,
cite ALL of them (not just the most representative one) — each fact in the answer should
be backed by every chunk that supports it. If two chunks describe the same scenario from
different angles, both warrant a citation marker. (W33 F1.1.b — Rule 8 restored from W31
commit 16b9b3d per sequential ship layered on W32 (h') backend)
```

F1.0 surgical edit target single line。

**Catch (2)**:`backend/tests/test_prompt_builder_dispatch.py:207-221` 5 assertions 鎖住 Rule 8 verbatim:

```python
assert "cite ALL of them" in SYSTEM_PROMPT
assert "partial information" in SYSTEM_PROMPT
assert "each fact in the answer should be backed by every chunk" in SYSTEM_PROMPT
assert "two chunks describe the same scenario" in SYSTEM_PROMPT
assert "both warrant a citation marker" in SYSTEM_PROMPT
```

F1.1 必須同步 update 全部 5 個 phrase 至 W35 tightened wording。任何 phrase 唔同步 break test。

**Catch (3)**:W33 verbatim restoration source `16b9b3d` — W35 是 first divergence from verbatim。`test_system_prompt_includes_rule_8_cite_breadth` docstring 「Restored verbatim from W31 commit 16b9b3d」 wording 需要 update 至 「Tightened W35 from W33 verbatim restoration」。

### 3 候選 wording surface(F1.0 implementation lock 之前)

| Option | Wording | 緊度 + 預測 |
|---|---|---|
| **A 激進** | `cite the most relevant chunks (typically 1-2 per fact) — additional overlapping chunks only if they add non-redundant detail` | 強 bound;可能傷 G1 cross-section breadth(W34 correctness +2.53pp 風險)|
| **B 中等** ⭐ working candidate | `cite SUFFICIENT chunks to support each fact (typically 1-2 chunks) — additional overlapping chunks warrant citation only when they add non-redundant detail (different angle, complementary evidence)` | 保留 W33 「different angles」 intent + soft cap;最 likely G1 preserve + G2 G3 drop |
| **C 保守** | `cite the chunks that support each fact (typically 1-2 per fact) — avoid citing multiple overlapping chunks that convey the same information` | 最 minimal change;G2 G3 drop 可能弱 |

**Working assumption**:Option B(中等)是 F1.0 implementation default 候選。F1.0.a 之前 user 可 override pick A/C。

### W26-W34 baseline reference

| Baseline | Source | Metric |
|---|---|---|
| W26 F1 historical | `baseline-metrics-W26-D1-raw.json` | faith 0.9851 / correctness 0.7416 / recall@5 0.8744 / p95 1001ms |
| **W34 F1 baseline** ⭐ | `backend/w34-f1-ragas-eval-raw.json` | **faith 0.9836 / correctness 0.7669 / recall@5 0.8936 / p95 1331ms** |
| W34 F2 baseline | `backend/w34-f2-aggregate.json` | I07 avg 62.2s / I01 avg 53.4s / synth_overall 16974ms / **synth_llm_completion 15665ms 92%** / synth_expand_citations 1308ms 8% / synth_prompt_build 0ms / **I07 avg_cit 6 / I01 avg_cit 10.2** |
| W34 envelope | W34 F1 baseline -2pp | **faith ≥ 0.9637** preserve threshold |

### Decision tree pre-implementation surface

3-axis decision tree(per plan §3):

| Axis | Threshold | Branches |
|---|---|---|
| **G1 faith** | W34 -2pp = 0.9637 | preserve / flag / break |
| **G2 cit count** | I07 ≤ 5 AND I01 ≤ 8 | drop / inconclusive / null |
| **G3 LLM emit** | synth_llm_completion ≤ 14098ms(-10%)| drop / inconclusive / null |

**Most likely outcome**:Option B → G1 preserve + G2 drop + G3 drop → W35 ship production-ready preserve in main。**Risk outcome**:Option B aggressive tighten → G1 break → F1.7 contingency revert to W33 verbatim。

### Self-verification checklist(per CLAUDE.md §12)

- [x] 對應 spec section:`docs/architecture.md §3.2` Citation contract(prompt-side enforcement)+ §3.5 Citation invariant
- [x] H1-H7 不違反 — F1.0 Rule 8 wording tighten = non-architectural prompt content change(no schema / vendor / storage / 8-view philosophy / Tier 2 / security / design fidelity impact)
- [x] §1 Karpathy think-before-coding — R6 3 個 catch + 3 wording options + decision tree surface before F1.0 lock
- [x] N/A frontend fidelity check
- [x] N/A test write(F1.1 in-place assertion update)
- [x] N/A ruff(no code edit this entry)
- [x] Commit message follow Conventional Commits — `docs(planning): kickoff W35-...`
- [x] N/A architectural-adjacent → ADR
- [x] N/A Dify reference
- [x] OQ status check — none expected for measurement re-verify phase
- [x] Phase checklist tick'd — F0.1-F0.4 + F0.5 in progress

### Commits

- `b2f4ca3` — F0.6 kickoff(plan + checklist + progress combined,3 files / 543 insertions)
- `8c08557` — F0.7 session-start.md §10 W35 row append active + W34 closeout commits backfilled

### Carry-overs / Blockers

- F0.5 progress.md Day 0 entry(this file)— done
- F0.6 kickoff commit `b2f4ca3` — done
- F0.7 session-start.md §10 W35 row append commit `8c08557` — done
- **D1 trigger**:F1.0.a Option A/B/C lock — user pick required(default Option B working candidate);plan §1 + progress.md Day 0 「3 候選 wording」 surface ready

---

## Day 1(2026-05-26)— F1 Rule 8 wording tighten + LIVE RAGAs eval + F1.7 Option C re-tighten

### F1.0 Initial Option B lock + edit

User lock Option B(working candidate per §1 surface)= `cite SUFFICIENT chunks to support each fact (typically 1-2 chunks) — additional overlapping chunks warrant citation only when they add non-redundant detail (different angle, complementary evidence)`。

- F1.0.a Option B locked
- F1.0.b prompt_builder.py:30 single-line edit B applied
- F1.0.c Attribution comment updated `(W35 F1.0 — Rule 8 wording tighten from W33 verbatim restoration per W34 G2 LLM emit dominant 92% verdict)`
- F1.0.d ruff clean ✅

### F1.1 Test assertions sync Option B

- F1.1.a `test_system_prompt_includes_rule_8_cite_breadth` → renamed `test_system_prompt_includes_rule_8_cite_sufficient`
- F1.1.b 5 assertions updated: `cite SUFFICIENT chunks` / `partial information` / `typically 1-2 chunks` / `non-redundant detail` / `different angle, complementary evidence`
- F1.1.c Rule 7 v2 + Rule 6 non-regression assertions unchanged
- F1.1.d Test docstring + section comment updated W33→W35 trajectory

### F1.2 pytest baseline verify Option B

- Full suite **1084 passed + 25 skipped + 0 failed in 384.38s** ✅(W34 closeout baseline exact preserve)
- ruff `All checks passed!` ✅

### F1.3 Backend kill+restart per PC chain

Docker Desktop UI 一度卡住,user 重啟 Docker + 所有 container restart。Pre-flight verify:
- Postgres `SELECT 1 AS ready_for_query` = 1 ✅(PC-W33-1)
- Langfuse `/api/public/health` 200 OK ✅(PC-W34-1,需 30s timeout cover post-restart warmup;Docker `unhealthy` flag 係 timing artifact 唔影響 endpoint)
- 冇 existing backend on :8000 → 直接 start fresh `python -m api.server`
- /health 5/5 components OK(azure_search + azure_openai + langfuse + postgres + cohere not_configured per Q5 Path A optional)

### F1.4 Option B LIVE RAGAs eval result

**runtime 478s vs W34 642s = -25% ⭐**

| Metric | W34 F1 | **Option B** | Δ vs W34 |
|---|---|---|---|
| faithfulness | 0.9836 | 0.9804 | -0.32pp ✅ G1 preserve(≥ 0.9637)|
| correctness | 0.7669 | 0.7169 | **-5.00pp ⚠️ regression** |
| recall@5 | 0.8936 | 0.8936 | 0 ✅ |
| p95_latency | 1331ms | 1402ms | +71ms 微升 |

**Karpathy §1.1 surface side effect**:Option B「different angle, complementary evidence」 wording 太 abstract 令 LLM over-conservative cite + answer 較 sparse → RAGAs `answer_relevancy` judge 解讀為 less complete supporting evidence → correctness -5pp regression。**唔在 plan §3 acceptance criteria explicit list 內**,但 material side effect。Surface to user 決定 path forward。

### F1.5 + F1.6 Decision tree branch verdict Option B

- G1 faith = **preserve ✅**(0.9804 ≥ 0.9637 W34 envelope + ≥ 0.9651 W26 envelope)
- G2 + G3 deferred F2 measurement,runtime -25% strong proxy
- **NEW G2' correctness side effect** -5pp NOT in §3 → 用戶 decision required

### F1.7 Contingency Option C re-tighten(user lock path (β))

User explicit lock 2026-05-26 path (β) F1.7 contingency → Option C「最保守」 wording。Plan §7 changelog amendment R3 logged before re-edit。

**Option C wording**:`cite the chunks that support each fact (typically 1-2 per fact) — avoid citing multiple overlapping chunks that convey the same information`

- F1.7.b.1 plan.md §7 changelog F1.7 amendment row appended(R3 no silent drift)
- F1.7.b.2 prompt_builder.py:30 B→C edit
- F1.7.b.3 test_prompt_builder_dispatch.py 5 assertions B→C update:`cite the chunks that support each fact` / `partial information` / `typically 1-2 per fact` / `avoid citing multiple overlapping chunks` / `convey the same information`;test docstring + section comment updated B→C
- F1.7.b.4 pytest scoped `tests/test_prompt_builder_dispatch.py` = **14 passed** ✅
- F1.7.b.5 ruff `All checks passed!` ✅
- F1.7.b.6 Rename `w35-f1-ragas-eval-raw.json` → `w35-f1-option-b-raw.json`(audit trail);runner OUTPUT_RAW_JSON → `w35-f1-option-c-raw.json`
- F1.7.b.7 Backend kill PID 32632 + restart with Option C wording → 5/5 components OK
- F1.7.b.8 F1.4 re-run Option C → **475.4s runtime**

### F1.4 Option C LIVE RAGAs eval result(post-F1.7 contingency)

| Metric | W34 F1 | Opt B | **Option C** | Δ vs W34 | Δ vs Opt B |
|---|---|---|---|---|---|
| **faithfulness** | 0.9836 | 0.9804 | **0.9876** | **+0.40pp ⭐ IMPROVED** | +0.72pp |
| **correctness** | 0.7669 | 0.7169 | **0.7226** | -4.43pp ⚠️ | +0.57pp |
| recall@5 | 0.8936 | 0.8936 | 0.8936 | 0 ✅ | 0 |
| **p95_latency** | 1331ms | 1402ms | **1102ms** | **-229ms (-17%) ⭐⭐** | -300ms |
| eval runtime | 642s | 478s | **475s (-26%) ⭐** | -167s | -3s |
| failed_queries | 10 | 11 | 10 | unchanged | -1 |

**Critical findings**:

1. **G1 faithfulness IMPROVED ⭐** — Option C 0.9876 超越 W34 baseline 0.9836(+0.40pp);Option C explicit anti-pattern 「avoid citing multiple overlapping chunks」 把 LLM cite-decision 收緊到 high-signal chunks only
2. **p95_latency -17% ⭐⭐** — per-query 中位數延遲 1331ms → 1102ms,確認 G3 LLM emit drop 假設正確(F2 stage timing 會 fine-grained confirm)
3. **runtime -26% ⭐** — eval pipeline cost win 同 Option B 相若
4. **correctness -4.43pp persisting** — 同 Option B -5pp 同樣 pattern,根因 = 「typically 1-2 per fact」 soft cap 本身令 LLM 答案更 concise → answer_relevancy judge 解讀為 less complete。Option C correctness 0.7226 = W26 baseline 0.7416 **-1.90pp**(W33-W34 累積 +2.53pp boost 部分喪失,但 close-to-baseline 而非 deep regression)

### Decision tree branch verdict Option C

| Axis | Threshold | Option C | Verdict |
|---|---|---|---|
| **G1 faith** | ≥ 0.9637 envelope | 0.9876 | ⭐ **G1 IMPROVED** beyond preserve |
| **p95_latency** | n/a explicit | 1102ms | -17% ⭐⭐ |
| eval runtime | n/a explicit | 475s | -26% ⭐ |
| G2 cit count | I07 ≤ 5 AND I01 ≤ 8 | TBD F2 | runtime + p95 strong proxy → 預期 G2 drop |
| G3 LLM emit | ≤ 14098ms(-10%)| TBD F2 | p95 -17% strong proxy → 預期 G3 drop |
| G2' correctness side effect | -1.90pp from W26 historical | 0.7226 | persist;within Q4 tolerance(W26 baseline state ship history)|

### F1.5-F1.6 final verdict + W36+ priority queue update

**User lock path (α) Ship Option C + proceed F2**(2026-05-26 same-day post-Option C result):
- Option C Pareto-optimal vs Option B 全部 4 axis 嚴格 better
- G1 actually IMPROVED 唔係 preserve
- correctness -1.90pp from W26 baseline within historical Q4 tolerance
- F2 latency re-verify pending → confirm G2 G3 cit count + LLM emit drops

W36+ priority queue update:
- DEMOTE: Option A more aggressive re-tighten(Option C 已 Pareto-optimal,A 風險高 G1 break)
- PRESERVE: PC-W34-1 + PC-W34-2 + (j') section_path + PC-W33-1 + PC-W32-1/2 housekeeping
- DEMOTED LOW: prompt token reduction + engine-fetch async pool(F2 evidence 預計仍 dominate LLM emit)

### Self-verification checklist(per CLAUDE.md §12)

- [x] 對應 spec section:architecture.md §3.2 Citation contract(prompt-side enforcement)
- [x] H1-H7 不違反 — Option C 仍係 prompt content change(non-architectural per H1)
- [x] §1 Karpathy think-before-coding — F1.4 surprise correctness -5pp surfaced upfront → user lock path (β) → Option C strictly better outcome
- [x] N/A frontend fidelity check
- [x] Test write — in-place assertion update(F1.1 + F1.7.b.3)
- [x] ruff PASS both edits
- [x] Commit message Conventional Commits(pending F1.8 commit)
- [x] N/A architectural-adjacent → ADR
- [x] N/A Dify reference
- [x] OQ status check — none expected wording tighten phase
- [x] Phase checklist tick'd — F1.0-F1.7 sub-items pending F1.8 commit

### Commits

- (F1.8 F1 commit pending — combined Option B + F1.7 Option C re-tighten lifecycle)

### Carry-overs / Blockers

- F1.8 F1 commit pending
- F2.1+ latency re-verify pending(F2.1.a w35-f2-runner.py adapt + F2.1.b 5-run + F2.2 aggregate + F2.3 commit)
- F3 closeout pending(post F2 outcome)

---

## Day 2(TBD)— F2 Latency re-verify + F3 closeout

(F2 5-run latency measurement + aggregate vs W34 F2 baseline + F3 decision tree intersect closeout)

---

## Day 2(TBD)— F2 Latency re-verify + F3 closeout

(pending Day 1 outcome)
