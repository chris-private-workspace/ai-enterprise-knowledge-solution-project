---
phase: W67
name: missing-image-chunk-mapping
status: active       # draft | active | closed
created: 2026-06-12
owner: "Claude (AI) — 技術 Lead Chris 審閱"
gap: "全圖召回定義下 mega-query 漏網圖(Q001 17 張 / Q043 20 張)嘅 chunk-level 定位 — W66 三岔口(harvest 擴展 / caption / 接受)嘅揀武器判據"
adr: null            # 零 code:複用 W59 catalog(reports/ 現成)+ /query 抓取 + ad-hoc 分析;無任何行為改動
spec_refs:
  - docs/01-planning/W66-cap-refs-vs-unique-diagnosis/   # 觸發:48–53 = 收割範圍真天花板,漏網喺未-cite 區域
  - scripts/dump_doc_images.py                            # W59 catalog 工具(checksum→source_section/doc_order/owning_chunk_ids)
  - docs/eval-set-image-recall-ar.yaml                    # Q001 GT 65 張(S03–S06)
---

# W67 — 漏網圖 chunk-level 映射

> **緣起**:用戶 2026-06-12 同意 — W66 證實 mega-query 漏網 GT 圖喺收割範圍以外(未被 cite 嘅
> chunk 區域),揀 H1 武器(章節範圍收割 / caption / 接受)之前先零 code 定位:**漏網 17 張
> 逐張對應邊個 chunk / 邊個 section,係咪集中喺 S04 mega-section 深處**。
>
> **R6 核實**:W59 catalog 現成(`reports/image_catalog_drive-images-1_drive-user-manual-0601-ar-
> fna-ar-management-v0-03.yaml`,2026-06-10 > 最後 re-index 2026-06-08 → 有效)含 checksum →
> `source_section` / `doc_order` / `owning_chunk_ids`;Q001 doc 同一份;cited chunks 由 fresh
> `/query` response 嘅 `citations[].chunk_index/section_path` 取。

## 1. 設計

| 步 | 內容 | 產出 |
|---|---|---|
| **F1** | 複用現成 catalog(驗 mtime > last_indexed)+ fresh Q001 `/query`(persisted config)抓全 response(citations + 圖 checksums)落 temp json | 兩個資料集 |
| **F2** | join:GT(65)− returned → missing set;每張漏網圖 → `source_section` / `doc_order` / owning chunk;cited chunks 對照(chunk_index 距離 / section 歸屬) | 映射表 |
| **F3** | 分類判決:漏網圖分佈(集中 S04 深處?散喺未-cite subsection?)+ 對三岔口嘅含意 | progress.md 判決 |
| **F4** | doc-sync(rollup §4.5)+ closeout | — |

## 2. Acceptance Criteria

- **AC1**:漏網每張圖有 section + doc_order + owning chunk 歸屬(catalog 找唔到嘅另列 — 代表
  catalog/index 落差,本身係 signal)。
- **AC2**:對照 cited chunks:漏網圖嘅 owning chunk 係咪(i)同 section 但 chunk_index 距離 >
  window、(ii)唔同 subsection 完全未 cite、(iii)其他 — 三類各佔幾多。
- **AC3**:判決寫明對 W66 三岔口嘅含意(例:若 90% 集中喺單一未-cite mega-chunk 區域 →
  章節範圍收割係精準武器;若散落 → caption 先掂)。
- **AC4**:零 code / 零 config 改動(連 per-KB toggle 都唔使 — 用 persisted config 跑)。

## 3. 風險

- **R1 🟢 catalog 落差**:catalog 2026-06-10 vs index 2026-06-08 — 無 re-index 發生,低風險;
  AC1 嘅「找唔到」欄位兜底。
- **R2 🟢 infra transient**:同前,probe-恢復-重試。

## 4. 非目標

- ❌ 實作任何收割機制改動(H1,判決後用戶揀)。
- ❌ Q043 同樣深挖(Q001 先行;pattern 通常共通,需要先補)。

## 5. H 核對

零 code / 零 config / checksum 軸 / mock auth → H1–H7 全不觸。

## 6. Changelog

| Date | Change | Reason |
|---|---|---|
| 2026-06-12 | Initial plan(active)| 用戶同意 W66 建議;R6 核實 catalog 現成有效 + 含 owning_chunk_ids |
