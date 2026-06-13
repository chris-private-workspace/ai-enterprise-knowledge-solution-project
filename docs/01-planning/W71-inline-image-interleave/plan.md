---
phase: W71
name: inline-image-interleave
status: closed       # draft | active | closed(2026-06-13 closeout — F1-F5 done;browser 肉眼視覺 = DD-1 deferred)
created: 2026-06-13
owner: "Claude (AI) — 技術 Lead Chris 審閱"
gap: "W70 基建 + 驗證已判 go(validity 1.000 / 真調換 0/249 / recall 零回退),但 chat 顯示仍係「文字講完先一批圖卡」;要把圖卡按 [IMG#sha8] 標記位置交織入答案文字流,先達成用戶『無限接近原文文字+圖片順序』嘅原始目標"
adr: "無新 ADR — ADR-0055 已 cover W71 render(membership 驗證 + 顯示語意預鎖);純前端 render 層,H1 不觸"
spec_refs:
  - docs/adr/0055-inline-image-markers-b2-dual-field.md
  - docs/01-planning/W70-inline-image-markers/progress.md   # Day 2 AC4 判決 + carry-overs
---

# W71 — 圖卡交織 render(mockup reverse-drift)+ DD-8 copy 路徑

> **緣起**:用戶 2026-06-13 對 W70 AC4 判決拍板「W71 go(chat 文字+圖片交織 render)」。
>
> **R6 核實(plan-text grounding,2026-06-13 kickoff 當日)**:
> - mockup `ekp-page-chat.jsx:443-500` `AnswerBody` — inline `InlineImageCard`(figure 1/2)
>   喺答案文字流中間,caption「Citation [n] · Section …」;`:581-618` `InlineImageCard`
>   `<figure>`(border / radius-md / card 背景 / 右上 Full size btn / figcaption figure
>   編號 + title + caption;margin 18px 0);`:621-664` `ImageGallery` 末尾總覽 — 三段
>   行號全部核實無誤。
> - **前端 `InlineImageCard` 已存在**(`frontend/app/(app)/chat/page.tsx:1697`,BUG-019
>   restore,mockup `:581-617` 對齊)+ `ImageGallery`(`:1799`,BUG-007/BUG-021)—
>   **W71 唔係起新元件,係把卡由「答案後一批 render」(`:1282-1292` `cappedImages.map`)
>   移入標記位置**。
> - 前端 surviving 圖集 = `dedupeCitationImages(message.citations)`(`:1148`)+
>   `selectInlineImages(..., inlineCap)`(`:1158`)— ADR-0055 membership 驗證直接
>   對呢個集合做(sha8 == `checksum_sha256` 前 8 hex,W70 已對齊)。
> - `AnswerBodyMarkdown`(`:1437`)而家 `stripInlineImageMarkers(content, streaming)`
>   (`:1450`)再行 citation preprocess(`⟦CITn⟧` placeholder + component override
>   pipeline)— **placeholder token 機制有現成 precedent**,交織可循同路。
> - copy 按鈕(`:2371` FeedbackBar)**係未 wire 嘅視覺 stub**(無 onClick)— DD-8
>   close = wire 時用 strip 後文字,影響面細過 register 描述。
> - 手動 select-copy 攞嘅係 DOM render 文字(標記已唔喺 DOM)— 天然乾淨,DD-8
>   實際面 = copy 按鈕 + 任何攞 raw `message.content` 嘅路徑。

## 1. 行為設計

- **解析層**(`lib/chat/inline-image-markers.ts` 升級):`parseInlineImageMarkers(text,
  survivingSha8) → segments[]`(text / image 兩類)。標記 sha8 ∉ surviving 圖集 →
  strip(ADR-0055 membership 驗證,爛標記永不變空卡);同一 sha8 第二次出現 →
  strip(dup dedup,per W70 判決 dup ~8-9% 特性);streaming 期間維持現有 strip +
  尾部 hold-back(交織只喺 stream 完成後 — 避免圖卡令版面跳動)。
- **render 層**:`AnswerBodyMarkdown` 按 segments 交織 — text 段照現有 markdown +
  citation pipeline,image 段 render 現有 `InlineImageCard`(H7:元件唔改,位置
  先係 mockup 本意);**末尾 inline 卡堆改成只 render 未被 anchored 嘅 surviving
  圖**(ADR-0055 顯示語意預鎖:anchored 圖唔重複喺末尾);`ImageGallery` 全量
  總覽不變;figure 編號全答案連續(anchored 先、未 anchored 後)。
- **DD-8 close**:copy 按鈕 wire(`navigator.clipboard` + strip 後文字);backend
  RAGAs answer 評分路徑 strip 標記(knob ON 時 answer 帶標記會污染 faithfulness
  判分文字 — 細改 + test)。
- **knob 不動**:drive-images-1 ON(W70 保留);global default False 不變。

## 2. 交付物 + Gate

| # | 交付 | Gate |
|---|---|---|
| **F1** | 解析層:`parseInlineImageMarkers` segments + membership 驗證 + dup strip + streaming 行為不變 | vitest 綠(membership / dup / 邊界 / streaming 快路不變);現有 strip tests 全綠 |
| **F2** | render 層:`AnswerBodyMarkdown` 交織 + 末尾堆改 un-anchored only + figure 連續編號 | tsc 0 / eslint 0 / vitest 綠;H7 fidelity check(對 mockup `:443-500`)|
| **F3** | DD-8:copy 按鈕 wire(strip 文字)+ RAGAs answer 路徑 strip | vitest + pytest 綠;DEFERRED_REGISTER DD-8 → 已 Close |
| **F4** | 驗證:knob ON 實跑(drive-images-1)肉眼核交織效果 + 九 query 報告級 sanity(標記全消費 / 無爛卡)| 實跑證據記 progress;AC 全過 |
| **F5** | 收爐:user-guide 同步 + memory + closeout | — |

## 3. Acceptance Criteria

- **AC1(交織正確)**:knob ON 答案 — 每個 valid 標記位置 render 一張
  `InlineImageCard`(該 sha8 對應 surviving 圖);標記文字本身永不可見(包括
  streaming 期間,半截都唔出)。
- **AC2(膜 membership + dup)**:sha8 ∉ surviving 圖集 → 無聲 strip(無空卡 / 爛
  卡);同一 sha8 第二個標記 strip(全答案每張圖至多 anchored 一次)。
- **AC3(顯示語意,per ADR-0055 預鎖)**:anchored 圖唔重複出現喺末尾 inline 卡
  堆;gallery 仍然全量;figure 編號連續無跳號。
- **AC4(零回歸)**:knob OFF KB 答案 render 與 W70 現狀 bit-identical(segments
  退化成單 text 段);citation pill / 引用 pipeline 不受影響。
- **AC5(DD-8)**:copy 按鈕複製嘅文字無標記;RAGAs answer 評分輸入無標記。
- **AC6(H6/H7)**:解析 + render + copy 全有 test;H7 fidelity check 過(交織位
  置 + 元件樣式對 mockup `AnswerBody`)。

## 4. 風險

- **R1 🟡 markdown 結構 vs block 級插卡**:標記可能喺 list item / 段落中間,而
  `InlineImageCard` 係 block 級 `<figure>` — 直接 string-split 會斬斷 markdown
  結構(list 編號重置)。兩個候選:(a) 標記提升到最近 block 邊界再 split;
  (b) 循現有 `⟦CITn⟧` placeholder + component override 路(`<li>` 內 `<figure>`
  HTML 合法)。實作時以 mockup 效果(卡喺步驟之後)+ 最小 diff 揀,決定記
  progress;兩路都唔得 → STOP+ask per H7。
- **R2 🟢 streaming 版面跳動**:已設計避開(stream 完成先交織;期間照 strip)。
- **R3 🟢 figure 編號**:anchored + un-anchored 連續編號,單一來源計算。

## 5. 非目標

- ❌ per-doc tab UI 開放 marker 旋鈕(API 層已通,等有 per-doc 粒度需求先開 —
  W70 §4 速查表 footnote 已記)。
- ❌ 其他 KB index PUT 遷移 / knob 推廣(等交織 UX 驗收先講)。
- ❌ aux / neighbour 圖嘅 section 級錨定(方案 A)— 交織 render 落地後先評估
  有冇需要。
- ❌ streaming 期間實時交織(R2;將來 UX 需求先做)。

## 6. H 核對

- **H1**:不觸 — 無 schema / vendor / pipeline 改動;純前端 render 層 + 兩處
  strip 細改(ADR-0055 已 cover render 方向)。
- **H7**:核心約束 — 交織 = mockup **reverse-drift**(`AnswerBody` 本來就 inline
  插圖;而家「圖卡堆末尾」先係近似)。`InlineImageCard` 元件已對齊 mockup,W71
  唔改元件只改位置;BUG-021 amendment(gallery gate >=1)係已記錄 deviation,
  維持。交織 render 任何 mockup 對唔齊位 → STOP+ask。
- **H2/H3/H4/H5**:不觸(零新 dep / 無 Dify / Tier 1 內 / 無 secret)。
- **H6**:前端 vitest(F1/F2/F3)+ backend RAGAs strip pytest(F3)。

## 7. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-06-13 | Initial plan(active)| 用戶拍板 W71 go(W70 AC4 判決);R6 grounding 完成 — 關鍵發現:`InlineImageCard`/`ImageGallery` 已存在(BUG-019/007/021),W71 = 移位 + 解析層,唔係起新元件;copy 按鈕係未 wire stub,DD-8 影響面收窄;`⟦CITn⟧` placeholder pipeline 係交織實作 precedent |
