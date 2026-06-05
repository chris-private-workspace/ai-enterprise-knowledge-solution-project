# W46 — UI Ingestion Config + Real KB-Level Reindex · Progress

> Daily progress + decisions + commits + 結尾 retro。每 daily commit 對應 Day-N entry(R2)。

---

## Day 1 — 2026-06-04

### Context / kickoff
W45 closed + pushed(`c3d60bb`)。用戶揀 W46 candidate = **UI 開放 ingestion 配置 + 真 KB-level reindex(dev 層)**(roadmap「後續候選」)。

### R6 grep 驗證(plan kickoff)— 揭真 blocker
Explore agent + 親自核實揭出:roadmap [AUDIT-C]「dev 層 iterate docs → reuse doc-level reindex」**估計過樂觀**。真 blocker:
- **原始檔冇存**(已核實):系統只有一個 blob container(`ekp-kb-{kb_id}-screenshots`),**冇 source-document container**。ingest stream 落 tempfile、`finally` 即刪。真 reindex(改 chunk_strategy / 圖數 cap → 重切)要 re-parse 原檔 → 冇原檔做唔到。doc-level reindex 靠用戶 re-upload;KB-level(`kb.py:252-280`)係純 stub(假 task_id + note pending Track A)。
- **mockup locked design**(H7):`ekp-page-kb.jsx:744-815` 將 `embedding_model` / `chunk_strategy` 設 disabled + hint「changing requires re-index」。改 mockup 解鎖 = H7 STOP+ask。

### 決策
- **AskUserQuestion(scope)**:Chris 揀 **Option 4「原始檔儲存 + UI 一次過(大 W46)」** —— 完整自助 loop(backend storage + frontend unlock + 真 reindex)。
- **H1 批准 → ADR-0043**(original-file blob storage + 真 KB-level reindex):NEW `ekp-kb-{kb_id}-sources` container + ingest best-effort persist + KB-reindex iterate `list_documents` 由 source re-ingest + `_run_ingest_pipeline` refactor(接受 file path/bytes)+ production-preserve(pre-W46 doc skip+report)。v1→v2 原子切換 + embedding_model unlock = out-of-scope。
- **H7 frontend = 獨立 design sub-gate**:F3 frontend GATED on H7 mockup design 確認(unlock `chunk_strategy` + 圖數 cap + Reindex UX;`embedding_model` 維持 locked)。design-first 改 mockup per ADR-0024 precedent。

### Done
- F0.1 ADR-0043 Accepted(H1 backend 方向)`docs/adr/0043-*.md`
- F0.2 ADR README index 加 0043 row + next → 0044
- R1 phase 三件套建立(plan/checklist/progress)

### F0.3 H7 design 確認(同日)
Chris AskUserQuestion 批准 unlock scope:**unlock `chunk_strategy` + per-KB 圖數 cap + Reindex KB UX(button + warning modal + summary);`embedding_model` 維 locked**(re-embed 較重另起)。F3 解鎖。

### F1/F2/F4 backend implementation(同日)
- **F1 source 儲存**:`storage/kb_naming.py` 加 `kb_id_to_source_container`(`ekp-kb-{kb_id}-sources`)+ NEW `backend/ingestion/source_store.py`(`upload_source_document` best-effort / `download_source_document`;blob name = `doc_id`,metadata 存 `original_filename` 令 reindex 重建 tempfile + 揀 parser)+ `_run_ingest_pipeline` ingest 成功後 persist 原檔(best-effort,失敗唔 fail ingest)
- **F2 真 KB-reindex**:NEW `run_kb_reindex`(documents.py)iterate `list_documents` → download source → 每 doc mirror doc-level reindex(delete_doc + counter −1,re-ingest +1)→ 同步 summary。**機制選擇**:用 `_bytes_to_upload_file`(BytesIO-UploadFile adapter)復用現成 `_run_ingest_pipeline`,**唔抽 130 行 core**(Karpathy §1.3 surgical,零 working-path regression 風險;ADR-0043 §Decision #4「refactor」以 adapter 達成)。kb.py `reindex_kb` route:加 `request` + archived guard + local import `run_kb_reindex`(避 circular)+ 移除 stub orphan `uuid` import
- **F4 tests**:`test_source_store.py` +6;`test_kb_reindex.py` 更新舊 stub test(202 mock → 503 without deps)+ 3 個 `run_kb_reindex` unit(skip-no-source / reingest+chunks_total / failed-doc report)

### 驗證(三軸)
- pytest:106 passed(test_source_store 6 + test_kb_reindex 7 + test_documents_route + test_documents_detail + test_orchestrator + test_screenshots + test_kb_management)= **0 regression**(source-persist best-effort swallow 唔影響既有 upload 路徑)
- ruff check + format:6 改動 file clean
- mypy --strict(全 import 解析):2 個 my-code error 修正(`int(object)` → isinstance guard / `reindex_kb -> dict` → `dict[str, object]`)後零 error

### Commits
- `84f5ef0` F0 — ADR-0043 + phase kickoff(plan/checklist/progress)
- _(pending — F1/F2/F4 backend code + checklist/progress tick)_

### Next
- **F3 frontend**(H7 解鎖已批准):mockup `ekp-page-kb.jsx` Settings tab unlock chunk_strategy + 圖數 cap + Reindex UX → frontend `kb/[id]/page.tsx` 100% match → wire `POST /kb/{id}/reindex` + summary 顯示 → F4.4 Vitest
- F5 doc-sync → F6 closeout

### Blockers / carry-over
- 無 blocker(H7 gate 已過,backend 綠燈)。R4 live reindex verify 需 Azure + backend(pytest 覆蓋 resolution 邏輯;live 可後評,可能 🚧 deferred)。

---

## Day 2 — 2026-06-05

### Context
F3 frontend(H7 解鎖已批准,F0.3)。Design-first per ADR-0024 precedent:先改 mockup `ekp-page-kb.jsx` → 再令 `page.tsx` 100% match。

### Done — F3.1 mockup(design-first)
`references/design-mockups/ekp-page-kb.jsx` `TabKbSettings`:
- **Unlock chunk_strategy**:seg 移除 `disabled` + `opacity: 0.7`,改 interactive(`data-active={chunkStrategy} onClick={setChunkStrategy}`);label icon `IcShield`(locked)→ `IcRefresh`(warning,需重索引);hint「Locked」→「需重新索引。改變切分策略 → 影響 chunk 邊界…」
- **NEW Max images / chunk 欄位**(ADR-0042):`<input className="input mono" placeholder="繼承全域 (8)">`;hint「留空 = 沿用全域上限(8)…超過即 force-split」
- **Re-indexing 卡 align W46 現實**:explainer ol 由 *v1→v2 原子切換 + eval gate + $3.42 cost*(Track A 願景)改為 *in-place per-doc re-ingest from stored source · synchronous*;補「pre-W46 無 source doc skipped + reported」+「v1→v2 zero-downtime stays Track A」;counts row 去除 fake cost 改「in-place · brief inconsistency window」
- **NEW warning modal**(`.modal-overlay` + `.modal` per DESIGN_SYSTEM §4.5):confirm 前提示「Save config changes first」+ docs/chunks/strategy/maximg 摘要
- **NEW summary banner**(presentational):reindex 後顯示「Re-indexed N/N · M chunks · skipped/failed」shape
- **R6 catch**:mockup explainer 係 pre-W46 aspirational plan-text(v1→v2/eval-gate/cost)與 ADR-0043 in-place 實作衝突 → align 至實作現實(design-first authorship,非單方改架構;v1→v2 仍標 Track A future,符 Tier 1/2 邊界慣例)

### Done — F3.2/F3.3/F3.4 page.tsx + API client
- `frontend/lib/api/kb.ts`:`KbConfig` 加 `chunker_max_images_per_chunk?: number|null`;NEW `KbReindexFailure` + `KbReindexSummary` interface;`kbApi.reindex(kbId)` → `POST /kb/{id}/reindex`
- `frontend/app/(app)/kb/[id]/page.tsx`:
  - header「Re-index」按鈕 `disabled` → enabled + `onClick={handleTabChange('settings')}`(對齊 Retrieval test 按鈕 pattern;mockup header 顯示 enabled)
  - `SettingsTab`:加 `chunkStrategy`/`maxImages` state + `maxImagesValue`(空→null)+ `configDirty` memo(fold topK/rerankK/chunkStrategy/maxImages/knobs);`buildConfigBody` 加 `chunk_strategy`+`chunker_max_images_per_chunk`;`handleSave` config 條件用 `configDirty`;Cancel reset 補 chunkStrategy/maxImages
  - chunk_strategy seg unlock(Shield→RefreshCw,interactive)+ Max images / chunk 欄位(`type="number" min={1}`,跟 page.tsx W43 KbTuneKnob type=number 慣例)
  - NEW `<ReindexCard kb chunkStrategy maxImages>` 元件(置 `<DangerZone>` 前,對齊 mockup「Re-indexing → Danger zone」相鄰):explainer 摺疊 + reindex mutation(success→invalidate kb query + toast summary;failed→banner-warning)+ summary banner + `.modal-overlay` confirm(target-check close per DESIGN_SYSTEM §4.5 canonical)
  - `embedding_model` disabled select 不動(F3.4)

### Done — F4.4 test
`frontend/tests/unit/kb-settings-reindex.test.tsx` +3:(1) chunk_strategy seg not-disabled + Max images 欄位 render;(2) Save PATCH 完整 config 含 `chunk_strategy: 'layout_aware'` + `chunker_max_images_per_chunk: 5`;(3) Re-index modal → confirm → `kbApi.reindex('test-kb')` → summary banner

### 驗證(F3.5,四軸)
- vitest `kb-settings`:**6 passed**(reindex 3 + tuning 3 regression)0 fail
- tsc --noEmit:clean
- next lint:clean(唯一 pre-existing `chat/page.tsx` `<img>` warning 無關)
- `[oklch`=0 preserved(用 inline style oklch,無 Tailwind arbitrary class)

### H7 design fidelity 自檢
Design-first → page.tsx by-construction match mockup。逐項對齊:label icon(RefreshCw)/ seg interactive / hint 文案 / Max images 欄位 / Re-indexing 卡 explainer+counts / modal markup+文案 / summary banner shape。Live-app 差異(summary 條件渲染 vs mockup static example;type=number vs mockup plain input)= 既有 codebase 慣例(empty-state / W43 KbTuneKnob),非新 drift。

### Commits
- `838a582` feat(frontend): W46 F3 — Settings unlock chunk_strategy + image cap + Reindex KB UX
- _(pending — F5 doc-sync + F6 closeout)_

### Next
- F5 doc-sync(architecture.md + roadmap + session-start)→ F6 closeout(同日完成,見下)

### Blockers / carry-over
- 🚧 R4 live reindex UI verify(需 backend + Azure + 真 KB)— vitest 覆蓋 mutation→summary 邏輯;live click-through 可後評,carry W47+ Track A

### F5 doc-sync(同日)
- **architecture.md** inline ADR-0043 amendment:§3.4(原始檔 `-sources` container + 真 reindex blockquote;落 §3.4 非 plan 標 §3.5 因 chunk record schema 不變 — R3 deviation note)+ §4.4 #19 row(endpoint count 18→19)+ §4.6 Re-sync logic(in-place vs v1→v2 Track A)+ §5.5.5 Settings note(unlock + Reindex UX)
- **roadmap**:「後續候選(原 W45)」table row + 逐期重點 → ✅ W46(本期)shipped;「W46 per-document」row + heading + §4 依賴樹 relabel「後續候選 — per-document(原標 W46)」避免 double-W46 false-done 映射;DESIGN_SYSTEM modal pattern 已存在 §4.5 直接復用無需新增

### F6 closeout(同日)

#### Phase Gate G1-G6 評估 — **PASS**(R4 live-verify 🚧 deferred caveat)

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| G1 | source container helper + ingest 持久化原檔 | ✅ PASS | `kb_id_to_source_container` + `source_store.upload_source_document` best-effort;`test_source_store` +6 |
| G2 | KB-level reindex 真 iterate + re-ingest;pre-W46 skip+report | ✅ PASS | `run_kb_reindex` iterate `list_documents` → download → delete+reingest;3 unit(skip-no-source / reingest / failed-doc report)no crash |
| G3 | pipeline refactor 兩路徑共用 + 0 regression | ✅ PASS | BytesIO-UploadFile adapter 復用 `_run_ingest_pipeline`(零 core 抽取,Karpathy §1.3);106 affected test 0 regression |
| G4 | frontend unlock 100% match mockup + reindex wired | ✅ PASS | design-first(mockup 先改)→ page.tsx by-construction match;`<ReindexCard>` wire `POST /kb/{id}/reindex`;vitest 6 pass(H7 fidelity) |
| G5 | pytest + ruff + mypy + frontend lint/**build** clean | ✅ PASS | backend 106 pass + ruff + mypy --strict clean(Day1);frontend vitest 6 + tsc --noEmit + next lint + **next build 15/15 pages** clean |
| G6 | ADR-0043 Accepted + H7 design 確認 + doc-sync | ✅ PASS | ADR-0043 Accepted(D1)+ H7 F0.3 Chris 批准 + F5 doc-sync done |

**判決:Phase Gate 通過(PASS)**。唯一 carry = R4 live reindex UI click-through verify(🚧 deferred,需 backend+Azure+真 KB;pytest 已覆蓋 reindex 邏輯 + vitest 覆蓋 mutation→summary,live verify 屬 R8/Track A adjacent 後評項)。

#### Retro — what went well / what to watch
- **R6 grep 連環 catch(2 次)**:(1) D1 揭真 blocker = 原始檔冇存(非 Track A 估算);(2) D2 揭 mockup Re-indexing explainer 係 pre-W46 aspirational plan-text(v1→v2/eval-gate/$3.42 cost)與 ADR-0043 in-place 實作衝突 → design-first align 至現實。兩次都喺 implement 前 catch,符 R6 recursive scope(plan-text/mockup-text contamination)。
- **Karpathy §1.3 surgical 收效**:F2 用 BytesIO-UploadFile adapter 復用現成 `_run_ingest_pipeline`,唔抽 130 行 core → 零 working-path regression 風險(plan F2.1 原寫「抽 core」,實際 adapter 更 surgical,checklist 已記)。
- **design-first(ADR-0024 precedent)順暢**:先改 mockup 再令 page.tsx match,H7 fidelity by-construction 而非事後對齊;live-app 差異(summary 條件渲染 / type=number)皆既有 codebase 慣例非新 drift。
- **double-W46 命名撞**:roadmap 原有「W46 per-document」候選與實際 phase「W46-ingestion-config」撞名 → F5 主動 relabel per-document 候選避免 false-done(延續 W45「relabel 避免 false 映射」紀律)。
- **Watch(carry W47+)**:(1) R4 live reindex verify;(2) heading_aware chunk_strategy 解鎖後若選中會 reindex 全 doc failed(NotImplementedError)— 現靠 reindex summary `failed` 列表 surface,UX 上未 disable 該選項(match mockup 4-button;後續可考慮 disable);(3) production v1→v2 原子切換(決策 4 / Track A)。

#### Carry-overs → W47+(rolling JIT,未 pre-create)
- 🚧 R4 live reindex UI click-through(backend+Azure)
- per-document scope 候選(原標 W46,決策 1 gated)
- config-test 加 ingestion 軸 / production v1→v2 reindex(決策 4 / Track A)
- heading_aware 解鎖後 footgun 觀察(可選 disable)

### Commits(F5+F6)
- _(pending — F5 doc-sync + F6 closeout + checklist/progress tick)_
