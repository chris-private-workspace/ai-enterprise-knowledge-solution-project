# W63 — checklist(Q005 section-miss 診斷)

> 對應 plan.md F1–F4。

## F1 — V4 retrieve-only 層(上游穩定性)

- [ ] backend health 200(現有條件,唔重啟)
- [ ] `POST /kb/drive-images-1/retrieval-test`(Q005 text / hybrid / rerank=true / top_k=20)×5
- [ ] 記 S17–S22 chunk 嘅 rank 分佈 + 跨 run 穩定性表 → progress.md(AC1)

## F2 — `/query` @ rerank=5(下游成敗對應)

- [ ] `/query`(Q005 + `top_k_rerank=5` 顯式)×6,每 run 記 cited sections + returned 圖數
- [ ] 成敗分類 + cited-section 對應表(AC2;分辨機制 (b) vs (c))
- [ ] 若全成/全敗 → 加 runs(R1)

## F3 — `/query` @ rerank=10(假設驗證)

- [ ] `/query`(Q005 + `top_k_rerank=10` 顯式)×6,同樣記錄
- [ ] 對照 F2:成功率 band + cited sections 差異(AC3)

## F4 — 判決 + doc-sync

- [ ] 機制判決((a)/(b)/(c))+ 風險一般化 → progress.md(AC4)
- [ ] rollup §4.5 / memory `project_image_recall_cap_not_true_ceiling`(或新 memory)doc-sync
- [ ] plan.md changelog closeout + status → closed;progress.md retro
- [ ] AC5 核對:零 KB 狀態改動(全程 per-query override)
