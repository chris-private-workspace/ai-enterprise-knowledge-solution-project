# W69 — checklist(image-dense-preset-ui)

## F1 — mockup 先行(H7)
- [x] `references/design-mockups/ekp-page-kb.jsx` tuning card 加 preset 行(按鈕 + 配方摘要 + 來源注釋)

## F2 — frontend
- [x] `page.tsx` 加 `IMAGE_DENSE_PRESET` 常量(80/10/40,注釋標 W62–W68 + ADR-0054 出處)
- [x] 套用 handler(`setRerankK(10)` + `setKnob` max_aux=40 / cap=80)+「已套用」偵測
- [x] preset 行 UI 對齊 mockup(class / spacing / typography)
- [x] tsc 0 / eslint 0 / prettier clean

## F3 — tests
- [x] 套用後欄位值正確(rerank 即見;max_aux/cap 喺「進階」摺疊區,展開後驗)+ 無 PATCH 發出
- [x] save body 含 preset 三值 + 其餘原樣(full-replacement)
- [x] 已套用 → 按鈕 disabled 態
- [x] vitest 全綠(suite 7/7;全套 30 檔 147/147)

## F4 — 驗證(H7 self-verify)
- [x] live UI 對 mockup 逐項 fidelity check(Playwright 截圖:icon / 標題+badge / desc / 按鈕全對齊)
- [x] drive-images-1 settings tab 顯示「✓ 已套用」disabled(AC3,persisted 80/10/40 自動偵測)

## F5 — 收爐
- [ ] rollup §4.5 補一筆 + memory 更新 + plan closeout + progress retro
