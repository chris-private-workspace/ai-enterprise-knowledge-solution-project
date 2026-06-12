# ADR-0054: Dedup-before-cap — `cap_images_per_answer` 預算改計 unique 圖

**Date**: 2026-06-12
**Status**: Accepted
**Approver**: Chris(2026-06-12 session AskUserQuestion「批准,实施」;前置 = 用戶同日拍板
圖密文件成功定義 = 全圖召回)

## Context

ADR-0040(W43)引入 per-KB `max_images_per_answer`,實作 `cap_images_per_answer`
(`backend/generation/citation_enrichment.py`)時**刻意揀 blunt 設計**:預算計 refs(跨 citation
重複照食預算)、無 cross-citation dedup — 理由係 cap 只為 bound response 大小,顯示層 dedup 交俾
frontend(BUG-026/BUG-031)。

W59–W67 image-recall 實證鏈(AR 圖密手冊 9-query GT)揭穿呢個設計喺 neighbour-aux-heavy 配置下
(W64 persisted preset:`citation_neighbour_max_aux_images=40` + `default_rerank_k=10`)嘅
real-world 代價:

- **W66**:refs 即刻脹滿任何 cap(60→150 全食),Q001 unique 釘死 48/65(recall 0.74)。
- **W67(決定性)**:漏網 17 張 GT 圖嘅 owning chunk **全部被 cite**(26 citations 覆蓋成個章節
  — 供給 + reach 完整);預算時間線:**citation 1–4 每條揹 ~22–48 refs 嘅高重複 neighbour aux
  (150 refs = 48 unique,68% 重複)食盡預算,citation 5–26 共 22 條嘅自有圖全部清零**。
  行到第一張漏網圖需 cap≈360 — 抬 cap 係死路(payload 爆炸)。
- 用戶可見傷害:程序型答案後半部步驟全部冇截圖。

## Decision

`cap_images_per_answer` 預算由「計 refs」改為「**計 unique 圖**」:

- `max_images=None` → **原樣返回(連 dedup 都唔做)** — production-preserve,無 per-KB cap 嘅
  KB bit-identical。
- `max_images` 設定時:walk citations in order;每張圖 key = `checksum_sha256 or blob_url`;
  **已見過嘅 key = 重複 ref → 剪走、唔食預算**(即使預算未盡 — payload 衛生);fresh 圖食 1
  預算;預算盡後 fresh 圖都剪。Citations 永不 drop。
- 配套:drive-images-1 per-KB cap 50→**70**(unique 預算覆蓋 Q001 GT 65 + margin)。

## Alternatives Considered

1. **抬 cap(維持 blunt)**:W66/W67 證需 cap≈360 先掂到第一張漏網,response 孭 360 refs —
   payload 爆炸,reject。
2. **章節範圍圖片收割新機制(ADR-0047 推廣)**:W66 三岔口選項 (a) — W67 證明根本唔需要
   (所有 GT 圖已 in reach),reject(over-engineering per Karpathy §1.2)。
3. **圖片 caption 語義化(rollup §4.6)**:重型 H1/H4-邊界路線 — 同上,現階段唔需要,reject。
4. **維持現狀(接受 0.74)**:用戶已拍板成功定義 = 全圖召回,reject。

## Consequences

- **Positive**:mega-query recall 天花板由 0.74 解封(W67 證 Q001 65/65 全部 in reach,預期
  ~1.00);response payload 縮細(重複 ref 剪走);per-citation 圖數變誠實(同 frontend display
  dedup 語義對齊);cap 語義變直觀(「最多 N 張唔同嘅圖」)。
- **Negative**:行為改變 — 有 per-KB cap 嘅 KB 喺同 cap 值下會返**更多 unique 圖**(舊行為啲
  預算被重複食咗);共享圖只喺首現 citation 出現(後續 citation 嘅 pill 唔再重複顯示 — 同
  frontend dedup 後嘅實際顯示一致,非 regression);兩個依賴舊 ref-counting 契約嘅 test 改寫。
- **Neutral**:None-cap 路徑 bit-identical;frontend 零改動(display dedup 邏輯保留,變成
  defence-in-depth)。

## References

- ADR-0040(per-KB tunable config — 本 ADR supersede 其「blunt no-dedup」實作決定,其餘不變)
- `docs/01-planning/W66-cap-refs-vs-unique-diagnosis/` + `W67-missing-image-chunk-mapping/`(證據鏈)
- BUG-026(frontend cross-citation dedup)/ BUG-031(frontend `INLINE_IMAGE_CAP`)
- `docs/01-planning/CONFIG_PLATFORM_W43-W58_ROLLUP.md` §4.5(W59–W67 全鏈記錄)
