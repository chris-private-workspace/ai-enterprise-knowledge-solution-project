# 05 — 文件類型 playbook(實戰配方)

> 按文件類型嘅起步配方 + 一個完整嘅「混合 10 份文件」實戰流程。
> 配方來源:平台實證(W43–W69 controlled A/B + eval),唔係理論值。

## 1. 圖密步驟手冊(操作 manual,每步有截圖)

**特徵**:章節多、每章 chunk 少、截圖密集(每章 5–70 張)、query 多數係「How do I …」程序型。

**配方(UI 一鍵)**:KB Settings → Advanced retrieval tuning →「**套用配方:圖密步驟手冊**」
→ 試跑 → 儲存。等於:

| 旋鈕 | 值 | 點解 |
|---|---|---|
| Rerank top-k | 10 | 錨點冗餘 — 跨章節 query 每章喺 top-k 要有 ≥2 條代表,唔係答案會隨機漏成個章節 |
| Neighbour max aux images | 40 | 圖片供給 binding 項 — 出廠 2 只夠普通文件 |
| Max images / answer | 80 | unique 圖預算(重複引用唔食預算)|

**建 KB 時記得**:開 `extract_embedded_images` + `return_images_in_chat`;每 chunk 圖上限保持 8。

**實證效果**:image-recall 0.574(出廠)→ **~1.00**(配方後,9-query GT,precision 0.988 無代價);
production chat 實測 65/65 全圖召回。

**可選加碼**:章節概覽圖置頂(overview pin)— 答案以章節 High-Level 流程圖開頭;
`answer_detail=detailed` — 逐 sub-step 鋪開(答案長、生成耗時高,圖密 mega query 可達 90 秒)。

## 2. Prose 型長文(報告 / 計劃書 / 政策文件)

**特徵**:連續文字、章節層級深、圖少且多為架構圖,query 多數係理解型 / 列舉型。

**配方:乜都唔使做。** 出廠值已係 eval 背書嘅完整性配方(parent-doc ON + expansion
max_aux 10 + 章節 bound,ADR-0052):
- 列舉型 query(「list all the scenarios …」)5/5 完整,零漂移
- 跨文件 30-query eval:文字 recall 1.0、零 regression

**可選**:深度報告想答案詳盡 → `answer_detail=detailed`(per-KB 或 per-doc)。

**注意**:prose 文件嘅**圖片**召回未有正式 GT 實證(文字有)— 圖少嘅文件出廠值通常夠,
有疑慮就用試跑「圖片章節數」驗一驗。

## 3. 簡報(PPT)

**特徵**:一頁一個主題、視覺主導。

**配方**:
- Chunk strategy:`slide_based`(或 `auto` 會自動揀)
- `slide_screenshots` 保持 True(出廠已開)— slide 整頁截圖入索引
- `return_images_in_chat` 開(出廠係關!)

## 4. 表格 / 排版複雜文件

- Chunk strategy:`layout_aware`
- 上傳後**必須**去 Chunks tab 驗收切分(表格切爛係呢類文件最常見問題)
- 唔啱 → Chunking Lab 預覽其他 strategy → 改 → re-index

## 5. 實戰:一個 KB + 10 份完全唔同類型嘅文件(有字有圖)

**第 0 步 — 先諗:應唔應該一個 KB?**
- 內容**主題相關**(用戶會一條 query 跨佢哋問)→ 一個 KB ✅
- 純粹「啲文件擺埋一齊」但主題唔搭 → 分 KB(檢索唔會互相干擾,配置各自最優)
- ⚠️ 結構性限制:top_k / rerank_k / parent-doc 係 KB 級共用 — 兩份文件對檢索層有
  **互相打架**嘅需求時,per-doc 救唔到,分 KB 係正解

**第 1 步 — 建 KB**:strategy `auto` + 開兩個圖開關 + 每 chunk 圖上限 8(出廠)

**第 2 步 — 上傳 10 份 → 驗收**(02 §4 清單:READY / 切分 / 圖數 / chat 試一條)

**第 3 步 — KB 層設多數派**:
- 圖密手冊佔多 → 一鍵 preset;prose 佔多 → 出廠值唔郁
- rerank_k:KB 入面**有**步驟手冊就建議 10(對 prose 無害,對手冊係穩定性關鍵)

**第 4 步 — 逐份文件試 + per-doc 對症**(核心,預留最多時間):

| 觀察(試跑指標)| 動作(該文件嘅 Per-doc tab)|
|---|---|
| 文字齊、圖唔齊(圖片章節數 < 涵蓋章節數)| 加大 Neighbour max aux images(→ 20–40)|
| 圖洪水(narrow query 出幾十張)| 設 Max images / answer(→ 6–10)|
| 答案太簡略(程序型文件)| `answer_detail=detailed` |
| 引用漂移到無關章節 | Expansion prefix depth → 1(如 KB 層被改過)|
| 概覽圖冇排最前 | 開 overview pin |

每改一刀 → per-doc 試跑 panel A/B(「此文件配置 vs 繼承 KB」)→ 儲存。

**第 5 步 — 整體回歸**:返去 KB 層試跑 2–3 條跨文件 query,確認 per-doc 覆寫
冇整壞跨文件場景(per-doc 只喺該文件主導答案時生效,一般無干擾)。

**預期投入**:第 1–3 步 ~半個鐘;第 4 步每份問題文件 ~10–15 分鐘(多數文件出廠值已夠,
通常只有 2–3 份要 per-doc 調)。

## 6. 幾時要諗 re-ingest 而唔係調旋鈕

| 信號 | 根因 | 解法 |
|---|---|---|
| 一個 chunk 自身揹 20+ 張圖(Chunks tab 見到)| ingest 切分 | 收細每 chunk 圖上限 → re-index |
| 章節邊界切錯(一個 chunk 跨兩章)| strategy 唔啱 | Chunking Lab 試其他 strategy → re-index |
| 圖完全冇入索引 | 建 KB 時冇開抽圖 | 開 `extract_embedded_images` → re-index |
| 舊 KB 圖片標籤錯(顯示引用 chunk 嘅章節而非圖自身)| 舊索引缺 metadata | re-index 即修(新 ingest 自動帶)|
