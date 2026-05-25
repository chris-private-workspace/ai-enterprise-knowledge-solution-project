---
bug_id: BUG-025
report_ref: ./report.md
checklist_ref: ./checklist.md
postmortem_ref: ./postmortem.md
status: done
last_updated: 2026-05-25
---

# BUG-025 — Progress

> Daily progress + Sev2 mandatory postmortem per PROCESS.md §4。
> Every commit must correspond to a Day-N entry mention(R2 binding rule)。

---

## Day 1 — 2026-05-25:BUG-025 surface + governance + implementation + verify + closeout

### Trigger sequence(2026-05-25 same-session as CH-005 ship)

1. **CH-005 ship 2026-05-25 morning**(commit `8418b57`)— W25 R14「Synthesizer overview-refuse」mitigation attempt via (i) Rule 6 `prompt_builder.py` + (iii) EXAMPLE 3 `query_reformulator.py`;all gates green(11 NEW tests + 1024 regression + mypy + ruff)。
2. **uvicorn restart + chat UI retry by Chris** — kill PID 34772 master + PID 24620 reload child;fresh start PID 47112 + reloader PID 1484;`/health` 200 confirm。
3. **Chris user-eye verify result**:
   - Q-W25-I07「show me all the Integration scenarios」still 0 citations + refuse(CH-005 唔 effective)
   - Control「what is high level architecture」still ✅ cites + screenshot(no regression)
   - **Chris feedback verbatim**:「現在連一些的內容也返回不了;而 query: what is high level architecture 反而沒有問題」
4. **AI investigation chain**:
   - `Grep _apply_low_value_post_filter` in `backend/retrieval/hybrid.py` → confirmed asymmetric drop branch at lines 66-97
   - `Grep enable_query_expansion` in `backend/storage/settings.py` → `False` default(reformulator EXAMPLE 3 NOT firing)→ ruled out (C) hypothesis
   - Settings inspection:`retrieval_image_low_value_weight: float = 0.7` active default → ADR-0035 post-filter active
   - **Root cause confirmed**:ADR-0035 `low_value + no-image → DROP` asymmetric branch silently removes text-only chunks。Integration scenarios chunks = text-only(empirical KB profile)+ short-structured(ADR-0033 chunker flags as low_value)→ silent drop。

### H1 boundary surface + Chris design pick(2026-05-25 AskUserQuestion 2-step)

**Investigation step** revealed `_apply_low_value_post_filter` asymmetric drop = ADR-0035 design assumption error(assumed text-only low_value = TOC/version-statement noise — empirically false for scenario-enumeration content);3 mitigation candidates analyzed:

| Path | Code locus | H1 trigger? | Diagnosis |
|---|---|---|---|
| **Path A** symmetric deboost | `_apply_low_value_post_filter` rewrite — low_value 一律 retain × image_weight | ⚠️ Yes — retrieval policy change → ADR-0035 amendment | Simplest;matches §3.5「deboost」spec literal intent;score × 0.7 should rank below non-low_value naturally |
| **Path B** chunker exception | ADR-0033 chunker — add heuristic for「scenario/case/example」enumeration markers → 唔 flag low_value | ⚠️ Yes — chunker logic change → ADR-0033 amendment | Keep ADR-0035 image-bias;but heuristic-fragile + domain-specific signal hard to generalize |
| **Path C** feature-flag post-filter | NEW `Settings.enable_low_value_post_filter: bool = True` default;False = identity passthrough | ❌ NO — Settings only,not architecture | Reversible A/B but tech-debt(short-term mitigate,not close root cause)|

**Chris design pick 2-step**:
1. **「Path A symmetric deboost」** — root-cause close
2. **「Amend ADR-0035(Recommended)」** + **「Single atomic commit(Recommended)」** — governance + commit shape

### Done

**1. BUG-025 docs landing**:

- `docs/03-implementation/bugs/BUG-025-retrieval-low-value-no-image-silent-drop/report.md` v1.0(Sev2 severity rationale + root cause + 5-whys + fix scope + acceptance criteria + risks + timeline)
- `checklist.md`(I1-I3 implementation + T1-T9 tests + D1-D5 docs amend + V1-V7 verify + P1 postmortem + G1-G6 governance + C1-C5 closeout)
- `progress.md`(this entry)
- `postmortem.md`(Sev2 mandatory per PROCESS.md §4)

**2. ADR-0035 amendment**(per Chris pick):

- Status flip:「Accepted」→「Accepted; amended 2026-05-25 W25.5 per Sev2 BUG-025」
- Decision (b) code block update — symmetric deboost rewrite
- NEW section "Amendment 2026-05-25 W25.5 BUG-025 — symmetric deboost" — explain assumption error + symmetric evolution
- References block add BUG-025 cross-ref

**3. Implementation**(2 file edits per Karpathy §1.3 surgical scope):

| File | Change |
|---|---|
| `backend/retrieval/hybrid.py` | `_apply_low_value_post_filter` symmetric deboost rewrite — remove asymmetric drop branch;low_value 一律 retain × image_weight;degenerate `image_weight ≤ 0` path preserved as A/B branch;module header comment + docstring updated |
| `backend/tests/test_hybrid_searcher_image_low_value.py` | 6 tests revised semantics(4 inverted drop→retain + 2 revised counts)+ 13 preserved unchanged;module-level docstring updated |

**4. Cross-doc sync**:

- `docs/architecture.md §3.6` line 384 inline-tagged amendment text re-amended(symmetric deboost wording)
- `docs/01-planning/RISK_REGISTER.md` R14 flip to Mis-diagnosed + NEW R15 entry(Sev2 → Mitigated)
- `docs/03-implementation/changes/CH-005-synthesizer-overview-aggregate-query-handling/spec.md` frontmatter:`approved → superseded-by-bug-025`(commit `8418b57` retained per Chris pick — prompts reasonable improvements but functionally orthogonal to root cause)
- `docs/12-ai-assistant/01-prompts/01-session-start.md` §11 R14 framing update + §10 sprint timeline add W25.5 BUG-025 row

**5. Verify gates**(see Day 1 §Done.6 below for results):

### Decisions(Day 1)

- **D1.1** — Path A picked over Path B(chunker exception heuristic-fragile)+ Path C(feature-flag postpones root-cause close)— per Chris AskUserQuestion 2026-05-25
- **D1.2** — Amend ADR-0035 picked over NEW supersede ADR — precedent ADR-0017 5 amendments + keeps ADR sequence lean + same decision family
- **D1.3** — Single atomic commit picked over two-commit(docs first / code second)— matches CH-005 precedent(`8418b57`)+ easier rollback if V6 user-eye verify fails
- **D1.4** — CH-005 commit `8418b57` retained(NOT reverted)— Rule 6 + EXAMPLE 3 仍係 reasonable improvements for overview/aggregate framing semantics + retain documentation continuity;spec.md frontmatter flipped to「superseded-by-bug-025」with retention rationale
- **D1.5** — Sev2 framing(not Sev1)— silent degradation,pre-Beta caught,query-class scope(text-only overview/aggregate),no production user impact yet;Sev1 reserved for production-down / data-loss / Beta-cohort-affecting
- **D1.6** — Test count preserved at 19(net unchanged)— 6 revised semantics vs adding NEW tests;cleaner regression count tracking
- **D1.7** — `image_weight ≤ 0` degenerate path preserved(drop all low_value)as A/B measurement branch — used for empirical comparison between asymmetric / symmetric / drop-all behaviors

### Blockers

無 functional blocker。User-eye verify(V6)requires uvicorn restart(`_apply_low_value_post_filter` 係 module-level function — `--reload` 應該 pick up,但 deterministic restart safer per CH-005 precedent)。

### Verify gates results(V1-V7)

| Gate | Result |
|---|---|
| V1 `pytest tests/test_hybrid_searcher_image_low_value.py -v` | ✅ **19/19 pass** in 0.66s(6 revised semantics + 13 preserved)|
| V2 `pytest tests/` full regression | ✅ **1024 passed + 25 skipped + 0 failed** in 192.84s(baseline preserved)|
| V3 `mypy --strict --explicit-package-bases retrieval/hybrid.py` | ✅ zero issues(clean)|
| V4 `ruff check retrieval/hybrid.py tests/test_hybrid_searcher_image_low_value.py` | ✅ all checks passed |
| V5 uvicorn restart + `/health` 200 | ✅ PID 12488 ready in 0s + all 5 components ok(cohere not_configured fallback expected per Q5 Path A)|
| V6 User-eye Q-W25-I07 retry + control verify | ✅ **PARTIAL CONFIRMED 2026-05-25 12:18**:Q-W25-I07 returns **3 citations + 3 screenshots**(vs pre-fix 0 + refuse — **silent-drop regression CLOSED ✅**);Scenario A named explicitly + 4 patterns extracted from meta chunk + chunk #8 §3.1 cited(2/5 scenarios A-only named — remaining quality gap **架構 mismatch per investigation brief**,NOT BUG-025 scope);control「what is high level architecture」no regression(still cites + screenshot ✅)|
| V7 R14 + R15 status flip + Task #208 close | ✅ RISK_REGISTER R14 ⛔ Mis-diagnosed superseded by R15;NEW R15 🟢 Mitigated by BUG-025 Path A;CH-005 spec frontmatter `approved → superseded-by-bug-025`(commit `8418b57` retained per Chris pick);session-start.md §11 BUG-025 CLOSED block added |

### Reframing per investigation brief(`docs/09-analysis/rag_retrieval_quality_investigation_20260525.md`)

User surfaced investigation brief mid-V6 verify cycle 2026-05-25。Brief 提供 critical context:

- **Problem 1**(enumeration query answer 唔完整 — 5 scenarios 只 1 named)= **架構 mismatch**「enumeration query × 定長 chunking + top-k retrieval」嘅本質不夾;**Dify 用 Cohere v4.0-pro 同 query 都 fail** 答「I'm not sure about that」→ **NOT EKP-unique bug,NOT BUG-025 scope**
- **Problem 2**(圖唔相關 — `attach_neighbour_images` 純位置鄰近)= 🟢 調參 candidate / 🟡 根治需要 multimodal embedding(H2 new vendor)
- **Problem 3**(UI count 4 inline vs 3 thumbnail)= 🟢 純前端 deterministic bug — 3 套計數語意 mismatch(`chat/page.tsx:1228+1797+2126`);**BUG-026 candidate**(out of BUG-025 scope per Karpathy §1.3)

**BUG-025 scope was correct + complete**:close silent-drop regression(0→3 citations measurable)。剩低 problem 1+2+3 屬 separate W26+ phase scope。

### Decisions(Day 1)

- **D1.1** — Path A picked over Path B(chunker exception heuristic-fragile)+ Path C(feature-flag postpones root-cause close)— per Chris AskUserQuestion 2026-05-25
- **D1.2** — Amend ADR-0035 picked over NEW supersede ADR — precedent ADR-0017 5 amendments + keeps ADR sequence lean + same decision family
- **D1.3** — Single atomic commit picked over two-commit(docs first / code second)— matches CH-005 precedent(`8418b57`)+ easier rollback if V6 user-eye verify fails
- **D1.4** — CH-005 commit `8418b57` retained(NOT reverted)— Rule 6 + EXAMPLE 3 仍係 reasonable improvements for overview/aggregate framing semantics + retain documentation continuity;spec.md frontmatter flipped to「superseded-by-bug-025」with retention rationale
- **D1.5** — Sev2 framing(not Sev1)— silent degradation,pre-Beta caught,query-class scope(text-only overview/aggregate),no production user impact yet;Sev1 reserved for production-down / data-loss / Beta-cohort-affecting
- **D1.6** — Test count preserved at 19(net unchanged)— 6 revised semantics vs adding NEW tests;cleaner regression count tracking
- **D1.7** — `image_weight ≤ 0` degenerate path preserved(drop all low_value)as A/B measurement branch — used for empirical comparison between asymmetric / symmetric / drop-all behaviors
- **D1.8** — V6 partial confirmation accepted as **closing BUG-025 scope**(silent-drop regression 0→3 citations measurable);remaining quality gap(1/5 scenarios named)attributed to architectural mismatch per investigation brief — NOT to be conflated with BUG-025 fix completeness
- **D1.9** — W26+ phase kickoff scope per Chris 3-step refinement(2026-05-25 chat):**Step 0** RAGAs context recall/precision baseline → **Step 1** rerank score threshold add(prerequisite for step 2)→ **Step 2** `enable_query_expansion=True` gated on step 1 + eval delta;image relevance / UI count / parent-doc ADR 留 step 2 之後 sprint scope。Brief §6 4-step approach refined by Chris explicit prerequisite ordering

### Carry-overs

- 🚧 **W26+ phase kickoff** per Chris 3-step refinement(per D1.9 above)— eval-driven baseline + rerank threshold + query expansion experiment;phase plan needed before any tuning per CLAUDE.md §10 R1
- 🚧 **BUG-026 candidate**(UI count discrepancy — problem 3 deterministic frontend bug per brief §2)— W26+ separate scope;**守 H7**(對 mockup 處理 multi-image citation 嘅 expected behavior 唔可以 approximate)
- 🚧 **BUG-027 candidate**(image relevance — problem 2 `attach_neighbour_images` 純位置鄰近)— 🟢 調參方向 brief §3 方向 C / 🟡 根治需要 multimodal embedding H2 new vendor ADR;W26+ scope
- 🚧 **Path A image_weight = 0.7 默認** — 仍 hard-coded default;W26+ Step 2 後可能基於 eval signal 調整(0.5 / 0.8 / 0.9);empirical signal-driven 而非 magic number

### Commits

- `fix(retrieval): BUG-025 Sev2 — symmetric deboost low_value chunks regardless of image presence (amend ADR-0035)`(single atomic commit per Chris pick)

---

**End of Day 1 entry** — BUG-025 fix implementation pending verify;commit + user-eye verify next。
