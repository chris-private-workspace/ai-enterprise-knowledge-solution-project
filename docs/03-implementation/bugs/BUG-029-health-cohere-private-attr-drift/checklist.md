---
bug_id: BUG-029
report_ref: ./report.md
last_updated: 2026-05-31
---

# BUG-029 — Checklist

## Triage + Diagnosis
- [x] 重啟後 /health cohere not_configured 但 .env 有 key+endpoint
- [x] code-trace:health.py getattr("reranker") vs RetrievalEngine self._reranker
- [x] ground-truth cohere 實際正常(Settings key/endpoint + make_reranker 條件 + lifespan log 乾淨 + do_rerank)
- [x] test 為何沒抓:MagicMock engine 掩蓋 public-attr 缺失
- [x] user 選修 + runtime confirm

## Fix
- [x] RetrievalEngine 加 read-only `reranker` property
- [x] health.py 不改(getattr 現在拿到 property)
- [x] H1 邊界評估(internal property,非架構,無 ADR)

## Test
- [x] NEW `test_health_cohere_ok_with_real_retrieval_engine`(真 engine + sentinel)
- [x] pytest test_health_route 全綠(5 + 1 NEW)
- [x] retrieval engine 既有 test 無 regression
- [x] mypy / ruff clean on touched

## Verify
- [x] 重啟 backend → /health cohere ok
- [x] runtime query → reranker_used=cohere-v4.0-pro

## Closeout
- [x] commit + push
