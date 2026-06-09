---
change_id: CH-012
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: closed     # implementing | closed
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

## Closeout — 2026-06-09

**判決**:✅ DONE（用戶 live UI 確認 OK）

- **交付**:`_find_section_neighbour_images` round-robin 跨 sub-section（ADR-0049）→ 解尾段 section 圖片餓死。主修一個搞掂,次修(cap section-fair)實測後判定唔需要。
- **驗證鏈**:30 unit test 綠(4 新 + 26 production-preserve)→ /query 實測 §3.1.4:5 / §3.1.5:6（baseline 0）→ 用戶 live UI PASS。
- **commit**:`cf94a63`（kickoff spec+ADR）+ `dcfc189`（impl+test）;ff-merge → main。
- **Gap C / Platform P1 完成**:CH-011（C-1 doc_order 排序）+ CH-012（C-2 完整性 section-fair）= layer C 地基齊。platform design doc §7 P1 標 done。

### Retro（教訓）
- **數據驅動 scope 救咗一次盲改**:初步假設「cap budget 食重複圖」**錯**;/query 實測揭真因 = 兩重 front-loading cap 把圖全堆 §3.1.1 lead + max_aux 擠走尾段。先實測再寫 spec(Karpathy §1.1)避免修錯層。
- **次修按實測判定唔做**:F2(cap section-fair)spec 標 conditional,主修 verify PASS 後判定多餘 → 唔做投機改動(§1.2)。
- **production-preserve 靠單-group 退化**:round-robin 喺單 sub-section 退化做 sequential = bit-identical,26 既有 test 零改動全綠。

### Next（platform 後續）
- **Gap A / P2**（per-doc 配置平台 + UI）= 用戶 vision 核心,未起。
- **Gap B / P3**（query 意圖 gate）必要性未證實,最低優先。

**Spec status → done。**

---

**End of CH-012 progress**
