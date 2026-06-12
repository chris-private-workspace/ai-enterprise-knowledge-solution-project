# W69 — progress(image-dense-preset-ui)

## Day 1(2026-06-12)— kickoff

- 用戶拍板開「preset 一鍵套用 UI」線(housekeeping 完成後三選一)。
- R6 grounding:tuning card `page.tsx:2736`(W43 F3.2)/ `default_rerank_k` 係獨立
  `rerankK` state(preset handler 要跨兩區寫)/ mockup `ekp-page-kb.jsx:832-873` card
  已存在(preset 行 = additive,mockup 先行)/ test pattern `kb-settings-tuning.test.tsx`。
- 設計定調:套用 = **填表唔即時 PATCH**(行現有 dirty → 試跑 → 儲存流程 =
  config-lifecycle 閉環);Tier 1 一個 preset(圖密步驟手冊 80/10/40)起步。
- 三件套 committed(`8f57efc`)。

### F1 — mockup 先行 ✅
- `ekp-page-kb.jsx` tuning card body 頂部加 preset 行:Zap icon + 標題「配方 preset:
  圖密步驟手冊」+ badge「W62–W68 實證」+ 三值摘要 desc + 「套用配方」按鈕;
  comment 注明 disabled「✓ 已套用」態 + 填草稿語義 + 配方出處。

### F2 — frontend ✅
- `IMAGE_DENSE_PRESET` 常量(80/10/40,注釋標 W62/W63/W68 + ADR-0054 出處)。
- `applyImageDensePreset`(`setRerankK` 跨 General 區 + 2×`setKnob`)+ `presetApplied`
  全等偵測 → 按鈕 disabled「✓ 已套用」。
- tsc 0 / eslint 0 / prettier clean(`.next` wipe 後 generated types 缺 → 預熱全
  route 即恢復,記一筆:tsc 之前要 dev server 編譯過所有頁)。

### F3 — tests ✅
- 新 describe「W69 — 圖密手冊 preset 一鍵套用」:套用填三欄(rerank General 區即見;
  max_aux/cap 喺「進階」摺疊區 — **state 已更新但 DOM 未 mount,test 要展開先驗**,
  第一輪 fail 嘅原因)+ 無 PATCH + 已套用 disabled + save full body 三值。
- suite 7/7;全套 30 檔 147/147 passed。

### F4 — H7 fidelity ✅
- Playwright live 驗證 `kb/drive-images-1?tab=settings`:preset 行 render 完整,
  icon / 標題+badge / desc / 按鈕逐項對齊 mockup(截圖核);**AC3 達成** —
  persisted 80/10/40 → 按鈕自動「✓ 已套用」disabled;rerank General 區顯示 10。
