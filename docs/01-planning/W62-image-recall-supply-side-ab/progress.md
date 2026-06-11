# W62 — progress(供給側 A/B)

> Daily progress + decisions + commits + 結尾 retro。對應 plan.md / checklist.md。

## Day 1(2026-06-12)— kickoff

### 背景 + 決策鏈
- 用戶 2026-06-12 拍板:「先補完定義無關差距,之後先評估成功定義」;AskUserQuestion 揀
  **W62 供給側 A/B 行第一**(隊列:① 供給側 → ② Q005 section-miss 診斷 → ③④⑤ faithfulness
  警告閘 / 指標入 UI / 圖密 preset;⛔ 等定義 = §4.6 caption / Gap B / 跨 KB agent)。
- 產品框架更新(本日討論):mega-query(GT 65–73)係**普通問題撞圖密文件**(Q001 = "How do I
  record a payment collection",程序本身 65 張截圖),唔係「攞晒全部」枚舉題 → 「成功定義」
  (全圖召回 vs section 覆蓋)係之後嘅產品決策,本 phase 只出供給實數。

### R6 plan-text 核實(落手前 grep,詳 plan.md 頭注)
- `default_rerank_k` per-KB 可控(query.py:293/313/556 讀 effective)✅
- `citation_neighbour_max_aux_images` per-KB 可控(effective_config.py:239)✅
- `citation_neighbour_window` **global-only**(effective_config.py:101/255;KbConfig 無此欄位
  → env 唔會被 per-KB 鎖死;映射 `CITATION_NEIGHBOUR_WINDOW`,settings.py case_sensitive=False)✅
- W61 cap60 reports 在 disk(`reports/image_recall_ar_cap60_r{1,2}.yaml`)→ A 臂複用 ✅

### 三件套 committed(R1 gate)
- `docs(planning): W62 supply-side image-recall A/B kickoff`
