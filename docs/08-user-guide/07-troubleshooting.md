# 07 — 故障排查

> 格式:症狀 → 最可能原因(按概率排)→ 解法。涉及旋鈕嘅去 03 查詳情。

## 1. Chat 完全冇圖

1. **KB 冇開 `return_images_in_chat`**(出廠係關!)→ KB Settings 開,即時生效
2. **建 KB 時冇開 `extract_embedded_images`**(出廠係關!)→ 開 + **re-index**
3. KB 嘅 Images tab 都係空 → ingest 層問題,睇 Pipeline tab / 文件狀態

## 2. 圖有,但唔齊(文件有 30 張步驟圖,答案得幾張)

按 04 §4 決策樹:
1. Neighbour max aux images 出廠只係 **2** → 圖密文件加大(20–40),或一鍵 preset
2. Max images / answer 預算太細 → 加大 / 留空
3. 試跑「圖片章節數 vs 涵蓋章節數」確認 — 文字齊圖唔齊就係收割旋鈕問題

## 3. UI 圖數同預期差 1–2 張(例:預期 65 見 63)

**多數唔係 bug** — 顯示層自動過濾裝飾性圖示(短邊 <64px 嘅 icon、≤512px 且近正方形
嘅 tip / idea 圖案)。文件入面嘅 Excel 附件 icon、燈泡提示圖案唔算內容截圖,被過濾係
by design。要核實:試跑 panel 嘅圖數係 backend 真數(過濾前)。

## 4. 答案唔完整(列舉型 query 漏項)

1. 確認 KB 冇人手關咗 parent-doc / citation expansion(出廠係開)
2. 跨章節 query 隨機漏成個章節 → rerank_k 5→10(錨點冗餘)
3. V4 Retrieval Testing 驗一驗:目標 chunk 排第幾?(04 §4 決策樹)

## 5. 圖洪水(問一個細步驟,出幾十張圖)

1. 即時止血:Max images / answer 設 cap(per-doc 設 6–10)
2. 根治:Chunks tab 睇係咪有 mega-chunk(一個 chunk 自身揹 20+ 張)→ 收細每 chunk
   圖上限 → re-index

## 6. 引用 / 答案漂移到無關章節

- Expansion prefix depth 被設返 0(冇章節 bound)→ 設返 1(出廠值)
- 放大 max_aux 而冇 bound 必然漂移 — 兩個要一齊用

## 7. 答案好慢 / 轉圈好耐

1. **圖密 mega query 生成 90 秒+ 屬正常**(timeout 上限 120 秒)— 等佢,答案係串流出
2. 一般 query 都慢 → 可能係 Azure 服務暫時降速(過陣自己恢復);Traces 頁睇邊段慢
3. 持續超時 → answer_detail 收返 concise / cap 圖

## 8. 揀咗 KB 但 chat 答「搵唔到相關內容」

1. KB 啱唔啱?(揀錯 KB 係最常見)
2. 文件真係 ingest 咗?Documents tab 全 READY?
3. V4 Retrieval Testing 跑下 — 完全零結果通常係 KB 空 / 文件 FAILED

## 9. 試跑兩次數字唔同

正常 — LLM 引用組成有 run-to-run 波動。所以:
- 重跑次數揀 3,睇 mean ± band,唔好單次定論
- band 大(>0.15)= 配置本身唔穩,先解決穩定性(通常 rerank_k=10 有幫助)再比大小

## 10. 改咗配置但行為冇變

1. 改嘅係 ingest 旋鈕(chunk strategy / 圖上限 / 抽圖)→ **要 re-index**
2. 改咗草稿但**冇撳「儲存到此 KB」**(試跑唔等於儲存)
3. Per-doc 覆寫但條 query 答案唔係以嗰份文件為主導 → per-doc 只喺該文件 dominant 時生效
4. 同一個旋鈕被更高層覆寫(per-doc 贏 per-KB)— 睇「已覆寫」badge 喺邊層

## 11. 對話歷史唔見咗

對話存喺資料庫,**唔會丟** — 列表空通常係 backend 暫時冇行(dev 環境常見)。
重啟全服務後返嚟。揾管理員 / 開發者重啟(dev 環境:全 stack 重啟程序)。

## 12. 圖片標籤錯(圖標住第個章節嘅名)

舊索引缺圖片自身章節 metadata — **re-index 即修**(新 ingest 自動帶)。

---

**仲未解決?** 收集三樣嘢再上報:(1)KB id + 文件名;(2)出事嗰條 query 原文;
(3)試跑 panel 截圖(雙軸指標 + 逐引用 breakdown)— 呢三樣足夠定位問題層。
