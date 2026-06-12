# W70 — checklist(inline-image-markers)

## F1 — ADR
- [x] `docs/adr/0055-inline-image-markers-b2-dual-field.md`(B2 雙欄位 + sha8 標記語法 + per-KB 開關 + B1 reject 理據;2026-06-12 雙 session 合併稿 Accepted)
- [x] `docs/adr/README.md` index 加 0055

## F2 — chunker(marked text 組裝)
- [x] `_SectionAccumulator` 加 ordered `flow`(paragraph / image 事件按 doc_order 入列)
- [x] `ChunkSpec.chunk_text_marked` 欄位 + `_build_text_chunk` 組裝 marked 文字
- [x] 三個 flush 點(`_flush_text_section` / token-cap 內 flush / `_force_flush_images`)flow 重置正確(另 cover 第 5 個出 chunk 位:oversized standalone 段落 snapshot 語義)
- [x] `_merge_adjacent_shorts` 合併 marked text(marker-less 一側以乾淨 chunk_text fallback 拼入)
- [x] tests:標記位置按 doc_order / `chunk_text` bit-identical / 三 flush 點 + merge case(9 條新 test;chunker 48 全綠)
- [x] 既有 chunker tests 全綠(連 ChunkSpec 消費者 suite 共 75 passed)

## F3 — orchestrator + index schema
- [x] orchestrator `[IMG@n]` → `[IMG#sha8]` 改寫 pass(uploader 跳過嘅圖標記剝走 + 空段收斂 + 無 marker 殘存 → `""`)
- [x] `ChunkRecord.chunk_text_marked` 欄位(`to_search_doc` 自動帶)
- [x] `schema.json` 加 `chunk_text_marked`(searchable false / retrievable true)
- [x] 現存 index PUT 遷移:先 GET 對照(零 drift,唯一 additive = 新欄位),再對 drive-images-1 重發 `create_index_for_kb`;live 驗證欄位已落 + doc count 369 不變
- [x] tests:sha8 改寫 / 缺 sha 剝走 / search doc 欄位形狀(`to_search_doc` keys == schema.json field set 對齊 guard)

## F4 — config 開關
- [x] `backend/storage/settings.py` 加 `enable_inline_image_markers: bool = False`
- [x] `backend/api/schemas/kb.py` KbConfig 加 knob(`bool | None = None`)+ `api/schemas/doc_config.py` DocConfig 加 per-DOC 層(per ADR-0055 Decision 3 四層)
- [x] `effective_config.py`:`PerQueryOverrides` + `EffectiveConfig` + `resolve_effective_config` 四層解析(per-query > per-DOC > per-KB > global)
- [x] tests:OFF 繼承 global False / per-KB ON 覆寫 / per-DOC 蓋 per-KB / per-query 最優先 / 舊 config dict 缺 key 解析 None 繼承 OFF(5 條;effective-config + per-KB consumer + config-test suites 73 passed)

## F5 — prompt 路徑(三條)
- [x] `prompt_builder._format_chunk` dispatch:knob ON 用 `chunk_text_marked or chunk_text`(append 模式主段都通)
- [x] `parent_doc_retriever` parent_section_text 組裝 marked 變體(`use_marked` threading;per-sibling fallback)
- [x] `context_expander` expanded_text 組裝 marked 變體(`use_marked` threading;anchor + 兩 neighbour,per-chunk fallback;`fields["chunk_text"]` 不動 = citation invariant)
- [x] system prompt 附加規則(knob-gated Rule 9):重現步驟時保留 `[IMG#...]` 標記原位;OFF 時 system prompt byte-identical
- [x] knob wire:`query.py` 兩 route + `crag.py` 再合成路 + `retrieval_engine` wrapper pass-through + `synthesizer` 兩路由 effective_config 讀(數據面確認:hybrid 三個 fetch 冇 select → marked 欄位自動返)
- [x] tests:OFF bit-identical / ON 三路徑都帶標記 / system rule 出現條件 / route 級 use_marked wire 雙向(11 條新;F5 suites 125 passed)

## F6 — 前端(最小面)
- [x] mockup 先行:`ekp-page-kb.jsx` tuning card 加開關行(`KbTuneGroup` 支援 bool-only 無進階;icon `IcTag`;knob 數 comment 12→13)
- [x] `kb/[id]/page.tsx`:`TuneKnobKey` + `TUNE_GROUPS` 加 `enable_inline_image_markers`(第 4 組 `knobs: []`;`KbTuneGroup` children optional 同 mockup parity;`lib/api/kb.ts` KbConfig type 同步)
- [x] 答案顯示 marker strip(新 `lib/chat/inline-image-markers.ts`;`AnswerBodyMarkdown` 加 `streaming` prop,strip 喺 citation 前處理之前;streaming 尾部半截標記 hold-back)
- [x] tests:開關 PATCH body(full-replacement 保留現有 knobs)/ strip 完整+畸形標記 / citation marker 不受影響 / streaming 半截六款 hold / 非 streaming 不 hold(vitest 14 條新;全 suite 162/163,1 條 `chat-meta-row` flake 單獨跑過)
- [x] tsc 0 / eslint 0 error(`<img>` warning pre-existing)/ prettier 新行全 clean(三檔 dirt 全 pre-existing)/ H7 fidelity check:同一 `KbTuneGroup` 視覺語言 + icon/title/desc 字串逐字一致 + strip 後答案視覺 == 現狀 == mockup(plan §6 預核)

## F7 — re-index drive-images-1
- [x] pre-flight(Langfuse 200 + Postgres SELECT 1 + backend /health 五 component ok + azurite TCP 通);**backend 重啟載 W70 code**(舊進程 13:25 起早過 F2 commits — 唔重啟 re-ingest 唔會寫 marked)
- [x] index PUT 更新(F3 已做;本步直接受益)
- [x] re-upload 全 6 doc(`POST .../documents/{doc_id}/reindex` multipart in-place;duplicate guard 擋咗裸 POST)→ chunk 數逐份對齊(16/28/74/83/78/90)總 369 不變;1018 圖全 dedup 零重上傳
- [x] 驗證:369 chunks 全 walk — 205 有圖 chunk == 205 有 marked 一一對應;`chunk_text` 零標記污染;全部 marker sha8 ⊆ 該 chunk `embedded_images_json` checksums;肉眼樣本(AR chunk-0001 封面圖 `[IMG#019f36cf]` 原位交織)PASS

## F8 — 驗證
- [x] `scripts/run_marker_placement.py`(四指標:validity / coverage / placement accuracy / dup rate + 人工覆核表輸出;core `backend/eval/marker_placement.py` + 13 tests;另加 `scripts/check_marker_order.py` 次序一致性覆核工具)
- [x] drive-images-1 knob ON(per-KB PATCH full replacement,80/10/40 保留;跑完**保留 ON** 俾 W71 判斷)
- [x] 九 query 實跑 → 報告 `reports/marker_placement_ar.yaml`(+ `_answers.yaml` raw 持久化;run 2:validity 1.000 / coverage 0.767 / dup 0.081)
- [x] image-recall 對照跑(knob ON)→ mean recall **1.000** vs W68 基線 0.9954,零回退(`reports/image_recall_ar_w70_markers_on.yaml`)
- [x] 人工覆核 placement 錯位 → AC4 判決寫入 progress.md(proxy 字面 25.43% 結構性誤報全歸因;真調換 0/249;判決 = 達標,建議 W71 go)

## F9 — 收爐
- [x] user-guide `03-configuration-reference.md` 加新旋鈕(§2.3 12→13 / 組 4 + copy caveat + 驗證數 / §4 速查表 row + per-doc API-vs-UI footnote)
- [x] DEFERRED_REGISTER 記 copy-含標記 caveat(**DD-8**,W71 處理)
- [x] memory 更新(`project_inline_image_markers_w70` + MEMORY.md index)+ plan closeout(status closed)+ progress retro + session-start 座標 bump(SESSION_SUMMARY.md → W70 + 01-session-start.md 頭注)
