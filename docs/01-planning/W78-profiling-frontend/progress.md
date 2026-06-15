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

**Commits**:
- (本次)docs(planning): W78 kickoff — profiling frontend 實作 plan
