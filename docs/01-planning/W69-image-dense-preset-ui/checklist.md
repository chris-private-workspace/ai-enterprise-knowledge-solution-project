# W69 — checklist(image-dense-preset-ui)

## F1 — mockup 先行(H7)
- [ ] `references/design-mockups/ekp-page-kb.jsx` tuning card 加 preset 行(按鈕 + 配方摘要 + 來源注釋)

## F2 — frontend
- [ ] `page.tsx` 加 `IMAGE_DENSE_PRESET` 常量(80/10/40,注釋標 W62–W68 + ADR-0054 出處)
- [ ] 套用 handler(`setRerankK(10)` + `setKnob` max_aux=40 / cap=80)+「已套用」偵測
- [ ] preset 行 UI 對齊 mockup(class / spacing / typography)
- [ ] tsc 0 / eslint 0

## F3 — tests
- [ ] 套用後欄位值正確(三欄 + dirty 亮起、無 PATCH 發出)
- [ ] save body 含 preset 三值 + 其餘原樣(full-replacement)
- [ ] 已套用 → 按鈕 disabled 態
- [ ] vitest 全綠

## F4 — 驗證(H7 self-verify)
- [ ] live UI 對 mockup 逐項 fidelity check
- [ ] drive-images-1 settings tab 顯示「已套用」

## F5 — 收爐
- [ ] rollup §4.5 補一筆 + memory 更新 + plan closeout + progress retro
