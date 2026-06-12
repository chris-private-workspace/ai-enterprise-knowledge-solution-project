# W70 — progress(inline-image-markers)

## Day 1 — 2026-06-12

### 緣起 + 拍板
- 用戶提出 chat 顯示要「無限接近原文文字+圖片順序」(而家全文後先一批圖卡)。
- 評估兩級方案(A 段落級引用錨定 / B 逐步級標記交織)+ B 嘅兩個變體(B1 單欄位 /
  B2 雙欄位)後,用戶拍板:**B2 + per-KB 開關 + marker-placement 驗證集先行**。
- 風險評估關鍵結論:B1 會令標記污染檢索六消費者(BM25 / vector / semantic / rerank /
  CRAG / RAGAs),R@5 基線有不可預證嘅回退風險 → reject;B2 令唯一不可消除風險收窄
  到「LLM 錯位標記」,用驗證集量化先決定 W71 去向。

### R6 grounding(kickoff 當日,記入 plan 頭注)
- chunker `_SectionAccumulator` 冇 interleaved flow(paragraphs / image_positions 兩條
  獨立 list)— marked text 要加 ordered flow,三個 flush 點 + `_merge_adjacent_shorts`
  都要跟。
- `to_search_doc()` model_dump 全欄位 → **現存 index 唔加欄位會拒收 upload**;
  `create_index_for_kb` 係 PUT 全量 schema → 遷移 = 重發 PUT(additive 合法)。
- prompt 文字三條路徑(parent_section_text / expanded_text / chunk_text)都要 marked
  變體 — production default parent_doc ON(ADR-0052),漏咗 parent 路徑標記就唔會出現。
- 標記語法定為 `[IMG#sha8]`(orchestrator 用 `position_to_sha` 改寫 chunker 嘅
  `[IMG@doc_order]` 佔位)— 跨 doc 全域唯一,直接對應前端 dedup key。

### F1 — ADR-0055 ✅(雙 session 合併稿,見 commit)
- 兩個平行 session 同題草稿合併:機制骨幹維持 B2 + `[IMG#sha8]` + 驗證先行兩段式;
  anchors 稿三項併入 — (1) W71 交織 render 定性 = **mockup reverse-drift**
  (`ekp-page-chat.jsx:443-500` `AnswerBody` 本來就 inline 插圖);(2) 標記解析必須對
  ADR-0054 dedup/cap 後 surviving 圖集做 membership 驗證,爛標記 strip;(3) 顯示語意
  預鎖(用戶確認):anchored 圖唔重複喺末尾 strip,gallery 全量。anchors 稿檔案已刪併入。
- 合併稿三項 load-bearing 主張二次核實全部成立(`to_search_doc` 全欄位上傳 /
  `create_index_for_kb` PUT additive / `position_to_sha` 現成)。
- 標記機制裁決:採 **sha8-at-ingest**(棄 anchors 稿嘅 doc_order + post-synthesis
  doc-scope 推斷)— ingest 寫死身份零推斷歧義,理據記 ADR Alternatives。
- **Chris 拍板(2026-06-12):「Accept 但先只 commit 文件」— ADR + README + W70 plan
  套件 commit;F2+ code 下個 session 開工。**

## Day 1(同日續,session 2)— 2026-06-12

### F2 — chunker marked-text 流 ✅
- `_SectionAccumulator` 加 `flow: list[tuple[str, str]]` — `("para", text)` /
  `("img", "[IMG@<doc_order>]")` 按 doc_order 入列,同 `paragraphs` /
  `image_positions` 平行鏡像;**乾淨 `chunk_text` 組裝路徑一行未郁**(diff 證:
  layout_aware.py 被改嘅 5 行全部係 `_build_text_chunk` call site 加 `flow` 參數)
  → G3 bit-identical by construction。
- `ChunkSpec.chunk_text_marked`(default `""`)— 無標記 chunk 留空,下游
  `marked or chunk_text` fallback,慳儲存 +「有值 = 有標記」語義清晰。
- 出 chunk 位共 **5 個**(plan 講三個 flush 點之外,實際多兩個)全部接 flow:
  (1) `_flush_text_section`(2) hard-cap pre-flush(3) soft-target flush
  (4) `_force_flush_images`(5) **oversized standalone 段落** — 第 5 個跟現有
  image snapshot 語義(袋走 acc 嘅 marker 但唔 reset,residual tail 會重複,
  同 `embedded_image_positions` double-attach 行為平行一致,pre-existing 唔郁)。
- flow 重置語義跟 `_reset_images_on_flush`:cap 設 → 全清;cap=None(pre-W44
  pile-on)→ 保留 img 事件,marker 喺後續 sub-chunk 重現,同 image list 鏡像。
- `_merge_adjacent_shorts`:marked 平行合併;marker-less 一側以乾淨 `chunk_text`
  fallback 拼入,merged marked 流保持完整;兩側都無標記 → `""`。
- Tests:9 條新(exact interleave 斷言 / chunk_text 永不含 marker + token 計數
  以乾淨文字計 / 無圖留空 / soft-target flush 重置 / hard-cap pre-flush 邊界 /
  切法 D batch 對應 `embedded_image_positions` / oversized snapshot / merge
  fallback / cap=None pile-on 鏡像)。chunker 48 全綠;連 ChunkSpec 消費者
  (test_orchestrator / test_ch009_image_dims / test_contextual_retrieval_ch008)
  共 **75 passed**。
- Lint:ruff check 全過;layout_aware.py format clean;test_chunker.py 只
  range-format 新增 W70 section(檔案其餘部分 pre-existing 唔 format-clean,
  per Karpathy §1.3 唔全檔 reformat);mypy --strict 新 code 零新 error
  (layout_aware.py:125/184 `ev` assignment + parsers docling typing 全部
  pre-existing)。
- 下一步:F3 orchestrator sha8 改寫 + `ChunkRecord` 欄位 + `schema.json` +
  drive-images-1 index PUT 遷移(記住先 GET 對照)。

### F3 — orchestrator sha8 改寫 + index schema + live 遷移 ✅
- orchestrator 新增 module function `_rewrite_image_markers`:`[IMG@<doc_order>]` →
  `[IMG#<sha8>]`(`position_to_sha` + `sha_to_url` 雙重 lookup,**剝走條件同
  `ImageRef` 落選條件完全一致** — marker 永遠對應 live 圖);剝走後空段收斂
  (`\n{3,}` → `\n\n`);無 marker 殘存 → 整欄退化 `""`(維持「有值 = 有標記」)。
  `extract_embedded_images=False` / `uploader=None` 時 `sha_to_url` 空 → marker
  全剝 → `""`,同無圖行為自然一致。
- `ChunkRecord.chunk_text_marked: str = ""` — `to_search_doc` model_dump 自動帶,
  零 serialization code 改動。
- `schema.json` 加 `chunk_text_marked`(`searchable: false, retrievable: true`
  per ADR-0055 — 檢索六消費者唔見標記)。
- **live 遷移(drive-images-1)**:臨時 script 先 GET `ekp-kb-drive-images-1-v1`
  定義對照 — 結構 drift **零**(首輪報嘅 4 項係假陽性:local schema.json 對
  Int32 / DateTimeOffset 冇明寫 `searchable`,Azure GET 回傳 explicit default
  `False`,PUT 同樣填 default 唔構成衝突);唯一 additive = 新欄位 → PUT 經
  production path `create_index_for_kb("drive-images-1")` 成功;post-GET 驗證
  欄位已落(searchable=False / retrievable=True)+ **doc count 369 → 369 不變**。
  其餘 KB 嘅 index 未遷移(per plan 非目標;re-ingest 前要先 PUT — 已知 gate)。
- 遷移 script 用 `truststore.inject_into_ssl()`(同 `api/server.py` 一致,
  corporate TLS interception 環境必須;系統 httpx 直連會 SSL 驗證失敗)。
- Tests:orchestrator 4 條新(sha8 改寫 / 缺 sha 剝走 + 收斂 / 無 marker 殘存
  退化 `""` / marker-less passthrough)+ populate 2 條新(`to_search_doc` keys ==
  schema.json field set **對齊 guard**(R2 drift 防護,以後加欄漏 schema 即紅)/
  marked 值 ride-through)。相關 suites 104 passed。
- 下一步:F4 config 開關(settings default + KbConfig knob + effective_config
  四層解析)。

### F4 — config 開關(四層解析)✅
- `Settings.enable_inline_image_markers: bool = False`(global default OFF —
  消費 gate only;ingest 端無條件寫 marked 欄位 per ADR-0055 Decision 3)。
- `KbConfig.enable_inline_image_markers: bool | None = None`(None = 繼承 global;
  query-time knob,flip 唔使 re-index,但該 KB index 要有 marked 數據先會出標記
  — 未 re-index KB 欄位空 → 自然 fallback 乾淨文字)。
- `DocConfig` 同步加(ADR-0055 Decision 3 寫明四層 per-query > per-DOC > per-KB
  > global;knob 屬 synthesis prompt 消費 = post-retrieval,符合 ADR-0050
  per-DOC 層「dominant cited doc 已知先消費」邊界)。
- `effective_config.py`:`PerQueryOverrides` + `EffectiveConfig`(concrete bool)+
  `resolve_effective_config` 行 `_resolve(pq, _layer(dc, kb), global)` 標準鏈。
- `DraftRetrievalConfig`(config-test 試跑 draft)**刻意唔加** — DD-5 precedent
  係按需加;harness 嘅 counter(citation / figure / latency)反映唔到 marker
  效果,W71 交織 render 落地先有意義。
- Tests 5 條新:global OFF 繼承(kb=None + 空 KbConfig 雙 case)/ per-KB ON 覆寫
  / per-DOC 蓋 per-KB / per-query 最優先 / 舊 config dict 缺 key → None → 繼承
  OFF(ADR-0028 migration-default precedent)。effective-config 28 + per-KB
  consumer + config-test 合計 73 passed;ruff 全過。
- 下一步:F5 三條 prompt 路徑(`prompt_builder._format_chunk` dispatch +
  `parent_doc_retriever` + `context_expander` marked 變體 + system prompt rule)。

### F5 — 三條 prompt 路徑 + system rule ✅
- **數據面先核實**(R6 精神):hybrid 三個 fetch(主 `search` / `fetch_by_chunk_ids`
  / `fetch_chunks_by_section_path`)全部冇 `select` → Azure 回傳全部 retrievable
  欄位,`chunk_text_marked` 自動入 `fields` — `hybrid.py` 零改動。
- **threading 設計 = 方案 X**(knob 傳入組裝者,唔係雙 key):`use_marked: bool
  = False` 參數加入 `expand_context` / `aggregate_parent_sections` / engine 兩個
  wrapper;ON 時組裝用 `chunk_text_marked or chunk_text`(per-chunk / per-sibling
  fallback,未 re-index 數據自然降級),輸出 key 名不變(`expanded_text` /
  `parent_section_text`)→ `prompt_builder` dispatch chain 不變。
- `prompt_builder`:`_format_chunk` 加 `use_marked`(raw 路 + append 模式主段);
  `build_prompt` 加 `inline_image_markers` → knob-gated **Rule 9**(原位保留
  `[IMG#...]` / 唔准自創改動 / 唔好喺行文提及標記)append 喺 base system prompt
  之後 — OFF 時 byte-identical。
- **wire 五個位**:`query.py` non-stream + stream 兩 route(expand + aggregate 各
  傳 `use_marked=effective.enable_inline_image_markers`)/ `crag.py` 再合成路
  (同 fallback 邏輯)/ `synthesizer.py` 兩路(effective_config 讀 knob,getattr
  因 `ExpansionConfig` protocol 唔含新欄位;legacy `None` fallback global)。
- `fields["chunk_text"]` 全程不動 — citation 顯示 / RAGAs contexts 繼續乾淨文字
  (ADR-0055 檢索 + 顯示七消費者不見標記)。
- Tests 11 條新:prompt_builder 5(OFF 忽略 marked + system byte-identical / ON
  raw 路 + rule appended / marked 空 fallback / dispatch 優先序不變 / append 主段)
  + context_expander 2(ON 三段 marked 組裝 + invariant / OFF 乾淨)+
  parent_doc_retriever 2(ON sibling marked + fallback / OFF 乾淨)+ route 級
  wire 2(per-KB ON → use_marked=True 到 engine / unset → False)。`_RecordingEngine`
  stub 同步加 kwarg。F5 相關 suites **125 passed**;ruff 唯一報項係
  `citation_image_neighbors.py` B905 pre-existing。
- 下一步:F6 前端最小面(mockup 先行 tuning card 開關行 + 答案顯示 marker strip
  含 streaming 半截 buffer + H7 fidelity check)。

### F6 — 前端最小面(mockup 先行)✅
- **mockup 先改**(`ekp-page-kb.jsx`):`KbTuneGroup` 加 children-optional 分支
  (bool-only knob 無「進階」掣 / grid);tuning card 圖片群後加第 4 行
  「Inline image markers(圖文位置標記)」(icon `IcTag`,繼承全域 OFF 初始);
  knob 數 comment 12→13。
- **implementation 對齊 mockup**:`kb/[id]/page.tsx` `TuneKnobKey` +
  `TUNE_GROUPS` 加第 4 組(`knobs: []`,icon lucide `Tag`);`KbTuneGroup`
  children optional + caller 空 knobs 傳 null(同 mockup 同一條件結構);
  `lib/api/kb.ts` `KbConfig` type 加欄位。PATCH 行現有 full-replacement 流程,
  開關值自動入 body — 零新 persist code。
- **marker strip**:新 `lib/chat/inline-image-markers.ts` —
  `stripInlineImageMarkers(text, streaming)`:完整標記寬鬆剝(`[IMG#[^\]\s]*\]`,
  畸形都唔俾用戶見;W71 先做 membership 驗證);`streaming=true` 時尾部半截
  標記(`[`→`[IMG#a1b` 全系 prefix)hold-back,下個 delta 完成或反證先放行 —
  標記碎片永不閃現。`AnswerBodyMarkdown` 加 `streaming` prop,strip 喺
  citation placeholder 前處理**之前**;caller 傳 `message.isStreaming`。
- Tests 14 條新:strip 單/多/畸形標記 + citation `[chunk-…]` 不受影響 + 快路
  不變 / streaming 六款半截 hold + 完整照剝 + 非 streaming 不 hold + held `[`
  下 delta 反證放行;tuning 第 4 組 render(進階掣維持 3 個)+ 開關 ON → PATCH
  body 帶 `enable_inline_image_markers: true` 且現有 knobs 保留。
- Gates:tsc 0 / eslint 0 error(唯一 warning = chat `<img>` pre-existing)/
  prettier 我嘅新行全 clean(報 dirty 三檔全 pre-existing,含 BUG-033 `ol`/`ul`
  行)/ vitest 全 suite 162/163(`chat-meta-row` 1 條 full-run 資源競爭 flake,
  單獨跑 9/9 過,與 marker 無關)。
- **H7 fidelity check**:mockup 先行流程(plan §6 預核 scope);同一
  `KbTuneGroup` 視覺語言;icon / title / desc 逐字一致;開關初始「繼承全域」
  badge + switch off 兩邊一致;strip 後答案視覺 == 現狀 == mockup。
- 下一步:F7 re-index drive-images-1(pre-flight → multipart re-upload 全 doc →
  chunk 數對齊 369 + `chunk_text_marked` 有值)。

### F7 — re-index drive-images-1 ✅
- pre-flight 全綠(Langfuse 200 / Postgres 1 row / backend /health 五 component
  ok / azurite TCP 通;Langfuse Docker `(unhealthy)` flag 照舊係 timing artifact)。
- **關鍵 catch:backend 進程 13:25 起 — 早過 F2-F5 commits,行緊舊 code**;唔重啟
  嘅話 re-ingest 唔會寫 marked 欄位(假驗收陷阱)。殺 dual-process(parent venv
  49228 + child 系統 python 15204,以 port 8000 listener 為錨)→ venv python
  重啟 → /health 200(~80s)。
- reindex 走 `POST /kb/drive-images-1/documents/{doc_id}/reindex` multipart
  in-place(裸 POST 被 `document.duplicate` guard 擋,hint 指路);6 doc 逐份:
  BM 16 / CB 28 / GL 74 / AP 83 / FA 78 / AR 90 — **逐份對齊基線,總 369 不變**
  (G3 chunker bit-identical 嘅 live 證據);1018 圖全 dedup 零重上傳(blob sha
  不變)。
- 驗證 script 全 index walk(369/369;首輪 `orderby chunk_id` 踩 sortable=false
  4xx,改 `chunk_index` + status check 後通):**205 有圖 chunk == 205 有 marked
  一一對應零例外**;`chunk_text` 零標記污染;全部 marker sha8 ⊆ 該 chunk
  `embedded_images_json` checksums(sha8 改寫 + 剝走條件 E2E 正確);肉眼樣本
  AR chunk-0001 封面 `[IMG#019f36cf]` 原位交織。VERDICT PASS。
- 下一步:F8 驗證(`scripts/run_marker_placement.py` harness 四指標 + drive-images-1
  knob ON per-KB PATCH + 九 query 實跑 + image-recall 對照 + AC4 判決)。
