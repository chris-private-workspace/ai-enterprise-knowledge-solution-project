# W67 — checklist(漏網圖 chunk-level 映射)

## F1 — 資料集
- [x] 驗 catalog mtime(2026-06-10)> KB last_indexed(2026-06-08)→ 複用
- [x] fresh Q001 `/query` capture:persisted cap=50 一份 + **cap=150 一份(映射基準,即復原)**

## F2 — join 映射
- [x] missing = GT(65)− returned(48)= 17;每張 → source_section / doc_order / owning chunk(AC1:17/17 in-catalog)
- [x] cited chunks 對照(AC2):**第四類發現** — owning chunk 全部被 cite,但 citation 預算清零(時間線:cit 1–4 食盡 150 refs,cit 5–26 全 0)

## F3 — 判決
- [x] 漏網分佈:17/44 全喺 2.1.3(S04 mega-section);其餘 section 零漏網
- [x] **W66「供給天花板」推翻**:供給+reach 完整(GT 65 張 owning chunk 全被 cite);真兇 = cap 計 refs + 前置 citation 高重複 aux 食盡預算
- [x] 武器揀定:dedup-before-cap(H1 提案,STOP+ask,本 phase 不實作);三岔口 (a)/(b) 都唔使行

## F4 — 收爐
- [x] rollup §4.5 doc-sync + memory 修正(W66 降級判決推翻 — 防 stale)
- [x] plan closeout + progress retro;AC4 核對(零 code / 零 config 殘留,cap 已復原)
