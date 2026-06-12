---
phase: W64
name: image-dense-preset-persist
status: active       # draft | active | closed
created: 2026-06-12
owner: "Claude (AI) — 技術 Lead Chris 審閱"
gap: "差距 ⑤ — 圖密 preset persist(用戶 2026-06-12 拍板「persist」);前置 = production timeout 120s sanity"
adr: null            # per-KB config 數據變更(ADR-0040 機制 as-designed),零 code/schema/global default 改動 → 無 ADR
spec_refs:
  - docs/01-planning/W62-image-recall-supply-side-ab/   # preset 配方實證(max_aux=40 / rerank=10 / cap≈50)
  - docs/01-planning/W63-q005-section-miss-diagnosis/   # rerank=10 錨點冗餘機制
  - docs/adr/0053-*                                     # production timeout 120s default
---

# W64 — 圖密 preset persist(drive-images-1)

> **緣起**:W62(供給)+ W63(機制)實證圖密步驟手冊 preset 配方;用戶 2026-06-12 拍板 persist。
> **前置條件**(W62 caveat):實驗全程用 `SYNTHESIZER_REQUEST_TIMEOUT_S=180`,production default =
> **120s**(ADR-0053)→ persist 前必須喺 120s 條件 sanity(mega query 答案重,timeout 風險真實)。
> **R6 核實**:settings.py:144 default 120.0;`.env` **無** timeout override(targeted grep,值不讀)、
> 有 `HYBRID_USE_SEMANTIC_RANKER`(免 402 長期設定)→ 重啟唔帶 env = 正宗 production 條件。

## 1. 範圍

KB = `drive-images-1`(per-KB config 數據變更,唔郁 global / 唔郁其他 KB):

| 欄位 | 原值 | persist 值 | 依據 |
|---|---|---|---|
| `citation_neighbour_max_aux_images` | 18 | **40** | W62 供給 binding 項 |
| `default_rerank_k` | 5 | **10** | W62 供給起點 + W63 錨點冗餘(Q005 12/12 零 flip)|
| `max_images_per_answer` | 20 | **50** | W62 供給上限 48 + margin(W61「40 已足」已推翻)|

## 2. 交付物 + Gate

| # | 交付 | Gate |
|---|---|---|
| **F1** | 重啟 backend(**無** timeout env;`.env` 提供 semantic=false)+ health | healthy + 條件確認 |
| **F2** | PATCH preset 三欄位(full replacement)+ GET readback | readback 40/10/50,其餘原封 |
| **F3** | **120s sanity**:image-recall 9/9 全跑(driver 用 KB default,自然繼承 preset) | 9/9 無 timeout;recall ≈ W62 band(mean ~0.85+;mega 無 502/timeout)|
| **F4** | persist 留低(成功)/ STOP+ask(timeout 出現);doc-sync(rollup + memory + 本 plan closeout)| 判決寫低 |

**失敗路徑**:F3 若 mega query timeout → **STOP and ask**(選項:回退 preset / persist 但記錄 chat
mega-query 風險 / per-KB timeout(ADR-0053 Alt 3,要 code,H1 route))— 唔自行揀。

## 3. Acceptance Criteria

- **AC1**:120s 條件下 9/9 出數、零 `APITimeoutError`。
- **AC2**:mean recall 唔明顯低過 W62 band(≥0.85;cap=50 vs 實驗 60 理論無差 — W62 returned 上限 48)。
- **AC3**:persist 後 GET readback = 40/10/50 + 其餘欄位原封(DD-4 三旋鈕 false/10/1、pin=true、
  top_k=50、detail=detailed 不變)。
- **AC4**:doc-sync 完成;**無 ADR**(ADR-0040 per-KB 機制 as-designed 使用,非 architectural change)。

## 4. 風險

- **R1 🟡 mega query 120s timeout**:W59 實測 ~90–98s(當時 cap=20);preset 下答案更重(11+
  citations / 48 圖 ref)。緩解:F3 直接量;timeout → STOP+ask。
- **R2 🟢 transient 502**:同 W61–W63,單次重試。

## 5. 非目標

- ❌ 改 global default / settings.py(呢個係 per-KB persist,唔係 DD-4 式 flip)。
- ❌ 其他 KB / 新 KB preset 自動化(差距 ⑥「profile 建議」範圍,未立項)。
- ❌ dedup-before-cap(W63 H1-adjacent 候選,獨立決策)。

## 6. H 核對

- **H1**:per-KB config 數據變更(Postgres row),ADR-0040 機制設計用途 → 不觸;**H5**:.env 只
  targeted grep key 名,值不讀不改;**H6**:零 code;**H7**:無前端。

## 7. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-06-12 | Initial plan(active)| 用戶拍板「persist」;前置 120s sanity per W62 caveat |
