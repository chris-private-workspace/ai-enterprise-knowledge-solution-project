---
bug_id: BUG-030
report_ref: ./report.md
last_updated: 2026-05-31
---

# BUG-030 — Checklist

## Triage + Diagnosis
- [x] symptom: test-kb-20260531-v1 total_screenshots=0, extract_embedded_images=True, failed_documents empty
- [x] rule out Docling (253 PICTURE, get_image 253/253)
- [x] rule out config (extract_embedded_images=True) + "no images" (226 word/media files)
- [x] diag repro upload step → ResourceExistsError (BlobAlreadyExists)
- [x] root cause: dup-sha imgs + unbounded gather no return_exceptions + upload(overwrite=False) race not caught
- [x] user picked "core + concurrency hardening"

## Fix
- [x] uploader.upload: catch ResourceExistsError → dedup hit
- [x] uploader.upload_many: Semaphore(8) + per-record isolation → list[UploadResult | None]
- [x] orchestrator: skip None in zip
- [x] H1 boundary (internal ingestion mechanism, no ADR)

## Test
- [x] 2 NEW tests (race→dedup + per-record isolation)
- [x] pytest test_screenshots + test_orchestrator 28 passed
- [x] ruff clean / mypy 0 new (9 pre-existing parser debt)

## Verify
- [x] live diag (real Azurite, new code): upload_many 253 → uploaded=223 deduped=30 failed=0, no raise
- [x] end-to-end re-ingest → KB total_screenshots > 0 (see progress.md)

## Closeout
- [x] commit + push
