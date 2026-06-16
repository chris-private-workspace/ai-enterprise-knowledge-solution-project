# W82 checklist — Settings 全域 preset-mapping write surface(ADR-0063)

> Atomic items per deliverable。每日 tick。Source of truth = `plan.md`。

## F1 — Backend persist store + 解析 ✅
- [x] F1.1 新 `backend/kb_management/preset_override_store.py`(mirror `doc_profile_store.py`,global key)
  - [x] `PresetOverrideStore` Protocol(get / upsert / delete / list_all)
  - [x] `InMemoryPresetOverrideStore`
  - [x] `PostgresPresetOverrideStore`(lazy psycopg + `CREATE TABLE IF NOT EXISTS profile_preset_overrides`)
  - [x] `make_preset_override_store(settings)`(Postgres if `database_url` else in-memory)
- [x] F1.2 `profile_presets.py` 加 async `resolve_preset(profile, store)`(`store.get ?? preset_for`)
- [x] F1.3 unit test:InMemory CRUD + `resolve_preset` fallthrough(無 override == `preset_for` bit-identical / 有 override 用 override)→ `test_preset_override_store.py` 14 passed
- [x] F1 gate:mypy strict(`Success: no issues found in 2 source files`)+ ruff(`All checks passed`)+ pytest 14 passed

## F2 — Backend write API + call-site migrate ✅
- [x] F2.1 新 `backend/api/routes/profile_presets.py`(GET / PUT / DELETE + `PresetMappingItem` schema)
- [x] F2.2 `server.py` wire store(`make_preset_override_store`)+ router(`include_router`,mirror doc_profile_store DI)
- [x] F2.3 三 call site `preset_for` → `resolve_preset`(`_route_profile_preset`+ingest / `override_doc_profile` / backfill `_backfill_one_doc_profile`)+ `_IngestionDeps.preset_override_store` + `_preset_override_store(request)` helper
- [x] F2.4 pytest:GET effective + PUT upsert + DELETE 還原 + 422 非法 profile(parametrize ×4)+ 503 unwired + `_route_profile_preset` 認 override 整合 → `test_profile_presets_routes.py`
- [x] F2.5 回歸:無 override 時三 call site bit-identical(`test_route_preset_production_preserve_without_override` + `resolve_preset(None)` fallback)+ routing/override/backfill 既有 test 全綠
- [x] F2 gate:mypy strict(4 module clean;唯一 error = `_engine_or_503` no-any-return `git stash` 證 baseline pre-existing)+ ruff clean(non-server「All checks passed」;server.py E402=40 baseline 零新增)+ pytest 50 passed

## F3 — Frontend wire ✅(code;F4 browser 驗待重啟後)
- [x] F3.1 新 `frontend/lib/api/profile-presets.ts`(`PresetMappingItem` + reuse `DocConfig` + GET/PUT/DELETE client)
- [x] F3.2 `settings-doc-profiling.tsx` 硬編碼 `PRESETS` → fetch `GET /profile-presets`(`useQuery`;effective view + 已覆寫 黃旗 badge)
- [x] F3.3 解 disabled「編輯」→ edit `Dialog`(復用 `dialog.tsx` primitive + `.field/.input/.switch/.seg`,視覺零發明;full-config draft 保 hidden 欄)
- [x] F3.4 儲存 → `PUT`(Dialog + warning banner = 儲存確認 gate)+ invalidate + `toast`;每 row「還原預設」→ `DELETE`(可逆 undo,如 L3)+ toast
- [x] F3.5 threshold card 維持唯讀 / disabled 不變(verbatim 保留 + disabled title 更新指 W79/ADR-0058)
- [x] F3 gate(code):type-check 0 + lint 零新 warning(唯一 = pre-existing `chat:1858`)+ build **compile + type 驗證通過**(clean-exit 受並行 `next dev` `.next` race 阻,重啟後 confirm)

## F4 — Browser 驗(playwright)✅
- [x] F4.1 全服務重啟(backend venv dual-process + frontend wipe .next + clean build ✓)+ pre-flight(Langfuse 200 + Postgres 1 row;postgres/langfuse/azurite 保持)
- [x] F4.2 Settings「文件分類規則」tab:表格 effective view(7 profile mockup order)→ 編 P2_prose 圖上限 12→99 → 儲存規則 → `GET /profile-presets` 確認 persist(overridden:True / 99 / answer_detail detailed 保留)
- [x] F4.3 「還原預設」→ DELETE → 回 factory(overridden:False / 12)
- [x] F4.4 threshold card 仍 disabled(scope 排除 ✓)
- [x] F4.5 驗完零污染(overridden profiles: NONE)
- [x] F4 gate:edit→save→persist→還原 round-trip **PASS**(編輯 Dialog 視覺零發明 + warning banner 儲存確認 gate;console 3 errors 全 pre-existing `/notifications` 404,我 component 零 error)

## F5 — closeout ✅
- [x] F5.1 全 gate 綠(backend pytest 50 + type-check/lint/build ✓ + browser round-trip PASS)
- [x] F5.2 plan closed + progress retro
- [x] F5.3 ADR-0063 README index(kickoff 已加 row + next → 0064)
- [x] F5.4 DD-11 由「結構性」表移去「已 Close」表 + 記證據
- [x] F5.5 memory `project_per_kb_tunable_config_vision` 更新(W82 段)
