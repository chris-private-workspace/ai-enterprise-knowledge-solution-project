# 04 — 調試與試跑工作流

> 平台嘅標準調參迴路:**改草稿 → 試跑 A/B → 睇指標 → 滿意先儲存**。
> 本手冊教你點用試跑 panel、點解讀指標、同點樣分層診斷問題。

## 1. 試跑(config-test)panel 操作

位置:KB Settings tab(草稿 vs 已存)/ 文件詳情 Per-doc 配置 tab(此文件配置 vs 繼承 KB)。

1. 喺上面旋鈕區改值(**唔使儲存** — 試跑攞嘅就係草稿)
2. 填「測試問題」— 用你 KB 嘅**真實代表性問題**(唔好用太泛嘅)
3. 揀「重跑次數」1–5(**建議 3**,見 §3 噪音紀律)
4. 開「同已存配置對照(A/B)」
5. 撳「試跑」→ 兩張結果卡(DRAFT vs SAVED)+ 逐引用 breakdown
6. 滿意 → 「把草稿配置儲存到此 KB」(或上面嘅「儲存到此 KB」)

## 2. 指標解讀(雙軸)

### 2.1 Presentation 軸(數量結構 — 穩定、可直接對比)

| 指標 | 量咩 | 點睇 |
|---|---|---|
| 引用數 citation_count | 答案引咗幾多個 chunk | 列舉型 query 太少(1–3)= 完整性差;太多(>15)可能 expansion 過激 |
| **涵蓋章節數 distinct_sections** | 引用覆蓋幾多個唔同章節 | **文字完整性嘅最好 proxy** — 跨章節 query 應 ≥ 題目涉及嘅章節數 |
| **圖片章節數 image_section_count** | 圖覆蓋幾多個章節 | **圖片完整性 proxy** — 同上面比:文字 5 章但圖得 1 章 = 圖片收割唔夠 |
| 圖片 raw / dedup | 收割總數 / 去重後 | dedup 遠細過 raw = 重複收割多(正常);dedup 太細 = 供給唔夠 |
| 答案字數 answer_chars | 答案長度 | detailed vs concise 嘅直觀對比 |
| latency_ms | 耗時 | 同已存比,睇配置嘅速度代價 |

### 2.2 質素軸(忠實度 faithfulness)— ⚠️ 有兩個使用警告

- 顯示 **mean ± band**(N 次重跑嘅波動範圍)。**band 大(>0.15)= 嗰個配置本身唔穩**,
  單睇 mean 會被誤導;N=1 時 UI 會出「單次 judge」警告 — 只可當方向性信號。
- **Length bias(UI 有注腳)**:忠實度對長 / 全面嘅答案**系統性偏低**(claim 越多越易被扣分)。
  實證見過完整答案 0.019 vs 殘缺短答案 1.0 嘅反轉 — **絕對唔好攞忠實度做「邊個配置好啲」
  嘅排序軸**,完整性請睇涵蓋章節數。

## 3. 調參紀律(血淚實證,跟住做少行彎路)

1. **一次改一個變量** — 一次改三個,升咗都唔知邊個有功。
2. **N=3 起步** — 單次有噪音(借邊 query 試過 1.00↔0 擲毫);band 細先可信。
3. **試跑用 panel,唔好用 chat 肉眼判** — chat 顯示層有 inline cap + 裝飾圖過濾,
   會遮住 backend 嘅真實數字(見 01 §5 三層數字)。
4. **改完記得儲存** — 試跑草稿唔落地;關頁就冇。
5. **改 ingest 旋鈕(chunk strategy / 圖上限)後必須 re-index** 先見效。

## 4. 分層診斷:問題出喺邊一層?

平台有三個測試面,各看一層 — 用啱個面先唔會白調:

| 測試面 | 行邊啲層 | 用嚟答咩問題 |
|---|---|---|
| **Retrieval Testing tab(V4)** | 只行檢索 + rerank(**冇**答案生成 / expansion / 圖)| 「啱嘅 chunk 有冇被搵到?排第幾?」|
| **試跑(config-test)** | 完整 pipeline + 雙軸指標 + A/B | 「呢套配置出嚟嘅答案結構好唔好?」|
| **Chat** | 完整 pipeline + 顯示層 | 「用戶實際體驗係點?」|

### 診斷決策樹

**問題:答案唔齊(文字)**
1. V4 tab 跑同一條 query(top_k 50):目標章節嘅 chunk 喺唔喺結果度?
   - **唔喺** → 檢索層問題(罕見;可能文件冇 ingest 好,睇 Chunks tab)
   - **喺,但排好後**(例如第 8 位而 rerank_k=5)→ **rerank 容量問題**:加大 rerank_k(5→10)
2. V4 有齊但 chat 唔齊 → 引用層問題:開 / 加大 citation expansion(記住要配 prefix depth=1)

**問題:文字齊但圖唔齊**
- 文字同圖係兩條獨立管線!睇試跑「圖片章節數 vs 涵蓋章節數」確認落差,然後:
  1. Neighbour max aux images 太細(出廠 2)→ 加大(圖密手冊 40)
  2. Max images / answer 預算太細 → 加大(或留空 = 無上限)
  3. 仲唔齊 → 檢查 KB 有冇開 `extract_embedded_images` + 係咪 ingest 之後先開(要 re-index)

**問題:圖洪水(細問題出幾十張圖)**
- 設 Max images / answer cap(narrow query 場景)
- 根治:per-chunk 圖上限(ingest 旋鈕)+ re-index — 一個 chunk 自身揹幾十張圖係
  ingest 層問題,runtime 旋鈕唔解

**問題:引用漂移(答案引咗無關章節)**
- 檢查 expansion prefix depth 係咪 0(冇章節 bound)→ 設 1

**問題:答案慢 / timeout**
- 圖密 mega query 答案生成可達 90 秒+(系統 timeout 120 秒內屬正常,等佢)
- 持續超時 → 收細 answer_detail(detailed→concise)或 cap 圖

## 5. 進階:eval 背書(調完想攞正式數)

試跑係快速迴路;要正式 benchmark(例如想將配方推廣到第二個 KB 前):
- **RAGAs 四指標 eval**(Eval 頁 / `/eval/run`):要 ground-truth eval set(YAML)
- **image-recall 指標**(`backend/eval/image_recall.py` + `scripts/run_image_recall.py`):
  要人手標注「每條 query 預期邊幾張圖」嘅 GT(有 HTML 標注 worksheet 工具輔助)
- 指標定義同歷史實證數字見 06 手冊
