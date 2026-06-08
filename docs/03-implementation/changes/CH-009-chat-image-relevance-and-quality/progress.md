---
change_id: CH-009
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: in-progress     # in-progress | closed
---

# CH-009 — Progress

> Day-N entries + closeout。每 commit 對應 Day-N mention(R2)。

---

## Day 1 — 2026-06-08

### Context
接 BUG-034 問題1 **圖片維度**(CH-008 文字 rerank 已 merged `34c5d7c` — chat 13/13 citation 錨 GL03)。Live 診斷(drive-images-1 GL「post a journal entry」`/query` 重現)揭三個圖片質素問題,全部圖 source_section 正確喺 GL03(非 recall 錯):① 裝飾燈泡 icon surface 成 figure(所有圖 `0x0` — dims 從來冇 populate)② `INLINE_IMAGE_CAP=8` 截斷 ③ 無 query-相關性排圖。Chris 揀「一個 CH 三項一齊」。

### Done(kickoff)
- ADR-0046 寫(Proposed)+ 入 ADR index(next NNNN=0047)。
- CH-009 spec(approved;OD-1/2/3 鎖定)+ checklist + progress committed。
- (pending I-A/I-B/I-C + tests + re-index + verify + closeout — code GATED on ADR-0046 Accept per H1)

### Decisions(Chris 2026-06-08 鎖定)
- **OD-1**:decorative flag + display filter(probe PNG IHDR 尺寸,stdlib 零新 dep;`min(w,h)<64px` 標 decorative;圖照存,display filter 走)。要 re-index drive-images-1。
- **OD-2**:wire per-KB `max_images_per_answer`(欄位已存在;null fallback 8)。
- **OD-3**:relevance 揀圖(owning citation `relevance_score`)+ document-order(Finding D)顯示。**H4 硬邊界:文字信號 only,無 image embedding**。

### Blockers
- Code GATED on **ADR-0046 Accept**(H1)。等 Chris Accept 先落 I-A→I-C。

### Effort
- Planned ~1-1.5 day;Actual:_(填)_

### Commits
| Hash | Subject |
|---|---|
| _(待)_ | docs(adr+change): ADR-0046 + CH-009 kickoff — chat image relevance |

---

**End of CH-009 progress (Day 1 — kickoff;code gate pending ADR-0046 Accept)**
