# W44 — Chunker Image-Density Deep Fix · Progress

> Daily progress + decisions + commits;結尾 retro。

---

## Day 0 — 2026-06-03(kickoff,F0 gate pending)

### 做咗乜
- **三方 roadmap audit 收斂**(本 session)→ 用戶 pick (a) 開 W44 深度優先。
- **根因 live-verify**:Read `layout_aware.py` 全文,確認圖洪 ingestion 根因 = 圖按 section accumulator pile-on,text flush(`:207` hard-cap / `:213-218` soft-target)**唔 reset** `image_positions`,`_build_text_chunk:248` copy 全部 + `_merge_adjacent_shorts:323` concat → 圖密短 section 單 chunk carry 全部圖(實測 `ci=15=57`,memory #7)。全 file 零 per-chunk 圖數 cap。
- **doc-level reindex 非 stub** 確認(`documents.py:786-884`,真刪 + `_run_ingest_pipeline`)→ W44 驗證唔卡 Track A([AUDIT-B])。
- **ADR-0041 draft 建立**(Status: Proposed)+ ADR README index 更新(0041 row + next=0042)。
- **W44 plan / checklist / progress 建立**(R1 plan-before-implement)。

### 決定
- 切法 recommended = **A(image-aware flush + `max_images_per_chunk` soft cap)**,Alternatives B(sub-heading)/ C(image-anchored)/ D(hybrid)/ runtime-cap-only(W43 已做,不足)記 ADR-0041。**最終切法 + cap default 待 F0 gate Chris 拍板(決策 2)**。
- **F1+ code GATED on F0 gate**(H1 per §5.1 — chunker §3.3 change + re-index)。本日只 docs housekeeping。

### Blockers / carry-over
- **F0 gate pending**:需 Chris confirm H1 boundary + 揀切法 + 定 cap default + tolerance → ADR Accept 先開 F1。
- Top risk(R6 已記 plan §4):重切改變所有 chunk 邊界 → eval no-regression gate(G3/G4)必過。

### Commits
- (本日 docs commit 見下批 — ADR-0041 + README + W44 plan/checklist/progress)
