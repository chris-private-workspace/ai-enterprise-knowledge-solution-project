---
bug_id: BUG-029
report_ref: ./report.md
checklist_ref: ./checklist.md
status: fix-verified
---

# BUG-029 — Progress

## Day 1 — 2026-05-31

### Triage + Diagnosis
- 服務重啟 user smoke 揭 `/health` cohere `not_configured`,但 `.env` 有 `COHERE_API_KEY`+`COHERE_ENDPOINT`,重啟也不消失。
- code-trace:`health.py:103` `getattr(engine, "reranker", None)` 找 public,`RetrievalEngine` 存 private `self._reranker`(retrieval_engine.py:84)→ 永遠 None → 永遠誤報。
- ground-truth cohere 正常:fresh `Settings()` key len 84 + endpoint len 69;`make_reranker` 條件滿足建出 `CohereReranker`;lifespan log 乾淨無 `__aenter__` error;engine `do_rerank=self._reranker is not None`。
- test gap:`test_health_route` 全 MagicMock engine + 手設 `.reranker` → 掩蓋 production public-attr 缺失。
- history:memory 記 W26 D1 + W27 D2 cosmetic surface = 第 3 次。

### Decision
- user chat 選「修 health 顯示 bug(輕量 bug-fix)+ 跑 query runtime 確認」。
- 修法選 public property(非 health.py reach private)— 對齊 health.py 原意 + 正確封裝;其他 caller 也受惠。
- H1:internal read-only property,非架構,無 ADR。

### Done (fix)
- `retrieval_engine.py`:RetrievalEngine 加 `@property reranker` → `return self._reranker`。
- `test_health_route.py`:+1 NEW real-engine regression test(`test_health_cohere_ok_with_real_retrieval_engine`)。

### Verify (全綠)
- backend pytest `test_health_route` **6 passed**(5 既有 + 1 NEW);retrieval engine 既有 test 無 regression。
- mypy / ruff clean on touched。
- 重啟 backend(venv python)→ `GET /health` cohere **ok**(↑ from not_configured)。
- runtime query → `reranker_used=cohere-v4.0-pro`(100% 證明實際 rerank)。

### Commits
| Hash | Subject |
|---|---|
| _(pending)_ | fix(retrieval): BUG-029 expose RetrievalEngine.reranker so /health reports cohere correctly |

### Lessons
- MagicMock-based test 對「物件是否有某 public attr」**無保護力** — 它對任何 attr 都回 MagicMock,掩蓋 production attr drift。守護「public API 存在」的 test 必須用真物件(或 `MagicMock(spec=...)`)。
- `/health` 是 config-state-only dashboard dot(Wave A,無 real ping)→ 顯示層 attr drift 不會被功能 break 抓到,只能靠 user smoke 或真物件 test。三次 surface 才修 = cosmetic 被持續 deprioritize 的代價。
