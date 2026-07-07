---
id: BUG-041
title: 鄰居圖 / 章節概覽圖路徑漏 ACL 過濾(confused-deputy 圖片洩漏)
severity: Sev2          # 安全(現階段暴露面細,啟用文件級 ACL 前必修)
status: done            # 2026-07-07 用戶 approve → fix landed + 驗證鏈 + 4 ACL test 全綠
reported: 2026-07-06
reporter: pipeline review(`docs/09-analysis/pipeline_review_20260706.md` Q-R1,代碼核對)
backlog: B-12
related: ADR-0066(檢索層文件級 ACL — G4 明言 expansion 必須 trim)/ ADR-0067(文件級 override)
---

# BUG-041 — 鄰居圖 / 概覽圖漏 ACL trim

## 1. 現象(代碼核對)

查詢層的 ACL security trimming(`allowed_principals` filter)已注入 **4 個檢索面**,但**鄰居圖 attach 與章節概覽圖 pin 兩條圖片路徑漏網** —— 它們的函數簽名根本無 `user_principals` 參數,內部撈 chunk 時無帶 ACL filter。後果:一份文件內若混合 classification / 混合 ACL 的 chunk,非 admin 用戶命中可見 chunk 時,可經鄰居圖撈到**理應被 trim 掉的鄰近 chunk 的圖片**(confused-deputy 洩漏)。

**現階段實際暴露面細**:文件級 ACL(P3,ADR-0067)尚未有真實 driver 啟用,現以「KB 層繼承」為主,同一 KB 內 chunk ACL 一致。**但一旦啟用文件級 ACL,此即真缺口 → 屬「啟用文件級 ACL 前必修」。**

## 2. 根因(對 code first-hand 核對)

- `backend/generation/citation_image_neighbors.py:45`(`attach_neighbour_images`)、`:318`(`pin_chapter_overview_images`)簽名**無 `user_principals`**;內部 `engine.list_chunks(kb_id, doc_id)`(`:77` / `:363`)**無傳 ACL filter**。
- 對比:其餘所有檢索面都已刻意 thread `user_principals` —— `search`、context expander(`fetch_by_chunk_ids`)、parent-doc(`fetch_chunks_by_section_path`)、citation expansion(`list_chunks`),見 `query.py:314/332/383/408/429`。唯這兩條圖片路徑漏。
- 與 ADR-0066 G4 的明確意圖矛盾 —— G4 註解(`hybrid.py:228`)正正寫「context expansion 必須 trim,否則經 expanded neighbours 洩漏」。

`enable_citation_neighbour_images` default **True**(`settings.py:255`),故鄰居圖路徑是 active 的;`enable_chapter_overview_pin` default False。

## 3. 建議修法(等 approve)

1. `attach_neighbour_images` / `pin_chapter_overview_images` 加 `user_principals` 參數,內部 `list_chunks` 帶 ACL filter,**對齊其餘 4 個檢索面既有 pattern**。
2. `query.py` 呼叫點(`:485` / `:505`)+ 串流對應點傳入 `user_principals`(與 `:429` 等一致)。
3. admin(`user_principals=None`)維持不過濾;非 admin 只見自己 principals 可及的鄰居圖。

## 4. 驗收標準(等 approve 後據此驗)

- 建構混合 ACL 測試文件(同 doc 內部分 chunk restricted),非 admin 查詢**不返回 trim 掉的鄰居圖 / 概覽圖**。
- admin 查詢圖片結果不變(無 regression)。
- 單一 ACL(現況 KB 繼承)下結果 bit-identical(production-preserve)。

## 5. 風險與注意

- 低:純補漏,對齊既有 4 面 pattern,無新機制。
- 現況(單一 KB ACL)下行為不變 → 零回歸;真正生效面在啟用文件級 ACL 之後。

## 6. Fix landed

- `citation_image_neighbors.py` — `attach_neighbour_images` + `pin_chapter_overview_images` 加 `user_principals` 參數,內部 `engine.list_chunks(..., user_principals=...)` 帶 ACL filter,對齊既有 4 個檢索面 pattern(前 session 起草)。
- `query.py` — 4 個呼叫點(非串流 attach/pin + 串流 attach/pin)傳入 `user_principals`(前 session 起草)。
- **驗證鏈(非假修復)**:確認 `engine.list_chunks`(`retrieval_engine.py:376`)→ `searcher.list_chunks`(`hybrid.py:567`)內部真係 `_build_acl_filter(user_principals)` 注入 Azure Search query filter(`hybrid.py:600`),principals 一路 thread 到 filter。
- `test_citation_image_neighbors.py` — 補 3 個 test:forward principals / admin None 不過濾 / **ACL-trimmed engine behavior**(restricted 鄰居圖唔洩漏俾非 admin,admin 見全部)。
- `test_ch010_chapter_overview_pin.py` — 補 1 個 pin forward principals test(概覽圖路徑對齊)。
- **驗證全綠**:42 test passed / `ruff format` clean(改動 3 處縮單行)/ `mypy` exit 0。`B905`(zip)+ `I001`(import)= pre-existing lint debt → 屬 BACKLOG B-20,不在本 fix 範圍(surgical)。
- admin(`user_principals=None`)不過濾;非 admin 只見自己 principals 可及嘅鄰居圖/概覽圖。單一 ACL(現況 KB 繼承)bit-identical(零回歸);真正生效面在啟用文件級 ACL 之後。

## 7. Changelog

| 日期 | 動作 | 決定人 |
|---|---|---|
| 2026-07-06 | 立案(pipeline review Q-R1 → BUG-041,Sev2 安全,`status: proposed`,未動 code) | pipeline review / 待用戶 approve |
| 2026-07-07 | 用戶 approve → fix landed(citation_image_neighbors + query.py 4 呼叫點 thread principals,前 session 起草)+ 驗證鏈確認 `hybrid.py` `_build_acl_filter` 真注入 + 補 4 ACL trim test + 42 test/format/mypy 全綠 → `status: done` | 用戶 approve / Claude |
