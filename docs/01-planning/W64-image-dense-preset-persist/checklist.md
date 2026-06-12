# W64 — checklist(圖密 preset persist)

## F1 — production timeout 條件
- [x] 殺現有 backend(180s env 嗰個,PID 6680/31660)+ 重啟**唔帶** timeout env(`.env` 提供 semantic=false)
- [x] health 200(全 components ok)

## F2 — PATCH preset
- [x] GET 現 config → 改 `citation_neighbour_max_aux_images=40` + `default_rerank_k=10` + `max_images_per_answer=50` → PATCH(full replacement)
- [x] GET readback = 40/10/50 + 其餘欄位原封(AC3)

## F3 — 120s sanity(9/9)
- [x] `scripts/run_image_recall.py` 全跑 → `reports/image_recall_ar_preset_sanity.yaml`
      (第 1 次 9×502 transient / 第 2 次中途 DNS 跌作廢 / 第 3 次 9/9 成功 — probe-恢復-重試)
- [x] 零 timeout(AC1 ✅ — mega ×3 全部 120s 內完成)+ mean 0.855 ≥ 0.85(AC2 ✅,precision 0.988)
- [x] timeout STOP+ask 路徑未觸發

## F4 — 收爐
- [x] persist 留低(per-KB Postgres 持久;成功路徑)
- [x] rollup §4.5 + memory doc-sync;plan closeout;progress retro
