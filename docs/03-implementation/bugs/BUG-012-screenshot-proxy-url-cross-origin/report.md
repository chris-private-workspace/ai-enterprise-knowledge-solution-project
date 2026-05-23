---
bug_id: BUG-012
title: "screenshot_proxy_url returns cross-origin absolute URL → browser <img> blocks session cookie → 401 → ImageCard fallback to placeholder"
severity: Sev3
status: triaged
reported: 2026-05-24
reporter: "Chris(chat 2026-05-23/24 — DevTools Network panel:8 個 `/screenshots/<sha>.png` request 全部 red/failed,Images tab card 全部 placeholder despite BUG-011 frontend `<img>` render code active)"
affects_components: [C08]    # API Gateway — proxy URL builder
spec_refs:
  - architecture.md §4.6    # screenshot blob storage + proxy pattern
related: [BUG-010, BUG-011]  # BUG-010 introduced the defect via request.base_url;BUG-011 surfaced it (frontend now actually fires <img>)
---

# BUG-012 — screenshot_proxy_url builds cross-origin URL, browser <img> can't auth

> **Report version**:1.0(initial)
> **Triage approver**:AI self-triaged Sev3;**Chris chat-confirmed 2026-05-23/24** to open BUG-012 + apply fix。

## 1. Symptom

W25 phase F2 verify(post-re-upload of `sample-document-with-image-1`)用戶開 `/kb/sample-document-with-image-1?tab=images` —— **8 個 image card 全部 render gradient + `<Layers>` placeholder**(BUG-011 嘅 onError fallback state),冇真縮圖。DevTools Network panel:8 個 `/screenshots/<sha>.png` GET request 全部紅色 failed。

## 2. Reproduction Steps

1. Ingest 1 KB(`extract_embedded_images=True`)+ upload docx containing embedded images(BUG-009 fix wired)
2. Browser navigate to `http://localhost:3001/kb/<kb_id>?tab=images`
3. Backend `/kb/<kb_id>/images` endpoint returns 8 items each `url: "http://127.0.0.1:8000/kb/<kb_id>/screenshots/<sha>.png"`(absolute URL,backend's `request.base_url`)
4. Frontend `<ImageCard>`(BUG-011 fix:`<img src={img.url}>` + onError → placeholder)render `<img>` element with that URL
5. Browser fires GET — **cross-origin**(page `localhost:3001` vs URL `127.0.0.1:8000` — different hostname AND port)
6. Browser does **NOT** send `ekp_session` cookie cross-origin(`<img>` default `crossorigin=anonymous`)
7. Backend `get_current_user` cookie path empty → mock auth path empty(no Bearer)→ **401**
8. `<img>` onError fires → `setImgError(true)` → render falls back to gradient placeholder

**Reproduction reliability**:Always(deterministic — every cross-origin `<img>` without `crossorigin="use-credentials"` exhibits this)。

**Environment**:Local dev,Next.js dev `localhost:3001` ↔ FastAPI dev `127.0.0.1:8000` — origins differ(hostname AND port)。

## 3. Expected vs Actual

| 範疇 | Expected | Actual |
|---|---|---|
| `<img>` GET for proxy URL | 200 + image bytes | 401 |
| Browser cookies on cross-origin request | Sent(via `/api/backend/<path>` same-origin proxy)| Not sent(direct cross-origin)|
| Image card hero region | Real thumbnail | gradient + Layers placeholder(onError fallback) |

## 4. Impact

**Two surfaces affected**(both dormant pre-W25):
- **KB Images tab**:user visible regression — Images tab functionally broken
- **Chat citation `<ImageGallery>`**:will be broken once W25 F5 D1 citation post-process + D2 retrieval low_value relax land + image-bearing chunks reach citation(currently masked because Problem 2 chat never had image citations)

- **Affected users / scenarios**:每個 user 用 KB Images tab + chat with image citation;但因 chat-images 路徑從未端到端 fired(Problem 2),呢個 latent defect 一直 dormant 等到 BUG-009/010/011 cascade + W25 F2 verify 先暴露
- **Workaround available?**:No(no end-user workaround,backend code fix required)
- **Data loss / corruption?**:No(blob bytes intact;只係 delivery URL routing)
- **Security implication?**:No(fix 仍 require auth;只係路由 same-origin 過 Next.js proxy 等 cookie 能送)

## 5. Severity Justification

**Sev3** per `PROCESS.md §4.5`:
- Text retrieval / Gate 1 / chat 答案文字 unaffected
- Affected = image **visibility** only(KB Images tab + future chat citation `<ImageGallery>`)
- 同 BUG-011 / BUG-010 同 severity-tier
- No data loss、no security regression
- Sev3 → no postmortem mandatory

## 6. Initial Diagnosis(root cause confirmed)

2026-05-23/24 經 backend curl probe + frontend DevTools Network panel + Next.js proxy route review 逐項 confirmed:

- **Root cause locus**:`backend/api/routes/documents.py:256-266` `screenshot_proxy_url` helper:
  ```python
  def screenshot_proxy_url(request: Request, kb_id: str, blob_url: str) -> str:
      blob_name = blob_url.rsplit("/", 1)[-1]
      base = str(request.base_url).rstrip("/")  # ← yields http://127.0.0.1:8000
      return f"{base}/kb/{kb_id}/screenshots/{blob_name}"
  ```
  `request.base_url` 解出 backend 自己嘅 URL(`127.0.0.1:8000`),frontend dev server 喺 `localhost:3001` — **cross-origin**。Browser `<img>` cross-origin **唔送 cookie** unless `crossorigin="use-credentials"` + CORS headers `Access-Control-Allow-Credentials: true` configured。
- **Why not caught earlier**:BUG-010 嘅 unit tests(`test_documents_route.py` proxy 200/404/422 + `test_query_screenshot_proxy.py` 3 tests)係 backend-only TestClient direct-route tests,**唔模擬 cross-origin browser cookie behavior**。Frontend `<img>` 端到端 test 唔存在 —— BUG-011 unit test 屬 H7 user-eye verify domain per BUG-011 checklist C3 carve-out。Chat ImageGallery 路徑 dormant(Problem 2 chat 從未引用圖)所以 hidden defect 一直未 caught。

**Probe evidence**:
```
GET <proxy_url> with Bearer:    200 / 513068 bytes / image/png     ← backend works
GET <proxy_url> without Bearer: 401 (browser <img> path)           ← cookie not sent
```

**Fix shape**:return **path-only relative URL** prefixed with `/api/backend/`(Next.js dev proxy per `app/api/backend/[...path]/route.ts` W11 D2 R8 mitigation route).Browser resolve 相對 `localhost:3001` → `localhost:3001/api/backend/kb/<kb_id>/screenshots/<sha>.png` → Next.js proxy 轉送去 backend → backend get_kb_screenshot route returns image bytes。Cookies same-origin → 自動 sent → backend cookie path auths → success。

```python
def screenshot_proxy_url(request: Request, kb_id: str, blob_url: str) -> str:
    del request  # unused after fix; signature kept for caller stability
    blob_name = blob_url.rsplit("/", 1)[-1]
    return f"/api/backend/kb/{kb_id}/screenshots/{blob_name}"
```

**`request` 參數保留** for caller stability(`list_kb_images` + `_proxy_citation_images` 都 pass `request`)— `del request` 顯式標明 intentionally unused post-fix,future cleanup 可再 surgical remove。

**`/api/backend/` prefix hardcoded** acceptable Tier 1 dev scope:production cloud-to-cloud deploy frontend + backend share-origin,呢個 prefix 仍 work 因為 `/api/backend/<path>` 喺 production 一樣由 Next.js catch-all route 處理。若 future Tier 2 改變(eg. removed Next.js proxy)→ env-var driven prefix follow-up,**out of BUG-012 scope**。

非架構 / vendor / storage-layout 改動(純 URL construction shape change)→ **唔觸發 H1 / H2,唔需 ADR**。

## 7. Acceptance for Fix(checklist preview)

- [ ] Root cause confirmed:`screenshot_proxy_url` 用 `request.base_url` 砌 cross-origin absolute URL → browser `<img>` cookie not sent → 401
- [ ] **Fix** — `backend/api/routes/documents.py:256-266`:return `/api/backend/kb/{kb_id}/screenshots/{blob_name}`(path-only relative),`del request` mark unused
- [ ] Tests — `test_query_screenshot_proxy.py` 3 assertions update(`http://testserver/...` → `/api/backend/...`)— `test_documents_route.py` direct route tests unchanged(backend endpoint untouched)
- [ ] Verify gates — `pytest tests/` regression 0 failed;`mypy --strict` on documents.py clean(zero new)
- [ ] Runtime verify — backend restart pick up code change;user open `/kb/<kb_id>?tab=images` hard refresh → 8 真縮圖 + Network 8 `/api/backend/kb/.../screenshots/<sha>.png` 200
- [ ] Future-tier follow-up(out of scope):env-var-driven `FRONTEND_PROXY_PREFIX` for cleaner production deployment story;remove `request` parameter from signature if no caller benefits from it

## 8. Report Changelog

| Date | Change | Reason | Approver |
|---|---|---|---|
| 2026-05-24 | Initial triage(Sev3)— W25 F2 verify post-re-upload uncovered;DevTools Network 8/8 red on `/screenshots/<sha>.png`;BUG-011 frontend code confirmed active(`<img>` fires GETs)but backend proxy URL cross-origin → browser cookie blocked → 401 → onError fallback to placeholder | BUG-010 latent defect surfaced now that BUG-011 unblocked the frontend render path | Chris(chat-confirm 2026-05-23/24)|

---

**Lifecycle reminder**:Sev3 → `postmortem.md` 不需要(only Sev1/Sev2 mandatory per `PROCESS.md §4.5`)。
