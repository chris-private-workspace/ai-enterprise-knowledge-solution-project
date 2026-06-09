# Per-Document / Per-KB 可調配置平台 — Design Spec(藍圖,未實作)

> **狀態**:`Proposed` design blueprint — 純設計,**未寫 ADR、未動 code**。
> **作者**:Claude(技術 Lead Chris 審閱中)
> **日期**:2026-06-08
> **緣起**:用戶 2026-06-01 foundational vision(memory `project_per_kb_tunable_config_vision`)+ 2026-06-08 chat RAG 圖片順序/完整性三問(GL03 「How do I process and confirm journal voucher transactions?」應出 ~35 圖,實際順序錯亂 + 不齊)。
> **性質**:本文件係**多 phase feature 嘅總藍圖**,用嚟 review 整體方向。逐個 phase 嘅 `plan.md` / ADR 待逐一 kickoff 時先寫(守 CLAUDE.md §10.4 rolling-JIT,**唔喺度預寫 phase folder**)。

---

## 0. TL;DR(一頁睇晒)

1. **平台已經建好一大半** —— vision memory(W43 之前寫)講「兩個半成品要連接」已經過時。實際上 **per-KB 配置 + 全 pipeline 試跑(N-run + A/B + faithfulness)+ 持久化 + UI + chunker 圖數 cap** 全部 production-implemented(W43–W51)。完整 config lifecycle loop 已存在,**只係 per-KB 粒度**。
2. **真正剩低嘅 gap 得 3 個**(對齊 vision 3 正交層):
   - **Gap A — per-DOCUMENT 粒度**:配置現時 resolve 到 per-KB,vision 要 per-doc。
   - **Gap B — query 意圖 gate**:未建(且 Fork B 必要性未獲證實,優先級最低)。
   - **Gap C — per-image 位置 + 相關性**:`doc_order` ingest 已有但**冇 propagate 到 `ImageRef`** → 圖片 section 內排唔到(用戶 Q3)+ 完整性受 nearest-first + caps 限(用戶 Q1)。**呢個係用戶即時痛點 + layer C 地基,而且最輕**。
3. **推薦 phasing**:**C → A →(B 視乎需要)**。Gap C 一個 phase 同時打 vision 地基 + 解即時圖片問題,且資料 ingest 已有,改動最 surgical。**【進度 2026-06-09:Gap C ✅ 完成 — C-1 = CH-011/ADR-0048,C-2 = CH-012/ADR-0049,均 merged + 用戶 live PASS。Gap A 後端層 ✅ 完成 — P2a = W57/ADR-0050(per-doc config storage + EffectiveConfig per-DOC layer + dominant-doc 解析 + config-test doc-scope + CRUD API),merged。下一步 = P2b(per-doc 配置 UI;doc-detail mockup 無 config 面 = H7,kickoff 待 mockup 決定)。】**
4. **3 條 H4 紅線**:per-doc config ≠ multi-tenancy(Tier 1 OK);query gate 必須輕量啟發式(唔可以 multi-agent);layer C 必須文字/section/`doc_order` signal(**唔可以** image embedding = Tier 2 multi-modal retrieval)。

---

## 1. 背景與問題陳述

### 1.1 用戶 vision(原話節錄)

> 「希望本系統不論功能架構和 UI 頁面操作的部分,都可以提供讓用戶自行設置和調整,令不同 KB 的文件都可以運用不同的度身訂做配置……當用戶能通過平台上去找出最理想的配置和測試了效果之後,這配置就會應用在該 KB 的那份文件中。」

用戶視此為「RAG 必經的流程」。

### 1.2 Why(根本問題)

全域單一配置(`.env` / `Settings`)同**內容格式耦合**:為 DCE 文件(prose + §8 五子情境)調嘅激進 expansion 設定,套落 AR 圖密步驟手冊就 citation 洪水 + 圖洪水;改全域 = 反噬其他 KB。

**證偽實驗(2026-06-01,AR KB `test-kb-20260531-v1`)**:
- ① **Fork A 確認**:不同文件需不同配置係**實證**(AR 文件兩條 query 都係保守 config 較佳,DCE-調嘅激進 config 令兩條變差)→ vision 核心成立。
- ② **Fork B 未獲證實**:AR 文件搵唔到「保守失敗但激進成功」嘅 query → query-adaptivity 必要性 **doc-dependent**,per-doc config 可能比預期更足夠 → **Gap B 優先級調低**。
- ③ **圖洪水 = ingestion-bound**:純 runtime config 解唔到圖密 chunk(chunk-0008 自帶 27 圖)→ chunker 改動(已落地,見 §3.5)。
- ④⑤⑥ **試跑 variance**:presentation 軸 ~20% run-to-run 噪音;faithfulness 軸 single-shot 噪音更大 + **對長/完整答案有 length bias**(更完整答案 faithfulness 反而更低)→ 質素軸唔可以做「越好分越高」排序軸(已反映落 config-test N-run band + warning gate,見 §3.4)。

### 1.3 即時觸發(2026-06-08 chat 三問)

GL03 程序問題應出 ~35 圖(§3.1.1 High Level Process → §3.1.5 Confirm),實際:
- **Q1 完整性**:出唔齊(三重 cap + nearest-first 揀圖餓死頭尾 section)。
- **Q2 方向**:用戶問依家係後台改定配置調、per-doc 範圍 ready 未。
- **Q3 順序**:`ImageRef` 無 per-image doc-position → section 內排唔到。

三問**全部落入 Gap C**,呢份 spec 把佢哋擺入平台脈絡。

---

## 2. 現況 As-Built(已經有嘅,唔好重造)

> **重要**:以下全部 **production-implemented**(W43–W51)。Vision memory 寫於 W43 之前,對呢層描述已過時。

### 2.1 Per-KB 配置層(query-time)

| 組件 | 檔案 | 作用 |
|---|---|---|
| `EffectiveConfig` + `resolve_effective_config` | `backend/generation/effective_config.py` | request entry resolve:**per-query > per-KB(`KbConfig`)> global(`Settings`)**;production-preserve(全 `None` = bit-identical 舊行為) |
| `KbConfig`(12 W43 runtime 旋鈕 + CH-006/007/010)| `backend/api/schemas/kb.py` | parent_doc / citation_expansion / neighbour-image / max_images / overview_pin / answer_detail / top_k / rerank_k |
| `PerQueryOverrides` | `effective_config.py` | per-query seam(MVP 只 wire `top_k_*`) |
| 持久化 | `backend/kb_management/postgres_backend.py` | Postgres `knowledge_bases.config` **JSONB**;`update_config()` / `_row_to_kb()`(ADR-0023) |

### 2.2 試跑 harness(config-test)— **已行全 pipeline**

| 組件 | 檔案 / endpoint | 作用 |
|---|---|---|
| Config-test 後台 | `POST /kb/{kb_id}/config-test`,`backend/api/routes/config_test.py` | 用 draft config 行**全 `/query` pipeline N 次**(1–5),aggregate presentation 計數 + faithfulness band + 可選 A/B vs saved |
| Schema | `backend/api/schemas/config_test.py` | `DraftRetrievalConfig`(13 旋鈕)/ `RunMetrics`(citation/distinct_sections/figure_raw/figure_dedup/latency/answer_chars)/ `MetricBand`(min/max/mean/**band**)/ `ConfigTestResult` |
| 質素軸 | `eval_faithfulness`(default on)| reference-free RAGAs faithfulness,**per-run band**(W48–W51,決策 7) |
| 完整性 proxy | `distinct_sections`(W51)| unique cited section 數(breadth proxy,非 ground-truth recall)|

### 2.3 V4 retrieval-only(diagnostic)

`POST /kb/{kb_id}/retrieval-test`(`backend/api/routes/retrieval_test.py`,ADR-0021)— 純 retrieve(embed → search → rerank → threshold),**唔行** synthesis / citation / image / faithfulness。診斷用,**唔好同 config-test 混淆**(後者先係全 pipeline 試跑面)。

### 2.4 配置 UI + lifecycle loop — **已端到端**

`frontend/app/(app)/kb/[id]/page.tsx`:
- **SettingsTab**:retrieval config + advanced tuning(`KbTuneGroup` × 3:parent-doc / citation expansion / neighbour images;每組 enable toggle + numeric `KbTuneKnob`,有「已覆寫 / 繼承全域」badge + reset)。
- **ConfigTestPanel**:test query + runs(1–5)+ compare_to_saved + faithfulness;result card 顯示 faithfulness / citation / distinct_sections / figure dedup / latency / stability band + per-citation breakdown + **length-bias 警告(W50)+ single-shot 警告(N=1)**。
- **Save**:「把草稿配置儲存到此 KB」→ `PATCH /kb/{id}/settings`。

→ **用戶 vision 嘅「設定 → 試跑預覽 → 驗證 → 持久化」loop 已存在,粒度係 per-KB。**

### 2.5 Ingestion(圖片相關)

| 組件 | 檔案 | 現況 |
|---|---|---|
| Chunker 圖數 soft-cap | `backend/ingestion/chunker/layout_aware.py`(`_MAX_IMAGES_PER_CHUNK=8`)| **已實作**(ADR-0041/0042);per-KB `chunker_max_images_per_chunk`;force-split 守 layout-aware;ingest-time 讀(非 EffectiveConfig);改動需 re-index |
| Screenshot 抽取 + dims | `backend/ingestion/screenshots/extractor.py` | `EmbeddedImage.doc_order` + `ScreenshotRecord.{doc_order, width, height(PNG IHDR probe, ADR-0046)}` |
| ImageRef 組裝 | `backend/ingestion/orchestrator.py` L188-220 | 用 `"img@<doc_order>"` key 解析每圖;**stamp `blob_url/alt_text/checksum/width/height/source_section`,但唔 stamp `doc_order`(用完即棄)** ← **Gap C 關鍵** |
| ImageRef ↔ json | `parse_embedded_images`(`backend/generation/citation_enrichment.py` L26-62)| 讀 `embedded_images_json` → `ImageRef`;**唔讀 `doc_order`**(schema 亦無此 field)|

### 2.6 圖片顯示(frontend)

`frontend/lib/chat/citation-images.ts`:
- `dedupeCitationImages`:flatten + checksum dedup + decorative filter(CH-009 OD-1/OD-4)+ **按 `source_section` lexical stable sort**(BUG-034 Finding D)。
- **限制**(用戶 Q3 根因):同一 section 內所有圖 `source_section` 相同 → stable sort 跌返後台 nearest-first 次序 → **唔係文件頁次**。註解自己寫明假設「single-digit sub-sections」,呢假設喺「一個 section 一條長程序多圖」時崩。

---

## 3. 目標架構 — 3 正交層 + lifecycle(對齊 vision)

```
                       ┌─────────────────────────────────────────────┐
   query ──▶  [Layer B] │ 意圖 gate(列舉型 vs 具體型,輕量啟發式)    │ ── 影響 expansion/completeness 傾向
                       └─────────────────────────────────────────────┘
                                       │
   cited doc_id ──▶ [Layer A] per-document profile ──┐
                                                     ├─▶ EffectiveConfig(per-query > per-DOC > per-KB > global)
   KB config ─────────────────────────────────────┘
                                       │
                       ┌─────────────────────────────────────────────┐
   citations ──▶ [Layer C]│ per-image 位置 + 相關性揀圖(doc_order + section/step 文字 signal)│
                       └─────────────────────────────────────────────┘
                                       │
   ┌──────────── lifecycle loop(已建,per-KB → 擴 per-doc)────────────┐
   │ 設定旋鈕 → config-test 全 pipeline 試跑(N-run band + A/B + faithfulness)→ 驗證 → 持久化 │
   └────────────────────────────────────────────────────────────────┘
```

### 3.1 Layer A — Per-Document Profile

**目標**:配置粒度由 per-KB 落到 per-document;執行期按**被引 chunk 嘅 `doc_id`** resolve 該文件 profile。

**設計**:
- **Resolution chain 擴一層**:`per-query > per-DOC > per-KB > global`。`_resolve()` 加一個 doc-layer 參數。
- **Storage**:per-doc profile 存喺邊?兩個選項 —
  - (a) 新 Postgres 表 `document_configs(kb_id, doc_id, config JSONB)`,query 時按 cited doc_id load。
  - (b) 沿用 `documents` metadata JSONB 加 `config` key。
  - **傾向 (a)**(乾淨,唔污染 doc metadata;ADR 決定)。
- **複雜度**:一個 answer 可能引**多個 doc**(跨文件 query)→ per-doc profile resolve 要決定「邊個 doc 嘅 profile 話事」。**傾向**:per-image / per-citation 各自用其 owning doc 嘅 profile(layer C 揀圖時 naturally per-image);synthesis-level 旋鈕(answer_detail)用 dominant doc。**呢個係 ADR 要拍板嘅核心 decision**。
- **UI**:Document Detail(ADR-0029)加一個 config override 面 +(可選)per-doc config-test。
- **試跑**:config-test 加 `doc_id` scope 參數,試跑針對單一文件。

**H4**:per-doc config 喺單一 KB / tenant 內,**唔係 multi-tenancy**(multi-tenancy = 隔離不同租戶);屬 Tier 1-friendly extensibility。

### 3.2 Layer B — Query 意圖 Gate(優先級最低)

**目標**:輕量啟發式分「列舉型(list every step…)vs 具體型」,誤判向「保留 completeness」傾。

**設計**:regex / keyword heuristic(「list」「all」「every」「步驟」「全部」…)→ 影響 expansion 傾向(列舉型放寬 completeness)。**現有 `enable_intent_routing` flag(`QueryRequest`)係 seam,但未實作意圖→config 映射。**

**H4 紅線**:必須**輕量啟發式**,**唔可以**做 LLM-router / multi-agent orchestration(Tier 2 L4)。

**狀態**:Fork B 必要性未獲證實(§1.2 ②)→ **建議擺最後,甚至視 A/C 完成後實測再決定要唔要做**(Karpathy §1.2 唔做投機 feature)。

### 3.3 Layer C — Per-Image 位置 + 相關性揀圖(即時痛點 + 地基)

**目標**:(i) 圖片照**真文件位置**排序(解 Q3);(ii) 揀圖由 nearest-first 改 **document-spanning** + 相關性(解 Q1)。

**設計(分兩半)**:

**C-1 位置 primitive(解 Q3,需 re-index)**:
1. `ImageRef` 加 `doc_order: int`(default 0,production-preserve;legacy 0 不參與排序)。
2. `orchestrator.py` L205-219 起 `ImageRef` 時,由 `pos`(`"img@<N>"`)parse 出 `N` → stamp `ImageRef.doc_order=N`(**資料已喺手**,純 propagate)。
3. Indexing(C03)serialize `ImageRef.doc_order` 落 `embedded_images_json`(Pydantic `model_dump` 自動帶)。
4. `parse_embedded_images` 讀返 `doc_order`。
5. Frontend `dedupeCitationImages` 排序 key 改為 **`(source_section, doc_order)`**(先 section 後文件位置)— section 內亂序即解。
6. **Re-index** drive-images KB(寫 `doc_order` 落 index;同 CH-009 dims re-index 同 pattern)。

> **附帶好處**:`doc_order` 係全文件單調遞增 → §3.1.1 overview(細 doc_order)天然排 §3.1.3 步驟(大 doc_order)之前,可**簡化甚至取代 CH-010 pin 嘅「move-to-front」hack**(pin 仍需負責**attach** overview,因佢未被 retrieve;但「排頭」由 doc_order 自然達成)。

**C-2 相關性揀圖(解 Q1)**:
- 揀圖由 `_find_section_neighbour_images` 嘅 nearest-first 改 **document-order span**(沿成條程序由頭到尾,而非聚埋 lead)。
- 完整性 vs 圖洪水張力:用 **per-doc `max_images_per_answer`**(layer A)+ chunker cap(已建)平衡。程序手冊文件 profile 可放寬上限;其他文件保守。
- **相關性 signal 限文字/section/step 關聯**(`source_section` + `doc_order` + 標題關鍵字),**絕不** image embedding。

**H4 紅線**:layer C 所有揀圖/排序 signal 必須係**文字 / section / `doc_order`**;**image embedding / 視覺相似檢索 = Tier 2 multi-modal retrieval,H4 禁**。

### 3.4 Lifecycle loop(已建,擴 per-doc)

現有 config-test loop(§2.2/§2.4)擴展:
- `ConfigTestRequest` 加 `doc_id` scope(試跑針對單一文件 profile)。
- `DraftRetrievalConfig` 加 layer C 新旨鈕(揀圖模式 / per-doc image cap)。
- **試跑信任 gate(沿用)**:N-run band + faithfulness length-bias 警告 + single-shot 警告 —— 防「試一次就鎖」。
- 質素軸**唔可以**做唯一排序依據(§1.2 ⑥);要配 `distinct_sections` completeness proxy 對沖。

---

## 4. 資料模型 / Schema 變更總覽

| 變更 | 檔案 | re-index? | Gap |
|---|---|---|---|
| `ImageRef.doc_order: int` | `backend/api/schemas/query.py` | — | C-1 |
| orchestrator stamp `doc_order` | `backend/ingestion/orchestrator.py` | **是** | C-1 |
| `embedded_images_json` 帶 `doc_order`(indexing C03 serialize)| C03 indexing | **是** | C-1 |
| `parse_embedded_images` 讀 `doc_order` | `backend/generation/citation_enrichment.py` | — | C-1 |
| frontend 排序 `(source_section, doc_order)` | `frontend/lib/chat/citation-images.ts` | — | C-1 |
| 揀圖 document-span 模式 | `backend/generation/citation_image_neighbors.py` | — | C-2 |
| per-doc profile storage(新表 `document_configs`)| `backend/kb_management/` + migration | — | A |
| EffectiveConfig 加 per-DOC layer | `backend/generation/effective_config.py` | — | A |
| config-test `doc_id` scope | `backend/api/schemas/config_test.py` + route | — | A |
| Document Detail config UI | `frontend/app/(app)/kb/[id]/...` | — | A |
| query 意圖 heuristic | 新 module(C04/C05)| — | B |

---

## 5. Component Mapping(C01–C13)

- **C01 Ingestion** — orchestrator `doc_order` stamp(C-1);chunker cap(已建)。
- **C02 KB Manager** — per-doc profile storage + resolve(A)。
- **C03 Indexing** — `embedded_images_json` 帶 `doc_order`(C-1);re-index。
- **C04 Retrieval** — 揀圖 document-span(C-2);意圖 gate(B)。
- **C05 Generation** — EffectiveConfig per-doc layer(A);citation image 排序/揀圖(C);config-test harness(已建)。
- **C06 Eval** — config-test faithfulness + completeness proxy(已建,擴)。
- **C09 Admin UI / C10 Chat UI** — Document config 面 + 試跑(A);圖片排序顯示(C-1,守 H7 mockup fidelity)。

---

## 6. Tier Boundary 評估(H4)

| 項目 | 判定 | 理由 |
|---|---|---|
| per-document config profile | ✅ Tier 1 | 單一 KB/tenant 內配置,**非** multi-tenancy(租戶隔離)|
| on-platform 試跑 loop | ✅ Tier 1(已建)| config preview/validate/persist UI,**非** workflow/plugin builder |
| query 意圖 gate(B)| ⚠️ Tier 1 **僅當**保持輕量啟發式 | LLM-router / multi-agent = Tier 2 L4,**禁** |
| layer C 揀圖(C)| ⚠️ Tier 1 **僅當**文字/section/doc_order signal | image embedding / 視覺檢索 = Tier 2 multi-modal,**禁** |
| chunker 圖數 cap | ✅ Tier 1(已建)| 守 §13.3 layout-aware,非 character-based |

---

## 7. Phasing Roadmap(提案;逐 phase kickoff 先寫 plan)

> 守 rolling-JIT:以下係**順序提案**,**唔代表**而家 pre-create folder。每個 phase 落實前先寫 `plan.md` + 觸發 ADR。

| Phase | 範圍 | 交付 | re-index | ADR |
|---|---|---|---|---|
| **P1 — Gap C ✅ DONE(2026-06-09)** | C-1 位置 primitive(`doc_order` propagate + 排序）= **CH-011 / ADR-0048**(merged）+ C-2 完整性 section-fair 分配 = **CH-012 / ADR-0049**(merged;實測尾段 §3.1.4/3.1.5 由 0 圖 → 5/6 圖,用戶 live PASS） | ✅ 解 Q1（完整性）/ Q3（順序）;layer C 地基齊 | C-1 是 / C-2 否 | ADR-0048(doc_order + document-span）+ ADR-0049(section-fair 分配）|
| **P2a — Gap A 後端 ✅ DONE(2026-06-09)** | per-doc profile storage(新表 `document_configs` + `DocConfigStore`)+ EffectiveConfig per-DOC layer + **dominant-doc 解析**(主導 doc + post-retrieval 旋鈕;檢索入口旋鈕維持 per-KB)+ config-test doc-scope + CRUD API = **W57 / ADR-0050**(merged;62 test PASS) | per-document 度身訂做配置(後端)| — | ADR-0050(per-doc config scope + dominant-doc resolve）|
| **P2b — Gap A UI** | Document 配置面 + per-doc config-test(消費 W57 CRUD API)| per-doc 配置 UI 操作 | — | **⏳ H7 缺口** — doc-detail mockup 無 config 面;kickoff 待 mockup 決定(擴 mockup / 沿用 KB SettingsTab pattern)|
| **P3 — Gap B(視乎需要)** | query 意圖 heuristic gate | 列舉型 query completeness 傾向 | — | ADR(僅當實測證實必要;否則 drop)|

**點解 C 先**:① 解用戶即時痛點(三問全落 C);② 資料 ingest 已有(`doc_order`),改動最 surgical;③ 係 layer C 地基,A/B 都依賴乾淨嘅 per-image signal;④ 一個 re-index 同時搞掂 dims(已 re-index 過)+ doc_order。

### 7.1 即時可行嘅最小 P1(若用戶想先止血)

只做 **C-1 排序**(`doc_order` propagate + frontend `(source_section, doc_order)` sort + re-index)就解 Q3,且令 CH-010 pin 簡化。C-2 完整性(揀圖模式 + per-doc cap)可入 P1 後段或併 P2。

---

## 8. ADR 觸發點(H1 — 須 approve 後寫)

1. **`ImageRef` schema 加 `doc_order`** + 揀圖模式(P1)— 改 §3.6/§4.5 schema + §3.7 揀圖,H1。
2. **per-document config scope + 多-doc resolve 策略**(P2)— 擴 §3 config 模型,H1(ADR-0040 後續)。
3. **query 意圖 gate**(P3,若做)— 加 §3 retrieval 前置,H1。

---

## 9. Open Questions / Risks

- **OQ-1**:多-doc query,per-doc profile 邊個話事?(傾 per-image owning-doc + synthesis dominant-doc;ADR 拍板)
- **OQ-2**:per-doc profile UI 擺 Document Detail 定獨立面?Design-mockup 有冇對應(H7 — 無就要 surface,唔可以自行 approximate)?
- **OQ-3**:完整性放寬 vs 圖洪水嘅 per-doc 上限預設值(實測 + 試跑 loop 定)。
- **Risk R1 🟡**:試跑 variance(presentation ~20% / faithfulness single-shot 大 + length bias)→ 配置決策**唔可以單次定論**,須 N-run band(已建 gate)。
- **Risk R2 🟡**:re-index 成本(drive-images KB)+ Free-tier semantic 402(用 `HYBRID_USE_SEMANTIC_RANKER=false` 繞)。
- **Risk R3 🟢**:production-preserve — 所有新 field `None`/0 default = bit-identical 舊行為(沿 ADR-0028/0040 migration-default precedent)。

---

## 10. 參考

- Vision:memory `project_per_kb_tunable_config_vision`
- 圖片 follow-ups:memory `project_chat_demo_rag_quality_followups`
- 試跑兩面區分:memory `project_v4_retrieve_only_vs_query_pipeline`
- 既有 ADR:ADR-0021(retrieval test)/ ADR-0023(Postgres persist)/ ADR-0028(multimodal migration-default)/ ADR-0034(neighbour images)/ ADR-0040(config-scope)/ ADR-0041/0042(chunker cap)/ ADR-0046(image dims)/ ADR-0047(overview pin)
- 即時痛點:CH-010(`docs/03-implementation/changes/CH-010-chapter-overview-image-lead/`)
- spec:`docs/architecture.md` §3.3/§3.5(chunker)、§3.6/§3.7(config/expansion)、§4.5(schema)、§11(Tier 2 matrix)、§13.3(layout-aware)
