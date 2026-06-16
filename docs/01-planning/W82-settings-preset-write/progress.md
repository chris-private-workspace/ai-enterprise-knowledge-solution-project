# W82 progress — Settings 全域 preset-mapping write surface(缺口 B,ADR-0063)

## Day 1 — 2026-06-16(kickoff)

**Context**:W81 closeout(缺口 A L3 image-anchor knobs)後,session-start gap 分析坐實**缺口 B** —
Settings「文件分類規則」tab 係「admin 指揮中心」調全域 profile→preset 映射,但 backend 冇 write
endpoint、前端 `PRESETS` 硬編碼 +「編輯」/「儲存規則」disabled。逐文件(L3,ADR-0058/0060)可調已通,
全域改唔到 →「指揮中心得一半」。

**狀況確認(code-grounded,grep 坐實非憑記憶)**:
- backend 只有 per-doc `PUT …/profile`(ADR-0058)+ `POST …/profiles/backfill`(ADR-0059),**冇**
  global preset / threshold write endpoint。
- `settings-doc-profiling.tsx` `PRESETS` 硬編碼鏡像 +「編輯」/「儲存規則」`disabled`(註解明標需
  backend write API)。

**用戶決定(2026-06-16,兩輪 AskUserQuestion)**:
1. W82 方向 = **B 收窄版**(preset 映射可寫;**threshold 維持不做** — 同 W79 ADR-0058 拍板,避免矛盾)。
2. 編輯互動 UI = **復用 Settings 既有 form 模式**(視覺零發明,W81 方案 A 同款;mockup 補 edit-form 設計
   走獨立 design sync)。
3. Guard = **還原預設 + 儲存確認**(每 row「還原預設」delete override→回出廠可逆 + 儲存前 confirm)。
4. DD-11 = **記入** `DEFERRED_REGISTER`(已記,免幻影工作項;close 條件 = 本 phase backend write API 落地)。

**Surface 過嘅 stale / 矛盾(揀之前已講清)**:
- 選項 A(D8 PDF/scan robustness)主體已 2026-06-15 探索後 defer(DD-9):robustness OK、真痛點 OCR 慢
  (Tier 2)+ 零 production scan KB → 唔行 A。
- 選項 B 原 prompt「threshold 寫入」同 W79「threshold 不做」矛盾 → 收窄為 preset 映射 only。

**ADR-0063 Accepted**(本 session):新全域 preset-mapping write surface — 持久層 mirror
`doc_profile_store.py`(global key)+ `resolve_preset` overlay(出廠值 `PROFILE_PRESETS` 不動)+
GET/PUT/DELETE API + 三 call site migrate + frontend 復用既有 form + guard。

**落點 ground(R6)**:
- 三 call site = `documents.py` `_route_profile_preset`(923)/ `PUT …/profile`(604 `preset_for`)/
  backfill(經 `_route_profile_preset`)→ 全 migrate `resolve_preset`。
- store mirror `doc_profile_store.py`(Protocol+InMemory+Postgres+factory),table 改 global
  `profile_preset_overrides(profile PRIMARY KEY, config JSONB)`。
- frontend `settings-doc-profiling.tsx`(硬編碼 `PRESETS` 20-36 / disabled 編輯 94-101)+ threshold
  card(139-146)**本 phase 不動**。

**紀律自檢**:H1 ⚠️→✅(ADR-0063 Accepted,follow persist precedent)/ H2 ✅ 零 dep / H4 ✅ 層 A admin /
H6 ✅ store+route 寫 test / H7 ⚠️→✅ edit-form design-stage expansion 用戶揀復用既有 form(視覺零發明)/
Karpathy ✅(store mirror reuse + 出廠值不動 overlay + 兩設計決定畀用戶揀 + production-preserve goal)。

**Plan 落地**:W82 folder + plan.md(active)+ checklist.md(F1-F5)+ progress.md + ADR-0063 + DD-11。

**F1 implement(Day 1)** ✅:
- **`backend/kb_management/preset_override_store.py`**(新)— verbatim mirror `doc_profile_store.py`,但
  **global key**(profile label,無 kb_id):`PresetOverrideStore` Protocol + `InMemoryPresetOverrideStore`
  + `PostgresPresetOverrideStore`(lazy psycopg + table `profile_preset_overrides(profile PRIMARY KEY,
  config JSONB)`)+ `make_preset_override_store`。value = `DocConfig`。
- **`backend/ingestion/profile_presets.py`** — 加 async `resolve_preset(profile, store)` =
  `override ?? preset_for`(出廠值 `preset_for` 不動,加 docstring 標明 factory vs effective);
  TYPE_CHECKING import `PresetOverrideStore`(零 runtime dep)。
- **`backend/tests/test_preset_override_store.py`**(新)— 14 test:InMemory CRUD(get/upsert/replace/
  delete-idempotent/list_all/copy-isolation)+ factory selection(無 DATABASE_URL→InMemory / 有→Postgres
  唔連線)+ `resolve_preset` overlay(無 override == `preset_for` bit-identical / None profile 維持 None /
  override 勝出 / override 可 route None-profile / 回傳 fresh copy 唔污染 store + factory)。
- **gate 全綠**:pytest **14 passed** / ruff **All checks passed** / mypy `--strict`
  **Success: no issues found in 2 source files**(25 個 mypy error 經核實全喺 `ingestion/parsers/*`
  docling 既有 stub debt,傳遞 import 拉入,我兩個檔零 error)。
- **production-preserve 坐實**:`test_resolve_no_override_is_bit_identical_to_factory` — 空 store 下
  `resolve_preset == preset_for` 對每個 profile;F1 純後端、零 API 接線、零 call-site 改動 →
  production 行為零影響(call-site migrate 留 F2)。

**Retro(F1)**:
- **store mirror = 零發明**:`doc_profile_store.py` 結構直接套(Protocol+InMemory+Postgres+factory),
  只改 key 由 `(kb_id, doc_id)` → global `profile`、value 由 `DocProfileInfo` → `DocConfig`。
- **出廠值不動 overlay 模式**:`preset_for` 保留做 factory reader(加 docstring 區分),`resolve_preset`
  做 effective overlay → 「還原預設」= 刪 override 自然回出廠,無需特殊邏輯。
- **mypy 全域跑會被 parser docling debt 淹**:本 phase 改檔用 `--follow-imports=silent -m <module>`
  隔離驗證(避免 file-path dup-name + 既有 parser 25 error 噪音);記低供 F2 沿用。

**F2 implement(Day 1)** ✅:
- **`backend/api/routes/profile_presets.py`**(新)— global scope route(無 KB verify):`GET /profile-presets`
  (effective factory view,`overrides ?? factory`,只列 7 個 routable profile + mockup order)+ `PUT
  /profile-presets/{profile}`(upsert override,422 非 routable label,reuse `preset_for is None` guard)+
  `DELETE /profile-presets/{profile}`(還原預設,idempotent 204)+ `PresetMappingItem`(profile/config/
  overridden)+ `_store` 503 guard(mirror `doc_config.py`)。
- **`backend/ingestion/profile_presets.py`** — `resolve_preset` 簽名改 `store: PresetOverrideStore | None`
  (None → factory,統一 graceful-degrade,call-site 零重複 guard;F1 簽名小修)。
- **`backend/api/routes/documents.py`** — 三 call site migrate `preset_for`→`resolve_preset`:`_IngestionDeps`
  加 `preset_override_store` 欄 + `_ingestion_deps_or_503` 讀 + `_preset_override_store(request)` helper +
  `_route_profile_preset` 加參數用 `resolve_preset`(ingest call site 傳 `deps.preset_override_store`)+
  `override_doc_profile`(ADR-0058 人手覆寫)用 effective preset + backfill `_backfill_one_doc_profile` 加參數
  + `run_kb_profile_backfill` 讀 store 傳入。移除 orphan import `preset_for`(Karpathy §1.3)。
- **`backend/api/server.py`** — `import make_preset_override_store` + `app.state.preset_override_store =
  make_preset_override_store(settings)`(mirror doc_profile_store lifespan)+ route module import + `include_router`。
- **`backend/tests/test_profile_presets_routes.py`**(新)+ `test_preset_override_store.py` 加 `resolve_preset(None)`
  fallback test。
- **gate 全綠**:pytest **50 passed**(新 route GET/PUT/DELETE/422×4/503 + `_route_profile_preset` 認 override
  整合 + production-preserve;regression routing/override/backfill 全綠)/ ruff non-server **All checks passed**
  (server.py E402=40 baseline 零新增,`git stash` 證)/ mypy `--strict` 4 module clean(唯一 error =
  `_engine_or_503` no-any-return `git stash` 證 baseline pre-existing,非本 phase)。
- **production-preserve 坐實**:`test_route_preset_production_preserve_without_override` —— 無 override 時
  `_route_profile_preset` 寫出 factory preset(== `preset_for`);production startup 空 store → 三條路
  bit-identical,直到 admin 編輯映射先生效。

**Retro(F2)**:
- **`resolve_preset(store | None)` 統一 graceful-degrade**:store 可 None(unwired)→ fallback factory,
  令三 call site migrate 零重複 None-guard(對齊 codebase 其他 store 全 `| None` 慣例);F1 簽名小修值得。
- **422 guard 復用既有 pattern**:`preset_for(cast(DocProfile, label)) is None` → 422,同 `override_doc_profile`
  (ADR-0058 line 604)一致,too_small/unknown/garbage 全攔。
- **mockup order 自然由 `PROFILE_PRESETS` dict insertion order 得**:`_routable_profiles` filter 非-None →
  7 個 P1-P5 順序 = mockup table 順序,零額外排序。
- **migrate 後驗 pre-existing 噪音必須 `git stash` 科學辨**:server.py E402(40 baseline)+ documents.py
  `_engine_or_503` no-any-return 都係 stash 證 baseline 已存在,非本 phase 引入(沿 W80 教訓)。

**F3 implement(Day 1)** ✅ code(F4 browser 驗待重啟後):
- **`frontend/lib/api/profile-presets.ts`**(新)— `PresetMappingItem`(profile/config/overridden)+ reuse
  `DocConfig` type(`doc-config.ts`)+ `profilePresetsApi` GET/PUT/DELETE(mirror `doc-config.ts` client)。
- **`frontend/components/settings/settings-doc-profiling.tsx`** — 硬編碼 `PRESETS` → `useQuery` fetch
  `GET /profile-presets`;table 顯示 effective config(formatter helper)+ 已覆寫 `badge-warning` 黃旗;
  解 disabled「編輯」→ **`EditPresetDialog`**(復用 `dialog.tsx` primitive + `.field/.input/.switch/.seg`
  mockup primitive,視覺零發明)+ warning banner(future-only + 全域影響 = 儲存確認 gate)+ 儲存 `PUT`/
  toast/invalidate;每 row「還原預設」→ `DELETE`/toast(可逆 undo,如 L3「還原至 KB」,無額外 confirm)。
  **threshold card verbatim 保留 disabled**(scope 排除,只更新 disabled title 指 W79/ADR-0058)。
- **關鍵正確性**:edit draft 由完整 fetched config 起(`{...config}`)→ PUT full replacement 保住 factory
  hidden 欄(`citation_neighbour_section_path_prefix_depth` / `enable_chapter_overview_pin` 等)唔變 null 退化。
- **gate(code)**:type-check **0** + lint **零新 warning**(唯一 = pre-existing `chat/page.tsx:1858` `<img>`)
  + build **「✓ Compiled successfully」+ type 驗證通過**。
- **build clean-exit 受阻 = 並行 `next dev` race(非 code)**:`next build`「Collecting page data」對隨機無關頁
  ENOENT(wipe 前 `/kb/new` → wipe 後 `/register` = 移動目標);`Get-CimInstance` 揪出 `next dev -p 3001`
  (pid 12704 + pnpm dev 57116 + worker 58176)正運行爭 `.next`(memory `project_frontend_next_cache_corruption`
  dev/build 衝突)。type-check + lint 已確證 code 正確。

**H7 自檢(F3)**:edit `Dialog` 屬 mockup 之外 design-stage expansion(SettingsDocProfiling mockup 只有唯讀表
+ disabled 編輯)→ 但 ADR-0063 已 Accepted 用戶揀「復用既有 form 模式視覺零發明」,全用既有 primitive
(`Dialog`/`.field`/`.input`/`.switch`/`.seg`/`.btn`/`.banner`)→ 視覺零發明,**唔再 trigger STOP**(同 W81
缺口 A 方案 A 同理);docstring 誠實標 design-stage expansion。

**全服務重啟(Day 1,用戶 trigger)**:用戶確認可安全重啟 → 受控重啟。pre-flight Langfuse `/api/public/health`
**200** + Postgres `SELECT 1` **(1 row)**(Docker langfuse「unhealthy」flag = 文件記載 timing artifact,以 endpoint
為準)→ postgres/langfuse/azurite(native Plan B pid 19584)**保持**;停 backend dual-process(venv parent 57224 +
system-python child 22776,per memory 兩個都殺)+ frontend dev tree(pnpm 57116 + next 12704 + worker 58176);
wipe `.next` → **clean build exit 0**(無 dev 爭用,完整 route table 含 `/settings` 41.6 kB → **F3 gate build ✓
確認**,證實之前失敗純 dev/build race)→ 起 backend(venv background,startup complete)+ frontend dev(background)。
驗:backend `/profile-presets` 由 404 → 回完整 mapping(F2 載入);frontend 307 up。

**F4 browser 驗(Day 1,playwright)** ✅ **round-trip PASS**:
- mock auth(`mock_msal.ts` dev-token client-side)→ `/settings` 無 redirect;warm route 200 in 20.7s(OneDrive 首編譯)。
- 文件分類規則 tab:**表格 effective view** render 正確(7 profile mockup order;P1 圖密SOP 80/開·40/section·cap 5、
  P2 散文 12/關/關;**編輯 button 啟用**;未覆寫無 還原預設)+ **threshold card 維持 disabled**(scope 排除)。
- **編 P2_prose**:點 編輯 → `EditPresetDialog` 開(復用 `dialog.tsx` + `.field/.input/.switch/.seg`,視覺零發明;
  warning banner = 儲存確認 gate;圖上限 spinbutton 12 = factory、三 switch 全關、詳細度 detailed)→ React native setter
  改圖上限 12→99 → 儲存規則 → **PUT persist**。
- **backend GET 確認**:P2_prose `overridden:True / max_images:99 / answer_detail:detailed`(**full-config 保 hidden 欄,
  非 Potemkin**)。**UI 表格** refetch:「已覆寫 / 99 / 還原預設 button 出現」+ Dialog 關閉。
- **還原預設 → DELETE**:backend P2_prose `overridden:False / max_images:12`(回 factory)+ **overridden profiles: NONE
  (零污染)**。
- console 3 errors 全 pre-existing `/api/backend/notifications` 404(memory:proxy 到 backend 無此 endpoint = 非故障);
  **我 component 零 error**。

**Retro(F4 + 重啟)**:
- **dev/build `.next` race 係 build 失敗唯一根因**:停 dev 後 clean build 即 exit 0(完整 route table)。F3 code 由
  type-check + lint 已證,build 失敗純 infra;`Get-CimInstance` 揪 running `next dev` 係科學定位法。
- **backend Python 唔 hot-reload**:running backend 係 pre-F2 → `/profile-presets` 404 = 坐實舊 code,重啟即載入
  F2 route(per W79 教訓)。
- **edit 用完整 fetched config 起 draft = 防退化關鍵**:F4 實證 answer_detail detailed 經 PUT full-replacement 保留
  (若只送 edited 欄,factory hidden 欄 prefix_depth/overview_pin 會變 null)。
- **多 session 進程紀律**:running backend + dev server 非本 session 起 → 用戶確認可重啟先動(per memory
  `project_multi_session_restart_collision`);native azurite(Plan B)+ docker infra healthy 故保持不 bounce。

**F5 closeout(Day 1)** ✅:全 gate 綠 — backend pytest **50 passed**(F2)+ frontend type-check **0** / lint
**零新 warning** / build **exit 0** / **browser round-trip PASS**(F4)。DD-11 由 DEFERRED_REGISTER 結構性表移去
「已 Close」+ 記證據。memory `project_per_kb_tunable_config_vision` 加 W82 段。**「指揮中心」兩半齊**:逐文件
(L3,ADR-0058/0060)+ 全域 preset 映射(W82,本 phase)。

**Phase Gate:full PASS**(F1 backend store + F2 write API/migrate + F3 frontend + F4 browser 全綠;production-preserve
坐實 — 空 store bit-identical;threshold persist 維持不做 per W79)。

**後續(rolling JIT,非本 phase)**:per-KB preset override(無需求)/ threshold persist(W79 已拍板不做)/
mockup 補 edit-form 設計(獨立 design sync)/ KB 層 section 錨定 UI(W81 交棒)。

**Commits**:
- (kickoff)`996039d` docs(planning): W82 kickoff + ADR-0063 + DD-11 — Settings preset-mapping write surface
- (F1)`ccc628b` feat(ingestion): W82 F1 global preset-override store + resolve_preset (ADR-0063)
- (F2)`7977dca` feat(api): W82 F2 profile-presets write API + 三 call-site migrate resolve_preset (ADR-0063)
- (F3)`46a1727` feat(frontend): W82 F3 settings preset-mapping edit UI (ADR-0063)
- (closeout)docs(planning): W82 closeout — full PASS + DD-11 close
