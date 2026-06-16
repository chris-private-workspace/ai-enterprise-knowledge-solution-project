# ADR-0064: 末尾無錨圖 gallery 章節分組（trailing image section grouping）

**Date**: 2026-06-16
**Status**: Accepted
**Approver**: Chris

## Context

用戶 2026-06-16 要推進 ADR-0056 vision 的「層 C 圖片按相關性揀（出哪幾張）」。三條真實 query
（`drive-images-1`：FA「create fixed asset master record」/ GL「process journal voucher」/
GL「post journal entry」）live 診斷,**推翻層 C 的兩個原始前提**：

1. **per-image section metadata「全空」已過時** — `ImageRef.source_section`（BUG-026 C-ii）+
   `doc_order`（CH-011 / ADR-0048）早已在 ingest 時 populate（實測 48/48 圖全有 section）。
2. **「文字-relevance 揀圖」已做過且主動 REVERTED** — ADR-0046 Decision #3 query-relevance image
   ordering 實作後 2026-06-08 revert（對程序手冊是錯方向，概覽圖被排出 cap）。
3. **召回圖全部相關,無圖可砍** — FA 48 / GL 40 張全是同一操作流程的截圖；「按相關性砍圖」維度錯了，
   且反噬 W59–W68「全圖召回」定調（用戶 2026-06-12 成功定義 = 全圖召回）。

**真因 = 圖粒度 > 文字步驟粒度（anchoring 失配,非 relevance）**：FA `chunk-0009` 633 字 ~12 步綁
**47 張圖**（required 12 欄位 + technical 14 欄位**每欄一截圖**）。沒有 47 段獨立文字對應 47 張圖 →
35 張欄位截圖無 inline marker 可錨 → 堆末尾成「一堆無序圖」（用戶痛點）。

**「調 `citation_neighbour_max_aux_images` 補召回」（方向 A）經乾淨 A/B 實證否決**：max_aux 40 vs 80
各 3 run（答案長度穩定 ~9500 字,variance 排除）召回**都係 40**。`max_aux` 不是上限，召回 40/49 gap
在更深候選構造機制（image-recall 弧教訓「每層天花板都係下層機制偽裝」）；再挖觸 H1 + 反噬 + ROI 低。

唯一真實改善 = 把末尾無錨圖（`trailingImages`）由「一堆無序圖」變「分章節的截圖附錄」。改 chat 圖片
presentation pipeline（C05 image ordering）+ mockup 無「分組 gallery」設計 → 觸 **H1** + **H7**。

## Decision

末尾無錨圖（`trailingImages` = capped 圖 minus anchored）按 `source_section` 分組 + 章節小標渲染，
**純前端呈現層，全用既有 primitive（H7 方案 1,用戶 2026-06-16 AskUserQuestion 揀）**：

1. **`groupTrailingBySection` helper**（`frontend/lib/chat/citation-images.ts`,純函數）：
   - 用既有 `imageSectionPath(image, citation)` 取每圖 section,按完整 `section_path` 分組。
   - 組順序 = 第一次出現（`trailing` 已 doc_order 排序 → 組順序自然 doc_order）；組內保留順序。
   - `sectionLabel` = section leaf；section 空 → fallback「Other」（純防禦）。
   - **不改 `figureIdx`** — 只分組,inline → trailing 連續編號保留。

2. **chat render**（`chat/page.tsx` 1299-1309）：`trailingImages.map` → `groupTrailingBySection` 外層
   map,每組先渲染章節 header（復用 ImageGallery header 同款 `muted mono text-xs` uppercase +
   `badge badge-muted`,**視覺零發明**）,再 map 該組 `InlineImageCard`（props 不變）。

3. **production-preserve** — `trailingImages` 空（knob off / 全錨）→ 0 組無渲染,bit-identical pre-W83。

4. **聚焦 trailing** — 只組織末尾大卡（用戶痛點「沒跟隨文字、最後面」直接對應）；ImageGallery 縮圖
   grid 保持 flat 總覽（索引性質,不動）。

**H4 守界**：純文字 `source_section` 信號分組,**無 image embedding / multimodal**（層 C 否決正因守 H4）。

## Alternatives Considered

- **層 C 按相關性砍圖** — 圖全相關無圖可砍 + 反噬全召回定調 + 文字-relevance 已 ADR-0046 revert。Reject → defer。
- **A 調 `max_aux` 補召回** — 乾淨 A/B 實證召回 40 vs 80 都 40,`max_aux` 非上限。Reject — 不做。
- **改 chunker 拆 mega-chunk 根治圖粒度** — 觸 H1 chunker + marker 數仍受步驟數限制（治標不治本）+ 重 +
  反噬全召回。Reject。
- **改 mockup 加分組 gallery 設計再實作（H7 正路）** — 最合 H7 精神但慢。Reject 本期 — 用戶揀方案 1
  復用既有 primitive（最低 H7 風險,同 W81 ADR-0060 precedent）；mockup 補設計走獨立 design sync。
- **同時組織 ImageGallery 縮圖 grid** — 範圍擴大 + gallery 是索引總覽 flat 合理。Reject 本期 — 聚焦 trailing。

## Consequences

- **Positive**：末尾「一堆無序圖」變「分章節截圖附錄」,每張知屬哪步驟章節；對 FA 型（逐欄位截圖,35 張）
  價值最大；純前端 + 視覺零發明 + 零 backend / retrieval 改動 + production-preserve；守 H4（無 multimodal）。
- **Negative**：分組後 FA 35 張可能散成多 §2.1.x 組（觀感碎,但分組總比無序好,F3 browser 驗實際觀感）；
  H7 design-stage expansion（mockup 補分組設計走獨立 design sync）。
- **Neutral**：不增加召回 / 不改圖數 / 不砍圖（A 否決,全召回不變）；ImageGallery 縮圖 grid flat 不變；
  inline 交織圖（W71）不受影響；knob off 答案 bit-identical。

## References

- ADR-0056（層 A document profiling — 本 vision 母 ADR）/ ADR-0046（chat image relevance — Decision #3
  relevance-select reverted,層 C 文字-relevance 路已試）/ ADR-0055（W70/W71 inline image markers + trailing pile）
- ADR-0048（CH-011 per-image doc_order）/ ADR-0049（CH-012 section-fair distribution）/ BUG-026 C-ii（source_section）
- ADR-0054（image-recall dedup-before-cap — 全召回定調背書）/ W59–W68 image-recall 弧
- ADR-0060（W81 L3 image-anchor knobs — H7 方案 1 復用既有 component precedent）
- architecture.md §3.5（image ordering）/ §5（chat UI）；H1（image presentation documented behavior）/
  H4（multimodal 邊界）/ H7（design-stage expansion）
- DEFERRED_REGISTER DD-12（層 C confirm defer）+ A `max_aux` 實證否決記錄
