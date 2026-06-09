---
change_id: CH-012
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: implementing     # implementing | closed
---

# CH-012 — Progress

> Day-N entries + closeout retro。

---

## Day 1 — 2026-06-09

### Done
- 用戶揀 kickoff Gap C C-2(圖片完整性)→ 調查現有揀圖 logic(CH-011 已做 document-order span）
- **實測根因診斷**(/query drive-images-1):20 圖**全堆 §3.1.1 lead citation**,citations[1-12] 零圖;20 張只涵蓋 §3.1.1+§3.1.3,**§3.1.4/3.1.5 零圖**。兩重 front-loading cap(section-attach max_aux=18 doc-order truncate + cap_images_per_answer=20 greedy)疊加 + decorative filter 20→15
- 用戶揀**方向 A(section-fair 分配)**over B(純升 cap）/ C(A+升 cap）
- spec.md 寫 + approved;ADR-0049 寫 + Accepted + README index

### Decisions
- Change CH-012(改既有揀圖分配行為,非 bug;< 3 days)
- ADR-0049 延伸 ADR-0048「揀圖模式」(section-fair distribution）
- 主修 = section-attach round-robin;次修(cap section-fair)= conditional,視主修實測(Karpathy §1.2 唔投機）
- 維持 cap=20(唔升,守圖洪水紀律);無 re-index/schema/frontend 改

### 實作 + Verify（Day 1 cont）
- **F1 主修**:`_find_section_neighbour_images` 改 round-robin —— 候選按 `section_path[:depth+1]` sub-section 分組(組按首 chunk_index 排序),`max_aux` budget 輪流跨組取圖,組內 doc order,`seen` 全局 dedup。單 group → 退化 sequential(bit-identical）。
- **T1/T2 test**:加 4 個 round-robin test(spread budget / tail-not-starved-bug / within-group doc-order / shared-figure dedup);26 既有 section/window test 全綠 = production-preserve。pytest **30 passed**。
- **V1**:ruff format clean;ruff check 2 pre-existing(B905 L83 + I001,CH-011 已記錄非我新增);新 code 零新 error。
- **V2 PASS（AC1）**:重啟 backend 載新 code，/query drive-images-1 → 20 distinct 圖 by section = §3.1.1:**2** / §3.1.3:**7** / §3.1.4:**5** / §3.1.5:**6**（baseline §3.1.4+§3.1.5 = **0**）。尾段 Approve/Reject + Post 唔再零圖。
- **F2 決定**:次修(cap section-fair）**唔需要** —— 主修已令圖 section-fair 且 survive cap=20（Karpathy §1.2）。

### Blockers
- 無（待 V3 用戶 live 驗 chat UI）

### Commits
| Hash | Subject |
|---|---|
| `cf94a63` | docs(change): CH-012 kickoff — spec + ADR-0049 |
| _(pending)_ | feat(generation): CH-012 section-fair neighbour-image distribution |

---

## Closeout（填於 status=closed）
_(待)_

---

**End of CH-012 progress**
