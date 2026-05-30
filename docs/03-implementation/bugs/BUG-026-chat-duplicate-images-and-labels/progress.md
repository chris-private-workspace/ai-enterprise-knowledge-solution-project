---
bug_id: BUG-026
report_ref: ./report.md
checklist_ref: ./checklist.md
status: in-progress
---

# BUG-026 — Progress

> Investigation → fix → verify timeline。
> 每 commit 必須對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。

---

## Day 1 — 2026-05-30

### Done
- 由 W42 post-closeout UI demo follow-up（memory `project_chat_demo_rag_quality_followups`）開 bug task
- Code-trace 3 個 root cause finding(無 live repro —— demo KB `dce-integration-demo-1` 已喺 demo 清理刪除)
- 寫 `report.md`(Sev3,3-finding 診斷)+ `checklist.md`
- **Finding A fix 實作**:
  - NEW pure helper `frontend/lib/chat/citation-images.ts::dedupeCitationImages`(key `checksum_sha256` fallback `blob_url`,首現 citation attribute,full-citations `citationIdx`)
  - `chat/page.tsx`:import helper + `dedupedImages = dedupeCitationImages(message.citations)`;inline cards + ImageGallery + FeedbackBar count 全部改由 deduped 列表 drive;ImageGallery 簽名 `citations`/`allCitations` → `images: DedupedCitationImage[]`(label 保持 mockup-faithful `chunk_title`+`doc_title` per Finding B)
  - `imageCitations` 保留(meta row「N with screenshots」= citations 數,語意正確)
- **NEW test** `tests/unit/citation-images.test.ts`(6 cases)
- **驗證全綠**:Vitest 13 passed(6 新 + 7 既有 `chat-meta-row` 無 regression)/ ESLint clean(唯一 pre-existing `<img>` warning)/ `tsc --noEmit` exit 0 / `npm run build` exit 0(✓ Compiled,15 頁)/ Prettier clean

### Diagnosis update
- **Finding A**(dedup,真 bug):`attach_neighbour_images`（`citation_image_neighbors.py`）跨 citation 無 dedup → 同 `checksum_sha256` 圖落多個 citation;frontend `chat/page.tsx` inline cards(1228-1245)+ gallery(1796)兩處 flat render 無 dedup
- **Finding B**(gallery label = `chunk_title`):code-trace 對 mockup `ekp-page-chat.jsx:653-656` —— **mockup 本身就用 chunk_title + doc_title**(source attribution),所以唔係 bug,改成 alt_text = H7 violation → 不動
- **Finding C**(per-image 真 caption):`alt_text` = ingest Docling caption(`docx_parser.py:117`);有 caption 時 inline title 已正確,無 caption fallback chunk_title;真 fix 屬 ingest 層 + overlap BUG-017 + 需 re-ingest + live 驗 alt_text → 待 user 決策

### Decisions
- Finding A dedup 位置 = **frontend display dedup**(report §8 Alt 1)—— presentation 層問題喺 presentation 層解;保留 backend citation↔image data 完整;contained 喺 chat page
- Finding B 保持 mockup-faithful(§13 mockup wins)
- Finding C 唔自行做 ingest 深度工作(較大 + 需 re-ingest + 需 live 驗證)→ STOP+ask user 方向

### Blockers
- Manual UI verify 需 demo KB 重新 ingest(blobs 已隨 demo 清理刪除)—— code + Vitest 層先驗,UI 層 user-deferred

### Effort
- Planned:0.5h(dedup fix);Actual:_(進行中)_;Variance:_

### Commits
| Hash | Subject |
|---|---|
| `cb5ed75` | fix(frontend): BUG-026 dedup cross-citation duplicate images in chat (C10) |

### Finding C 驗證(user pick「先驗證 alt_text 實際內容」)—— DONE
- 跑 `backend/scripts/diagnose_image_doc_order.py`(`PYTHONIOENCODING=utf-8` 繞 Windows cp1252 console crash)against sample docx,**無需 re-ingest**(純本地 Docling parse)
- **結果**:8/8 圖 `alt_text` **全空**(Docling 抽唔到「Figure N:」caption)+ per-image section 8/8 正確(post-BUG-017)
- **結論**:label mislabel 係真嘢(alt_text 空 → 永遠 fallback chunk section);Finding C 確認需要 ingest 工作先有準確 per-image label;正確 section 已喺 ingest 知道但冇 propagate 落 `ImageRef`
- 詳見 `report.md §6` Finding C 驗證結果 + 3 候選 fix 方向(C-i parser caption / C-ii propagate section / C-iii defer)

### Next
- Finding C fix 方向 = **C-ii**(user pick 2026-05-30)→ 落 Day 2

---

## Day 2 — 2026-05-30(Finding C-ii —— propagate section)

### Done
- **Backend**(4 edit):storage `ImageRef`(`indexing/schemas.py`)+ API `ImageRef`(`api/schemas/query.py`)加 `source_section: list[str]`;`orchestrator.py` ingest 填 `list(spec.section_path)`(owning chunk = parser-correct post-BUG-017);`citation_enrichment.py::parse_embedded_images` parse + defensive coerce
- **Frontend**:`query.ts::ImageRef` optional `source_section?`;`citation-images.ts` 加 `imageSectionPath`(prefer 圖自己 section)+ `imageTitle`(alt_text > section leaf > chunk_title)helpers;`chat/page.tsx` InlineImageCard title+caption + ImageGallery title 改用 helpers
- **Tests**:backend 4 NEW(parse source_section + default-empty + non-list-coerce + storage→query round-trip)/ frontend 6 NEW(imageSectionPath ×3 + imageTitle ×3)
- **驗證全綠**:Backend pytest **48 passed** + 0 new mypy(15 pre-existing 唔 reference 新 code)/ Frontend Vitest **19 passed** + `tsc` 0 + `build` 0 + Prettier clean

### Diagnosis update
- 機制:圖 attach 落 chunk,neighbour-attach 時 `parse_embedded_images` 複製整個 ImageRef → `source_section` 自然帶住圖**自己** section(唔係 citing chunk)→ §8.4 圖 surface 喺 §8 intro citation 都顯示 §8.4

### Decisions
- H1 邊界評估:`embedded_images_json` 係現有 §3.6 index field,只係 JSON payload 內加 key(非 index schema 改);Pydantic additive optional field → **無 H1 trigger / 無 ADR**(per report §6 C-ii note)
- Gallery title 由 `chunk_title`(citing)改 `imageTitle`(圖自己 section)—— C-ii data-accuracy fix,結構維持 mockup-faithful;user explicit pick C-ii「propagate section to fix label」= approved scope

### Blockers
- 🚧 **Live re-ingest + UI verify deferred** —— C-ii 對既有 index chunk latent(`source_section` 空 → frontend graceful fallback citing section);需 re-ingest 一個 KB(backend+azurite+Azure Search infra)先 populate + UI 睇到效果

### Effort
- Planned:1.5h(C-ii cross-layer);Actual:~1.5h;Variance:0

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | fix(retrieval): BUG-026 C-ii propagate image source_section for accurate chat labels |

---

## Closeout(填於 status=closed)

_(待 C-ii commit + live re-ingest UI verify 決策)_
