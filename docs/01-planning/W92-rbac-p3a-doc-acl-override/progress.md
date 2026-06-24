# W92 P3a — Progress

> 每日進展 + 決策 + commits + 結尾 retro。對應 [`checklist.md`](./checklist.md)。

## Day 1 — 2026-06-24(P3a kickoff)

### 開工背景
- ADR-0067 **Accepted**(2026-06-24,用戶 decision owner 拍板)→ 次序鐵律 5 satisfied → P3-impl 解鎖。
- 用戶批准「開 P3-impl」。scope sensible default:**W92 = P3a backend**(doc_acl override,G6)/ P3b 群組(G7)= W93 / frontend = H7 延後。
- replace 語義(DG-P3-A)/ 手動 group(DG-P3-B,W93)/ Tier 1.5(DG-P3-C)per ADR-0067。

### kickoff(R1)
- rolling JIT 建 W92 三件套。F1-F5 backend-only,沿用 P2 `allowed_principals` Collection 零新索引欄位。

### F1-F5 全部完成(✅ 2026-06-24 Day 1 一輪)
- **F1**:`api/schemas/doc_acl.py`(DocAclEntry + 3 request/response,mirror KbAcl* 復用 enum)+ `kb_management/doc_acl_store.py`(Protocol + InMemory flat-list + Postgres `document_acls` RETURNING upsert + factory)+ 8 store 測試。
- **F2**:`api/routes/doc_acl.py`(GET/POST/PATCH/DELETE,mirror kb_acl.py,router-level `require_kb_acl("manage")`,audit `doc.access.granted` 加 Literal)+ server.py register router + wire store + 6 route 測試。
- **F3**:`acl.resolve_doc_principals`(replace:doc 有行 → doc principals,無 → KB 繼承 fallback,store None → KB,BC)+ documents.py `_run_ingest_pipeline` 由 `resolve_kb_principals` 改 `resolve_doc_principals`(`_IngestionDeps` 加 `doc_acl_store`)+ 4 resolution 測試 + 2 ingest 測試(override / 繼承)。
- **F4**:`IndexPopulator.update_doc_principals`(search-then-merge `allowed_principals` collection)+ doc_acl POST/DELETE `_restamp_doc` best-effort wire + 3 populator 測試。
- **F5 Gate**:針對性 **89 passed** + ruff clean(我嘅檔)+ mypy 改動 production 檔自身 0 error。**north-star §15 no-op by construction**:drive-images-1 無 doc_acl → fallback KB 繼承 → 無 grant → `[]` byte-identical P2,restamp 只 doc_acl 改才觸發(drive-images-1 無)→ 零退化,無需重跑 eval。

### 設計決策(R3,實作補充)
- **PATCH role 不 restamp**:改 role(query/edit/manage)只影響「該 principal 可做咩寫操作」(role rank gate 寫),**唔改 principal 集**(可見者不變)→ chunk `allowed_principals` 不變 → 唔需 restamp。POST/DELETE 改 principal 集才 restamp。
- **restamp best-effort**:doc_acl 行係 source of truth(已 persist);restamp miss(Azure down / 未 ingest)log 但唔 fail ACL 寫,下次 ingest re-resolve。同 P2 kb_acl-change-restamp 性質。
- **kb_acl-change-restamp 遺留** 仍未補(ADR-0067 §Decision 4 提)→ 留 W93 或後期(本期聚焦 doc_acl)。

### 待續(本 phase)
- 全套測試綠確認 → commit + push(視用戶)。Phase Gate 收尾。

### Commits
- (kickoff)docs(planning): kickoff W92 P3a doc-acl-override phase artifacts
- (本 entry)feat(api): P3a document-level doc_acl override(表+Store+API+replace 解析+restamp)
