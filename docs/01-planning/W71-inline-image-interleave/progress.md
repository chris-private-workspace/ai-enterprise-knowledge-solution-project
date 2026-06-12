# W71 — progress(inline-image-interleave)

## Day 1 — 2026-06-13

### Kickoff + R6 grounding
- 用戶對 W70 AC4 判決拍板:「W71 go(chat 文字+圖片交織 render)」。
- R6 plan-text grounding(發現記 plan 頭注 + §7 changelog):
  - mockup 三段行號(`AnswerBody:443-500` / `InlineImageCard:581-618` /
    `ImageGallery:621-664`)全部核實無誤;
  - **`InlineImageCard` 前端已存在**(`chat/page.tsx:1697`,BUG-019 restore 對齊
    mockup)— W71 scope 收窄做「移位 + 解析層」,唔係起新元件;
  - 末尾卡堆現狀 = `:1282-1292` `cappedImages.map`(BUG-026 A deduped list);
    surviving 圖集 = `dedupeCitationImages` + `selectInlineImages`;
  - `⟦CITn⟧` citation placeholder pipeline(`AnswerBodyMarkdown:1437+`)= 交織
    實作現成 precedent;
  - copy 按鈕(`:2371`)係未 wire 視覺 stub — DD-8 影響面收窄(手動 select-copy
    攞 DOM 文字天然乾淨)。
- 三件套建立(plan / checklist / progress),plan status = active。
- 下一步:F1 解析層(`parseInlineImageMarkers` + membership + dup strip +
  vitest)。
