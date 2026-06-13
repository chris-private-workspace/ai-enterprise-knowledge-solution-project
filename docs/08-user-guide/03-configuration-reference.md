# 03 — 配置完全參考

> 每個旋鈕:喺邊度、出廠值幾多、做咩、幾時調。出廠值核對自 2026-06-12 codebase
> (`backend/storage/settings.py` + `backend/api/schemas/kb.py` + `doc_config.py`)。

## 1. 四層解析鏈(再講一次,因為成份手冊都建基於佢)

```
per-query(試跑草稿,唔落地)
  > per-doc(文件詳情 → Per-doc 配置 tab)
    > per-KB(KB 詳情 → Settings tab)
      > global(系統出廠值 — UI 顯示「繼承全域」)
```

旋鈕留空 = 繼承上層;填值 = 覆寫(badge「已覆寫」+ ↺ 還原)。下表「全域出廠值」即係
你乜都唔設時嘅實際行為。

## 2. KB Settings tab(per-KB 配置中心)

### 2.1 General card

| 項 | 可改? | 說明 |
|---|---|---|
| Name / Description | ✅ 隨時 | 顯示用 |
| `kb_id` | ❌ 鎖定 | 索引名 `ekp-kb-{kb_id}-v1` 由佢生成 |

### 2.2 Retrieval config card

| 項 | 出廠值 | Runtime? | 說明 |
|---|---|---|---|
| Embedding model | text-embedding-3-large(1024d)| ❌ 鎖定 | 改 = 全量重 embed,Tier 1 唔開放 |
| Chunk strategy | `auto` | ❌ 需 re-index | 四選項見 02 §1 |
| Max images / chunk | 留空 = 全域 8 | ❌ 需 re-index | 防 mega-chunk;圖密文件嘅關鍵 ingest 旋鈕 |
| Default top_k | 50 | ✅ | 檢索取幾多候選 chunk |
| Default rerank_k | 5 | ✅ | rerank 後留幾多入答案生成。**圖密 / 跨章節 query 建議 10**(錨點冗餘,W63 實證)|
| 答案詳細度 answer_detail | 繼承全域(concise)| ✅ | `concise` 摘要式 / `detailed` 逐步鋪開(程序型手冊適用,答案長、成本高)|

另有 W20 三個 multimodal 開關(per-KB):`extract_embedded_images`(出廠 **False**,ingest-time)/
`slide_screenshots`(出廠 True)/ `return_images_in_chat`(出廠 **False**,runtime)— 見 02 §2 陷阱說明。

### 2.3 Advanced retrieval tuning card(13 個 runtime 旋鈕,四組)

全部 runtime、即時生效。每組一個總開關 +「進階」摺疊區內嘅細旋鈕(組 4 只有開關,無進階區)。

**組 1 — Parent-document retrieval**(把命中嘅子 chunk 擴展到所屬父段落,文字完整性機制之一)

| 旋鈕 | 全域出廠值 | 說明 |
|---|---|---|
| 開關 `enable_parent_doc_retrieval` | **True**(ADR-0052 起)| 列舉型 query 完整性嘅主力;代價 ~+0.4s p95 |
| Section depth offset | 1 | 父段 = 章節路徑去掉最後 1 層 |
| Parent top_k | 2 | 最多聚合幾多個父段 |
| Max tokens / parent | 2000 | 每個父段上限 token |

**組 2 — Citation post-hoc expansion**(答案生成後為每個引用補鄰近輔助 chunk,文字完整性機制之二)

| 旋鈕 | 全域出廠值 | 說明 |
|---|---|---|
| 開關 `enable_citation_post_hoc_expansion` | True | |
| Max aux / citation | **10**(ADR-0052 起)| 每個引用最多補幾多個鄰居 chunk |
| Expansion window | 10 | 搵鄰居嘅 chunk 距離範圍 |
| Section path prefix depth | **1**(ADR-0052 起)| 鄰居必須同引用同一個頂層章節 — **冇呢個 bound,放大 max_aux 反而會跨章節漂移**(實證)|

**組 3 — Citation neighbour images + 圖片上限**(圖片完整性機制 — 同文字機制完全獨立!)

| 旋鈕 | 全域出廠值 | 說明 |
|---|---|---|
| 開關 `enable_citation_neighbour_images` | True | 引用鄰近 chunk 嘅圖一齊帶入 |
| Neighbour max aux images | **2**(保守)| 每個引用最多收割幾多張鄰居圖。**圖密手冊要 40**(W62 實證:呢個係圖片供給嘅 binding 項)|
| Neighbour prefix depth | 0(= 用距離窗 ±3)| 設 1 = 改成「同章節先收割」(章節制勝過距離制)|
| Max images / answer | 留空 = 後端無上限 | 全答案 unique 圖預算(ADR-0054:重複引用唔食預算)。圖密手冊 80 |

> 組 3 仲有一個唔喺呢個 card 嘅關聯旋鈕:章節概覽圖置頂(overview pin,全域出廠 False)—
> 喺 per-doc tab 有得設(§4),令章節開頭嘅 High-Level 概覽圖排最前。

**組 4 — Inline image markers(圖文位置標記,W70 基建 / W71 交織 / ADR-0055)**

| 旋鈕 | 全域出廠值 | 說明 |
|---|---|---|
| 開關 `enable_inline_image_markers` | **False** | ON = 答案生成時 LLM 見到帶 `[IMG#…]` 位置標記嘅原文,**chat 會把對應截圖卡擺喺答案對應步驟原位(文字+圖片交織顯示)**,而唔係全部圖卡堆喺答案末尾;末尾只剩冇被原位錨定嘅截圖,「Referenced screenshots」gallery 仍然全量總覽。標記文字本身永不顯示(串流期間半截都唔出)。W70 驗證(drive-images-1 九 query):標記有效率 100%、次序零調換、image-recall 1.00 零回退;W71 交織 9/9 answer 標記全消費、figure 連續 |

> 兩個已知特性(非故障):(1)同一截圖喺答案重複提及只**錨定一次**(其餘標記自動隱藏);
> (2)截圖喺答案無對應位置(LLM 冇放標記)→ 跌返末尾 + gallery,行為同 knob OFF 一樣。
> 驗證 KB drive-images-1 已開呢個 knob(W70 F8 起保留)。**Copy 答案**已 strip 乾淨(`[IMG#…]`
> 同引用標記都唔會入剪貼簿,W71 F3 / DD-8 修正)。

### 2.4 配方 preset 一鍵套用(card 內第一行)

「**配方 preset:圖密步驟手冊**」(W62–W68 實證,image-recall 0.574 → ~1.00):

```
Rerank top-k = 10  +  Neighbour max aux images = 40  +  Max images / answer = 80
```

撳「套用配方」只係**填草稿**(三欄即時可見「已覆寫」)— 之後照常試跑 → 滿意 →
「儲存到此 KB」先落地。三欄已等於配方時按鈕自動轉「✓ 已套用」。

### 2.5 儲存語義

「儲存到此 KB」會把**成份配置**寫入(完整替換)— UI 已自動帶齊所有未動嘅欄位,你只需
明白:儲存後成份配置以頁面當前狀態為準,persist 落 Postgres,過 restart 唔會丟。

## 3. Per-doc 配置 tab(文件詳情頁)

**只有 10 個旋鈕** — 全屬「答案生成 + 引用後處理 + 圖片」層(檢索層去唔到 per-doc,
因為要檢索完先知邊份文件主導):

| 旋鈕 | 對應 KB 層 |
|---|---|
| 答案詳細度 answer_detail | 同 §2.2 |
| Citation post-hoc expansion 開關 + Max aux + Window + Prefix depth | 同 §2.3 組 2 |
| Citation neighbour images 開關 + Max aux images + Prefix depth | 同 §2.3 組 3 |
| Max images / answer | 同 §2.3 組 3 |
| 章節概覽圖置頂(overview pin)| 概覽圖排最前(步驟手冊適用)|

**生效規則(dominant-doc)**:一條 query 嘅答案引用咗邊份文件**最多**,就套嗰份文件嘅
覆寫。即 per-doc 配置係「呢份文件做主角嗰陣先生效」— 對混合引用嘅跨文件 query,
以引用最多嗰份為準。

Per-doc tab 都有自己嘅試跑 panel(「此文件配置(DRAFT)vs 繼承 KB(SAVED)」A/B)。

## 4. 全旋鈕速查表

| 旋鈕 | 全域出廠 | KB | doc | Runtime |
|---|---|---|---|---|
| chunk_strategy | auto | ✅ | — | ❌ re-index |
| chunker_max_images_per_chunk | 8 | ✅ | — | ❌ re-index |
| extract_embedded_images | False | ✅ | — | ❌ re-index |
| slide_screenshots | True | ✅ | — | ❌ re-index |
| return_images_in_chat | False | ✅ | — | ✅ |
| default_top_k | 50 | ✅ | — | ✅ |
| default_rerank_k | 5 | ✅ | — | ✅ |
| answer_detail | concise | ✅ | ✅ | ✅ |
| enable_parent_doc_retrieval | True | ✅ | — | ✅ |
| parent_doc_section_depth_offset | 1 | ✅ | — | ✅ |
| parent_doc_top_k | 2 | ✅ | — | ✅ |
| parent_doc_max_tokens_per_parent | 2000 | ✅ | — | ✅ |
| enable_citation_post_hoc_expansion | True | ✅ | ✅ | ✅ |
| citation_expansion_max_aux | 10 | ✅ | ✅ | ✅ |
| citation_expansion_window | 10 | ✅ | ✅ | ✅ |
| citation_expansion_section_path_prefix_depth | 1 | ✅ | ✅ | ✅ |
| enable_citation_neighbour_images | True | ✅ | ✅ | ✅ |
| citation_neighbour_max_aux_images | 2 | ✅ | ✅ | ✅ |
| citation_neighbour_section_path_prefix_depth | 0 | ✅ | ✅ | ✅ |
| max_images_per_answer | 無上限 | ✅ | ✅ | ✅ |
| enable_chapter_overview_pin | False | —(global/doc)| ✅ | ✅ |
| enable_inline_image_markers | False | ✅ | ✅* | ✅ |

> *per-doc 層 backend 四層解析已支援(API),per-doc tab UI 未開放呢個旋鈕(W71 一併考慮)。

> 另:系統層仲有答案生成 timeout(120 秒,ADR-0053)同 hybrid 檢索 top 50 — 唔喺 UI 開放,
> 屬平台運維層,一般唔使理。
