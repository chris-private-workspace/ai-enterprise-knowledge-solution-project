# W64 — checklist(圖密 preset persist)

## F1 — production timeout 條件
- [ ] 殺現有 backend(180s env 嗰個)+ 重啟**唔帶** timeout env(`.env` 提供 semantic=false)
- [ ] health 200

## F2 — PATCH preset
- [ ] GET 現 config → 改 `citation_neighbour_max_aux_images=40` + `default_rerank_k=10` + `max_images_per_answer=50` → PATCH(full replacement)
- [ ] GET readback = 40/10/50 + 其餘欄位原封(AC3)

## F3 — 120s sanity(9/9)
- [ ] `scripts/run_image_recall.py` 全跑 → `reports/image_recall_ar_preset_sanity.yaml`
- [ ] 零 timeout(AC1)+ mean ≥ 0.85(AC2)
- [ ] 若 timeout → STOP+ask(plan §2 失敗路徑)

## F4 — 收爐
- [ ] persist 留低(成功路徑)
- [ ] rollup §4.5 + memory doc-sync;plan closeout;progress retro
