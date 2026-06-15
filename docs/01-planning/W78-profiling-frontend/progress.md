# W78 progress — profiling frontend 實作(ADR-0056 層 A 段③ 落地)

## Day 1 — 2026-06-15(kickoff)

**Context**:W76 開 backend profile 讀取介面 + W77 author mockup,本 phase = 把 mockup 落實到 `frontend/`
(段③ 真正畀用戶用嘅 UI)。用戶揀「frontend 實作 — 把 W77 mockup 落實到 frontend/(對齊 H7)」。

**Grounding(plan kickoff,4 落點逐個 read 核實 + 1 Explore agent 廣度 map)**:
- L2 = `kb/[id]/page.tsx` `DocumentsTab`(line 384-456,6 欄簡化 table,**無** Profile 欄)
- L3 = `doc-config-tab.tsx` `DocConfigEditor`(scope banner line 187-207);parent `docs/[docId]/page.tsx`
  **已 fetch `DocumentDetail`**(line 66-70,含 `.profile`)但 line 565 只 pass `kbId/docId/kbName`(無 profile)
- Settings = `settings/page.tsx`(`TABS` line 69-76,6 tab;sub-component extracted pattern)
- L1 = `upload/page.tsx` `StepExecute`(line 656-864,single-file flow)
- backend contract = `DocProfileInfo`/`DocProfileSignals`;`DocumentSummary.profile`+`.profile_confidence`(L2);
  `DocumentDetail.profile`(L3)
- **TS type 未同步**:`documents.ts` `DocumentSummary`/`DocumentDetail` 仲未加 profile field(backend 已加)

**Explore agent 自相矛盾已自核**:agent report 講「KB page 有 ProfileBadge component line 1-159」係**幻覺**
(實況 frontend 4 處全部未有 profiling UI,net-new 落地)。自己 read 4 落點核實。

**3 處 backend-limited adaptation 識別(plan §4)**:
1. L2 低信心判斷用 `profile_confidence < 0.7`(summary 無 fallback_applied;視覺零差)
2. L3 override select + Settings 編輯 = static/disabled display(mockup 本身 static + 無 write API)
3. L1 per-doc 即時 badge → 說明 banner + 完成後引導(uploadDoc 無 return profile;W22 single-file adaptation)

**H7 定位**:本 phase = implementation,**完全受 H7 約束**(對 mockup 100% 對齊);非 author mockup(W77)。

**紀律自檢**:H1 ✅(現有 page 加欄/card/tab/banner)/ H2 ✅(零新 dep)/ H4 ✅(層 A)/ H7 ✅(對齊 mockup
+ 3 backend-limited adaptation 有 precedent)/ Karpathy ✅(reuse primitive 不發明 + surgical + think-before)。

**Plan 落地**:W78 folder + plan.md(active)+ checklist.md(F1-F6)+ progress.md。

**F1-F5 implement(Day 1)**:
- **F1 TS types**(`lib/api/documents.ts`):新增 `DocProfileSignals`(13-field)+ `DocProfileInfo`
  (mirror backend `doc_profile.py`);`DocumentSummary` 加 `profile?`+`profile_confidence?`(L2 輕量);
  `DocumentDetail` 加 `profile?: DocProfileInfo | null`(L3 完整)。
- **F2 L2**(`kb/[id]/page.tsx` `DocumentsTab`):加 `PROFILE_LABELS`(7 類)+ `ProfileBadge` helper
  (對齊 mockup ekp-page-kb.jsx:139-159;低信心 `confidence < 0.7` per §4-1)+ table 加「Profile」欄
  (Tags 後 / Status 前);unprofiled → `badge-muted`「未分析」。
- **F3 L3**(`doc-config-tab.tsx` + parent `docs/[docId]/page.tsx`):parent pass `profile={doc.profile}`
  落 `DocConfigTab`(→ `DocConfigEditor`);scope banner 後加「文件畫像」card(`DocProfileBadge` + 低信心
  `banner-warning` + signals `stat-grid`(img_density/list_ratio/max_depth/headings/pdf 條件 3 項/
  paragraphs)+ override `select` 7 類 + hint「覆寫持久化段③後續」);profile=null graceful 唔 render。
  對齊 mockup ekp-page-doc-detail.jsx:453-505。
- **F4 Settings**(新 `components/settings/settings-doc-profiling.tsx` + `settings/page.tsx`):
  `SettingsDocProfiling`(profile→preset mapping table 7 行,值對齊 `profile_presets.py` + W75 cap=5;
  `ThresholdRow` confidence 0.70 / img_density 0.15 / too_small 20 對齊 `profiler.py`;編輯/儲存 button
  disabled + title per §4-2 write surface 後續)+ `TABS` 加第 7 entry `doc-profiling`「文件分類規則」+
  `<TabBoundary>`。對齊 mockup ekp-page-settings-tabs.jsx:52-147。
- **F5 L1**(`upload/page.tsx` `StepExecute`):加「自動文件分類(W72 profiler)」`banner-info` 說明 banner
  (對齊 mockup ekp-page-misc.jsx:266-273);per-doc 即時 badge 因 `uploadDoc` 無 return profile → §4-3
  說明 banner + 完成後 redirect `/kb/{id}`(L2 table 即見 profile)。

**F6.1 三重驗證(Day 1)**:`pnpm type-check`(tsc --noEmit)**0 error** + `pnpm lint`(next lint)
**零新 warning**(唯一 = pre-existing chat/page.tsx:1858 `<img>`,與本次無關)+ `pnpm build`
(next build)**✓ Compiled successfully** + 15/15 static pages;4 落點 route `/kb/[id]`(20.7kB)/
`/kb/[id]/docs/[docId]`(10.5kB)/ `/kb/[id]/upload`(7.11kB)/ `/settings`(39.3kB)全部編譯通過。

**Commits**:
- `c0a9764` docs(planning): W78 kickoff — profiling frontend 實作 plan
- (本次)feat(frontend): W78 F1-F5 profiling 三層 UI 落地（L1/L2/L3 + Settings tab）
