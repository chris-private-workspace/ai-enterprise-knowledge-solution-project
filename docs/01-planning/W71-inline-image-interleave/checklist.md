# W71 — checklist(inline-image-interleave)

## F1 — 解析層
- [ ] `lib/chat/inline-image-markers.ts` 加 `parseInlineImageMarkers(text, survivingSha8)` → segments(text / image)
- [ ] membership 驗證:sha8 ∉ surviving → strip(無空卡);同一 sha8 第二次出現 → strip(dup dedup)
- [ ] streaming 行為不變(期間照 strip + 尾部 hold-back;parse 只用於完成態)
- [ ] vitest:membership / dup / 相鄰標記 / 無標記退化單 text 段 / 現有 strip tests 全綠

## F2 — render 層(交織)
- [ ] `AnswerBodyMarkdown` 按 segments 交織:text 段照現有 markdown + citation pipeline,image 段 render 現有 `InlineImageCard`(R1 技術路徑二選一,決定記 progress)
- [ ] 末尾 inline 卡堆改 un-anchored only(anchored 圖唔重複;ADR-0055 顯示語意)
- [ ] figure 編號全答案連續(anchored 先、un-anchored 後)
- [ ] `ImageGallery` 全量總覽不變;knob OFF 答案 render 零回歸
- [ ] tsc 0 / eslint 0 / vitest 綠;H7 fidelity check(mockup `ekp-page-chat.jsx:443-500` 對齊)

## F3 — DD-8 copy 路徑
- [ ] copy 按鈕 wire:`navigator.clipboard` + strip 後文字(vitest)
- [ ] backend RAGAs answer 評分路徑 strip 標記(pytest)
- [ ] DEFERRED_REGISTER DD-8 → 已 Close(記證據)

## F4 — 驗證(knob ON 實跑)
- [ ] drive-images-1 實跑肉眼核:標記位置出卡 / 末尾無重複 / gallery 全量 / 無爛字無空卡
- [ ] 九 query 報告級 sanity(標記全消費;可用 `scripts/run_marker_placement.py` 答案 + 前端 parse 對拍)
- [ ] AC1-AC6 自評記 progress

## F5 — 收爐
- [ ] user-guide 同步(02/03 提交織顯示行為 + DD-8 caveat 解除)
- [ ] memory 更新(`project_inline_image_markers_w70` 接力位 close)+ plan closeout + retro
