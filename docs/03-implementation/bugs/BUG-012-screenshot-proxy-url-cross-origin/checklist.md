---
bug_id: BUG-012
report_ref: ./report.md
status: in-progress
last_updated: 2026-05-24
---

# BUG-012 — Checklist

> Derived from `report.md §7 Acceptance for Fix`。延後項標 🚧 + reason(per CLAUDE.md sacred rule — 唔可以刪未勾 `[ ]`)。

## Investigation

- [x] **T1** — Root cause confirmed:`backend/api/routes/documents.py:256-266` `screenshot_proxy_url` 用 `str(request.base_url)` → `http://127.0.0.1:8000`(backend self URL,cross-origin from `http://localhost:3001` frontend dev server)
- [x] **T2** — Browser `<img>` cross-origin behaviour:default `crossorigin="anonymous"` (no credentials)+ no CORS `Allow-Credentials` header on backend → no cookie sent → backend cookie path empty → mock auth no Bearer → 401
- [x] **T3** — Probe evidence:`curl <proxy_url> -H "Authorization: Bearer dev-token"` returns **200 / 513068 bytes / image/png**;`curl <proxy_url>`(no Bearer)returns **401**

## Fix

- [ ] **T4** — `backend/api/routes/documents.py:256-266`:replace `base = str(request.base_url).rstrip("/")` + `return f"{base}/kb/.../{blob_name}"` with `del request` + `return f"/api/backend/kb/{kb_id}/screenshots/{blob_name}"`。Path-only relative URL routed via Next.js dev proxy(`app/api/backend/[...path]/route.ts` W11 D2 R8 mitigation),browser resolve 相對 `localhost:3001` → same-origin → cookies sent automatically
- [ ] **T5** — Docstring update:cite BUG-012 + explain `request` 參數保留 reason(caller signature stability)

## Tests

- [ ] **T6** — `tests/api/test_query_screenshot_proxy.py:51` assertion `http://testserver/kb/kb-1/screenshots/abc.png` → `/api/backend/kb/kb-1/screenshots/abc.png`
- [ ] **T7** — `tests/api/test_query_screenshot_proxy.py:68-70` assertions `http://api.example/kb/kbX/screenshots/{one,two}.png` → `/api/backend/kb/kbX/screenshots/{one,two}.png`
- [ ] **T8** — `tests/api/test_documents_route.py` BUG-010 proxy 200/404/422 tests **unchanged**(these hit backend endpoint directly via TestClient,not the URL builder — pass through unaffected)

## Verification

- [ ] **T9** — `pytest tests/test_query_screenshot_proxy.py -v` → all pass
- [ ] **T10** — `pytest tests/` full backend regression → 0 new failures vs W25 F1 baseline 939 passed
- [ ] **T11** — `mypy --strict --explicit-package-bases ingestion/chunker/layout_aware.py backend/api/routes/documents.py` → zero new errors on documents.py
- [ ] **T12** — Restart backend(kill PID + relaunch via venv python)
- [ ] **T13** — Runtime verify(user):`/kb/sample-document-with-image-1?tab=images` hard refresh → 8 真縮圖 + Network 8 `/api/backend/kb/.../screenshots/<sha>.png` 200 each

## Closeout

- [ ] **T14** — `progress.md` closeout summary
- [ ] **T15** — `report.md` status `triaged → done`;`checklist.md` `in-progress → done`
- [ ] **T16** — Commit + push BUG-012 fix

---

## Cross-Cutting

- [ ] **C1** — No ADR — H1(URL construction shape change,non-architectural)+ H2(no new dependency)均不觸發
- [ ] **C2** — H5 — N/A(fix 仍 require auth via cookie path,blob 維持 private — 反之 fix 修返 broken auth path,**改善** security posture)
- [ ] **C3** — H6 — `documents.py` 屬 H6 mandatory list → unit test coverage 維持(3 assertion update;no new test added because behaviour shape preserved)
- [ ] **C4** — H7 — N/A(no frontend / mockup change)
- [ ] **C5** — Commit references `progress.md` entry per R2
- [ ] **C6** — `report.md` status flip + `checklist.md` flip + `progress.md` closeout summary per R2/R3
