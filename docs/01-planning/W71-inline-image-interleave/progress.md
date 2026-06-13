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

### F1 — 解析層 ✅
- `lib/chat/inline-image-markers.ts`:`COMPLETE_MARKER_PATTERN` 加 capture group
  攞 marker body(`\[IMG#([^\]\s]*)\]`;strip 照用 `.replace(…, '')` 唔受影響)+
  `imageMarkerKey(checksum)`(sha8 = 前 8 hex,keying 集中)+ `InlineSegment`
  型(text / image)+ `parseInlineImageMarkers(text, validSha8)`。
- **語義**:valid+new marker → 斷段出 image segment;sha8 ∉ validSha8(capped
  out / decorative-filtered / malformed / 幻覺)→ strip 並把前後文字併入同一 run
  (用 running buffer,唔 flush);同一 sha8 第二次(dup)→ strip(anchored set)。
  空 validSha8 → 單 text 段且文字 == `stripInlineImageMarkers(text)`(零回歸路)。
- **streaming 唔郁**:`stripInlineImageMarkers` 原封不動;parse 只完成態用(避免
  版面跳動,module note 寫明)。F2 串流期間照行 strip 單塊 render。
- vitest 14 新(27 passed 全綠)/ tsc 0 / eslint 0 / prettier clean。
- 下一步:F2 render 層(`AnswerBodyMarkdown` 按 segments 交織 reuse 現有
  `InlineImageCard` + 末尾堆改 un-anchored only + figure 連續編號;R1 技術路徑
  二選一決定記 progress + H7 fidelity check)。

### F2 — render 層(交織)✅
- **R1 決策(關鍵)**:睇 W70 saved answer 實況 — 標記係喺**深層巢狀 step list
  內**(`1. **AR04...** [IMG#55224e29]` / `  2. Set the parameter. [IMG#6dd75fad]`),
  唔似 mockup `AnswerBody` 嗰種「平層 3 步 list + 之後一張卡」。
  - ❌ **segments-split**(F1 segment 各自 render separate ReactMarkdown):會打散
    巢狀 list 嘅 `1./1.1/1.1.1` 編號(每段變 fresh list)。
  - ❌ **path(a)lift-to-block**:成個程序係**一個**巢狀 list,把卡提升到 block
    邊界 = 全部卡 clump 喺 list 之後,完全失去 per-step 交織意義。
  - ✅ **採 path(b)refined**:`[IMG#sha8]` → `⟦IMG:sha8⟧` placeholder(經 F1
    `parseInlineImageMarkers` 決定 membership + dedup,валid+first→placeholder,
    其餘 strip)→ **單一** ReactMarkdown 保留全巢狀結構 → `p`/`li` override
    `harvestImageTokens` 抽 token + render `InlineImageCard` 喺 block 層。
    `<figure>` 入 `<li>` 係合法 flow content(BUG-023 限制只係 `<div>`-in-`<p>`),
    入 `<p>` 用 fragment-sibling(卡喺段後,對齊 mockup `:470/490`「卡喺 block 間」)。
- **分區 + figure 編號**:`planAnchoredImages(content, capped)`(放 `citation-images.ts`,
  用 F1 parse + `imageMarkerKey`)→ `inlineBySha8`(anchored,figure = marker 序)
  + `trailing`(un-anchored,figure 接續)。**單一計算**,AnswerBodyMarkdown 同
  末尾堆共用,編號零跳號。
- **末尾堆**:`cappedImages.map` → `trailingImages.map`(只 render un-anchored;
  anchored 唔重複,ADR-0055 顯示語意)。`ImageGallery` 全量總覽 + `totalCount`
  完全唔郁。
- **零回歸**:streaming 或 knob OFF(無標記)→ `inlineBySha8` 空 → `interleave`
  false → 行原 `stripInlineImageMarkers` + 全 `cappedImages` trailing = pre-W71
  bit-identical。
- **placement 微妙位**(記低,F4 肉眼覆核):標記喺有子 list 嘅父 step 上時,卡
  render 喺該 `<li>` 所有內容(含子 list)之後 — 喺正確 step 內但喺子步之後。
  Tier 1 可接受(mockup 無呢個 case);F4 覺得礙眼先調。
- **Tests**:`planAnchoredImages` 7 條(無標記全 trailing / 單 anchor / marker 序
  定 figure / dup anchor 一次 / 非 surviving sha8 ignore / 無 checksum 必 trailing /
  連續編號)入 `citation-images.test.ts`;render smoke 3 條新檔
  `chat-inline-image-interleave.test.tsx`(標記變 figure 卡 + 無爛字 + gallery 全量 /
  membership strip 無爛卡 / 無標記 = pre-W71)。
- **Gates**:tsc 0 / eslint 0(唯一 warning `<img>` pre-existing)/ prettier clean;
  vitest 隔離 74 全綠(含 chat-meta-row img-count 無回歸);full suite 8 fail 全
  `Test timed out in 5000ms`(超載並行 flake,environment setup 795s),逐個隔離 pass
  (register / chat-meta-row 已驗)。
- 下一步:F3(DD-8 copy 按鈕 wire strip 文字 + backend RAGAs answer 路徑 strip)。

### F3 — DD-8 copy 路徑 ✅
- **copy 按鈕**(前端):`FeedbackBar` 本來係 unwired stub(只有 `<Copy>` icon,
  無 onClick)。加 `content` prop + `handleCopy` —
  `navigator.clipboard.writeText(answerToCopyText(content))`;新 `answerToCopyText`
  strip `[IMG#…]`(`stripInlineImageMarkers`)+ `[chunk-…]` citation 標記 → copy
  出乾淨 prose(渲染見到嘅文字,非 raw token)。clipboard 不可用(insecure
  context / denied)→ try/catch 吞,按鈕不變;`copied` state 令 title 暫轉「Copied」。
- **RAGAs answer**(backend):新 `backend/generation/inline_image_markers.py`
  `strip_inline_image_markers`(lenient `\[IMG#[^\]\s]*\]`,與前端
  `lib/chat/inline-image-markers.ts` 對稱,放 generation 因 marker 係該層概念 +
  `prompt_builder._MARKER_RULE` 喺度)。入 `ragas_evaluator.py` 兩個評分點:
  `_ascore_all`(strip 一次 → faithfulness `response` + answer_relevancy
  `response` + reference fallback 共用)+ config-test `_eval`(strip 後再判空)。
  knob-ON 答案標記不再當 unsupported claim 污染 faithfulness。
- **Tests**:backend 7 strip(單/多/畸形/citation 不碰/fast-path/空/marker-only
  strip 後空)+ ragas_runner 13 = 20 passed;ruff + mypy strict clean。前端 copy
  render test(streamQuery 答案含 `[IMG#a1b2c3d4]` + `[chunk-chunk-1]` → click
  copy → `clipboard.writeText` 收文字 `[IMG#`/`[chunk-` 皆無、prose 保留);
  interleave suite 4 passed;tsc 0 / eslint 0 / prettier clean。
- **DD-8 close**:DEFERRED_REGISTER 由結構性表移去「已 Close」表(證據記低);
  export 路徑(目前無 backend export 端點)future 沿用同一 helper,不在此 close 範圍。
- 下一步:F4(knob ON 實跑 drive-images-1 肉眼核交織 + 九 query report-級 sanity +
  AC1-AC6 自評)。

### F4 — 驗證 ✅(headless;browser 肉眼 = DD-1)
- **九 query 報告級 sanity(headless,跑真實程式碼)**:W70 saved answers(`reports/
  marker_placement_ar_answers.yaml`,9 條,Q001 63 標記 / 48 distinct = 15 dup,
  標記深埋巢狀 step list)→ dump JSON → 臨時 vitest import **真實**
  `parseInlineImageMarkers` + `planAnchoredImages` 跑 →
  **9/9 PASS**(臨時檔跑完即刪,讀 gitignore reports 不可 commit;同 W70 F8
  一次性驗證 pattern):
  - 每 text segment 零 `[IMG#` 洩漏(全消費)
  - image segment 數 == distinct marker 數、序 == first-occurrence(dup 收斂、無漏)
  - `planAnchoredImages` inlineBySha8.size == distinct、trailing == []、figure
    1..N 連續無跳號
- **AC 自評**:
  - **AC1 交織正確** ✅(headless):每 valid 標記 → image segment(`InlineImageCard`),
    標記文字零洩漏(replay 9/9 + F2 render smoke);streaming 半截不出(F1 hold-back
    test)。卡視覺位置正確 = 🚧 DD-1 browser。
  - **AC2 membership + dup** ✅:sha8 ∉ surviving → strip 無空卡(`planAnchoredImages`
    + render smoke「membership strip」case);dup 至多 anchored 一次(replay 真實
    15-dup answer + unit)。
  - **AC3 顯示語意** ✅(機制層):anchored 唔重複末尾(`trailingImages` = un-anchored
    only,replay 全 anchored → trailing []);gallery 全量(`cappedImages` + totalCount
    未改);figure 連續(replay 1..N)。視覺 = 🚧 DD-1。
  - **AC4 零回歸** ✅:knob OFF / 無標記 → inlineBySha8 空 → strip 路 + 全 trailing =
    pre-W71(F1 空 membership == strip / F2 render smoke「無標記」/ chat-meta-row
    img-count 無回歸)。
  - **AC5 DD-8** ✅:copy strip(前端 render test)+ RAGAs answer strip(backend 7
    test);DD-8 已 close。
  - **AC6 H6/H7** ✅:F1 12 + F2 planAnchoredImages 7 + render smoke 3 + F3 backend
    7 + copy 1;H7 = `InlineImageCard` 元件原樣 reuse、卡擺位對齊 mockup `AnswerBody`
    (block 之間)。視覺 fidelity 終核 = 🚧 DD-1 browser。
- **🚧 DD-1 browser 肉眼(用戶 2026-06-13 明示 headless-only scope)**:drive-images-1
  knob ON 之下行 chat,人眼確認「卡喺步驟原位 / 末尾只剩 un-anchored / gallery 全量 /
  巢狀 list 內卡擺位睇落自然(F2 記低嘅子-list-之後 placement 微妙位)」。需全 stack +
  browser(DD-1 class)。
- 下一步:F5(收爐 — user-guide 同步交織顯示行為 + DD-8 caveat 解除 + memory +
  plan closeout + retro)。

### F5 — 收爐 ✅
- **user-guide**:`03-configuration-reference.md` §2.3 組 4 由 W70 描述(「答案會喺
  對應步驟原位帶標記,chat 顯示自動隱藏」)改 W71 行為(「chat 把對應截圖卡擺喺
  答案對應步驟原位,文字+圖片交織顯示;末尾只剩冇被錨定嘅截圖,gallery 仍全量」)
  + 兩個已知特性(dup 只錨定一次 / 無位跌返末尾)+ copy caveat 由「帶標記」改
  「已 strip 乾淨(W71 F3 / DD-8)」。`01-platform-overview.md` 嘅「截圖 gallery」
  仍準確(gallery 依然存在),不改。
- **memory**:`project_inline_image_markers_w70`(W70 名)更新 — W71 接力位 →
  已落地(F1 解析 / F2 R1 巢狀插圖決策 / F3 DD-8 / F4 驗證)+ 巢狀 markdown 插
  block 圖卡教訓;MEMORY.md index 行同步。
- **plan.md** `status: closed`。

### Phase Gate 自評(closeout)
- **AC1-AC6 全部達標(機制 / headless 層)** — 詳見 F4 entry;唯一未行 = browser
  肉眼視覺(明示 headless-only scope → DD-1)。
- **判決:Phase Gate 通過 WITH SMOKE-USER-DEFERRED CAVEAT**(同 W12-W18 同類
  pattern — static / 機制 / unit / 真實答案 replay 全綠;互動視覺層 DD-1)。

### Retro(W71)
- **順利**:R6 grounding 提早發現 `InlineImageCard`/`ImageGallery` 已存在(BUG-019/
  007/021),令 W71 由「起新元件」收窄做「移位 + 解析層」,scope 大減;F1 先起
  純 parse + 測試,F2 先有穩固地基至接 render;F4 用真實 W70 答案過真實程式碼
  (唔係另寫 mock)抓到 dup + 巢狀真實形狀。
- **R1 決策(最大技術判斷)**:睇真實答案發現標記喺深層巢狀 list — segments-split
  同 lift-to-block 兩個 naive 路都唔得;改 placeholder + 單一 ReactMarkdown +
  block override 注入。教訓:**插 block 級元素入 markdown 之前,先睇真實內容嘅
  結構(巢狀深度),唔好憑 mockup 平層例子定 render 策略**。已入 memory。
- **教訓(`<figure>` HTML 合法性)**:block `<figure>` 入 `<li>` 合法、入 `<p>`
  唔合法(BUG-023 同源)。下次喺 markdown override 插 block 元素要先分 host 係
  list-item(直接入)定 paragraph(fragment-sibling)。
- **教訓(full suite flake)**:重 jsdom render suite 並行喺超載機(environment
  setup 795s)會 5000ms timeout — 8 fail 全 flake,逐個隔離 pass。判 CI 綠要睇
  隔離結果,唔好被 full-suite 並行 timeout 嚇親。
- **Carry-overs**:DD-1 browser 肉眼(drive-images-1 knob ON 行 chat 人眼核交織 +
  巢狀子-list 卡擺位)/ per-doc tab UI marker 旋鈕未開(W70 §4 footnote)/ 其他 KB
  re-ingest 前先 index PUT(known gate)/ export 路徑 future 沿用 `strip_inline_image_markers`。
