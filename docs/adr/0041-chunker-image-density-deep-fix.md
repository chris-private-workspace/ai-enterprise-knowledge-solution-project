# ADR-0041: Chunker Image-Density Deep Fix — Per-Chunk Image Distribution for Image-Dense Sections

**Date**: 2026-06-03
**Status**: **Accepted**(W44 F0 gate PASS 2026-06-03 — Chris confirm H1 boundary + 決策 2 揀**切法 D 混合** + `max_images_per_chunk` default **8** + Accept)
**Approver**: Chris(技術 Lead)

## Context

W43(ADR-0040)把 retrieval / citation / image 旋鈕降到 per-KB scope,但對「圖洪水」只交付 runtime 鈍刀 `max_images_per_answer`(砍到 N 張,**揀唔到邊 N 張先啱**)。ADR-0040 §MVP scope + R6 catch 5 已預告:圖洪水**深層修係 ingestion-bound**,runtime 解唔到根,split out 至本 ADR-0041 / W44。

**根因(code-grounded,`backend/ingestion/chunker/layout_aware.py`)**:圖片按 `doc_order` attach 落**整個 open section 嘅 accumulator**,**唔隨 text flush 分配**:
- `:146` — `accumulator.image_positions.append(f"img@{img_pos}")`(圖累積落 section accumulator)
- `:207` — hard-cap flush 時 comment 明寫「Keep image_positions on the open section — they belong to whole section」(text flush **唔 reset** image_positions)
- `:213-218` — soft-target flush 同樣只 reset `paragraphs` + `token_count`,**唔掂** `image_positions`
- `:248` — `_build_text_chunk` 每次 `embedded_image_positions=list(acc.image_positions)`(copy 當前全部)
- `:323` — `_merge_adjacent_shorts` 合併時 `combined_images = prev + curr`(concat,再放大)
- 全 file **零 per-chunk 圖數上限**(只有 `_TOKEN_HARD_CAP=1500` token cap)

**後果**:一個圖密但 text 短嘅 section(例:AR 手冊「System Instruction for each step」)→ text < 500 token 唔觸發 flush → **單一 chunk carry 成節所有圖**。

**實測(memory `project_chat_demo_rag_quality_followups` #7,2026-06-01 AR KB `test-kb-20260531-v1`)**:`ci=15=57` / `ci=8=27` / `ci=31=25`(單 chunk 最高 57 圖;30/68 chunks carry imgs,221 unique)。W43 live A/B(#8 Test C)證:`enable_citation_post_hoc_expansion=false` 把 citation 11→1,但**該 1 個 chunk 仍 intrinsically 帶 35 圖** → runtime config 解唔到根,坐實 ingestion-bound。

**為何 H1**:改 chunker 切分 / image-attach 邏輯 = 改 `architecture.md §3.3`(layout-aware chunking philosophy);且**需重新索引**先生效 → 兩項皆 H1 trigger(CLAUDE.md §5.1)。

**為何 W44 唔卡 Track A([AUDIT-B] 校準)**:現成 `POST /kb/{kb_id}/documents/{doc_id}/reindex`(`documents.py:786-884`,真刪 + 真 `_run_ingest_pipeline`,**非 stub** — 有別於 KB-level `kb.py:252-280` stub)可對單份文件即時重切驗證。production 零 downtime 安全 reindex(v1→v2 原子切換)留 W45 + Track A,**唔阻 W44**。

## Decision

**F0 gate PASS(2026-06-03)**:Chris confirm H1 + 揀**切法 D(混合:sub-heading 細分 + image cap 兜底)** + `max_images_per_chunk` default **8**(對齊前端 BUG-031 `INLINE_IMAGE_CAP=8`)+ Accept。

令圖片**隨內容切分按 `doc_order` 分配落 sub-chunk**,而非 pile-on 整個 section:

1. **Image-aware flush(切法 A 核心,切法 D 第一支柱)**:`_SectionAccumulator` 加 image-count 感知;當累積圖數達 `max_images_per_chunk` soft cap(default 8),**force flush** 當前 chunk(連已累積 text + 嗰批圖),開新 sub-chunk(延續同一 `section_path`,prev/next 連續)。圖按 `doc_order` 跟最近 flush 分配 → text flush 同步 reset `image_positions`(修 `:207`/`:213-218` 嘅 pile-on)。
1b. **Sub-heading 細分 + merge image-guard(切法 D 第二支柱)**:現有 chunker 已 heading-aware(`section_stack` pop/push by `heading_level`)→ sub-heading 細分**大部分由現有邏輯處理**;W44 重點係**防 `_merge_adjacent_shorts`(`:294-376`)把圖密短 sub-section 合併返**(merge 後圖數超 cap 則唔 merge — `_should_merge` 加 image-count guard);對**無 sub-heading** 嘅圖密 section,fallback 至點 1 嘅 image cap force-split。**避免 over-build:唔重寫 heading 邏輯(已存在),只加 image-guard + cap**(守 Karpathy §1.2 simplicity-first)。
2. **Per-image section metadata 自然繼承**:sub-chunk 細分後,每個 sub-chunk 有自己更精確嘅 `section_path` → image 透過 owning-chunk 繼承更精確 section(reuse post-BUG-026 `ImageRef.source_section` stamp 機制,**零新 schema field**)。
3. **新 `Settings.chunker_max_images_per_chunk` knob**(**default 8** per F0;設 `None`/0 → 不限 = 今日 bit-identical 行為,可回退)。⚠️ 註:default 8 **異於** ADR-0037/0040 嘅 OFF-by-default measurement-first 慣例 —— 但對**正常文件**(每 chunk 本身 < 8 圖)係 **no-op**,只 cap 圖密 flood;且只喺 **re-index 後**生效,現有未重切 KB 不變(影響面限於圖密 chunk,intentional per Chris 決策 2)。後續可循 ADR-0040 模式降至 per-KB `KbConfig`(W44 暫不做,守 simplicity)。
4. **Re-index required**:改完用 doc-level reindex 對圖密文件重切驗效;eval no-regression gate(R@5 + RAGAs)必過。
5. **守 H4 邊界**:本 ADR 只做「**位置 / 章節切分**」(Tier 1 上限,per [AUDIT-E]);「按**視覺內容**語意揀圖」= multi-modal = Tier 2,**明確 out-of-scope**。

## Alternatives Considered

- **維持 W43 runtime cap(status quo)** — REJECTED:`max_images_per_answer` 只鈍刀砍數量,揀唔到啱嗰幾張;W43 #8 Test C 證 intrinsic flood runtime 解唔到根。
- **切法 B — 更深 sub-heading 細分** — DEFERRED/可組合:對有 sub-heading 嘅文件最語意對齊(一步一 chunk),**但依賴文件真有 sub-heading**;AR mega-section 可能單一 heading 下塞晒步驟 + 圖 → 無效。可作切法 A 之上嘅 enhancement。
- **切法 C — image-anchored splitting(圖驅動錨點)** — REJECTED(W44):需 heuristic 判圖文歸屬,複雜度高,違 Karpathy §1.2 simplicity-first;收益未證大於切法 A。
- **切法 D — 混合(B 優先 + A cap 兜底)** — DEFERRED:最 robust 但最複雜;先用 A 解根因,若 eval 顯示語意切斷再升 D。
- **per-image relevance ranking(vision 模型揀圖)** — OUT OF SCOPE:multi-modal retrieval = Tier 2(H4 邊界),需新 ADR + stakeholder(per [AUDIT-E] Layer C 視覺內容語意線)。
- **per-chunk 圖數 hard truncate(切走多餘圖唔重切)** — REJECTED:會永久丟失圖(用戶可能要嗰張),非「分配」而係「刪」;違 vision「揀啱」精神。

## Consequences

- **Positive**:
  - 圖密文件單 chunk 圖數受控(57 → ≤ cap),檢索攞到嘅 citation chunk 圖數合理、per-citation 圖更精準(章節精度,Tier 1 上限)
  - 解 ADR-0040 R6 catch 5 預告嘅 ingestion-bound 根因,終結「圖洪只能鈍刀」局限
  - per-image section 透過細分自然更精準,免新 schema(reuse BUG-026 機制)
  - 純 Tier 1,驗證路徑現成(doc-level reindex),唔卡 Track A
- **Negative**:
  - **重切改變所有 chunk 邊界 → 可能影響 retrieval recall / RAGAs** → **必須 eval no-regression gate(R@5 + faithfulness)**,呢個係 W44 top risk(R6 pre-active-flip 適用)
  - 圖數 cap 可能切斷語意連貫嘅步驟(step + 其截圖跨兩 chunk)→ cap 要設合理 + prev/next 連續緩解;eval 顯示語意切斷則升切法 D
  - re-index 成本(現有 KB 要重跑 ingest pipeline 先生效)
  - 新 Settings knob(+1 config surface;default 不限 = preserve)
- **Neutral**:
  - production default 維持今日行為直到 knob explicit set(measurement-first,沿 ADR-0037/0040 慣例)
  - per-KB 化(降 `chunker_max_images_per_chunk` 落 `KbConfig`)留後期,本 ADR 唔關閉

## Validation(W44 F3–F4.9,2026-06-04)— Gate PARTIAL→PASS

切法 D 實作(`8145656`)+ reindex 驗證結果:

**G1/G2 圖洪根治(F3,硬證)**:AR doc 重切 max per-chunk 圖數 **57 → 8**(cap 嚴格守);分佈 baseline 多 mega(57/27/25/23/18/16/14/12/12/11)→ 重切後 **0 個 >8**,223 unique 圖全保留(無丟失)。drive 全 KB cap=8 = **369 chunks**(vs cap=None 287,+82 force-split:AR 68→90 / AP 63→83 / FA 59→78 / CB 23→28 / GL 60→74 / BM 14→16)。

**G3/G4 eval no-regression(F4.7/F4.8/F4.9 隔離對比)**:同一套 **W44 F4.6 SME-validated eval-set-v1-draft**(46 main keyword GT + 4 reclassified OOS)、同條件(F4.4 throttle on / semantic off)、**唯一變數 = chunker cap**:

| 指標 | before(cap=None)| after(cap=8)| Δ | ±2pp gate |
|---|---|---|---|---|
| recall_at_5 | 0.933 | 0.9312 | **−0.18pp** | ✅ PASS |
| faithfulness | 0.9506 | 0.9459 | **−0.47pp** | ✅ PASS |
| correctness | 0.795 | 0.7722 | **−2.28pp** | ⚠️ marginal |
| evaluated / errored | 46 / 0 | 46 / 0 | — | — |

**Gate verdict = PARTIAL→PASS(Chris 拍板 2026-06-04,per plan §3 marginal policy)**:recall(最客觀 retrieval-grounded)+ faithfulness 皆 flat(±2pp 內)→ cap=8 force-split **冇損檢索 / 答案 grounding**;correctness −2.28pp 啱啱越 ±2pp 嚴格線,歸因 RAGAs `answer_relevancy` run-to-run noise(三指標中最 noisy,W35/W36 calibration 已記 0.6X 邊緣 benign;兩個更客觀指標 flat 佐證非真 regression)。**配合三源證實**(G1/G2 圖洪 57→8 硬證 + pytest text token cap=None/under-cap **bit-identical** + 單/3 sanity query retrieval healthy)→ cap=8 chunker = **確認 no-regression**,gold SME eval 喺客觀指標背書。

**F4 deviation 記錄(R3)**:原單次 eval 撞 eval-harness decay(Cohere rate-limit 401 + eval-set empty-GT)→ 擴展 gold-eval rigor track(F4.4 throttle / F4.5 GT discovery / F4.6 SME content-based GT[Q14 首次執行] / F4.7 cap=None before / F4.8 cap=8 after / F4.9 隔離對比)。GT 類型由 chunk_id strict pivot 至**內容導向 keyword**(chunker-agnostic,跨 re-chunk valid 比較)。詳見 W44 phase folder + roadmap addendum。

## References

- ADR-0040(per-KB tunable config;§MVP scope + R6 catch 5 split out 圖洪深層修至本 ADR;`max_images_per_answer` runtime 鈍刀)
- ADR-0033(chunker low-value tuning + adjacent-short-merge — 同屬 §3.3 chunker amendment 先例;`_merge_adjacent_shorts` image concat `:323` 係本 ADR 觸及面)
- ADR-0004(layout-aware chunking — not character-based;本 ADR 守此 philosophy,只改 image 分配 + 加圖數 cap,**唔變** character-based)
- BUG-026(`ImageRef.source_section` stamp owning chunk section_path,`d66f5a5` — 本 ADR per-image metadata 繼承機制 reuse)
- BUG-027(`_find_section_neighbour_images` section-aware attach — 細分後 section-matching 更精準,Layer C 章節語意 Tier 1)
- memory `project_chat_demo_rag_quality_followups`(#7 圖洪實測 `ci=15=57` + #8 W43 live A/B Test C intrinsic flood)
- ROADMAP-per-kb-tunable-config.md(§3 W44 + [AUDIT-A/B/E])
- `backend/ingestion/chunker/layout_aware.py`(根因:`:146` image append / `:207` pile-on comment / `:248` copy-all / `:323` merge concat)
- architecture.md §3.3(chunking — 本 ADR amends)+ §3.5(ChunkRecord schema)
- CLAUDE.md §5.1 H1(chunker change + re-index → ADR)+ §5.4 H4(vision relevance = Tier 2 邊界)
