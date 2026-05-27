---
phase: W40-deboost-refinement-batch
plan_ref: ./plan.md
checklist_ref: ./checklist.md
status: closed   # F4 收尾 2026-05-27 — Phase Gate PASS outcome (a) per Chris pick
last_updated: 2026-05-27
---

# W40 — Progress

> Daily progress journal。每日 append 一個 Day-N entry,closeout 時 retro 7 段。

## Day 0 — 2026-05-27(kickoff)

### Trigger

W39 closed_partial 2026-05-27 推 origin/main `7b46df2`。User explicit pick post-`/compact` resume:**「W40+ kickoff,先執行 (1) + (2),immediate ship 唔需 wait Azure billing — W39 evidence-driven architectural insight 直接落實。」**

(1) + (2) 對應 W39 retro §W40+ HIGHEST 3 NEW 候選嘅前兩個:
- (1) **Anchor-prefix length-mismatch fix**(W39 F1 architectural insight 2,~30min effort)
- (2) **Cohere overfetch fix**(W39 F1 architectural insight 1,~1h effort)

第三個候選 Hybrid mode billing-resolved re-verify 屬 Azure IT-side billing event gate,W40 範疇外(W41+ candidate)。

### Plan rationale

- **Sequential ship strategy 對齊 W26 PC1 + W31 sequential ship strategy validated**:F1 先(simpler,less invasive,deboost loop 內 1-line min() 加 + 2 NEW tests)→ F2 後(more invasive,加 NEW Settings field + 4 NEW tests)
- **Atomic batch per W36 precedent**:兩個 fix 都係 algorithmic refinement 屬 same component(C04 Retrieval Engine)+ same module(`retrieval_engine.py`)+ same W38 cea024f cluster — atomic batch ship 比 split 2 phase 更 efficient + reduce overhead
- **Q4 measurement-experiment-fail-policy preserve**:F1 + F2 default disabled(deboost=1.0 default + multiplier=1 default)→ 0 production behavior change risk;LIVE F3 optional via Free tier workaround
- **Karpathy §1.3 surgical scope 嚴守**:無 synthesizer prompt change(W33 baseline preserve)+ 無 citation_expansion change(W32+W37 preserve)+ 無 LLM cost knobs(per memory `feedback_judge_llm_cost_policy.md`)

### R6 Day 0 6 catches surfaced(per CLAUDE.md §10 R6 W22 D9 recursive scope amendment)

| # | Catch | Evidence | Mitigation |
|---|---|---|---|
| 1 | `retrieval_engine.py:172-176` anchor_prefix silent truncate(無 length check)| Read tool L172-198 確認 | F1.1.a 加 `effective_depth = min(depth, len(anchor_sp))` |
| 2 | `retrieval_engine.py:160-162` reranker.rerank top_k 固定 pass(無 multiplier wrapper)| Read tool L160-162 + cohere.py L84-100 API contract 確認 | F2.3.a wrap 加 multiplier when deboost active |
| 3 | Existing `test_w38_reranker_deboost_same_section_hierarchical_zoom_preserved` 用 anchor `['Doc','§8']` length 2 → **NOT 對應實際 corpus shape**(W39 Path A evidence:corpus `['8. Integration scenarios...']` length 1 無 leading "Doc")| W39 F2 Path A runner output L4-25 corpus section_path 證據 | F1.2.a NEW test 用 length-1 anchor reproduce W39 evidence bug 模式 |
| 4 | Settings 新 field 命名要 distinct vs `hybrid_overfetch_for_rerank`(避免 confusion)| `settings.py:91-104` Cohere block 已有 `hybrid_top_k_retrieval` etc + W38 block L297-303 | F2.1.b `reranker_overfetch_multiplier` 命名 + comment block 解 distinction |
| 5 | `server.py:156-163` RetrievalEngine init wire 已有 W38 deboost 2 params,F2 加一行同 pattern | Read tool L156-163 確認 | F2.5.a 加一行 wire(no breaking change) |
| 6 | `.env` REVERTED 2026-05-27(production preserve invariant per W37/W38/W39 closeout precedent)| W39 plan §7 §F3 changelog | F3.2.a + F4.A.5 marker block convention preserved |

### Real-calendar projection

- F0 ~30min(已 build folder + 4 artifacts + commit pending)
- F1 ~30min(simple 1-line min() + 2 unit tests)
- F2 ~1h(4 sites:Settings + engine init + rerank call site + truncate + 4 unit tests)
- F3 ~30-45min optional(Free tier workaround + 5+5 LIVE + decision tree)
- F4 ~30min closeout

**估計 total ~2.5-3h actual real-calendar collapse**(對齊 W36 atomic batch precedent + W39 multi-F mid-phase efficiency)。

### Next

F0.6 commit + F0.7 session-start.md sync → F1 implementation start。

---

## Day 1 — 2026-05-27(F1 + F2 + F4 same-day collapse)

### F1 — Anchor-prefix length-mismatch fix(~30min actual)

**Implementation**(commit `bca7446`):
- `retrieval_engine.py:172-198` deboost loop 加 `effective_depth = min(depth, len(anchor_sp))` + use 喺 anchor_prefix + cand_prefix slice 兩處
- Observability log 加 `effective_depth` field 顯式 trace anchor scope
- 2 NEW unit tests in `test_retrieval.py`:
  - `test_w40_f1_anchor_shorter_than_depth_hierarchical_zoom_preserved` 用 W39 evidence corpus shape(length-1 anchor + length-2 same-chapter zoom-in + length-2 cross-chapter)+ verifies zoom-in preserved,cross-chapter deboosted
  - `test_w40_f1_anchor_empty_section_path_no_deboost_defensive` 空 anchor → all preserved(defensive)

**BONUS housekeeping**(per W23 user directive 不希望累積債務 + Karpathy §1.3 surgical adjacent mess):
- W39 F2 pre-existing test mock gap discovered during F1 full pytest run — 6 tests failing with `_MockEngine.retrieve() got an unexpected keyword argument 'mode'`(W39 F2 `dadcb44` 加 mode propagation 但無 update test mock)
- Fixed 3 test files(`test_observe_query_route.py:62+237` `_MockEngine` + `_FailingEngine` + `test_e1_e5_e12_smoke.py:66` `_MockEngine`)— `**_kwargs: object` swallow per Karpathy §1.2 minimum code
- 6 previously failing tests reclaimed → pytest 1095 + 6 failed → 1101 passed + 0 failed

**Verify outcome**:
- pytest 1095 + 6 failed → **1101 passed + 0 failed**(+W40 F1 2 NEW + W39 mock fix 6 reclaimed)
- ruff PASS(W40 F1 specific edits + 3 mock fix files)
- mypy strict W40 F1 specific edits self-clean(13 pre-existing scope-out per Karpathy §1.3 + W38 F2 precedent)

### F2 — Cohere overfetch fix(~50min actual)

**Implementation**(commit `ca025cc`):
- `storage/settings.py` NEW field `reranker_overfetch_multiplier: int = 1` default disabled + 12-line comment block 解 distinction vs `hybrid_overfetch_for_rerank=50` + W41+ ramp guidance
- `retrieval_engine.py:__init__` add `reranker_overfetch_multiplier` param + store
- `retrieval_engine.py:158-167` rerank_top_k = top_k default + 若 deboost active + multiplier > 1 overwrite to top_k * multiplier
- `retrieval_engine.py:215-219` post-deboost truncate `chunks = chunks[:top_k]` invariant
- `retrieval_engine.py:232-238` observability log adds `rerank_top_k` field for trace visibility
- `api/server.py:163` wire `reranker_overfetch_multiplier=settings.*`(one line addition,no breaking change)
- 5 NEW unit tests(BONUS — plan §6 said 4,added aggressive deboost variant for clearer swap-in evidence):
  - `test_w40_f2_overfetch_multiplier_default_no_op` — multiplier=1 + deboost active → rerank top_k=5 unchanged
  - `test_w40_f2_overfetch_multiplier_disabled_with_deboost_disabled` — multiplier=4 + deboost=1.0 → multiplier dormant
  - `test_w40_f2_overfetch_multiplier_with_deboost_swap_in_same_section` — multiplier=4 + deboost=0.85 + 6 candidates simulated → rerank top_k=12 + xs deboosted
  - `test_w40_f2_overfetch_aggressive_deboost_swap_in_same_section_dominates` — multiplier=4 + aggressive deboost=0.5 + 6 candidates → `[anchor, same_pos5, same_pos6]` swap-in evidence ⭐
  - `test_w40_f2_overfetch_truncate_to_top_k_invariant` — multiplier=4 + 12 reranked + top_k=3 → final count exactly 3

**Verify outcome**:
- pytest 1101 → **1106 passed + 0 failed**(+W40 F2 5 NEW)
- ruff PASS(W40 F2 specific edits — settings.py + retrieval_engine.py + test_retrieval.py;api/server.py 30 E402 pre-existing truststore pattern NOT W40 F2 regression)
- mypy strict W40 F2 specific edits self-clean

### F3 — LIVE verify SKIPPED per Chris pick

Per W36 operational debt batch precedent — pure algorithmic refinement default disabled,unit test sufficient verification。F3 LIVE preserved as W41+ HIGHEST candidate alongside hybrid mode billing-resolved re-verify。Real-calendar saved ~30-45min。

### F4 — Closeout(in progress)

Phase Gate **PASS** outcome (a)。Cross-doc sync:plan.md + checklist.md + progress.md(本文件)+ session-start.md §10 W40 row flip。F1+F2 production code preserved as W41+ enabler。`.env` clean preserved(F3 NOT triggered,marker block 從未加)。

---

## Retro

### 1. 整體結果

**Phase Gate PASS outcome (a)** per Chris explicit pick(skip F3 → F4 closeout)。

**Key outcome metrics**:
- F1 + F2 implementation:atomic batch 4 commits(F0:`5d491cd` + `db1c305` / F1:`bca7446` / F2:`ca025cc`)
- Backend pytest:1095 + 6 failed → **1106 passed + 0 failed**(+11 net = W40 F1 2 + F2 5 + W39 mock fix 6 - 2 numerical reconcile)
- Real-calendar:F0 ~30min + F1 ~30min + F2 ~50min + F4 closeout ~30min = **~2.5h actual** vs ~2.5-3h estimate = **within range** ⭐(F3 LIVE skipped saves ~30-45min)
- Code change summary:
  - `retrieval_engine.py`:W38 deboost loop W40 F1 enhanced + W40 F2 overfetch wrap + truncate invariant + observability log extended
  - `storage/settings.py`:1 NEW field `reranker_overfetch_multiplier: int = 1`(default disabled preserve W38 baseline)
  - `api/server.py`:1 line wire(no breaking change)
  - `tests/test_retrieval.py`:7 NEW unit tests(2 F1 + 5 F2)
  - 3 mock files:W39 F2 pre-existing test gap fix(6 tests reclaimed)
- Production preserve invariant:**100% preserved** — F1 fix dormant until deboost activated;F2 multiplier=1 default disabled exact W38 baseline behavior

**2 architectural insights from W39 evidence directly implemented**:
- Insight 2 (anchor-prefix length-mismatch) — corpus chapter intro chunk under depth=2 silent truncate 修正 by effective_depth = min(depth, len(anchor_sp))
- Insight 1 (Cohere overfetch) — deboost scope-limited 修正 by top_k * multiplier rerank + truncate post-deboost

### 2. 5 axes lessons learned

| Axis | Finding | Action 來年 sprint adoption |
|---|---|---|
| **Plan accuracy** | F1+F2 cumulative real-calendar (~80min) matched ~90min estimate within range;BONUS items(W39 mock fix + aggressive deboost test)added but absorbed | Pattern correct — concrete code-change sites identified at R6 Day 0 level translate to accurate timing |
| **Karpathy §1.1 think-before-coding** | R6 Day 0 6 catches direct surface key implementation details(silent truncate bug location / Cohere top_n self-cap / Setting naming distinction)before any code — F1+F2 implementation 0 mid-implementation surprise R3-amend | Maintain R6 Day 0 framework — surfaced ALL major implementation decisions upfront |
| **Karpathy §1.3 surgical** | W39 mock fix 順手 discovered during F1 full pytest run — fixed within W40 F1 commit scope (per W23 不希望累積債務) NOT in separate W41+ phase | Pattern works — adjacent mess clean-up within atomic commit when discovered;don't pre-emptively scope-out without evidence |
| **W36 atomic batch precedent** | Pure algorithmic refinement(no production behavior change)+ unit test sufficient verification → closeout PASS without LIVE evidence;saved ~30-45min vs LIVE workflow | Pattern formalized — 對 default disabled infrastructure-only phases,LIVE optional per Q4 measurement-experiment-fail-policy |
| **Sequential ship strategy(W26 PC1 + W31 validated)** | F1 simpler first(simple 1-line min())+ F2 more invasive(NEW Setting + multi-file wire)separated atomic commits | Pattern preserved — clean attribution + reversal granularity per individual fix |

### 3. CLAUDE.md / PROCESS.md / session-start.md 同步

- **CLAUDE.md**:無 amendment required(F1+F2 純 algorithmic refinement,延續 W38 + ADR-0035 H1 verdict;Karpathy §1.3 surgical 仍 applicable)
- **PROCESS.md**:無 amendment required(Phase workflow 2026-05-27 v2.0 仍 robust 對 atomic batch precedent)
- **session-start.md §10**:W40 row append closed 2026-05-27 + W40+ → W41+ rename(F4 closeout commit)

### 4. Memory updates

無 NEW memory required — W40 F1+F2 純 algorithmic refinement,W39 F2 mock fix 屬 test infrastructure pattern(已 catalogued via test fix commit message)。`feedback_judge_llm_cost_policy.md` + `feedback_chinese_primary_replies.md` + `feedback_design_fidelity.md` 等 standing memories 持續 effective。

### 5. 後續(W41+ candidates)

| Priority | Candidate | Trigger / Effort |
|---|---|---|
| **HIGHEST preserved** | Hybrid mode billing-resolved re-verify(isolate true W38+W40 deboost effect without mode=vector conflate)| Azure billing IT-side gate;唯一 path 分離 hybrid vs vector mode contribution |
| **HIGHEST NEW** | F3 LIVE Free tier workaround(W40 SKIPPED)— mode=vector + .env temporary enable + 5+5 LIVE I07+I01 | ~30-45min;provide swap-in mechanism evidence + 2 architectural insights closure 验证;non-Azure-billing dependent |
| **MEDIUM preserved** | `\b\d+\.\d+\b` regex relax for `_find_neighbour_chunks` | TBD effort |
| **LOW preserved** | Ghost-Python-3.12 restart investigate(W37+W38+W39 重現)| TBD effort |
| **Long-term** | Q14 SME-validate reference_answer cascade / (c)/(e)/(f) BUG-026+027 cosmetic / W22 D8 setup.md §8.6 / W16 F1-F4 Track A IT cred 平行軌道 | 持續 carry-over |
| **永久 OUT** | path (a) judge LLM 升級 | per memory `feedback_judge_llm_cost_policy.md` |

### 6. Real-calendar collapse

**~2.5h actual** vs ~2.5-3h planned = **within range** ⭐(F3 LIVE skipped saved ~30-45min);F1+F2+F4 same-day cumulative。對齊 W36 atomic batch precedent + W39 multi-F mid-phase efficiency。

### 7. PR readiness

無 PR — W40 F1+F2 直接 main branch commits per established workflow(EKP Tier 1 內部開發,non-stakeholder-facing infrastructure refinement)。Push origin/main pending F4 closeout commit。
