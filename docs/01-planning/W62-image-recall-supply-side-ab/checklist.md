# W62 — checklist(供給側 A/B)

> 對應 plan.md F1–F5。逐項 tick,daily 對應 progress.md Day-N entry。

## F1 — pre-flight + baseline 確立

- [ ] pre-flight:Docker(ekp-postgres + langfuse endpoint 200)+ azurite(port 10000)+ backend `/health`
- [ ] 確認無另一 Claude session 在動 backend(multi-session collision 防)
- [ ] 重啟 backend(venv python;env = `SYNTHESIZER_REQUEST_TIMEOUT_S=180` + `HYBRID_USE_SEMANTIC_RANKER=false`,**無** window override)
- [ ] `GET /kb/drive-images-1` 記錄**全份 per-KB config 原值**落 progress.md(F4 復原依據)
- [ ] 確認 KB 無 re-index(doc/chunk 數對 W61 記錄)→ A 臂複用 W61 cap60_r1/r2 合法(R5)
- [ ] PATCH cap `max_images_per_answer` 20→60(full replacement)+ GET readback = 60

## F2 — B 臂(rerank 軸)

- [ ] PATCH `default_rerank_k` 原值→10 + GET readback = 10(其餘欄位不變)
- [ ] 單條 probe(Q002)200 OK 後跑 run 1(9/9)→ `reports/image_recall_ar_supply_rerank10_r1.yaml`
- [ ] run 2 → `..._r2.yaml`

## F3 — C 臂(window 軸)+ D 臂(combo)

- [ ] PATCH `default_rerank_k` 復原原值 + readback
- [ ] AC2 gate ①:offline `get_settings().citation_neighbour_window` 喺 env 下回 8
- [ ] AC2 gate ②:同 shell 同 env(`CITATION_NEIGHBOUR_WINDOW=8`)重啟 backend → healthy
- [ ] C 臂 run 1 + run 2 → `reports/image_recall_ar_supply_win8_r{1,2}.yaml`
- [ ] PATCH `default_rerank_k`=10 + `citation_neighbour_max_aux_images`=40 + readback(window env 持續)
- [ ] D 臂 run 1 + run 2 → `reports/image_recall_ar_supply_combo_r{1,2}.yaml`

## F4 — 完全復原

- [ ] PATCH 寫回 F1 原值(cap=20 / rerank 原值 / max_aux=18 / 其餘欄位)+ GET readback 逐欄位對
- [ ] 重啟 backend **無** window env(或停 backend;下次啟動自然無)
- [ ] progress.md 記 RESTORE PASS

## F5 — 分析 + 判決 + doc-sync

- [ ] returned_count × recall × precision 三軸對比表(A/B/C/D 四臂,cap-bound 5 條 + 對照 3 條 + Q005)
- [ ] 判決:供給推唔推得高?主貢獻旋鈕?precision 代價?(AC3/AC4)
- [ ] rollup `CONFIG_PLATFORM_W43-W58_ROLLUP.md` §4.5/§4.6 doc-sync(供給側實數)
- [ ] plan.md changelog 補 closeout 行 + status → closed
- [ ] progress.md retro
