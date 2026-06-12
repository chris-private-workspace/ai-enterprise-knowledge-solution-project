# 02 — KB 建立與文件管理

## 1. 建立 KB(五步 wizard,`/kb/new`)

| 步 | 名稱 | 填咩 | 注意 |
|---|---|---|---|
| 1 | Identity | 名稱 + `kb_id` | `kb_id` 建立後**鎖死**(索引名 `ekp-kb-{kb_id}-v1` 由佢生成)|
| 2 | Format & chunking | embedding(鎖定 text-embedding-3-large)+ chunk strategy | strategy 預設 `auto`;改動屬 ingest-time |
| 3 | Multimodal | 抽圖開關 | ⚠️ **本步有兩個關鍵出廠值,見 §2** |
| 4 | Retrieval defaults | Top-K(預設 50)+ Rerank-K(預設 5)| 圖密手冊建議 rerank 10(可後補)|
| 5 | Review & create | 覆核 → 建立 | 建立即 provision 索引 |

### Chunk strategy 四個選項

| 選項 | 適合 | 行為 |
|---|---|---|
| `auto`(預設)| 混合文件 KB | 按文件格式自動揀切法 — **唔肯定就用呢個** |
| `heading_aware` | 章節結構清晰嘅 Word / PDF | 跟標題層級切 |
| `layout_aware` | 排版複雜(表格 / 多欄)| 跟版面結構切 |
| `slide_based` | PPT 簡報 | 一頁 slide 一個單位 |

## 2. ⚠️ 兩個必看嘅出廠值(同圖片有關,好多「冇圖」問題嘅根源)

| 旋鈕 | 出廠值 | 後果 | 邊度改 |
|---|---|---|---|
| `extract_embedded_images` | **False(唔抽)** | 文件入面嘅截圖**根本唔會入索引** | 建 KB Step 3 / Settings(改完要 re-index)|
| `return_images_in_chat` | **False(唔顯示)** | 圖有索引但 **chat 唔出圖** | KB Settings(runtime,即時生效)|

**有圖嘅文件,呢兩個都要開。** 仲有一個配套值:每 chunk 圖上限(`chunker_max_images_per_chunk`)
全域預設 8 — 圖密文件防止單一 chunk 揹幾十張圖(mega-chunk),一般唔使郁;想再細可以 per-KB 設。

## 3. 上傳文件

- KB 詳情頁右上「Upload documents」;支援 **docx / pdf / pptx**。
- Ingest 自動行:解析(Docling / python-pptx)→ 切分 → 抽圖(如有開)→ embed → 入索引。
- Pipeline tab 睇進度;Documents tab 睇每份文件狀態(READY / FAILED)。

## 4. Ingest 完嘅驗收清單(建議每次新 KB 都做)

1. **Documents tab**:10 份全部 READY?有 FAILED 就撳入睇錯誤。
2. **Chunks tab**:抽幾份文件睇切分 — 章節邊界啱唔啱?有冇一個 chunk 揹超多圖?
3. **Images tab**:圖數同預期接近?(注:會有 1–2 張差異 — 文件位置喺 chunk 範圍外嘅圖屬正常)
4. **Chunking Lab**:對切分唔滿意可以預覽其他 strategy 嘅效果再決定改唔改。
5. 去 **chat 試一條真問題**(揀呢個 KB)— 文字有引用?圖有出?

## 5. Re-index(幾時要 / 點做)

**要 re-index 嘅情況**:
- 改咗 chunk strategy 或每 chunk 圖上限(ingest-time 旋鈕)
- 開咗 `extract_embedded_images`(之前 ingest 嗰陣冇抽圖)
- 舊 KB 升級(喺平台修咗 ingest 層 bug 之後,舊索引要重建先受惠)

**點做**:KB Settings tab 最底「Re-indexing」card →「Trigger re-index now」。
重新解析全部文件,索引版本 +1。文件多時需時幾分鐘,Pipeline tab 睇進度。

**唔使 re-index 嘅情況**:所有標住「Runtime · no re-index」嘅旋鈕(12 個 advanced tuning 旋鈕、
top_k / rerank_k、answer_detail、`return_images_in_chat`)— 儲存即生效。

## 6. 文件層操作

Documents tab 撳入一份文件 → 文件詳情:
- 內容 / chunk 預覽、該文件嘅圖
- **Per-doc 配置 tab** — 對呢一份文件覆寫合成 + 引用 + 圖片行為(詳見 03 §4)
- 單份文件 re-ingest(更新文件版本時)

## 7. KB 生命周期

- **Archive**(Settings → Danger zone):轉唯讀,chat 唔再揀到。
- **Delete**:刪 KB + 索引(audit-logged;謹慎)。
