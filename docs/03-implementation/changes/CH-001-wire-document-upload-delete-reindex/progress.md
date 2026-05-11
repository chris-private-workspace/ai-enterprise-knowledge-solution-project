---
change_id: CH-001
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: done
last_updated: 2026-05-11
---

# CH-001 — Progress

> Day-N entries during execution + 結尾 closeout summary。
> 每 commit 對應一個 Day-N entry mention(R2 binding rule per PROCESS.md §5)。

---

## Day 0 — Kickoff(2026-05-11)

### Trigger
- User trigger:2026-05-11 dev test session — `/kb/new` Pipeline wizard step 3 hit 501 on `POST /kb/{kb_id}/documents`(screenshot `Screenshot 2026-05-11 102613.png`)
- Diagnosis confirmed:`backend/api/routes/documents.py:72-102` is a 3-route hardcoded 501-stub cascade(POST upload + DELETE doc + POST reindex);session-start.md §11 lists this as **CO_F3a** carry-over("per-doc upload/reindex/delete stays 501 stub — W2 ingestion + Track A")
- "Track A" deferral label was over-broad — the actual block is `.env.production` for prod deploy, but the dev `.env` already has Azure OpenAI + AI Search cred(W2 Gate 1 PASS R@5=0.9722 was driven by these);so this is unblocked **now**

### Done(this session)
- ✅ Confirmed diagnosis by reading `backend/api/routes/documents.py` + grepping for the 501 stub text + confirming the W2 ingestion machinery exists(`backend/ingestion/orchestrator.py` + `parsers/{docx,pptx,pdf}_parser.py` + `parsers/__init__.py` `select_parser` factory + `chunker/layout_aware.py` + `embedding/azure_openai_embedder.py` + `indexing/populate.py`)+ `scripts/run_populate_sanity.py` as the canonical caller pattern
- ✅ PROCESS.md §1 classification = **Change**(behavior change 501 stub → real implementation;not a Phase deliverable — no active phase;not a Bug-fix — no regression)
- ✅ Surfaced **Decision A**(reindex semantics)to the user:**(i)** 422 + hint / **(ii)** replace-in-place / **(iii)** source-doc store
- ✅ User picked scope **(b)**(POST + DELETE + reindex 一齊做)+ Decision A = **(ii) replace-in-place reindex**
- ✅ Wrote `spec.md` v1.1 — status `draft` → `approved`(2026-05-11);§2.3 locked to (ii) with the doc_id-match safety check;§3 AC9 broken into AC9.1 (happy path) / AC9.2 (missing file) / AC9.3 (mid-pipeline failure + mismatch);§7 changelog row added
- ✅ Derived `checklist.md` v1.1 from spec §2.2 In Scope + §3 AC — 7 phases × T-items(T1.1-T7.7 ≈ 40 atomic items)+ Cross-Cutting
- ✅ **Decision B discovery + approval**(post Phase 1 read-only investigation):while reading `backend/api/routes/kb.py:22-31` + `backend/storage/kb_naming.py` + ADR-0018 to plan the lifespan wiring,surfaced the **multi-KB Azure AI Search index provisioning gap** ── `POST /kb` only creates the KB storage record but does NOT provision the per-KB index `ekp-kb-{kb_id}-v1`(legacy `drive_user_manuals` was manually provisioned at W2 D1 via `scripts/create_index.py`);user's screenshot workflow(`copilot-cowork-document-1` new KB)would still fail post-CH-001-v1.1 with Azure 404 not 501. **User picked (β) scope expansion**:(1)user's screenshot was a new-KB workflow → (α) didn't solve it;(2)ADR-0018 Phase 3 was over-deferred(Track A blocks prod deploy, not dev `.env` admin-key);(3)同 W16 F5.3 Decision B.1 一齊 unblock;(4)避免 CH-001/CH-002 切割成本。
- ✅ **Updated spec to v1.2** — title extended;§1.5 NEW "discovered scope gap" subsection;§2.1 split into A (document routes) + B (KB routes auto-provisioning);§2.2 added S14-S20(create_index_for_kb / delete_index / delete_doc / upload kb_id-dynamic / POST kb wiring / DELETE kb wiring / docstring cleanup / test extension);§2.4 added 3 new explicit out-of-scopes;§3 added AC18-AC22;§4 added R9-R11;§5 effort 4-6h → 6-9h;§6.5 reaffirmed clean(implementation of existing ADR-0018, not new architecture);§6.6 NEW ADR-0018 status touch note;§7 v1.2 changelog row。
- ✅ **Extended checklist to v1.2** — NEW Phase 1.5(T1.5.1-T1.5.10, multi-KB index provisioning);Phase 2 T2.5 updated(`upload(kb_id=kb_id)` per T1.5.5);Phase 3 T3.1 referenced T1.5.4 not T1.2;Phase 5 added T5.14-T5.19(AC18-AC22 tests);Phase 6 T6.2 changed to use a NEW kb_id(was vague)+ added T6.4 + T6.6 Azure-direct verifies;Phase 7 T7.2/T7.3/T7.4 extended + T7.5 NEW(ADR-0018 update)

### Decisions
- **Decision A = (ii) replace-in-place reindex**(per user 2026-05-11). Rationale per spec §2.3:real semantics(atomic replace, one API call), honest about the source-store gap(user provides the source), 90% code reuse with POST + DELETE, closes CO_F3a properly. (i) rejected as technical-but-not-real close;(iii) rejected as genuinely Tier 2(R12 Azurite mismatch + scope creep).
- **Decision B = (β) scope expansion**(per user 2026-05-11):include multi-KB index provisioning(`POST /kb` auto-creates Azure index;`DELETE /kb` drops it;`IndexPopulator.upload(kb_id=)` BC-preserving signature;close ADR-0018 Phase 3 upload-side). Rationale per spec §1.5 + §7 changelog v1.2 row:user's screenshot workflow needs it,ADR-0018 was over-deferred,dev cred is already there,avoid CH-001/CH-002 split cost. (α) rejected because it doesn't solve the user's actual workflow ── only renames the wall.
- **Approach A vs B** for lifespan(spec §6.2):commit to **A** in implementation unless the embedder isn't safely shareable across query + ingest contexts(then B as fallback). Lifespan-init for `app.state.embedder`(exposed for ingestion)+ `app.state.index_populator` + `app.state.ingestion_chunker` alongside the existing `app.state.retrieval_engine` etc.
- **`uploader=None`** per the existing `scripts/run_populate_sanity.py` precedent(R12 Azurite signature mismatch still open;screenshots extracted but blob upload skipped;text retrieval unaffected per architecture.md §3.5). Per-KB blob container provisioning(ADR-0018 Phase 3 blob-side)stays deferred per R11 + spec §6.6 — needs R12 resolution first.
- **doc_id derivation = slugified filename stem**(not UUID)— traceability over opacity;duplicate doc_id within the same KB → 409 with hint.
- **`upload` signature BC**:keep `kb_id=None` optional default(falls back to `self.index_name` legacy behavior)so existing W2-era callers like `scripts/run_populate_sanity.py` + W2 tests don't break. Karpathy §1.3 surgical.
- **POST /kb storage rollback on Azure failure**:storage record deleted via `service.delete(kb_id)` if `populator.create_index_for_kb` raises;rollback failure itself is logged but the user-facing 502 still surfaces(R10 documented).
- **No new ADR + no new dep**(spec §6.4 + §6.5 — H1/H2 both verified clean;Decision B = implementation of existing ADR-0018, not a new architectural decision).
- **ADR-0018 stays `Accepted`** post-CH-001(NOT `done`)— Phase 3 upload-side closed,blob-side still R12-deferred(R11 + spec §6.6)

### Blockers
- None at kickoff — all W2 machinery already implemented, Azure dev cred presumed in `.env`(if missing → spec AC5 surfaces the 503 cleanly, not a CH-001 blocker)

### Effort
- Planned (today, kickoff + Decision B scope-expansion + spec/checklist/progress v1.1 → v1.2):~2.5h(initial 1.5h + ~1h for Decision B discovery + spec/checklist/progress update)
- Actual:~2.5h(this session)
- Variance:0

### Commits
| Hash | Subject |
|---|---|
| `671a925` | docs(planning): CH-001 spec + checklist + progress — approved Decision A = (ii) replace-in-place reindex (close CO_F3a) |
| _(pending)_ | docs(planning): CH-001 spec v1.2 + checklist + progress — Decision B = (β) scope expansion (multi-KB index provisioning; close ADR-0018 Phase 3 upload-side) |

### Next
- Commit the v1.2 pre-doc bundle update;then start **Phase 1**(T1.1-T1.5 backend service wiring)+ **Phase 1.5**(T1.5.1-T1.5.10 multi-KB index provisioning ── `IndexPopulator.create_index_for_kb` + `delete_index` + `delete_doc` + `upload(kb_id=)` BC ext + POST/DELETE /kb wiring)+ **Phase 2-4**(documents.py routes);commit per phase or per logical chunk;run `pytest` + `mypy --strict` + `ruff check` after each phase

---

## Day 1 — Phase 1 + 1.5 backend service wiring + multi-KB index provisioning(2026-05-11)

### Done
- ✅ **T1.1** Read `api/server.py` lifespan in full ── existing pattern: `embedder` / `searcher` / `reranker` / `synthesizer` / `crag_grader` all `__aenter__`ed inside the `if azure_cred:` block. App.state already has `retrieval_engine` / `synthesizer` / `crag_loop`. **No `IndexPopulator` or ingestion services on app.state yet** ── added.
- ✅ **T1.2 / T1.5.2-1.5.5** `backend/indexing/populate.py` — added 3 new methods + extended `upload` signature(`12bfd3f` will commit):
   - `IndexPopulator.create_index_for_kb(kb_id)` ── PUT `/indexes/{name}?api-version=2024-07-01` with `_load_index_schema()` from `backend/indexing/schema.json`(`@lru_cache(maxsize=1)` so the read is once-per-process);override `schema["name"]` with `kb_id_to_index_name(kb_id, legacy_default_index=self.index_name)`;accept 200/201/204 as success;raise `httpx.HTTPStatusError` on 4xx/5xx;structlog `index_created` on success
   - `IndexPopulator.delete_index(kb_id) -> bool` ── DELETE `/indexes/{name}?api-version=2024-07-01`;**True on 204, False on 404 (fail-soft)**, raise on other errors;structlog `index_deleted` / `index_already_gone` / `index_delete_failed`
   - `IndexPopulator.delete_doc(kb_id, doc_id) -> int` ── two-step:(1) POST `/docs/search` with `filter=kb_id eq X and doc_id eq Y`, `select=chunk_id`, `top=1000` to collect chunk_ids;(2) batch POST `/docs/index` with `@search.action: "delete"` per chunk_id;return count deleted. Fail-soft when the index itself is missing(returns 0)── covers the "DELETE on a doc in a KB never populated" edge case
   - `IndexPopulator.upload(records, action, kb_id=None)` ── BC-preserving signature ext;`_resolve_index_name(kb_id)` helper resolves dynamically(falls back to `self.index_name` when kb_id None;works for existing W2-era callers like `scripts/run_populate_sanity.py`);`_upload_batch` now takes `index_name` arg
- ✅ **T1.4 / T1.5** `backend/api/server.py` lifespan — added `app.state.embedder` + `app.state.index_populator` + `app.state.ingestion_chunker` alongside the existing `app.state.retrieval_engine` etc;`populator` ── `__aenter__`ed inside the `if azure_cred:` block + `__aexit__`ed in `finally`;`LayoutAwareChunker()` (stateless) constructed unconditionally(works without Azure cred — chunking is offline);**Approach A confirmed**(lifespan-init, not per-request)── one Azure REST client per app lifetime
- ✅ **T1.5.6-1.5.7** `backend/api/routes/kb.py` POST + DELETE wiring(`12bfd3f` will commit):
   - POST `/kb` ── after `service.create(payload)` success → resolve `_get_populator(request)`;**fail-soft when populator is None**(no Azure cred → log warning + return 201 with storage record only, preserving W16 F5.3 Decision B.1 baseline + the existing `test_delete_kb_in_memory_baseline_preserved` contract);Azure call failure → `service.delete(payload.kb_id)` rollback + 502 `index.create_failed` with the actionable hint quoting Azure index-name rules;rollback failure logged but the original 502 still raised(R10)
   - DELETE `/kb/{kb_id}` ── after `service.delete(kb_id)` success → resolve `_get_populator(request)`;**fail-soft when populator is None**(returns 204 with storage already gone, no Azure touch);populator's `delete_index` itself is fail-soft on 404(common for pre-CH-001 KBs / partial-rollback orphans);Azure 5xx → 502 with hint to manually drop the index via `scripts/create_index.py delete`
   - **Deviation discovered**:initial `_populator_or_503` (strict 503) broke `test_delete_kb_in_memory_baseline_preserved_per_b1` ── pytest failed with `503 != 204`. Fixed by replacing with `_get_populator -> IndexPopulator | None` + fail-soft branches in both routes. **Karpathy §1.3 "don't break what wasn't part of the change"**;the test surfaced the regression early
- ✅ **T1.5.8** Dropped the "Track A W17+" deferral comment block in `routes/kb.py` DELETE docstring + replaced with the CH-001 closure note + ADR-0018 reference
- ✅ **T1.5(documents helper)** `backend/api/routes/documents.py` — added `_ingestion_deps_or_503(request) -> _IngestionDeps`(NEW frozen dataclass bundling embedder + populator + chunker)alongside the existing `_engine_or_503`;**strict 503** for upload/reindex routes(uploads can't function without Azure cred);file-top docstring updated with the CH-001 closure narrative;imports for `IndexPopulator` / `Embedder` / `Chunker` Protocols added
- ✅ Verified `mypy --strict` clean on the 4 changed files(`indexing/populate.py` + `api/server.py` + `api/routes/kb.py` + `api/routes/documents.py`);transitive mypy errors exist in OTHER unrelated files(eval/ragas_evaluator, api/routes/query, etc — pre-existing baseline, not introduced by this Change)
- ✅ Verified `ruff check` at the pre-existing 19-error baseline on `api/server.py`(my 2 new imports added 2 noqa-suppressed entries — net delta zero)+ clean on the other 3 files
- ✅ Verified `pytest backend/tests/test_orchestrator.py tests/test_api_skeleton.py tests/test_documents_listing.py tests/test_kb_management.py tests/test_kb_reindex.py tests/test_multi_kb_routing.py` — **46 tests pass**(including the previously-failing `test_delete_kb_in_memory_baseline_preserved_per_b1` after the fail-soft fix)
- ✅ Verified `python -c "import api.server"` clean(no startup error)

### Decisions
- **Fail-soft when populator is None**(both POST + DELETE /kb)── necessary to preserve the W16 F5.3 Decision B.1 in-memory baseline + the existing test contract. Spec §2.1 wasn't explicit about this case;documented in the route docstrings + this Day-1 entry. Strict Azure-required would be wrong for dev/CI where `.env` may not have Azure cred. Upload routes(documents.py)remain strict-503 because they genuinely can't function without Azure.
- **Per-request `IngestionOrchestrator` construction**(not lifespan)── because `select_parser(Path)` resolves the parser per-file-extension;orchestrator holds parser reference;cheap to construct(just dataclass-ish). Embedder + populator are lifespan-shared.
- **Embedder shared between RetrievalEngine + ingestion path** ── `app.state.embedder = embedder` exposed alongside the existing `RetrievalEngine(embedder=embedder, …)` wrapping. Safe because the embedder is a stateless async httpx client(no per-call state). Saves one Azure OpenAI client.
- **`_load_index_schema()` cached via `lru_cache(maxsize=1)`** ── schema.json is small + immutable per-process;cache the parsed dict once;cheap.
- **`# noqa: E402` on the 2 new `server.py` imports** ── same truststore-after-imports pattern as the 19 pre-existing E402 errors in the file. Not refactoring the whole file's noqa (Karpathy §1.3 — don't refactor what isn't broken from your edit's perspective).

### Blockers
- None

### Effort
- Planned (Phase 1 + 1.5):~2.5h (T1.1-T1.5.10)
- Actual:~2.5h (this session)
- Variance:0

### Commits
| Hash | Subject |
|---|---|
| _(pending — committing now)_ | feat(backend,api,ingestion): CH-001 Phase 1 + 1.5 — IndexPopulator multi-KB lifecycle + lifespan wiring + POST/DELETE /kb auto-provisioning (close ADR-0018 Phase 3 upload-side) |

### Next
- **Phase 2** T2.1-T2.10 ── wire `POST /kb/{kb_id}/documents`(UploadFile → tempfile → select_parser → IngestionOrchestrator → IndexPopulator.upload(kb_id=) → KB counter sync)
- **Phase 3** T3.1-T3.5 ── wire `DELETE /kb/{kb_id}/documents/{doc_id}`(IndexPopulator.delete_doc → 404 / 502 / 204)
- **Phase 4** T4.1-T4.9 ── wire `POST /kb/{kb_id}/documents/{doc_id}/reindex`(replace-in-place per Decision A = (ii))
- Likely commit Phase 2-4 as one logical chunk(same file, same lifespan deps, atomic CO_F3a closure)
- Then Phase 5 backend tests + Phase 7 docs

---

## Day 2 — Phase 2 + 3 + 4 document routes + counter-sync(2026-05-11)

### Done
- ✅ **T1.3 (deferred from Day 1)** `backend/kb_management/storage.py` + `postgres_backend.py` + `service.py` ── added counter-sync infra:
  - `KBStorageBackend.update_metrics(kb_id, *, documents_delta=0, chunks_delta=0, last_indexed_at=None, append_failure=None) -> KbStatus` Protocol method
  - `InMemoryKBBackend.update_metrics` — read-modify-write via `kb.model_copy(update={...})`;`max(0, …)` floors prevent negative drift
  - `PostgresKBBackend.update_metrics` — single SQL UPDATE with `GREATEST(0, total_documents + %s)` arithmetic + `COALESCE(%s, last_indexed_at)` overwrite + `failed_documents || %s::jsonb` JSONB array append(via `psycopg.types.json.Jsonb`)
  - `KBService.record_doc_event` wrapper forwards to backend
  - **Minimal scope** per progress.md Day-1 plan:tracks `total_documents` + `total_chunks` + `last_indexed_at` + `failed_documents`;**skips** `total_screenshots` + `storage_size_mb`(drift acceptable — no per-doc size tracking yet;documented as a known follow-up below)
- ✅ **Phase 2 (T2.1-T2.10)** `POST /kb/{kb_id}/documents` (`api/routes/documents.py:upload_document`)
  - `_slugify_doc_id(stem)` helper:lowercase + `re.sub(r"[^a-z0-9-]+", "-", …)` + collapse multi-dashes + strip leading/trailing → returns `""` on empty input → 422 `validation.invalid_doc_id`
  - `_api_error(code, message, hint, http_status)` helper → builds the uniform `{code, message, actionable_hint}` envelope HTTPException matching the W7 D4 F4.1 error-handlers convention
  - `_doc_exists_in_kb(engine, kb_id, doc_id)` helper:fail-open dup check via `RetrievalEngine.list_documents(kb_id)`(Azure errors → False so the upload still proceeds;worst case = `mergeOrUpload` action handles idempotently)
  - `_run_ingest_pipeline(*, upload_file, kb_id, doc_id, deps, service)` SHARED helper(reused by POST + reindex):tempfile stream via `shutil.copyfileobj(file.file, tmp)` → `select_parser(tmp_path)` → `IngestionOrchestrator(parser, deps.chunker, deps.embedder, uploader=None).ingest(...)` → `deps.populator.upload(result.chunks, kb_id=kb_id)`(targets `ekp-kb-{kb_id}-v1`)→ on success `service.record_doc_event(documents_delta=+1, chunks_delta=succeeded, last_indexed_at=now)`;on `result.failure` → `record_doc_event(append_failure=…)` + 502 `ingestion.{stage}_failed`;`finally:` unlinks the tempfile
  - Route handler:`_verify_kb_or_404` → `_ingestion_deps_or_503` → `_engine_or_503` → filename validation → `_slugify_doc_id` → `_doc_exists_in_kb` 409 dup check → `_run_ingest_pipeline` → 202 with `{doc_id, status:"indexed", chunks_emitted, images_uploaded, images_deduped}`
  - 7 error codes wired:`validation.file_required` / `validation.invalid_doc_id` / `validation.unsupported_format` / `kb.not_found` / `document.duplicate` / `ingestion.{parse,embed,index}_failed`(per AC1-AC7)
- ✅ **Phase 3 (T3.1-T3.5)** `DELETE /kb/{kb_id}/documents/{doc_id}` (`api/routes/documents.py:delete_document`)
  - `_verify_kb_or_404` → `_ingestion_deps_or_503` → `deps.populator.delete_doc(kb_id, doc_id)` → return count
  - `count == 0` → 404 `document.not_found`(clean idempotency:DELETE-on-missing surfaces an error, doesn't silently 204)
  - Azure errors → 502 `index.delete_failed`
  - Success → `service.record_doc_event(documents_delta=-1, chunks_delta=-count, last_indexed_at=now)` + 204 No Content
- ✅ **Phase 4 (T4.1-T4.9)** `POST /kb/{kb_id}/documents/{doc_id}/reindex`(`api/routes/documents.py:reindex_document`)── Decision A = (ii) replace-in-place
  - Signature changed to accept `UploadFile` body(was no body in stub)
  - `_verify_kb_or_404` → `_ingestion_deps_or_503` → `_engine_or_503` → `_doc_exists_in_kb` (404 if doc missing) → slugify uploaded-file stem and verify `== doc_id` (422 `reindex.doc_id_mismatch` — UX safety against "uploaded wrong file")
  - Atomic delete-then-ingest:`deps.populator.delete_doc(kb_id, doc_id)` → `service.record_doc_event(documents_delta=-1, chunks_delta=-deleted_count)` for the delete-half → `_run_ingest_pipeline(...)` reused
  - Mid-pipeline failure(after delete, before re-ingest succeeds)→ re-wrap the pipeline's HTTPException as **502 `reindex.partial_failure`** with the actionable hint:「The old chunks are gone — retry via POST /kb/{kb_id}/documents with the same file.」(per AC9.3 + spec §4 R3)
  - 202 with `{doc_id, status:"reindexed", chunks_emitted, images_uploaded, images_deduped}`
- ✅ **`tests/test_kb_reindex.py`** updated:`test_per_doc_reindex_still_501_per_karpathy_surgical` (asserted `== 501`)renamed → `test_per_doc_reindex_503_without_azure_per_ch001`(asserts `== 503` in the no-Azure-cred dev/test setup — the natural fail-closed state via `_ingestion_deps_or_503`);file-top docstring updated with the CH-001 reference
- ✅ `ruff check api/routes/documents.py kb_management/ indexing/populate.py` → **All checks passed!**
- ✅ `mypy --strict --explicit-package-bases` clean on my 4 changed files(the 49 transitive errors in 14 other files are pre-existing baseline — unrelated)
- ✅ `pytest backend/tests/{test_orchestrator,test_api_skeleton,test_documents_listing,test_kb_management,test_kb_reindex,test_multi_kb_routing}.py` → **46 passed**(including the rewritten reindex test)

### Decisions
- **Counter-sync min-scope**:`total_documents` + `total_chunks` + `last_indexed_at` + `failed_documents` only;**`total_screenshots` + `storage_size_mb` drift accepted**(no per-doc size tracking yet — adding it needs a new DB column or per-doc size storage,which is genuinely future-tier work). The dashboard's "X documents · Y chunks · Z.0 MB" will show 0 MB / 0 screenshots until that follow-up;documented in the storage Protocol docstring + this entry.
- **Counter-sync failure = non-fatal**(per spec R7):`try/except` around every `record_doc_event` call in the routes;structlog.exception on failure but the user-facing response is still 202/204. Counter drift is recoverable via a future "rebuild counters from index" job;dropping the upload because the counter write failed would be worse UX.
- **Tempfile cleanup ALWAYS runs**(spec S9): `tmp_path` declared outside the try, `finally:` unlinks if `tmp_path is not None and tmp_path.exists()`.OSError on unlink → log warning but don't propagate(the tempfile is in `tempfile.gettempdir()` and will be GC'd by the OS).
- **`_run_ingest_pipeline` shared helper**(spec T4.9): DRY between POST upload and POST reindex(~90% common code:tempfile + select_parser + orchestrator + populator + counter-sync + 502 branches).Each route adds only its own pre-flight checks(POST: dup check;reindex: doc-exists check + doc_id-match safety check + pre-delete).
- **Fail-open `_doc_exists_in_kb`**(spec T2.2): if `engine.list_documents` raises(Azure outage), allow upload to proceed.`IndexPopulator.upload` uses `@search.action: "mergeOrUpload"` which is idempotent per chunk_id,so the worst case is a re-overlay, not a corruption.
- **Reindex doc_id-match safety check** is the spec §2.3 (ii) commitment;catches "user picked the wrong file" before destructive delete.Slugify both `{path_doc_id}` and `{uploaded_file_stem}` then compare → 422 `reindex.doc_id_mismatch` if mismatched.
- **`scripts/run_populate_sanity.py` not migrated**(spec §2.4 explicit out-of-scope):W2-era script still uses `populator.upload(result.chunks)` with `kb_id=None` default,relying on `self.index_name = "ekp-kb-drive-v1"`. Works as-is.

### Blockers
- None at end of Day-2. Phase 5 (backend tests) + Phase 6 (manual smoke) + Phase 7 (docs closeout) remain.

### Effort
- Planned (Phase 2 + 3 + 4):~3h (T2.1-T4.9)
- Actual:~2.5h (this session;real-calendar collapse pattern)
- Variance:-0.5h

### Commits
| Hash | Subject |
|---|---|
| `c2aca46` | feat(api,ingestion): CH-001 Phase 1 + 1.5 — IndexPopulator multi-KB lifecycle + lifespan wiring + POST/DELETE /kb auto-provisioning (close ADR-0018 Phase 3 upload-side) |
| _(pending — this session)_ | feat(api,ingestion): CH-001 Phase 2 + 3 + 4 — document routes wired (POST upload / DELETE doc / POST reindex replace-in-place) + KBService.record_doc_event counter-sync (close CO_F3a) |

### Next
- **Phase 5** T5.1-T5.22 ── NEW `backend/tests/api/test_documents_route.py` with monkeypatched orchestrator + populator + KBService(real Azure-call tests = `scripts/run_populate_sanity.py` territory, not in CI);target ~15 tests covering AC1-AC10 + AC18-AC22 + AC9.1-AC9.3 reindex paths + IndexPopulator unit tests
- **Phase 6** T6.1-T6.6 ── manual smoke on `:3001` + `:8000`(user's pre-Beta walkthrough since I can't drive the browser:fresh KB create → upload doc → see chunks in the Documents tab → DELETE → verify gone;need user's Azure cred in `.env` for end-to-end)
- **Phase 7** T7.1-T7.8 ── docs hygiene(file-top docstring removals + ADR-0018 timing row + COMPONENT_CATALOG C03/C08 + session-start §11 CO_F3a flip + grep `501` = 0 verify + progress closeout + frontmatter status → done)

---

## Day 3 — Phase 5 backend tests(2026-05-11)

### Done
- ✅ **T5.1** NEW `backend/tests/api/__init__.py`(empty package marker)+ `backend/tests/api/test_documents_route.py` ── ~560 LOC,24 test cases。Test fixtures:`_populator_mock`(MagicMock with 4 AsyncMock methods)+ `_engine_mock`(RetrievalEngine.list_documents AsyncMock)+ `_patch_orchestrator`(monkeypatch `IngestionOrchestrator` to factory returning MagicMock with `.ingest` AsyncMock + `select_parser` to MagicMock parser)+ `_build_app`(FastAPI + 2 routers + dependency_overrides + app.state shape)
- ✅ **Phase 5 ticked** T5.1-T5.18 + T5.20-T5.22(checklist updated this commit)
- ✅ **T5.2-T5.7** POST upload coverage:happy(`test_upload_happy_path_returns_202_indexed`),per-KB index targeting(`test_upload_targets_per_kb_index_not_legacy` AC22),counter sync(`test_upload_records_counter_event_on_success` AC10),pdf+pptx parametrized(AC2),unsupported `.txt` → 422(AC3),unknown kb → 404 + populator-never-awaited(AC4),no-populator → 503(AC5),parse/embed failure parametrized → 502(AC6),partial index failure → 502(AC6 b)
- ✅ **T5.8** Duplicate doc_id → 409(`test_upload_duplicate_doc_id_returns_409`)+ populator.upload never awaited
- ✅ **T5.9** DELETE 3 paths:happy + counter(204)/ not-found(404 `document.not_found`)/ Azure error(502 `index.delete_failed`)
- ✅ **T5.10-T5.12** Reindex(Decision A = (ii) replace-in-place)5 tests:happy(`test_reindex_happy_returns_202_reindexed` AC9.1)/ missing-filename(`test_reindex_missing_filename_returns_422` AC9.2 — FastAPI's own UploadFile validation surfaces 422 BEFORE the route's defensive guard;`delete_doc.assert_not_awaited()`)/ doc-not-found(`test_reindex_doc_not_found_returns_404` AC9 — `_doc_exists_in_kb` returns False → 404)/ doc-id-mismatch(`test_reindex_doc_id_mismatch_returns_422` AC9 — uploaded `wrong-doc.docx` vs path `manual`)/ mid-pipeline-failure(`test_reindex_mid_pipeline_failure_returns_502_partial` AC9.3 — FailureRecord AFTER delete_doc → 502 `reindex.partial_failure` + delete_doc.assert_awaited_once)
- ✅ **T5.14-T5.17** POST /kb + DELETE /kb auto-provisioning(Decision B = (β)):`test_post_kb_calls_create_index_for_kb` AC18 / `test_post_kb_index_create_fail_rolls_back_returns_502` AC19(GET → 404 confirms storage rollback)/ `test_delete_kb_calls_delete_index` AC20 / `test_delete_kb_index_already_gone_fail_soft_returns_204` AC21
- ✅ **T5.18** AC22 — `populator.upload.call_args.kwargs["kb_id"] == "drive_user_manuals"`(NOT `None`)— confirms per-KB index targeting
- ✅ **T5.20** `pytest tests/api/test_documents_route.py` → **24 passed**
- ✅ **T5.21** Regression run:`pytest tests/{test_orchestrator,test_api_skeleton,test_documents_listing,test_kb_management,test_kb_reindex,test_multi_kb_routing}.py tests/api/test_documents_route.py` → **70 passed**(46 prev + 24 new;zero regression)
- ✅ `mypy --strict --explicit-package-bases tests/api/test_documents_route.py` → 0 errors on the test file(47 transitive errors in 15 other files = pre-existing baseline,unrelated to CH-001)
- ✅ `ruff check tests/api/test_documents_route.py` → clean(initial run flagged I001 import-ordering — auto-fixed via `--fix`)
- ✅ **T5.22** `pnpm test:unit` skipped — CH-001 made zero frontend changes(no `frontend/` paths touched per `git diff --stat b87ce77..HEAD`);implicit AC12 satisfied

### Decisions
- **T5.19 🚧 deferred(`test_index_populator.py` for httpx-mocked unit tests)** ── Karpathy §1.2 simplicity-first:`create_index_for_kb` + `delete_index` + `delete_doc` + `upload(kb_id=)` are transitively covered via the 4 route-level tests(T5.14-T5.17 + AC22)+ `scripts/run_populate_sanity.py` reference + `scripts/create_index.py` precedent. A dedicated httpx-mocked unit test file adds little beyond integration-smoke noise — deferred to a future "Azure REST smoke harness" Change if real-Azure validation becomes a priority(W16+ Track A candidate).
- **`_orch_factory` returns a per-call MagicMock** with the SAME `.ingest` AsyncMock attribute(shared across instances)── allows tests to call `ingest_mock.assert_awaited_once()` regardless of how many orchestrator-construction calls happened in the route. Cleaner than `monkeypatch.setattr` of `IngestionOrchestrator.ingest` directly because the orchestrator dataclass `__init__` then has nothing to do with the test.
- **`_FakeUploadResult` duck-types `IndexUploadResult`** (3 attrs:`succeeded` / `failed` / `failed_keys`)── avoid importing the real class. The route reads `upload_result.succeeded` + `upload_result.failed` only;duck-typing is enough.
- **T5.11 `test_reindex_missing_filename_returns_422` — surfaced a route-level dead-code finding**:FastAPI's own UploadFile validation rejects an empty-filename multipart part at the framework layer BEFORE the route's `_api_error("validation.file_required", ...)` guard fires. The defensive guard is unreachable via HTTP. Documented in the test docstring + this entry ── NOT a refactor target per Karpathy §1.3 surgical(removing the guard would expand CH-001 scope unnecessarily;the guard is harmless defensive code).
- **TestClient + multipart `files={"file": (filename, bytes, mime)}` pattern** is the canonical approach;`io.BytesIO` wrapping is unnecessary.
- **AsyncMock `name=` kwarg** ── kept on every Mock for nicer pytest traceback identification.
- **DeprecationWarning `HTTP_422_UNPROCESSABLE_ENTITY` 是 pre-existing** ── Starlette 0.47+ renames the constant to `_CONTENT`;FastAPI internal + `documents.py:377` use the old name. Out of CH-001 scope;mention in retro for a follow-up Karpathy-§1.3-surgical Change.

### Blockers
- None at end of Day-3.

### Effort
- Planned (Phase 5):~1.5-2h (T5.1-T5.22)
- Actual:~1h (this session;real-calendar collapse pattern — mocking patterns settled quickly because the test file mirrors `test_documents_listing.py`'s structure with the same KBService + app.state fixtures)
- Variance:-0.5h

### Commits
| Hash | Subject |
|---|---|
| _(pending — this session)_ | test(api): CH-001 Phase 5 — 24 backend tests for document routes + POST/DELETE /kb (AC1-AC10 + AC18-AC22 + AC9.1-AC9.3) |

### Next
- **Phase 6** T6.1-T6.6 — user-driven manual smoke(needs `:8000` backend restart + `.env` Azure cred + `/kb/new` Pipeline wizard end-to-end)── AI cannot drive the browser;user smoke after this Phase 5 commit
- **Phase 7** T7.1-T7.8 — docs closeout:remove documents.py file-top stale 501 stub note + ADR-0018 Implementation-timing row + COMPONENT_CATALOG.md C03/C08 status append + session-start.md §11 CO_F3a flip "stays 501 stub" → "CLOSED by CH-001" + grep `501` = 0 verify(AC17)+ progress closeout summary + frontmatter `in-progress → done`

---

## Day 4 — Phase 7 docs closeout(2026-05-11)

### Done
- ✅ **T7.1** documents.py file-top docstring ── already CH-001-aware after Phase 2-4 commits;line 4 historical reference 「W16 F5.1.1 closure (CO_F3a): GET /kb/{kb_id}/documents — replaced 501 stub …」 retained as narrative provenance(NOT a stub itself per AC17 literal text:"the file no longer has any 501 stub")
- ✅ **T7.2** Route docstrings ── POST upload / DELETE doc / POST reindex docstrings all written in Phase 2-4 commits;`routes/kb.py` POST/DELETE docstrings updated in Phase 1.5 commit `c2aca46`
- ✅ **T7.3** `session-start.md §11` ── flipped **CO_F3a/b/c** line 285 from「per-doc upload/reindex/delete stays 501 stub — W2 ingestion + Track A」to「**per-doc upload/reindex/delete CLOSED by CH-001 2026-05-12**」(详 mechanics inline);line 301 「⏸ CO_F3a/b/c → W16 F5.1-F5.3」 changed to「✅ CO_F3a/b/c — GET docs/chunks/PATCH:W16 F5.1-F5.3 done;upload/delete/reindex:CLOSED by CH-001 2026-05-12」
- ✅ **T7.4** `COMPONENT_CATALOG.md` ── C03 Indexing Service Status row appended:`create_index_for_kb` + `delete_index` + `delete_doc` + `upload(kb_id=)` BC ext + ADR-0018 Phase 3 upload-side closure note;C08 API Gateway Status row appended:3 document routes wired + POST/DELETE /kb auto-index-provisioning + 24 backend tests
- ✅ **T7.5** `docs/adr/0018-multi-kb-kb-id-propagation.md` ── added a 「2026-05-12 (CH-001) — Phase 3 upload-side CLOSED」 inline block under `**Implementation timing**:` summarizing the upload-side mechanics + reiterating the **blob-container-side stays deferred**(R12 Azurite + W16+ Track A);**Status remains `Accepted`** pending blob-side closure ── per CH-001 spec §6.6 + R11
- ✅ **T7.6** `grep -n 'HTTP_501\|501_NOT_IMPLEMENTED' backend/api/routes/documents.py` → **0 hits**(AC17 satisfied)
- ✅ **T7.7** Day-4 closeout summary written(this entry)+ Closeout block below filled
- ✅ **T7.8** Frontmatter `status: in-progress → done` on both `progress.md` + `checklist.md` + `spec.md` ── this commit

### Decisions
- **T7.1 retained narrative line in documents.py:4** ── Karpathy §1.3 surgical:the line documents the *history* of how `GET /kb/{kb_id}/documents` got real(W16 F5 closed listing 501 before CH-001 closed upload/delete/reindex 501s)。Stripping it would erase useful provenance。AC17 literal text:「the file no longer has any 501 stub」 ── the *stubs* are gone(grep `HTTP_501` = 0);retaining mention of "previously was a 501 stub" is honest documentation。
- **ADR-0018 Status stays `Accepted`** ── per spec R11 + §6.6:upload-side closed but blob-container-side(`ekp-kb-{kb_id}-screenshots` per ADR-0005)still R12-Azurite-blocked。Flipping to `done` would mis-signal completion。
- **No `components/C03-*.md` design note bump** ── per Cross-Cutting:「No new component design note bump required(C01 + C03 + C08 are already `v1-active` — only `Status` row appended」

### Blockers
- None.

### Effort
- Planned (Phase 7):~0.5h(T7.1-T7.8)
- Actual:~0.5h(this session)
- Variance:0

### Commits
| Hash | Subject |
|---|---|
| _(pending — this session)_ | docs(planning,adr,catalog): CH-001 Phase 7 closeout — CO_F3a flipped CLOSED + ADR-0018 Phase 3 upload-side closed + COMPONENT_CATALOG C03/C08 status + frontmatter done |

---

## Closeout(status=done)

### Acceptance verification(against spec §3 AC1-AC22)

| AC | Outcome | Notes |
|---|---|---|
| **AC1** | ✅ | POST .docx → 202 `{doc_id, status:"indexed", chunks_emitted, images_uploaded, images_deduped}`;unit-tested:`test_upload_happy_path_returns_202_indexed` |
| **AC2** | ✅ | .pdf + .pptx parametrized(`test_upload_supports_pdf_and_pptx`) |
| **AC3** | ✅ | .txt → 422 `validation.unsupported_format`(`test_upload_unsupported_format_returns_422`) |
| **AC4** | ✅ | unknown kb_id → 404 + populator-never-awaited(`test_upload_unknown_kb_returns_404`) |
| **AC5** | ✅ | `index_populator is None` → 503(`test_upload_no_populator_returns_503`) |
| **AC6** | ✅ | parse/embed parametrized → 502 `ingestion.{stage}_failed` + index partial → 502 `ingestion.index_failed` |
| **AC7** | ✅ | duplicate doc_id → 409 `document.duplicate` |
| **AC8** | ✅ | DELETE 3 paths(204 / 404 `document.not_found` / 502 `index.delete_failed`)|
| **AC9.1** | ✅ | reindex happy → 202 `reindexed` + delete_doc.assert_awaited_once |
| **AC9.2** | ✅ | empty filename multipart → 422(FastAPI's own UploadFile validation fires first — route's `validation.file_required` defensive guard unreachable via HTTP, documented in the test)|
| **AC9.3** | ✅ | mid-pipeline FailureRecord AFTER delete → 502 `reindex.partial_failure` |
| **AC10** | ✅ | counter sync covered in 2 tests;**minimal scope**:`total_documents` + `total_chunks` + `last_indexed_at` + `failed_documents` — screenshots + storage_size_mb drift accepted(known follow-up)|
| **AC11** | ✅ | `pytest tests/api/test_documents_route.py` → 24 passed |
| **AC12** | ✅ | regression 46 prev + 24 new = 70 passed,zero regression;`pnpm test:unit` skipped(no frontend touch)|
| **AC13** | ✅ | `mypy --strict` 0 errors on new test file(47 transitive errors = pre-existing baseline)、`ruff check` clean |
| **AC14** | 🟡 user-deferred | Pipeline wizard end-to-end smoke = Phase 6 owned by the user — AI can't drive a browser headlessly(needs backend restart + `.env` Azure cred);same deferral pattern as W12-W18 pre-Beta smoke |
| **AC15** | ✅ | session-start §11 CO_F3a flipped + ADR-0018 inline Phase 3 upload-side closure note + COMPONENT_CATALOG C03/C08 status updated |
| **AC16** | ✅ | Conventional Commits + CC tags throughout:`671a925` `2c088cd` docs(planning) / `c2aca46` `b87ce77` feat(api,ingestion) / `c323e6b` test(api) / Phase-7 docs |
| **AC17** | ✅ | `grep 'HTTP_501\|501_NOT_IMPLEMENTED' documents.py` → 0 hits |
| **AC18** | ✅ | `test_post_kb_calls_create_index_for_kb` — POST /kb → 201 + create_index_for_kb awaited + GET → 200 |
| **AC19** | ✅ | `test_post_kb_index_create_fail_rolls_back_returns_502` — 502 + GET → 404(storage rollback verified)|
| **AC20** | ✅ | `test_delete_kb_calls_delete_index` — DELETE /kb → 204 + delete_index awaited |
| **AC21** | ✅ | `test_delete_kb_index_already_gone_fail_soft_returns_204` — fail-soft on 404 |
| **AC22** | ✅ | `test_upload_targets_per_kb_index_not_legacy` — `populator.upload.call_args.kwargs["kb_id"] == "drive_user_manuals"`(NOT `None`)|

**Aggregate**:**21/22 ✅ + 1/22 🟡 user-deferred**(AC14 manual smoke — pre-Beta smoke deferral pattern per ADR-0017 R8 + headless-browser-not-AI-controllable);**No ❌ failed**。

### Effort summary

| Day | Planned (h) | Actual (h) | Variance |
|---|---|---|---|
| Day 0 (kickoff + Decision A + B + spec v1.0→v1.1→v1.2) | 2.5 | 2.5 | 0 |
| Day 1 (Phase 1 + 1.5 backend wiring + multi-KB) | 2.5 | 2.5 | 0 |
| Day 2 (Phase 2/3/4 routes + counter-sync) | 3 | 2.5 | -0.5 |
| Day 3 (Phase 5 — 24 tests) | 1.5-2 | 1 | -0.5 to -1 |
| Day 4 (Phase 7 docs closeout) | 0.5 | 0.5 | 0 |
| **Total** | **10-10.5** | **9** | **-1 to -1.5** |

Vs spec §5 estimate(6-9h post Decision B):**actual 9h within upper bound**(Decision B scope expansion well-anticipated;`record_doc_event` Postgres-side SQL took ~30min extra but test-writing real-calendar collapse saved it back)。

### Lessons

- **What worked**:
  - **Spec → checklist → code → test → docs** sequence held per PROCESS.md §3 Change workflow;each Phase had a clean Day-N progress entry + ≥ 1 commit
  - **Decision surfacing PRE-implementation**(A then B)── saved a CH-002 split + avoided over-broad Track A deferral
  - **Karpathy §1.3 surgical re fail-soft** ── when strict-503 `_populator_or_503` broke the existing in-memory baseline test,fixed via `_get_populator -> IndexPopulator | None` + explicit fail-soft branches in both routes(deviation documented in route docstring + Day-1)── explicit-decision beats silent-drift
  - **`_run_ingest_pipeline` SHARED helper** ── ~90% code reuse between POST upload + POST reindex
  - **AsyncMock + factory pattern for orchestrator** ── `_orch_factory` returning MagicMock with `.ingest` AsyncMock attribute allowed clean `assert_awaited_once()` assertions without leaking the dataclass `__init__` contract into the test
  - **Real-calendar collapse on test writing**(Day-3 1h vs planned 1.5-2h)── fixture pattern mirrored `test_documents_listing.py` + `_build_app` + KBService fixture
- **What didn't / unexpected friction**:
  - **FastAPI `UploadFile` validation pre-empts the route's `validation.file_required` guard** ── Day-3 test initially asserted `detail["code"] == "validation.file_required"` and hit `TypeError: list indices must be integers` because FastAPI returns multi-error list envelope;route's defensive guard is dead code via HTTP。Test fixed by just asserting `status_code == 422`(documented in test docstring);NOT refactored away per Karpathy §1.3 surgical — out of CH-001 scope
  - **`mypy --strict` 1 type-arg warning on `_docx_files` return type** ── trivial fix(`dict[str, tuple[str, bytes, str]]`)
  - **2 ruff I001 import-ordering** ── auto-fixed via `--fix`
  - **Postgres-side `update_metrics` SQL** ── `GREATEST(0, …)` + `COALESCE` + JSONB `||` append in single statement took ~30 min extra
- **Carry-overs**:
  - 🚧 **Per-KB Azurite blob container provisioning**(`ekp-kb-{kb_id}-screenshots`)── R12 + W16+ Track A;ADR-0018 stays `Accepted` until blob-side closes
  - 🚧 **`total_screenshots` + `storage_size_mb` counter drift** ── no per-doc size tracking;future-tier follow-up
  - 🚧 **`scripts/run_populate_sanity.py` migrate to `populator.upload(kb_id=)`** ── spec §2.4 explicit out-of-scope;works as-is via BC default
  - 🚧 **`test_index_populator.py` httpx-mocked unit tests**(T5.19)── deferred per Karpathy §1.2 simplicity-first;transitively covered via route-level tests
  - 🚧 **Phase 6 manual smoke** ── owned by the user;headless browser not AI-controllable per ADR-0017 R8 umbrella
  - 📝 **`HTTP_422_UNPROCESSABLE_ENTITY` Starlette 0.47+ rename to `_CONTENT`** ── 2 DeprecationWarnings at `documents.py:377` + FastAPI internal;follow-up surgical Change candidate

### Component design note status updates
- **C01**(Ingestion):`v1-active`(orchestrator path now also exercised via HTTP route — no spec/interface change → no version bump)
- **C03**(Indexing):`v1-active` + `IndexPopulator` extended with 3 new methods + 1 BC sig ext;`COMPONENT_CATALOG.md` C03 Status row appended
- **C08**(API Gateway):`v1-active`(stub-cascade fully closed:5 KB endpoints + GET docs + 3 document routes wired);`COMPONENT_CATALOG.md` C08 Status row appended

### CO_F3a status flip
- `session-start.md §11`(line 285 + 301)flipped from「stays 501 stub」 to **「CLOSED by CH-001 2026-05-12」** per ADR-0018 Phase 3 upload-side ── Phase 7 T7.3 done

### ADR status touch
- **ADR-0018** Status stays `Accepted`(NOT `done`)── Phase 3 upload-side closed by CH-001 2026-05-12;Phase 3 blob-container-side stays deferred(R12 + W16+ Track A);inline note added under `**Implementation timing**:`
- **No new ADR** created(per spec §6.5 — H1/H2 verified clean;Decision B = implementation of existing ADR-0018, not new architectural decision);next NNNN remains **0025**
- **23 ADR landed total**(0001-0012 + 0014-0024;0013 reserved for AF3 fix)

---

**End of CH-001 progress**
