---
bug_id: BUG-012
report_ref: ./report.md
checklist_ref: ./checklist.md
status: in-progress
last_updated: 2026-05-24
---

# BUG-012 — Progress

> Bug-fix workflow per `PROCESS.md §4`。

## Day 1 — 2026-05-24

### Investigation

W25 phase F2 verify gate(post-re-upload `sample-document-with-image-1` 拎 post-W25 chunker measurement)用戶開 KB Images tab → 8 cards 全 placeholder。BUG-011 frontend `<img>` + onError 邏輯 confirmed on disk + dev server running(check via `grep '<img\|setImgError'` + node PID 17948 active)。DevTools Network panel(用戶截圖 + console paste)揭示:

- 8 個 `/screenshots/<sha>.png` request 全部 **RED**(failed)→ `<img>` 確實 render + fire GET,但全部失敗 → onError 觸發 → fallback placeholder。即 BUG-011 working,defect 在 backend URL。
- Console 紅色 errors 全部係 unrelated(NotificationsMenu `/api/backend/notifications 404` + Chrome extension noise)—— 冇 image-specific log because Chrome 唔放 `<img>` failures 入 console only Network panel。

Backend curl probe:

```
GET <proxy_url> -H "Authorization: Bearer dev-token"  → 200 / 513068 bytes / image/png  ✅
GET <proxy_url>  (no auth header)                      → 401                              ❌
```

→ Browser `<img>` cross-origin behaviour:`localhost:3001`(page)vs `127.0.0.1:8000`(`<img src>`)→ different origin → browser default 唔送 cookie cross-origin → backend `get_current_user` cookie path empty → mock auth path empty(no Bearer)→ **401**。

Root cause locus = `backend/api/routes/documents.py:256-266` `screenshot_proxy_url` 用 `str(request.base_url)` = backend 自己 host = cross-origin from frontend perspective。BUG-010 嗰陣 dormant(chat ImageGallery 路徑從未 fired per Problem 2);BUG-011 unblock frontend render → defect surface。

### Decisions

- **D1.1** — 分類 Bug-fix BUG-012 Sev3 same-tier as BUG-010/011(image visibility,non-text-retrieval)
- **D1.2** — Fix shape = **path-only relative URL** prefixed `/api/backend/`(Next.js catch-all proxy per W11 D2 R8 mitigation route `app/api/backend/[...path]/route.ts`)→ browser resolve relative to current page origin → same-origin → cookies sent → backend cookie path auths
- **D1.3** — Keep `request` parameter for caller signature stability(`list_kb_images` + `_proxy_citation_images` both pass `request`);use `del request` to explicitly mark intentionally-unused-post-fix
- **D1.4** — Hardcode `/api/backend/` prefix acceptable Tier 1 dev scope;production cloud-to-cloud frontend+backend share-origin 仍經 Next.js catch-all route handle 相同 prefix;env-var-driven prefix for non-Next.js deployment 屬 future-tier out-of-W25-scope
- **D1.5** — No ADR triggered:URL construction shape change,non-architectural

### Code changes

| 檔案 | 改動 |
|---|---|
| `backend/api/routes/documents.py` | `screenshot_proxy_url` line 256-266:`del request` + path-only return `f"/api/backend/kb/{kb_id}/screenshots/{blob_name}"`;docstring update cite BUG-012 |
| `backend/tests/api/test_query_screenshot_proxy.py` | 3 assertions updated:`http://testserver/...` → `/api/backend/...`(line 51 + 69 + 70)|

### Verify gates

- **`pytest tests/api/test_query_screenshot_proxy.py + test_documents_route.py -v`** → **44 passed + 5 warnings in 170.18s**(BUG-012 3 updated assertions + BUG-010 documents-route batch all green)
- **`mypy --strict --explicit-package-bases documents.py`** → `documents.py` zero new error;50 errors found 全部 transitively-imported retrieval/generation modules + 1 pre-existing line 95(`_engine_or_503` Any-return, outside BUG-012 edit scope)→ **same Karpathy §1.3 surgical carve-out as BUG-010 + W25 F1**
- **Full backend regression** `pytest tests/` → running in background post-commit;will backfill on notification
- **Runtime verify** — backend restart + user hard refresh `/kb/<kb_id>?tab=images` → 8 真縮圖 + Network 8 × `/api/backend/kb/.../screenshots/<sha>.png` 200 each → _(user-confirmed step,pending after restart)_

### Commits

_(見 commit footer — `fix(api): screenshot_proxy_url same-origin path-only URL — BUG-012`)_

### Retro

- **Latent defect surfaced via cascade**:BUG-010 introduced(2026-05-22)— frontend image render dormant per BUG-011 placeholder → BUG-011 fix unblocked frontend(2026-05-23)→ user hit Images tab → BUG-012 surfaced(2026-05-24)。**Three-bug cascade in 3 days**:同一 image pipeline 嘅三個 layer(upload + counter + serving + rendering + cross-origin auth)逐層 expose latent defects。Cumulative learning:end-to-end manual verify earlier 喺 closure cascade 中可以 catch upstream defects 在 downstream 引爆之前 —— W25 F6 manual user-test gate 應該 mandatorily 包含 multi-origin browser session smoke,而非 backend curl smoke。
- **Cross-origin cookie 係 frontend-backend dev environment 常見 gap**:any future proxy URL builder 都應該 default 用 same-origin path-only URL(via Next.js catch-all `/api/backend/<path>`)而非 backend `request.base_url` absolute URL。Pattern 可加入 future ADR / coding convention if recurring。
- **R6 retroactive value**:R6 pre-active-flip recursive grep verification 已 catch 過 BUG-010 嘅 filter-mechanism plan-text contamination(W25 D0)— 但 BUG-012 嘅 cross-origin defect 屬 frontend-backend interaction layer,grep verify 本身無法 catch。需要 browser-level smoke earlier in cascade。
