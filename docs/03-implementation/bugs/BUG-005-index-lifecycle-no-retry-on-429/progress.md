---
bug_id: BUG-005
report_ref: ./report.md
checklist_ref: ./checklist.md
status: closed              # in-progress | closed
---

# BUG-005 — Progress

## 2026-05-22 — triage + diagnosis + fix + verify + closeout (single sitting)

### Done
- Folder + 3 docs created `docs/03-implementation/bugs/BUG-005-index-lifecycle-no-retry-on-429/{report,checklist,progress}.md`(per PROCESS.md §4 + `_templates/bugfix/`)
- Triaged **Sev3** — core flow(KB 建立)defect,但有 workaround(wait+retry)+ storage rollback 乾淨 + trigger 部分 external。Sev3 → no mandatory postmortem。
- Chris confirmed Bug-fix BUG-005 + scope (b) all 3 CH-001 methods + misleading-hint fix + Azure tier = Free(chat 2026-05-22)。

- **T1 root cause confirmed** via code read — `create_index_for_kb`(`populate.py:207`)/ `delete_index`(`:241`)/ `delete_doc`(`:270`)三個 CH-001 method 無 `@retry`;`upload()`(`:146`)有;module docstring(`:7`)claims「tenacity retry on 429/5xx」但只 cover `upload()`;`kb.py` index_create_failed hint 對所有 failure append kb_id 命名規則(對 429 誤導)
- **T2-T5 `populate.py` fix** — NEW `_is_retryable_azure_error(exc)` predicate(`httpx.TransportError` → retry;`HTTPStatusError` → retry iff 429/≥500;其他 4xx → False)+ NEW `_azure_lifecycle_retry` shared decorator(`retry_if_exception` + `stop_after_attempt(3)` + `wait_exponential(1,1,10)` + `reraise=True`,mirror `upload()`);`@_azure_lifecycle_retry` apply 落三個 CH-001 method(body 不變);import 加 `retry_if_exception`;module docstring §7 更新
- **T6-T7 `kb.py` fix** — NEW `_index_create_hint(exc)` helper(429 → throttle+retry+Free-tier 提示 / ≥500 → outage / 400 → kb_id 命名規則 / 其他 → generic);`create_kb` 502 detail 改用 helper;`import httpx` 加咗
- **T8 test** — NEW 4 test in `tests/test_populate.py` — `create_index_for_kb` 429-then-201 retry 成功 / 429×3 exhaust→raise / 400 即刻 raise 不 retry / `delete_index` 429-then-204 retry 成功
- **T9-T10 verify** — backend pytest **912 passed + 11 skipped + 0 failed**;ruff All checks passed;mypy `populate.py` target-clean
- **BUG-005 committed** `(this commit)`

### Decisions
- **D1 — predicate-gated retry(retry 429/5xx/transport only)**:用 `retry_if_exception(_is_retryable_azure_error)` 而非 `retry_if_exception_type(httpx.HTTPStatusError)`。後者會連 genuine 4xx(400 bad index name / 404)都 retry — caller error retry 只係延遲一個 deterministic failure。Predicate 精準 gate:429 + ≥500 + transport error 先 retry,其他 4xx 即刻 reraise。method body 不變(`raise_for_status()` 照舊)。
- **D2 — method-level `@retry` on 全 3 method(含 `delete_doc` 2-step)**:`delete_doc` 係 search + batch-delete loop。method-level retry 重跑成個 method = 重做 search。可接受 — search 同 delete-by-key(`@search.action:delete`)都 idempotent,且 mirror `upload()` 嘅 method-level retry pattern。
- **D3 — error-class-aware hint(`kb.py`)**:固定「check kb_id rules」hint 對 429 誤導(`drive-sop` 完全合法)。`_index_create_hint` 按 `HTTPStatusError` status 分支,429 hint 兼點明 Free tier 限流 + 3-index 硬上限。
- **D4 — test scope:3 `create_index_for_kb` + 1 `delete_index` smoke,`delete_doc` 不另測**:三個 method 用**同一個** `@_azure_lifecycle_retry` decorator。測 `create_index_for_kb`(用戶實際撞到嗰個)3 個 case + `delete_index` 1 個 consistency smoke 已足夠覆蓋 decorator 行為;再 triplicate `delete_doc` = Karpathy §1.2 over-test。
- **D5 — `kb.py:246` pre-existing `dict` type-arg 不修**:mypy `--strict` 報 `kb.py:246` `Missing type arguments for generic dict` — `git diff -U0` hunk headers 確認 BUG-005 改動喺 line 20/50/137,唔掂 246 → pre-existing,非 BUG-005 引入。Per Karpathy §1.3 surgical,out of scope 不順手修(mention only)。

### Acceptance（report.md §7）
- ✅ Root cause confirmed — 3 CH-001 methods 無 `@retry`(vs `upload()` 有)+ misleading hint — via code read
- ✅ `populate.py` retry — `_is_retryable_azure_error` + `_azure_lifecycle_retry` apply 落 3 method
- ✅ `kb.py` hint — `_index_create_hint(exc)` error-class-aware,取代固定 kb_id-rules hint
- ✅ Test — 4 NEW test(429 retry / exhaust / no-retry-on-400 / delete_index consistency)
- ✅ backend pytest no regression — 912 passed(908 baseline + 4 NEW)+ 11 skipped + 0 failed
- ✅ ruff clean on touched files;mypy `populate.py` target-clean(`kb.py:246` pre-existing,outside diff)
- 🚧 **Out of scope（environmental — 不修）**:Azure AI Search Free tier 3-index 硬上限 + 持續限流 → 需升 Standard S1(architecture.md §3.2 vendor lock / Track A IT cred)

**Verdict**:BUG-005 **CLOSED 2026-05-22**(Sev3;single-sitting triage + fix + 4-test + verify + closeout)。`create_index_for_kb` / `delete_index` / `delete_doc` 三個 CH-001 index lifecycle method 加咗 429/5xx/transport backoff retry(對齊 `upload()` + 對齊 module docstring 承諾);`kb.py` index-create error hint 改為 error-class-aware(429 唔再誤導 user 去 check kb_id 命名)。一個 transient Azure 429 而家會 backoff-retry,唔再即刻 hard-fail。**注意**:Free tier 嘅結構性限制(3-index cap + 持續限流)係 environmental,retry 救唔到 — 需升 Standard S1。

### Commits
| Hash | Subject |
|---|---|
| _(this commit)_ | `fix(indexing): retry Azure 429/5xx on CH-001 index lifecycle methods — BUG-005` |

---

**End of BUG-005 progress**
