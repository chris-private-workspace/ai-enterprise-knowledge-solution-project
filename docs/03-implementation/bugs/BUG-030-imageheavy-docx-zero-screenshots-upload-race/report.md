---
bug_id: BUG-030
title: Image-heavy docx extracts 0 screenshots (concurrent dedup-race ResourceExistsError aborts whole upload batch)
severity: Sev3
status: fix-verified
opened: 2026-05-31
related:
  - uploader.py:upload (ResourceExistsError on race) + upload_many (unbounded gather, no return_exceptions)
  - orchestrator.py upload step (best-effort try/except swallowed whole-batch failure)
  - BUG-009 (azurite blob upload) / ADR-0018 (multi-KB container)
---

# BUG-030 — Image-heavy docx extracts 0 screenshots (concurrent dedup race)

## 1. Symptom

User built KB `test-kb-20260531-v1` from `DRIVE_User Manual_0601(AR)_FNA-AR Management_v0.03.docx`; chat/KB showed NO images. `total_screenshots=0` despite `extract_embedded_images=True`, and `failed_documents` empty (silent — doc "succeeded").

## 2. Root Cause (ground-truth — ruled out 3 benign hypotheses first)

- ✅ NOT Docling: direct `DocumentConverter().convert()` → **253 PICTURE items, `get_image` ok 253/253**.
- ✅ NOT KB config: `extract_embedded_images=True`.
- ✅ NOT "file has no images": docx `word/media/` has **226 media files**.
- **Real cause** — diag repro of the upload step raised:
  `upload_many RAISED: ResourceExistsError: The specified blob already exists (BlobAlreadyExists)`.

  The DRIVE docx contains **duplicate images** (repeated UI frames / logos → same sha256; diag confirmed **30 dup of 253**). `ScreenshotUploader.upload_many` used `asyncio.gather` over **all 253 records unbounded + NO `return_exceptions`**. `upload()` dedup = "HEAD-check blob; if absent → `upload_blob(overwrite=False)`". Under concurrency, two records sharing a sha256 both HEAD-miss → both proceed → the 2nd `upload_blob` hits **`ResourceExistsError`**. The `@retry` only covers `ConnectionError`/`TimeoutError`, so it propagates → `gather` **aborts the whole batch** → orchestrator's best-effort `try/except` swallows it → `images_uploaded=0`, doc still "succeeds", `failed_documents` empty → **silent 0 images**.

  (DCE 8-img doc was fine = few imgs, no dup, no race.) `uploader.py:137-138` comment already anticipated the race ("prefer the earlier write") but **never implemented the catch**.

## 3. Fix (user picked "core + concurrency hardening")

- **`uploader.upload`** (core): wrap `upload_blob(overwrite=False)` in `try/except ResourceExistsError` → treat as a dedup hit (the behaviour the comment already intended).
- **`uploader.upload_many`** (hardening): bound concurrency with `asyncio.Semaphore(max_concurrency=8)` + isolate per-record failures — a record that still raises after retries maps to `None` at its index (logged), instead of an unbounded `gather` that aborts on first failure. Return type → `list[UploadResult | None]`, length + order preserved.
- **`orchestrator`**: `upload_results: list[UploadResult | None]`; skip `None` entries in the zip.
- **H1 boundary**: internal ingestion upload mechanism; no vendor / storage layout / interface change → not architectural, no ADR.

## 4. Verify

- pytest `test_screenshots` + `test_orchestrator` **28 passed** (incl. 2 NEW: race→dedup + per-record isolation); ruff clean; mypy 0 new (9 pre-existing parser Docling-stub / Literal debt only, `CO_W25_mypy_strict_debt`).
- **Live diag (real Azurite, new code)**: `upload_many OK: 253 results (uploaded=223 deduped=30 failed_none=0)` — no longer raises; 30 duplicate-sha images resolved as dedup, 223 unique uploaded, 0 failures.
- **End-to-end** (re-ingest DRIVE docx → KB `total_screenshots > 0`): see progress.md.

## 5. Acceptance

- [x] upload_many no longer aborts on duplicate-sha race (253 → 223 + 30 dedup, 0 fail)
- [x] concurrency bounded (semaphore) + per-record isolation (None on failure)
- [x] orchestrator skips None
- [x] 2 NEW tests + existing 28 green
- [ ] end-to-end re-ingest → KB total_screenshots > 0 (backend restart + re-ingest — see progress.md)

## 6. Changelog

| Date | Change | Approver |
|---|---|---|
| 2026-05-31 | Triage Sev3 + root cause (concurrent dedup-race ResourceExistsError aborts unbounded gather) + core (catch ResourceExistsError) + hardening (semaphore + per-record isolation) + pytest/diag verify | user (chat: 核心 + 並發加強) |
