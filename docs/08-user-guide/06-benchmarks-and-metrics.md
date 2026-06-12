# 06 — 參考指標與 benchmark

> 平台實證數字(全部來自真實 eval run,標明條件)+ 指標定義 + 「咩數先算好」對照。
> 用途:你調完一個 KB,攞呢度嘅數做對照,知道自己離平台已證上限有幾遠。

## 1. 平台實證 benchmark(2026-06 快照)

### 1.1 文字檢索 / 問答質素

| 指標 | 實證值 | 條件 |
|---|---|---|
| 檢索 Recall@5(Gate 1)| **0.9722** | W2 正式 gate,36-query ground truth |
| 跨文件文字 recall | **1.0** | 30-query eval,6 份財務模組手冊 287 chunks,production default |
| 忠實度 faithfulness | 0.98–0.99 | 同上(N-run mean)|
| 正確性 correctness | ~0.85 | 同上 |
| 列舉型完整性 | 5/5 章節,4/4 run 零漂移 | 「list all the scenarios」類 query,ADR-0052 default |
| p95 latency(檢索+生成前)| ~1.3 秒 | +0.4 秒係 parent-doc 完整性嘅代價(已含)|

### 1.2 圖片召回(圖密手冊,9-query 人手 GT)

| 配置 | image-recall(mean)| precision |
|---|---|---|
| 出廠值 | 0.574 | ~0.98 |
| + cap 放寬 | 0.732 | ~0.98 |
| + 供給旋鈕(max_aux 40)| 0.889 | 0.976–0.988 |
| **+ 完整 preset(80/10/40,ADR-0054 後)** | **0.995(九 query 全部可達 1.00)** | **0.988** |

- Production chat 實測:65 張 GT 截圖 65/65 全召回(2026-06-12)。
- Precision 零代價 — 放大召回冇引入圖片垃圾(0.976–0.988 全程)。
- 注:以上係**圖密步驟手冊**實證;prose 型文件圖片線未有 GT(文字線有)。

### 1.3 系統行為參考值

| 項 | 值 | 備註 |
|---|---|---|
| 答案生成 timeout | 120 秒(ADR-0053)| 圖密 mega query 實測 90–98 秒屬正常 |
| 一般 query 答案生成 | ~12–20 秒 | 串流顯示,感知延遲低 |
| Hybrid 檢索候選 | top 50 | 固定;rerank_k 先係你調嘅嘢 |
| Re-index(6 份文件 / ~300 chunks)| 幾分鐘級 | Pipeline tab 睇進度 |

## 2. 試跑指標 — 「咩數先算好」對照表

| 指標 | 健康範圍(經驗值)| 警號 |
|---|---|---|
| 引用數 | 具體 query 3–8;列舉型 6–15 | 1–2(完整性差)/ >15(expansion 過激)|
| 涵蓋章節數 | ≥ 題目涉及嘅章節數 | 跨 5 章 query 只覆蓋 1–2 章 |
| 圖片章節數 | ≈ 涵蓋章節數(圖密文件)| 明顯細過文字章節數 = 圖收割唔夠 |
| 圖 dedup | 同該題真實圖量同數量級 | 0(冇開圖 / 冇抽圖)/ 幾十張(narrow query 洪水)|
| 忠實度 mean | >0.9(N≥3)| band >0.15 = 配置唔穩;⚠️ 長答案有 length bias,勿做排序軸 |
| latency | 同 SAVED 差 <1 秒 | 倍增 = 諗下值唔值 |

## 3. 正式 eval 指標定義(Eval 頁 / RAGAs)

| 指標 | 定義 | 靠咩判 |
|---|---|---|
| faithfulness | 答案每句 claim 有冇 context 支持 | LLM judge(gpt-5.4-mini)|
| answer correctness | 答案 vs ground-truth 答案嘅符合度 | LLM judge |
| context recall | ground-truth 要點有幾多喺檢索 context 入面 | LLM judge |
| context precision | 檢索 context 入面有幾多係真有用 | LLM judge |

**使用注意**:
- judge 係 LLM,單次有噪音 — 正式對比起碼 2 輪
- faithfulness 對長 / 全面答案系統性偏低(length bias)— 同完整性係**兩回事**,
  曾實證「更完整嘅答案分數反而低」嘅反轉

## 4. image-recall 指標定義(腳本層)

- **image-recall** = 答案返回嘅 unique 圖 ∩ GT 預期圖 ÷ GT 預期圖數
- **image-precision** = 命中 GT 嘅 ÷ 答案返回嘅 unique 圖數
- GT = 人手標注(每條 query 預期邊幾張截圖);有 HTML worksheet 工具輔助標注
- 量度喺 **backend 層**(顯示層裝飾圖過濾之前)— 所以 eval 1.00 同 UI 少 2 張 icon 可並存

## 5. 經驗法則摘要(一頁版)

1. 文字完整性出廠已係最優配方(ADR-0052)— 唔好亂關 parent-doc / expansion。
2. 圖密手冊:一鍵 preset,期望 recall ~1.0。
3. 試跑 N=3,睇 band;一次改一個變量。
4. 忠實度係方向性信號,完整性睇涵蓋章節數。
5. UI 圖數 ≠ backend 圖數(裝飾圖過濾 + inline cap)— 量化對比用試跑 panel。
6. Runtime 旋鈕即時生效;ingest 旋鈕(切分 / 抽圖)要 re-index。
7. 一個 chunk 自身揹幾十張圖 = ingest 問題,runtime 旋鈕唔解。
