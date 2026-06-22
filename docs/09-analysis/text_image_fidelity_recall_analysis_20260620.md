# 圖文還原度(Source Fidelity Recall)缺口分析 — 末尾孤兒圖根因 + 修法選項

**Date**: 2026-06-20
**Status**: Analysis brief — 前置分析,**未決策、未開 phase、未寫 ADR**(交俾 Chris 定方向)
**Scope**: chat 答案嘅「圖文還原度」— 末尾無錨圖堆積 + figure 編號倒置;呢份文件唔係 implementation order
**讀者**: Chris(技術 Lead)+ Claude Code(本 repo AI 助手)
**觸發**: `drive-user-manual-kb-20260618`「How do I post a journal entry in General Ledger?」smoke test(conversation `583fa2046e274d02a952b0ed1c7fff74`)
**Related**:
- CLAUDE.md §15 North-Star Principle(本分析嘅頂層準則)+ memory `principle_source_fidelity_recall`
- ADR-0055(inline image markers)/ ADR-0056 段②d(section-anchor inject)/ ADR-0040(四層 config resolve)
- `docs/09-analysis/rag_retrieval_quality_investigation_20260525.md`(同類前置分析)

---

## 0. 前置指示(落手前必讀)

1. **遵守 CLAUDE.md §15 North-Star Principle**(見 §1)。本分析所有修法,出發點都係「忠實還原原文檔圖文關係」,**唔係**「把多餘圖掃走令版面乾淨」。
2. 下面每個修法方向標明咗 🟢 Tier-1-safe(調 config / bug-fix,可自行做)定 🟡 trigger H1 / H2 / H7(STOP and ask + 寫 ADR)。**唔可以**因為「順手」把 🟡 當 🟢 做。
3. **最重要嘅紀律**:末尾孤兒圖**唔可以無腦退底部 / 收納**。本分析已實證(§4)末尾圖係**甲+乙混合**;無腦退底部會把「甲類」(原文步驟嘅截圖)永久埋葬 = 破壞還原 = 改錯方向。退底部 / 收納前**必先逐圖分甲 / 乙 / 丙**。
4. 遵守 §1 Karpathy baseline:eval-driven,一次郁一個旋鈕。唔清楚 → ask(§13)。

---

## 1. 北極星準則:圖文還原度(Source Fidelity Recall)

> **用戶 2026-06-20 確立嘅 RAG / 知識系統最根本目的準則(= CLAUDE.md §15)。**

**核心**:答案要**忠實還原原文檔本來嘅圖文關係** —— 原文檔某段內容本來有相關圖片跟隨,當嗰段被 recall 入答案,圖亦應**盡可能還原到答案對應位置**。衡量嘅係「對原文檔圖文鄰接關係嘅還原度」,**唔係**圖文 1:1 配對,亦**唔係**排版美觀。「盡可能」= 唔追求 100%,追求忠實。

**Why(關鍵)**:做到忠實還原,**高完整度 + 準確度係自然結果**,唔係另一個獨立要追嘅 KPI。

**執行紀律**:出發點**以原文檔為中心**(原文圖跟邊段 → 答案還原嗰段時圖都還原),**唔好以答案文字為中心**(「有冇答案錨點 → 冇就退底部」會破壞還原)。

---

## 2. 問題現象(觀察到嘅 symptom)

測試 query:**「How do I post a journal entry in General Ledger?」**,KB = `drive-user-manual-kb-20260618`(369 chunks / 827 screenshots),dominant doc = GL 手冊(`drive-user-manual-0605-gl-...`,74 chunks)。

1. **文字 + 跟隨文字嘅圖,直到「4. Confirm voucher transactions.」為止都正常**(圖文交織,圖跟住步驟)。
2. **之後突然多出一堆冇文字嘅圖**(figure 27–38,共 12 張),冇任何文字內容跟隨。
3. **最後仲有一張 figure 23 出現喺最末**(編號倒置 — 23 排喺 38 之後)。

---

## 3. 機制根因(三層,各自獨立)

> 以下全部係用 stored conversation `583fa20…` 嘅真實 answer + citations 離線重現前端 pipeline 得出,非推斷。

### 3.1 末尾堆 = section-anchor inject 嘅章節級 clump(🟡 設計局限,非 bug)

答案實測:38 張去重圖**全部 inline、trailing = 0**;47 個 `[IMG#]` marker、40 unique。關鍵喺答案最尾:

```
4. Confirm voucher transactions. [IMG#51c418a7][IMG#60a8a6e9]…×13
```

「4. Confirm voucher transactions.」一句後面 clump 咗 **13 個連續 marker**。拆解:

- **第 1 個**(`51c418a7`,do=408)= synthesizer 自己寫嘅 Confirm-voucher 圖。
- **後 12 個** = 系統 **inject**(`backend/generation/section_anchor_markers.py`)。來源 = `attach_neighbour_images` 喺 synthesis 之後撈嘅同章節 aux 圖,synthesizer 睇唔到 → 無 marker → 由 inject 補。

inject 用 `section_prefix_depth=1`(章節級)。實測呢 12 張圖嘅 `source_section[0]` **全部 = `"3 GL03. Processing Journal Vouchers"`** → 整個 §3 當成**一個** anchor group → §3 全部 un-anchored aux 圖堆去「§3 最後一個 anchored marker」(= Confirm voucher transactions,啱啱係答案最後一句步驟)後面。

含意:呢個係 W75 教訓 5 已記錄嘅「章節級錨定太粗 → 同章節大量 aux 圖全 clump 一個錨點」。

### 3.2 figure 23 倒置 = 巢狀清單嘅 render 限制(🟡 已知前端限制,W71 F2)

答案係深度巢狀 numbered list:

```
3. **GL03-3. Post the Journal** [IMG#7b7b8186]   ← figure 23,marker 喺父層步驟標題行
   1. **Post the Journal**
      1. Click Post > Post. [IMG#8b5e2ded]         ← figure 24
      3. Click Voucher. [IMG#30ac2592]             ← figure 25
      4. Confirm voucher transactions. [IMG#…×13]   ← figure 26–38
```

`figure 23`(`7b7b8186`)個 marker 第一次出現位置(字元 10806)其實**早過** clump(11597),所以攞細編號 23。但前端 `AnswerBodyMarkdown` 嘅 `li` override 有已知行為:**父層步驟自己帶圖、底下又有子清單時,會把父層圖卡 render 喺成個子清單之後**。所以 figure 23 個圖卡被推到 figure 24–38 之後 → 「編號 23 但視覺排喺 figure 38 後面」。係 `[編號順序]` 同 `[render 位置]` 脫鉤,同 §3.1 嘅 inject clump 無關。

### 3.3 cap=0 config 漂移(放大因子,🟢 可修)

`GET /kb/.../docs/{gl-doc}/config` 實測 GL doc(連同 KB 內全部 6 個模組 doc)嘅 effective config:

```
enable_section_anchored_aux_images = true
section_anchor_max_per_anchor      = 0     ← 無上限(每錨點注入無限張)
answer_detail                      = detailed
max_images_per_answer              = 80
citation_neighbour_max_aux_images  = 40
```

`P1_sop_imgdense` preset 嘅設計值係 **`section_anchor_max_per_anchor=5`**(正正為咗 bound clump)。而家 6 個 doc 全部係 0 + `answer_detail=detailed` 一致 → 係**某次統一套 config 嘅結果**,最可能係 full-replacement PATCH(L3 旋鈕 / config-test save / Settings preset 套用)冇帶呢個欄位,被 reset 做 default 0(memory 已記「PATCH = full replacement,omitted field reset default」陷阱)。**cap=0 把本應被 cap 嘅 clump 放大到無上限。**

> **已在另一 session 處理**:Chris 2026-06-20 把 6 個 doc 嘅 `section_anchor_max_per_anchor` 改返 5。**注意**:cap=5 只係 bound clump 大小(超出落 trailing),**唔解決還原度問題**(超出嗰啲圖仲係無還原到對應步驟)。

---

## 4. 實證查證:末尾 12 張圖嘅甲 / 乙 / 丙分類

> 方法:用 V4 `POST /kb/.../retrieval-test`(fulltext mode)抽返 GL §3.1.5 原文 chunk 文字,逐句對照答案。**圖嘅 `alt_text` 全部係空(原文 figure 無 caption 抽取)→ 唔可以靠 caption 判,必須對原文 chunk_text。**

### 4.1 鐵證:答案 vs 原文

**原文 §3.1.5(chunk #34)步驟列表**:
```
GL03-3. Post the Journal
  Click Post > Post
  Confirm Operation completed.
  Click Voucher.
  Confirm voucher transactions.
  [RMS/RSP] Petty cash withdrawal/reimbursement process…   ← 一個變體流程
```

**答案嘅 §3.1.5**:
```
GL03-3. Post the Journal
  1. Click Post > Post.
  2. Confirm Operation completed.
  3. Click Voucher.
  4. Confirm voucher transactions.
  （冇咗 [RMS/RSP] Petty cash 變體段）
```

即係:答案**逐句還原咗主步驟 4 步**,但**漏咗 RMS/RSP Petty cash 變體段 + 完全冇寫 §3.1.1 Overview 段**。而 GL §3.1 chunk 結構:§3.1.1 Overview(2 圖)/ §3.1.3(25 圖)/ §3.1.4(6 圖)/ **§3.1.5(16 圖)**。§3.1.5 16 張圖,答案 4 步只配到 2 張 synthesizer 圖,其餘全部 inject 去末尾。

### 4.2 分類(末尾圖係甲+乙混合)

| 末尾圖 | 原文歸屬 | 答案有冇寫嗰段 | 類別 |
|---|---|---|---|
| 「Click Post」「Confirm Operation」步驟截圖 | §3.1.5 主步驟 | **有**(答案寫咗呢幾步) | **甲** — 該還原到步驟旁,因 `depth=1` 章節級錨堆去末尾 |
| §3.1.1 Overview 流程圖(figure 27 等 2 張) | 章節概覽段 | **冇** | **乙** — 答案根本冇寫 overview |
| RMS/RSP Petty cash 截圖(figure 38 Petty Cash 表) | §3.1.5 後半變體段 | **冇** | **乙** — 答案漏咗呢個變體 |

**結論:呢條 query 嘅末尾圖同時跨甲、乙。** 證實 §0 紀律 —— 無腦退底部會錯埋葬甲類。

---

## 5. 修法選項(每個標 H 級別 + 深層障礙)

### 5.1 即時 bound clump:cap 改返 5(🟢 純 config,已做)

- 把 6 個 doc `section_anchor_max_per_anchor` 0 → 5。clump 由 12 → 5,其餘落 trailing(W83 已按章節分組)。
- **限制**:只 bound clump 大小,**唔提升還原度**。係止血,唔係根治。

### 5.2 甲類根治:圖→步驟級錨點(🟡 trigger H1 — ingestion 改動)

- **目標**:令「Click Post」步驟嘅截圖還原到「Click Post」嗰行旁,而唔係章節尾。
- **深層障礙(關鍵發現)**:圖嘅 metadata `source_section` **只到 §3.1.5 章節級,冇步驟級錨點**。即使 section-anchor 由 `depth=1` 改 leaf 級,都只能到 §3.1.5,**無法精確到「Click Post」嗰步**(呢個正正係 W75 記錄「leaf 級可錨率 2-82% 波動」嘅根)。
- **真·步驟級還原**要喺 **ingest 時畀圖更細嘅錨點 metadata**(圖喺邊一步之後 / 圖嘅 anchor token)→ chunker / parser 改動 → **trigger H1,要寫 ADR**。
- 規模:中至大(掂 ingestion pipeline + re-index)。

### 5.3 乙類根治:提升 synthesizer 還原度(🟡 — synthesizer / prompt 改動)

- **目標**:令 synthesizer 更完整還原原文段落(§3.1.1 Overview、RMS/RSP 變體),咁嗰啲圖自然有文字錨。
- **障礙**:synthesizer 而家傾向濃縮;要還原需改 prompt / pipeline,答案會變長(同「簡潔」有張力)。亦要小心唔好變成逐句複製原文(失去 synthesis 價值)。
- 規模:中(prompt 工程 + eval 驗證還原度 vs 簡潔)。
- **注意**:呢個觸及 synthesizer 行為,屬 §3 RAG core,改 prompt 策略**可能** trigger H1(視乎係咪改 pipeline 結構)— 落手前 STOP and ask 確認邊個層級。

### 5.4 丙類 / 殘餘:分層呈現(🟡 trigger H7 — 前端 render)

- **僅適用於丙類**(原文本來逐畫面截圖、無獨立句)**同確認過嘅乙類殘餘**(答案還原唔到、又唔值得逼 synthesizer 寫嘅段)。
- 做法:無錨圖唔出正文大卡,退落底部「相關截圖」按章節分組縮圖區(reverse-direction drift fix,**更貼 mockup 原始兩層設計** — mockup 本來只有 inline 大卡 + gallery 縮圖,冇「無錨大卡牆」)。
- **⚠️ 紀律**:呢個**唔可以**喺未分類前做(會錯埋甲類)。係甲 / 乙根治之後嘅**殘餘收納**,唔係第一手解法。
- H7:移除 trailing 大卡牆本身 = reverse drift fix(唔 trigger);gallery 加章節分組 = 偏離 mockup flat grid(trigger H7,要 confirm)。

### 5.5 figure 23 倒置:巢狀清單 render(🟡 trigger H7 — 前端)

- 改 `AnswerBodyMarkdown` 嘅 `li` override,令父層步驟圖唔卡喺子清單後。獨立於上面所有項。
- 屬前端 render 改動 → trigger H7,要對 mockup + STOP and ask。

---

## 6. RAG 評審準則框架(回應「應該設怎樣嘅評審準則」)

**唔好追「100% / 任何 query 都完美」** — RAG 係機率系統(retrieval + synthesis 都有 variance,實測同 config 4 分鐘內 faithfulness 0.929↔0.53);「完美」無法定義;追 100% 會對單次結果過度反應(本項目反覆踩過 stochastic over-claim)。

**應該分維度 + 分硬軟 + 用 eval set 對抗 variance**:

| 維度 | 問題 | target | 性質 |
|---|---|---|---|
| 檢索召回 recall | 相關內容 / 圖有冇撈到 | 高(R@5 ≥ 0.95;Gate 1 已 0.9722) | **硬** |
| 答案忠實度 faithfulness | 有冇 grounding / 幻覺(注意 length bias) | 高 | **硬** |
| **圖文還原度(§1 north-star)** | 原文圖文關係還原咗幾多 | 盡可能高 | **硬-中**(本項目核心) |
| 檢索精確度 precision | 有冇混入不相關 | 中高 | 軟 |
| 呈現品質 placement | 圖文配對 / 次序 / 排版 | 盡力,可後補 | 軟 |

兩個重點:**(a)** 分硬軟 — 硬指標(召回、忠實度、還原度)唔妥協,軟指標(排版次序)可接受 Tier 1 局限。**(b)**「圖文匹配完整度」要先定義邊個指標 — placement precision(每張顯示嘅圖有冇對應文字)vs placement recall(每個步驟有冇圖)vs image recall(相關圖有冇召回);三者優化方向唔同,本項目要追嘅係 **§1 還原度**。

**落地**:per-KB ground truth eval set(30–50 條代表 query,標好「應召回邊啲 section / 關鍵圖 / 圖應喺邊段」)+ 多次 run 睇 band。

---

## 7. 建議 + 決策點(交俾 Chris)

**判斷**:你個願景嘅核心(文字+圖 recall、per-doc profile、UI 可調)已落地;今次嘅真正卡點係**圖文還原度喺 ingestion 層** —— 圖只知道屬 §3.1.5 章節,唔知道屬「Click Post」嗰步,所以無論 runtime 點錨都錨唔到步驟級。呢個係 image metadata 粒度嘅天花板,要喺入庫時補「圖→步驟」關聯先突破(甲);乙就係 synthesizer 還原度 vs 簡潔嘅取捨。

**優先順序建議**:
1. ✅ 即時:cap 改返 5(已做,止血)。
2. 🟡 **甲(最根本)**:評估「圖→步驟級錨點」嘅 ingestion 方案 → 觸 H1,要 ADR。**最高槓桿**,因為佢直接解還原度天花板。
3. 🟡 **乙**:評估提升 synthesizer 還原度(Overview / 變體段)→ 確認 H 級別。
4. 🟡 **丙 / 殘餘**:分層呈現 + figure 23 倒置(H7 前端)→ 喺甲 / 乙之後做殘餘收納。

**待 Chris 決策**:
- 揀邊條腿先深入(甲 ingestion / 乙 synthesizer / 兩者並行)?
- 甲方向要開 ADR + phase plan(per §10 R1);未開 plan 唔可以 implement。
- 本分析文件可作該 ADR 嘅 Context 來源。

---

## 8. 外部研究 → 見姊妹文件(本節已縮減,避免重複)

> **外部市場 / 學術調查由姊妹文件做 single source**:[`source_fidelity_recall_external_research_20260620.md`](./source_fidelity_recall_external_research_20260620.md)(deep-research,**驗證成功 22 confirmed / 3 killed**,21 個 primary arXiv / SIGIR / NeurIPS / ACL 來源)。

**分工**(per 姊妹文件 §0):本文件 = **內部機制根因 + 修法 + 自驗**(EKP code + stored conversation);姊妹文件 = **外部 paper / benchmark / 成本權衡**。兩者唔重複。

**歷史備註**:本文件最初亦跑過一次 deep-research,但**驗證階段全撞 API rate limit**(verdict 假性「inconclusive」),內容已被姊妹文件成功版本取代;原 §8.1-§8.6 外部 paper 清單已移除(避免兩份外部研究矛盾)。只保留以下對 §5 嘅修正:

### 8.1 對 §5 嘅修正(外部證據支撐,詳見姊妹文件)

| §5 原本判斷 | 修正(姊妹文件 §2-§3 支撐) |
|---|---|
| 步驟級錨點(§5.2)= 要 H1 重建 parser | **唔使重建**。姊妹文件 §3 三條成本階梯:**① runtime 用既有 `doc_order` 線性細錨**(近零成本,先驗證)/ ② ingestion 補抽 bbox(觸 H1)/ ③ 引入新模型(不需要)。**先試 ①**(§9 自驗已坐實 ① 可行) |
| 評審準則(§6)要自己定 | 姊妹文件 §4 metric 工具箱:MRAMG Image Ordering / Position Score、MMDocRAG text-image coherence、FinRAGBench-V (page,bbox) 雙層可機器驗證 |
| inline marker 係土炮 | 姊妹文件 §2.2 證實 = 學界主流(MMDocRAG `![](imagej)`),方向正確,卡喺位置精度 |

**最強外部證據**(姊妹文件 §2.3):「高召回 ≠ 正確錨定」係 SOP domain 已知未解(MRAMG Visual Recall@10 0.99 但 image-ordering 全不及格 / FinRAGBench-V page→block citation 掉 36pp)→ 印證 EKP 症狀係真問題,且**單靠 runtime 模型放對喺手冊場景係已知失敗** → 支持投資細粒度錨定(階梯 ① 先驗證)。

---

## 9. 自驗結論(Docling + chunker code,2026-06-20)— 推翻 §5.2

跟進 §8.1 嘅 tension(Docling 有冇步驟級信號),自驗咗 ingestion code:

| # | 發現 | 證據 |
|---|---|---|
| 1 ✅ | Docling `iterate_items()` 提供統一 reading-order;parser 畀**文字段落 / heading / list_item / table / picture 分配同一個 monotonic `doc_order`** | `backend/ingestion/parsers/docx_parser.py:70-145` |
| 2 ✅ | chunker 已保留 **doc_order-interleaved event stream**(W70 ADR-0055):`chunk_text_marked` 用 `[IMG@<doc_order>]` placeholder 標記圖喺 chunk 內精確文檔位置 | `backend/ingestion/chunker/layout_aware.py:27-31, 78-82` |
| 3 ✅ | 最終 index 嘅圖 metadata 有 `doc_order`(= 步驟級位置信號) | conversation `583fa20…` embedded_images 實測有 `doc_order` |
| 4 ❌ | **section-anchor inject(W75)定位用 `source_section[:1]` 章節級,`doc_order` 淨係用嚟 sort marker run 內部,冇用嚟定位** | `backend/generation/section_anchor_markers.py` |

**修正後嘅卡點 1 結論(推翻 §5.2)**:唔係「信號缺失要 H1 重建 parser」,亦唔係「ingestion 補 metadata」(信號一直存在),而係 **section-anchor inject 演算法冇利用已有 `doc_order` 步驟級信號**。

**新修法方向(取代 §5.2)**:
- **甲類** → **純 runtime 改 inject 定位邏輯**:由「同章節最後一個 anchored marker」→「答案裡 `doc_order` ≤ aux 圖且最接近嘅 anchored marker」之後。**唔觸 ingestion、唔觸 H1**;工程量 = 改一個純函數(`section_anchor_markers.py`)+ 實證驗證。
- **乙類**(答案根本冇寫嗰段) → 仍需 synthesizer 還原度改進(`doc_order` 再準都冇文字做錨);觸 §3 RAG core,要確認 H 級別。

**Caveat**:`doc_order` 鄰近錨定只解甲類,且需要答案附近有 anchored marker 先有錨點;要 offline apply 喺真實 query 實證效果(參考 W75 教訓 3 嘅 offline-apply 驗證法)再判。

**淨結論**:卡點 1 由「H1 大改 ingestion」降為「runtime 改純函數(甲)+ synthesizer prompt(乙)」,工程量同風險大幅下降。下一步建議 = offline apply `doc_order` 鄰近錨定喺今次 query,量化甲類改善,再決定開 ADR / phase。

### 9.1 bbox 自驗(跟進姊妹文件 §3 open question,2026-06-20)

姊妹文件 §3 / §6 提出 open question:「Docling picture bbox 喺 ingestion 有冇被保留未確認」(階梯 ② 需要 bbox)。自驗 code:

| 層 | bbox 狀態 | 證據 |
|---|---|---|
| parser schema | `ParagraphItem` / `Table` / `ImageItem` **全部冇 bbox**(只有 `doc_order`) | `backend/ingestion/parsers/base.py` |
| pdf_parser | **PDF parser 同 docx 一樣用 `iterate_items()` 攞 `doc_order`,完全冇碰 Docling bbox / prov** | `backend/ingestion/parsers/pdf_parser.py`(grep `bbox\|prov\|page_no` 零 match) |
| index(ImageRef) | 欄位 = `blob_url / alt_text / checksum_sha256 / width / height / source_section / doc_order`,**冇 bbox** | `backend/api/schemas/query.py:8-26` |

**結論(細化姊妹文件階梯 ②)**:bbox 喺成條 pipeline **完全冇保留**,而且**對我哋唔對症**:(1) GL 手冊係 **docx(flow 文檔,無 page 座標)**,bbox 意義有限;(2) 我哋係**一維 reading-order 問題**(圖跟邊段步驟),`doc_order` 正中要害,bbox 係 2D 空間信號 = over-kill。→ **階梯 ① `doc_order` 唔單止「最省」,係對 docx 場景嘅「正確信號維度」;階梯 ②(bbox)可 deprioritize**(對 docx 價值低,連 PDF parser 都冇抽)。**修法收窄為:直接做階梯 ① `doc_order` 鄰近錨定,唔需要 bbox。**
