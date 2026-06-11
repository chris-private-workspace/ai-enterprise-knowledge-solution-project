# W61 — checklist(cap 放寬軸 A/B)

> Atomic checkbox per deliverable。daily tick。對應 plan.md F1–F5。

## F1 — pre-flight + baseline(cap=20)
- [x] pre-flight:azurite 10000 LISTEN / Langfuse `/api/public/health` 200 / Postgres `SELECT 1` / backend `/health` 200
- [x] `GET /kb/drive-images-1` 確認現 config(`max_images_per_answer=20` + DD-4 三旋鈕 `false/10/1`)
- [ ] 確保 backend 於 documented env(`SYNTHESIZER_REQUEST_TIMEOUT_S=180` / `HYBRID_USE_SEMANTIC_RANKER=false`);有需要重啟(先查 multi-session collision + 殺殘留以 port 8000 LISTEN PID)
- [ ] 跑 A 臂 baseline(cap=20)→ `reports/image_recall_ar_cap20.yaml`
- [ ] AC1:9/9 scored + Q001/Q036 無 timeout error + mean ≈ 0.572(否則 STOP 查 confounding)

## F2 — cap=40 ×2
- [ ] `GET /kb/drive-images-1` 取現 config(留底完整 KbConfig)
- [ ] `PATCH /kb/drive-images-1/settings`(full replacement,只改 `max_images_per_answer=40`)
- [ ] `GET readback` 確認 `max_images_per_answer=40`(真 sanity gate)+ 其餘 field 無誤改
- [ ] 跑 run 1 → `reports/image_recall_ar_cap40_r1.yaml`(9/9 scored)
- [ ] 跑 run 2 → `reports/image_recall_ar_cap40_r2.yaml`(9/9 scored)

## F3 — cap=60 ×2
- [ ] `PATCH /kb/drive-images-1/settings`(full replacement,只改 `max_images_per_answer=60`)
- [ ] `GET readback` 確認 `max_images_per_answer=60`(真 sanity gate)
- [ ] 跑 run 1 → `reports/image_recall_ar_cap60_r1.yaml`(9/9 scored)
- [ ] 跑 run 2 → `reports/image_recall_ar_cap60_r2.yaml`(9/9 scored)

## F4 — 復原 cap=20
- [ ] `PATCH /kb/drive-images-1/settings`(full replacement,`max_images_per_answer=20`)
- [ ] `GET readback` 確認 `max_images_per_answer=20`(+ DD-4 三旋鈕仍 `false/10/1`)

## F5 — 分析 + doc-sync
- [ ] per-query recall / precision / **returned_count** 跨 20/40/60 三臂對比表(progress.md)
- [ ] AC3 cap-binding 判決:returned 升向新 cap(cap 是 binding)vs 持平 ~20(反證 W59)
- [ ] AC4 recall/precision 判決:5 條 cap-bound 提升幅度 + precision tradeoff + 對照 4 條是否持平
- [ ] 結論落 rollup §4.5(cap 放寬軸實證)
- [ ] progress.md retro + Phase closeout
