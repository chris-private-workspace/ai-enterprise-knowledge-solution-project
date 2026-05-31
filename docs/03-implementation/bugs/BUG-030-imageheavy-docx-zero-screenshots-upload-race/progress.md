---
bug_id: BUG-030
report_ref: ./report.md
checklist_ref: ./checklist.md
status: fix-verified
---

# BUG-030 — Progress

## Day 1 — 2026-05-31

### Triage + Diagnosis
- user built KB `test-kb-20260531-v1` from `DRIVE_User Manual_0601(AR)...docx` → 0 images. `total_screenshots=0`, `extract_embedded_images=True`, `failed_documents` empty.
- ruled out 3 benign hypotheses: Docling (253 PICTURE, get_image 253/253) / config (True) / no-images (226 word/media files).
- diag repro of the upload step → `ResourceExistsError (BlobAlreadyExists)`. root: duplicate-sha images (30/253) + unbounded `asyncio.gather` no `return_exceptions` + `upload(overwrite=False)` race not caught → whole batch aborts → orchestrator best-effort swallows → silent 0.

### Decision
- user chat AskUserQuestion: **核心 + 並發加強**.
- fix: `uploader.upload` catch `ResourceExistsError`→dedup; `upload_many` `Semaphore(8)`+per-record isolation→`list[UploadResult | None]`; `orchestrator` skip None.
- H1: internal ingestion mechanism, no ADR.

### Done (fix)
- `uploader.py`: `upload` catch ResourceExistsError; `upload_many` bounded + isolated.
- `orchestrator.py`: zip handle None.
- `test_screenshots.py`: +2 NEW.

### Verify
- pytest `test_screenshots` + `test_orchestrator` **28 passed**; ruff clean; mypy 0 new (9 pre-existing parser debt).
- **live diag** (real Azurite, new code): `upload_many OK: 253 results (uploaded=223 deduped=30 failed_none=0)`, no raise.
- **end-to-end** (backend restart + reindex with fix loaded):
  - reindex #1 (container still had fix-pre partial-upload blobs) → `images_uploaded=0 deduped=253` — **no raise** (fix confirmed in the real ingest path; pre-fix this reindex raised → 0).
  - cleared the KB's screenshot container (223 stale blobs) → reindex #2 clean → **`images_uploaded=223 deduped=30`** (0 fail).
  - **KB `total_screenshots` 0 → 223**.
  - chat `/query` "how to manage AR invoices" → 23 citations, **7 carry `embedded_images` (136 imgs total)**, each with `blob_url` + correct `source_section` (e.g. "2 AR01. Payment Collection > 2.1.3 …"). **Images fully extracted + chat-visible.**
  - Note: `GET /kb/{id}/images` admin aggregation returns empty — separate pre-existing admin-view issue (per memory), does NOT affect chat.

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | fix(ingestion): BUG-030 bound screenshot upload concurrency + treat dedup-race as hit |

### Lessons
- Unbounded `asyncio.gather` + no `return_exceptions` = ONE item's failure aborts the WHOLE batch. For best-effort batches: bound concurrency (semaphore) + isolate per-item (None/log on failure).
- `overwrite=False` dedup MUST catch `ResourceExistsError` on the concurrent-race path — the HEAD-check is not atomic with the write. The comment predicted it ("prefer the earlier write") but the code never implemented the catch.
- Diagnose ingestion image bugs by RULING OUT layer-by-layer (Docling label count → extractor → uploader), not guessing — the symptom (0 images) pointed at Docling/config but the real cause was 3 layers down.
