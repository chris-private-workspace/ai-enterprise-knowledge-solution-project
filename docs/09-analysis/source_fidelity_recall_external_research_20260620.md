# 圖文還原度(Source Fidelity Recall)— 外部市場 / 學術實證調查(2024-2026)

**Date**: 2026-06-20
**Status**: Research brief — 外部證據彙整,**未決策、未開 phase、未寫 ADR**(交俾 Chris 定方向)
**Scope**: 對「如何改善 RAG 答案對原文圖文關係 / 內容結構的還原度」做市場 + 學術調查;聚焦 2024-2026 有實證 / 論文 / benchmark 支持的方向
**讀者**: Chris(技術 Lead)+ Claude Code(本 repo AI 助手)
**研究方法**: deep-research harness — 5 路 fan-out web search → 21 個 primary 來源(幾近全部 arXiv,含 SIGIR / NeurIPS / ACL peer-reviewed)→ 抽 101 條 falsifiable claim → 對其中 25 條做三票對抗式驗證(需 2/3 反證才剔除)→ 22 confirmed / 3 killed

---

## 0. 本文件與姊妹文件嘅分工(避免重疊)

| 文件 | 性質 | 證據來源 | 回答嘅問題 |
|---|---|---|---|
| `text_image_fidelity_recall_analysis_20260620.md`(姊妹文件,**先寫**) | **內部機制根因 + 修法選項** | EKP 自身 code + stored conversation 離線重現 | 「我哋個末尾孤兒圖 + figure 倒置,根因喺邊?有咩修法?各觸邊個 H 級?」 |
| **本文件** | **外部市場 / 學術實證調查** | 2024-2026 arXiv / benchmark / survey | 「外面業界 + 學界點解呢類問題?有咩有實證支持嘅方向?成本權衡證據點?」 |

**兩份唔重疊**:本文件**唔重複**姊妹文件嘅甲 / 乙 / 丙分類、code 根因、H 級別判定;姊妹文件**唔重複**本文件嘅外部 paper / benchmark。兩者銜接點喺 §7。

> **遵守 CLAUDE.md §15 North-Star Principle**:本調查所有方向,出發點都係「忠實還原原文檔圖文關係 + 內容結構」,**唔係**「把多餘圖掃走令版面乾淨」。

---

## 1. 一句話結論

2024-2026 文獻對「圖文還原度」給出清晰且有實證支持嘅方向:**圖→步驟錨定本質上需要喺 ingestion / parse 階段保留細粒度結構 metadata(bounding box + reading order + figure-caption linkage),而非寄望 runtime 或模型自行放對**;而「把圖放回答案正確位置」已被學界正式形式化為可量度任務(MRAMG / MMDocRAG / M2IO-R1),並有多份 benchmark **實證確認「高召回 ≠ 正確錨定」係兩個 decoupled 問題 —— 正正係 EKP 嘅症狀**。

---

## 2. 四個方向嘅核心發現(逐項標來源 + 票數)

### 2.1 方向一 — 圖-文錨定 / 版面感知:業界共識係 ingestion-time 重建結構 metadata

| 做法 / 來源 | 實證 | 票數 |
|---|---|---|
| **LAD-RAG**(arXiv 2510.07233):ingestion 時建 symbolic document graph 捕捉版面 + 跨頁依賴,與 neural embedding 並用 | retrieval completeness >90% perfect recall | 3-0 |
| **Docling**(arXiv 2408.09869):parse 階段做「讀序校正 + figure-caption 配對 + bbox 預測」,輸出 per-item bbox(left/top/right/bottom)+ 頁碼 + reading-order + caption linkage | RT-DETR on DocLayNet;primitive 齊備 | 3-0 |
| **XY-Cut++**(arXiv 2504.10258):階層式版面排序 | reading-order 還原 98.8 BLEU,勝 baseline 最多 24% | 3-0 |
| **SCAN**(arXiv 2505.14381):rule-based 座標排序(先 y 後 x)讀序近似 + coarse-grained layout-aware semantic chunking | textual RAG +2.7~+9.4;visual RAG +5.6~+10.4 | 3-0 |

**對 EKP 最關鍵嘅一點**:**EKP 已經用 Docling**(architecture.md §3.2 lock)。Docling 喺 parse 時本來就算出 picture 嘅 bbox + doc-order + caption linkage —— 呢啲正正係做「圖→步驟」細粒度錨定嘅原料。即係 EKP 想升「章節級 → 步驟級」**唔需要引入新 vendor / 新模型**(唔觸 H2),缺口係「ingestion 時有冇保留 Docling 已算好嘅 bbox」。

### 2.2 方向二 — 交織式圖文呈現:已被形式化為獨立任務,EKP 走喺正確路線

| 做法 / 來源 | 機制 | 票數 |
|---|---|---|
| **MRAMG-Bench**(SIGIR 2025,arXiv 2502.04176)| 把「答案內 text+image 交織」形式化為任務,有別於只輸出純文字嘅傳統 MRAG | 3-0 |
| **MMDocRAG**(NeurIPS 2025,arXiv 2505.16470,Huawei Noah's Ark;4,055 QA / 222 docs / 60 模型)| 用 inline citation marker(圖 `![](imagej)`、文 `[i]`)由 LLM 喺適當位置插入,專家驗證位置一致性 | 3-0 |
| **M2IO-R1**(arXiv 2508.06328)| 專門 RL inserter(Inserter-R1-3B,GRPO 訓練)學每張圖該錨喺輸出邊度 | 3-0 |

**對 EKP 嘅含意**:MMDocRAG 嘅 inline citation marker 機制**同 EKP 既有 W70/W71 inline image marker 同源**(memory `project_inline_image_markers_w70`)。即係 EKP 嘅 `[IMG#]` marker 路線**就係學界主流,唔係行錯路**;卡嘅只係「插入位置嘅精度」。M2IO-R1 證明若要更精準可訓練專門 inserter,**但成本高 + EKP 受 H4 禁 fine-tuning 限制 → 呢條唔適用**。

### 2.3 方向二嘅鐵證 — 最對準 EKP 症狀:「高召回 ≠ 正確錨定」係已知未解難題

> 呢個係成份調查最值得注意嘅部分:**外部實證印證咗我哋嘅診斷**(卡點在還原度,唔在召回)。

- **MRAMG**(arXiv 2502.04176):lifestyle(食譜 / 手冊等 step-like)domain,Visual Recall@10 高達 **0.99**,但**所有模型嘅 image-ordering 都唔及格** —— 論文原話「image insertion order... remains an unresolved challenge」。(票數 2-1)
- **FinRAGBench-V**(arXiv 2505.17471):即使 retrieval Recall@10 達 85-90%,**block-level(區域級)citation recall 只有 ~20-61%**;GPT-4o 由 page-level 89.98% 掉到 block-level 54.17%(掉 ~36pp),Gemini-2.0-Flash block-level 崩到 20.41%。(票數 3-0)

EKP「圖召回近 1.0 但錨唔返步驟」同呢個 **page→block gap 完全同構**,而且 manual / SOP 正正係出問題最嚴重嘅 domain。**呢個係最強嘅外部證據:單靠 runtime / 靠模型自行放對,喺手冊場景係已知失敗。**

### 2.4 方向四 — 還原度評估 metrics:有現成可借用工具箱(超越 RAGAs 純文字 faithfulness)

| 來源 | 可借用 metric | 票數 |
|---|---|---|
| **MRAMG**(arXiv 2502.04176)| **Image Ordering Score**(插入順序 vs ground truth,weighted edit distance)+ **Image Position Score**(放置適切性)| 3-0 |
| **MMDocRAG**(arXiv 2505.16470)| 五維 0-5 評分(fluency / cite quality / **text-image coherence** / reasoning logic / factuality)+ text / image quote 各自 precision / recall / F1 | 3-0 |
| **FinRAGBench-V**(arXiv 2505.17471)| 細粒度 visual citation =(page, bbox=[x1,y1,x2,y2])雙層,**可機器驗證** | 3-0 |

### 2.5 方向三 — 過度濃縮 / 內容完整度:本輪覆蓋最弱(誠實交代)

呢個對應姊妹文件嘅「乙類」(答案濃縮丟段落)。本輪**冇任何 confirmed claim 直接支撐** coverage-oriented prompting / extractive-then-abstractive / claim-coverage 評估嘅具體實證方法 → 列為 open question(見 §5),需要另開一輪針對 synthesizer 完整度嘅研究。**含意**:乙類比甲類更不成熟、更難借外部實證,風險更高。

---

## 3. 三條成本階梯(對「ingestion 改 metadata vs runtime 近似」嘅權衡)

研究**冇推翻**「需要更細圖錨」嘅方向,但揭示 EKP 嘅真正缺口唔係「重做 ingestion / 引入新模型」,而係「Docling 已算好 bbox + doc-order,EKP 目前只壓縮成章節級 `source_section`,丟咗細粒度」。由此得出三條成本階梯:

| 階梯 | 做法 | 成本 | re-index? | H 級別(待確認)| 適用時機 |
|---|---|---|---|---|---|
| **① 最省** | runtime 用既有 `doc_order` 做線性細錨(EKP 而家就有 `doc_order`)| 近零 | 否 | 內部實作改動,interface 不變(可能 Tier-1-safe,落手前 STOP 確認)| **先驗證** |
| **② 中等** | ingestion 補抽 Docling 已有嘅 picture bbox,做空間 proximity 錨定 | 中 | 是 | 改 chunk / metadata schema → 觸 H1,要 ADR(但範圍細過引入新模型)| ① 唔夠準先升 |
| **③ 最貴** | 引入新版面模型 / RL inserter(ColPali / DSE / M2IO-R1 類)| 高 | 是 | 替換 retrieval 層 / 加模型 → 觸 H1 + H2 + 可能 H4 | **唔需要**(EKP 已有 Docling 原料)|

**研究背書 ① 先行嘅理由**:caveat (5) 明說「**冇任何一份做過 ingestion 步驟級 metadata vs runtime 章節級近似喺 SOP 上嘅直接對照**」→ EKP 必須自己做小規模 A/B 先有定量證據;而 SCAN 證明「讀序乾淨時 rule-based 幾何近似可行」,EKP 讀序已乾淨 → ① 有外部理論支撐其「可能足夠」。

> **前提已自驗(2026-06-20,對齊姊妹文件 §9)**:姊妹文件 §9 自驗 ingestion code 證實 ——(a) Docling `iterate_items()` 畀文字 / heading / list_item / table / picture 分配**同一個 monotonic `doc_order`**(`backend/ingestion/parsers/docx_parser.py:70-145`);(b) chunker 已保留 doc_order-interleaved event stream(`[IMG@<doc_order>]` placeholder,`backend/ingestion/chunker/layout_aware.py`);(c) 最終 index 圖 metadata **確有 `doc_order`**(conversation `583fa20…` 實測)。**所以階梯 ① 嘅 `doc_order` 步驟級信號一直存在、即刻可試,毋須等 bbox。** 真正缺口係 section-anchor inject 演算法淨係用 `source_section[:1]` 章節級定位、冇用 `doc_order` 嚟定位(姊妹文件 §9 發現 4)→ 修法 = 純 runtime 改 inject 定位邏輯,**唔觸 H1**。bbox(階梯 ②)只係若 `doc_order` 線性錨唔夠準先需要嘅後備。

---

## 4. 可借用嘅 metric 工具箱(填入姊妹文件 §6 嘅「還原度」維度)

姊妹文件 §6 已有「硬 / 軟分維評審框架」(原則層);本文件提供**外部來嘅具體 metric**(工具層),可直接填入嗰個框架嘅「圖文還原度」維度:

1. **圖序 / 圖位**:借 MRAMG **Image Ordering Score + Image Position Score** — 量「圖插入順序 / 位置 vs ground truth」。
2. **圖文連貫**:借 MMDocRAG **text-image coherence**(0-5)— 量「圖同周邊文字嘅語義一致」。
3. **步驟級錨點 schema 範本**:借 FinRAGBench-V **(page, bbox=[x1,y1,x2,y2]) 雙層表示法** — 作 EKP 步驟級錨點 metadata 嘅 schema 設計範本,且**可機器驗證**(crop / box-bounding 自動評)。

呢三個正好補 RAGAs faithfulness / recall **唔覆蓋**嘅「圖-文位置還原」維度。

---

## 5. Open Questions(本輪未解,需 EKP 自驗或另開研究)

1. **階梯 ① 嘅實際增益待 offline 實證(已收窄,對齊姊妹文件 §9)**:原問題「ingestion 步驟級 metadata vs runtime 章節級近似邊個好」已被姊妹文件 §9 自驗收窄 —— 信號(`doc_order`)一直存在,問題變成「**純 runtime 改 inject 定位邏輯(`doc_order` 鄰近錨定)喺真實 query 實際解到幾多甲類**」。下一步 = offline apply `doc_order` 鄰近錨定喺今次 query(conversation `583fa20…`)、量化甲類改善(參考 W75 教訓 3 offline-apply 驗證法),再決定是否需要升階梯 ②(bbox)。冇 paper 直接對照 SOP 場景,EKP 仍須自驗。
2. **Docling 原料夠唔夠**:Docling 既有 picture bbox + reading-order 係咪已足以喺 EKP pipeline 內做「圖→最近步驟文字」proximity 錨定,定要額外版面分組模型?
3. **乙類覆蓋最弱(已有起點,對齊姊妹文件 §8.3)**:答案「過度濃縮丟段落」嘅 coverage-oriented prompting / extractive-then-abstractive / claim-coverage 評估,本輪冇 confirmed claim 支撐 → 需另一輪針對 synthesizer 完整度嘅研究。**起點**:姊妹文件 §8.3 揾到 `arXiv:2411.17375`(faithfulness vs utility:extractive→abstractive,utility 升最多 200% 但 cited sentences 跌最多 50%),量化咗「還原度 vs 簡潔」trade-off。⚠️ 該 claim 喺姊妹文件 §8 屬 🟡 未對抗驗證、喺本文件來源清單亦未進 confirmed findings → 係**起點唔係定論**,另開研究時要先驗證。
4. **純 prompt 插圖位置上限**:MMDocRAG / MRAMG 嘅 inline-citation 位置插入(同 EKP W70/W71 同源),喺 Azure OpenAI GPT 合成層**唔訓練 RL inserter** 嘅前提下,位置正確率上限未知(M2IO-R1 證明 RL inserter 有效但成本高)。

---

## 6. Caveats(誠實交代,避免 over-claim)

1. **時間敏感 + 學術 best-case**:核心來源全為 2025-2026 新 paper(LAD-RAG 2025-10、MMDocRAG NeurIPS 2025、MRAMG SIGIR 2025、FinRAGBench-V / SCAN / XY-Cut++ / Vision-Guided 2025、M2IO-R1 2025-08),引用數仍少、部分為作者自報結果;benchmark 數字屬學術 best-case framing(如 XY-Cut++ 98.8 BLEU 喺作者自建 DocBench-100;「up to 24%」為最佳子集)。
2. **3 條子 claim 被 refuted 不採用**:Vision-Guided Chunking 端到端 0.89 vs 0.78(1-2)、其「prompt 強制 step+圖同 chunk」(0-3)、「reading-order recovery 直接提升 RAG」(1-2)→ 對 Vision-Guided 只採其「ingestion-time 重建 + 結構保留」嘅事實,不採具體效果數字。
3. **領域 / 語言適用性**:SCAN textual 增益偏小(+2.7)且主要喺日文密集文件訓練;FinRAGBench-V 係金融文件、MRAMG / MMDocRAG 含 web / wiki,**非純 SOP** → 跨到 EKP 嘅 Word / PPT / PDF 企業手冊需自行驗證。
4. **機制 vs 症狀錯位**:MRAMG / M2IO-R1 解嘅係「generation-time 由模型決定插圖位置」,而 EKP 根因部分係 ingestion metadata 粒度(章節級)→ 兩者 outcome 層症狀相同(高召回≠正確放置)但機制唔同,**直接搬 RL inserter 未必對症**,ingestion-time 步驟級 metadata 先係 EKP 直接缺口。
5. **成本權衡係方向一致非定論**:多份 primary source 都把錨定重建放 ingestion-time,SCAN 證明 rule-based 幾何近似「讀序乾淨時」可行;但**冇一份直接做 SOP 上 ingestion vs runtime 對照** → EKP 仍需自做 A/B。
6. **來源品質整體高**(全 primary arXiv,多為 SIGIR / NeurIPS / ACL peer-reviewed,無 blog / marketing);但部分 claim 嘅「可用於細粒度錨定」屬合理推論(hedged「can be used」)而非 paper 直述。

---

## 7. 與姊妹文件嘅銜接(交俾 Chris)

本文件**唔重複**姊妹文件嘅修法選項與 H 級判定;以下只列外部證據對嗰啲選項嘅**更新**:

- **姊妹文件 §5.2「甲類根治」** ← 本文件 §2.1 + §3 補:EKP 用緊 Docling 已有 bbox 原料,「甲類」未必要「重建 ingestion」咁貴,有三條成本階梯,**先試階梯 ①(runtime doc_order)**。
- **姊妹文件 §5.3「乙類根治」** ← 本文件 §2.5 + §5(3) 補:乙類喺外部研究覆蓋最弱,**需另開一輪研究**先有實證方法可依,不宜現在憑感覺改 synthesizer。
- **姊妹文件 §6「評審準則框架」** ← 本文件 §4 補:外部 metric 工具箱(MRAMG Image Ordering/Position、MMDocRAG text-image coherence、FinRAGBench-V bbox 雙層)可填入嗰個框架嘅還原度維度。
- **EKP 既有 W70/W71 inline marker 路線** ← 本文件 §2.2 證實 = 學界主流(MMDocRAG `![](imagej)`),方向正確,卡喺位置精度。

**最強單一外部證據**:§2.3 嘅「高召回 ≠ 正確錨定」(MRAMG lifestyle ordering 全不及格 + FinRAGBench-V page→block 掉 36pp)— manual / SOP domain 印證 EKP 症狀,且印證**單靠 runtime 模型放對喺手冊場景係已知失敗** → 支持投資細粒度錨定(階梯 ① 先驗證,唔夠先升 ②),而非繼續喺 runtime 用章節級近似堆圖。

---

## 附錄:來源清單(全 21 個 fetched,標 quality + 對應方向)

| URL | quality | 方向 |
|---|---|---|
| https://arxiv.org/abs/2510.07233(LAD-RAG)| primary | 圖-文錨定 |
| https://arxiv.org/html/2408.09869v1(Docling)| primary | 圖-文錨定 |
| https://arxiv.org/pdf/2506.16035(Vision-Guided Chunking)| primary | 圖-文錨定 |
| https://arxiv.org/pdf/2504.10258(XY-Cut++)| primary | 圖-文錨定 |
| https://arxiv.org/pdf/2505.14381(SCAN)| primary | 圖-文錨定 |
| https://towardsdatascience.com/docling-the-document-alchemist/ | blog | 圖-文錨定 |
| https://arxiv.org/abs/2502.04176v2(MRAMG-Bench)| primary | 交織呈現 |
| https://arxiv.org/pdf/2508.06328(M2IO-R1)| primary | 交織呈現 |
| https://arxiv.org/html/2505.16470v1(MMDocRAG)| primary | 交織呈現 |
| https://arxiv.org/pdf/2505.17471(FinRAGBench-V)| primary | 交織呈現 |
| https://arxiv.org/pdf/2502.08826(Multimodal-RAG Survey,ACL 2025 Findings)| secondary | 交織呈現 |
| https://github.com/llm-lab-org/Multimodal-RAG-Survey | primary | 交織呈現 |
| https://arxiv.org/html/2606.09376v1 | primary | 完整度 vs 濃縮 |
| https://arxiv.org/abs/2411.17375 | primary | 完整度 vs 濃縮 |
| https://arxiv.org/abs/2510.24870 | primary | 還原度評估 |
| https://arxiv.org/pdf/2504.15068 | primary | 還原度評估 |
| https://staff.fnwi.uva.nl/m.derijke/wp-content/papercite-data/pdf/wallat-2025-correctness.pdf | primary | 還原度評估 |
| https://arxiv.org/pdf/2510.07233(LAD-RAG,SOP angle)| primary | SOP 工業實踐 |
| https://arxiv.org/pdf/2410.21943 | primary | SOP 工業實踐 |
| https://arxiv.org/pdf/2602.01858 | primary | SOP 工業實踐 |
| https://arxiv.org/pdf/2510.03663 | primary | SOP 工業實踐 |

> **統計**:5 angles / 21 sources fetched / 101 claims extracted / 25 verified / 22 confirmed / 3 killed / 9 after synthesis。

---

**End — 本文件係外部實證調查 brief,非 implementation order;決策權喺 Chris。**
