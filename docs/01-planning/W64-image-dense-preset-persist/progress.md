# W64 — progress(圖密 preset persist)

## Day 1(2026-06-12)— kickoff

- 用戶拍板「persist」(差距 ⑤)。配方 = W62+W63 實證:`citation_neighbour_max_aux_images=40` +
  `default_rerank_k=10` + `max_images_per_answer=50`(drive-images-1 per-KB)。
- R6 核實:settings.py:144 timeout default 120.0;`.env` targeted grep — **無** timeout override、
  有 `HYBRID_USE_SEMANTIC_RANKER`(免 402)→ 重啟唔帶 env = production 120s 條件。
- 三件套 committed:`docs(planning): W64 image-dense preset persist kickoff`(`5ea8d0a`)

### F1 — production 條件重啟 ✅
- 殺 180s-env backend(PID 6680/31660)→ 重啟**零 override env**(timeout 由 settings default 120s;
  semantic=false 由 `.env`)→ healthy,全 components ok。

### F2 — PATCH preset ✅ readback PASS
- `max_aux=40 / rerank_k=10 / cap=50`;原封欄位逐一核對(top_k=50 / parent_doc=False / exp 10/1 /
  neighbour_depth=1 / pin=True / detail=detailed / return_images=True)。

### F3 — sanity 兩次撞 infra(非 preset / 非 timeout)
- 第 1 次:9/9 全 502 `APIConnectionError`(W61 同款 transient);probe 恢復。
- 第 2 次:Q001–Q003 出數後**網絡中途跌**(Q004+ 全 `getaddrinfo failed` = DNS / corp VPN 層),
  頭 3 條數字喺降級網絡下出,不可信。**唯一可用信號:Q001(最重 mega)120s 內完成,零
  `APITimeoutError`(AC1 正面初證)**。
- 恢復 probe ×3(跨 30s)全通 → 第 3 次完整重跑(bg `b6zhy1rtq`)。

### F3(第 3 次)— ✅ AC1 + AC2 雙過(9/9,mean 0.855 / precision 0.988)
| Query | recall | returned | 對照 W62 band |
|---|---|---|---|
| Q001 | 0.74 | 48 | = D/E/F 臂(0.74/48)|
| Q036 | 0.62 | 40 | 在 band(0.62–0.74)|
| Q043 | 0.66 | 48 | = band |
| Q003 | **1.00** | 38 | = band(全召回)|
| Q038 | **1.00** | 38 | = band(全召回)|
| Q002/Q004/Q006 | 1.00 | 19/12/8 | 對照持平 |
| Q005 | 0.69 | 22 | 注腳見下 |

- **AC1 ✅**:9/9 零 `APITimeoutError` — 三條 mega query 全部喺 production 120s 內完成
  (W62 caveat 解除:180s 實驗條件唔係必要)。
- **AC2 ✅**:mean 0.855 ≥ 0.85;同 W62 band(0.889–0.904)嘅差距幾乎全部嚟自 Q005
  (0.69 vs 1.00;扣除後 ≈0.89 = 正中 band)。
- **Q005 注腳**:0.69(22/32,AR06/AR07 sections 在,**冇 0-flip**)— W63 證 rerank=10 消滅
  災難性歸零(b-1/b-2),唔係保證每 run 32/32;cite/expansion 組成 variance 正常存在。

### F4 — persist 留低 ✅(AC3/AC4)
- per-KB config 維持 `max_aux=40 / rerank_k=10 / cap=50`(F2 readback 為證,Postgres 持久)。
- 無 ADR(ADR-0040 per-KB 機制 as-designed 數據變更)。

### Retro
- W62 配方 → W63 機制 → W64 persist,三 phase 鏈完整:**drive-images-1 而家 production 條件下
  圖片召回 mean 0.855 / precision 0.988**(由 0.574 起步,+28pp,零 code 改動)。
- 今日 infra 不穩(兩種 signature:`APIConnectionError` transient + `getaddrinfo` DNS/VPN 跌)—
  probe-恢復-重試紀律有效;**降級網絡下出嘅部分數據必須作廢**(第 2 次 run 頭 3 條),唔好
  攞嚟做判決。
- 隊列剩餘:③ faithfulness 警告閘 / ④ 圖片指標入 UI(code 項)+ 卡用戶嘅 prose GT +
  等定義嘅 caption / Gap B / 跨 KB。
