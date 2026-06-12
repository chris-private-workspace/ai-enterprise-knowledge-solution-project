# W64 — progress(圖密 preset persist)

## Day 1(2026-06-12)— kickoff

- 用戶拍板「persist」(差距 ⑤)。配方 = W62+W63 實證:`citation_neighbour_max_aux_images=40` +
  `default_rerank_k=10` + `max_images_per_answer=50`(drive-images-1 per-KB)。
- R6 核實:settings.py:144 timeout default 120.0;`.env` targeted grep — **無** timeout override、
  有 `HYBRID_USE_SEMANTIC_RANKER`(免 402)→ 重啟唔帶 env = production 120s 條件。
- 三件套 committed:`docs(planning): W64 image-dense preset persist kickoff`
