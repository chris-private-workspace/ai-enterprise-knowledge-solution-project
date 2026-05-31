---
bug_id: BUG-029
title: /health misreports Cohere reranker as not_configured (private attr drift)
severity: Sev4
status: fix-verified
opened: 2026-05-31
related:
  - health.py:_check_cohere (the misreporting probe)
  - retrieval_engine.py:84 (self._reranker private attr — drift source)
  - test_health_route.py (MagicMock-based tests masked the drift)
  - W26 D1 + W27 D2 (cosmetic surface 1st + 2nd; this = 3rd)
---

# BUG-029 — /health Cohere private attr drift

## 1. Symptom

2026-05-31 服務重啟後 user smoke:`GET /health` 報 `cohere: not_configured`(detail「Cohere reranker not configured (Q5 Path A optional)」),但 `.env` 明確有 `COHERE_API_KEY` + `COHERE_ENDPOINT`,且重啟也不消失。

## 2. Root Cause

- `health.py:103` `_check_cohere`:`reranker = getattr(engine, "reranker", None)` — 找 **public** `engine.reranker`。
- `retrieval_engine.py:84`:`RetrievalEngine` 把 reranker 存成 **private** `self._reranker`,**沒有** public `reranker` attr/property。
- → `getattr(engine, "reranker", None)` 永遠 fall through 到 `None` → 永遠報 `not_configured`,**與實際有無配置 reranker 無關**。
- Ground-truth 證實 cohere 實際正常:fresh `Settings()` key len 84 + endpoint len 69;`make_reranker` 條件(endpoint AND api_key 非空)滿足 → 建出 `CohereReranker`;lifespan `__aenter__` 無 error(啟動 log 乾淨,無 reranker/traceback);engine `do_rerank = self._reranker is not None` → 真的 rerank。
- **Test 為何沒抓到**:`test_health_route.py` 全用 `MagicMock` 當 engine + 手動 `engine.reranker = MagicMock()` → MagicMock 自動有任何 attr,掩蓋 production `RetrievalEngine` 沒 public `reranker` 的事實。test 永遠綠 / production 永遠誤報。
- **History**:cosmetic surface W26 D1 + W27 D2(per memory)= 第 3 次,前 2 次當 cosmetic 未修。

## 3. Fix

- `retrieval_engine.py`:`RetrievalEngine` 加 read-only `reranker` property(`return self._reranker`)— 純 additive,對齊 `health.py` 原本就預期的 public attr;不改 retrieval 行為。
- `health.py` **不改**(原本 `getattr(engine, "reranker")` 現在能拿到 property 值)。
- **Test regression guard**:`test_health_route.py` 加 `test_health_cohere_ok_with_real_retrieval_engine` — 用**真** `RetrievalEngine`(非 MagicMock)+ sentinel reranker,assert `engine.reranker is sentinel` + health cohere `ok`。fix 前紅 / fix 後綠。

**H1 邊界**:C04 RetrievalEngine 加 read-only property = internal accessor,無 vendor / storage / interface / 8-view 改動 → 非架構改動(per CLAUDE.md §5.1「加 internal helper function」例外),無 ADR。Cohere 本來就在跑,純修顯示層。

## 4. Verify

- pytest `test_health_route` 全綠(既有 5 + 1 NEW)+ retrieval engine 既有 test 無 regression
- mypy / ruff clean on touched
- 重啟 backend → `GET /health` cohere `ok`
- runtime query → `reranker_used=cohere-v4.0-pro`(100% 證明實際 rerank)

## 5. Acceptance

- [x] RetrievalEngine 加 public `reranker` property
- [x] /health 報 cohere `ok`(真 engine)
- [x] NEW regression test 用真 RetrievalEngine(不被 MagicMock 掩蓋)
- [x] runtime query reranker_used=cohere-v4.0-pro
- [x] 既有 health + engine test 無 regression

## 6. Changelog

| Date | Change | Approver |
|---|---|---|
| 2026-05-31 | Triage Sev4 + root cause(health public-attr probe vs engine private `_reranker`)+ public property fix + real-engine regression test + restart/runtime verify | user(chat 選「修 health 顯示 bug + 跑 query 確認」)|
