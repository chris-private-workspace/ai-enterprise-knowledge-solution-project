---
change_id: CH-011
spec_ref: ./spec.md
adr_ref: ../../../adr/0048-per-image-doc-order-and-document-span-selection.md
status: in-progress     # in-progress | done
last_updated: 2026-06-08
---

# CH-011 — Checklist

> Atomic items derived from `spec.md §3`。done → `→[x]`;未做標 🚧 + 理由(per CLAUDE.md sacred rule)。
> **Code/re-index GATED on ADR-0048 Accept(H1)。**

## Pre-gate
- [x] P0 — design spec(`per-document-config-platform-design.md` P1)+ CH-011 spec + ADR-0048 Proposed + README index
- [x] P1 — **ADR-0048 Proposed → Accepted(Chris 2026-06-08)**

## C-1 — 位置 primitive(解 Q3)
- [x] C1.1 — `ImageRef.doc_order: int = 0`(**兩個** ImageRef:`backend/api/schemas/query.py` + `backend/indexing/schemas.py`)
- [x] C1.2 — orchestrator 由 `"img@<N>"` key stamp `ImageRef.doc_order`(`backend/ingestion/orchestrator.py`;defensive parse,malformed → 0)
- [x] C1.3 — `embedded_images_json` 序列化帶 `doc_order`:**零改動** — `ChunkRecord.to_search_doc` 嘅 `model_dump(mode="json")` 自動帶新 field(round-trip test 驗證)
- [x] C1.4 — `parse_embedded_images` 讀 `doc_order`(`backend/generation/citation_enrichment.py`;absent → 0)
- [x] C1.5 — frontend `dedupeCitationImages` 排序 `doc_order` 主鍵 + `source_section` fallback(`frontend/lib/chat/citation-images.ts`;mode 一次性決定保 transitive)+ `ImageRef` TS type 加 `doc_order?`(`lib/api/query.ts`)

## C-2 — document-span 揀圖(改善 Q1)
- [x] C2.1 — `_find_section_neighbour_images` cap 選擇 nearest-first → document-order(chunk_index ascending)(`citation_image_neighbors.py`)
- [ ] 🚧 C2.2 — verify 時調大 drive-images-1 per-KB `max_images_per_answer`(config,非 code;V1 re-index 時做)

## Tests
- [x] T1 — `parse_embedded_images` doc_order unit test(有/無 key + storage→query round-trip)(AC2)
- [x] T2 — frontend vitest:doc_order 排序 + 跨 section + doc_order 缺失 fallback(28 passed)(AC3)
- [x] T3 — `_find_section_neighbour_images` document-order pytest(rename caps test + lead 放中間 discriminate)(AC4)
- [x] T4 — backend pytest **1262 passed + 25 skipped + 1 pre-existing fail(非我 — 見 progress)**;frontend vitest 28 + type-check exit 0;ruff 我 code 乾淨(B905 L83 + I001 import 皆 pre-existing 保留);ruff format 全過;mypy --strict 改檔 0 新 error(AC7)

## Verify
- [ ] V1 — re-index drive-images-1(`HYBRID_USE_SEMANTIC_RANKER=false`;pre-flight Langfuse 200 + PG SELECT 1)
- [ ] V2 — **live chat GL03 query**:§3.1.3 步驟圖照 Word 頁次 render(Q3 解)+ 概覽 lead + coverage 改善(Q1)(AC5)— **用戶驗**
- [ ] 🚧 V3 — 跨文件 30-query eval:recall / faithfulness flat + p95 latency 記錄(AC6)
- [ ] V4 — production-preserve:未 re-index KB(doc_order=0)行為 bit-identical(AC7)
- [ ] V5 — doc_order 單調性抽查(GL03 `img@<N>` N 遞增)(R2)

## Cross-Cutting
- [ ] X1 — 每 commit 對應 `progress.md` Day-N(R2)+ component tag(`feat(scope): ... (Cn)`)
- [ ] X2 — ADR-0048 Accepted + README index(R5)
- [ ] X3 — components `C01/C03/C05/C10-*.md` design note bump(若適用)(CC-5)
- [ ] X4 — `progress.md` closeout summary + status flip `closed`

---

**Lifecycle reminder**:checklist 隨 spec §3 acceptance criteria 衍生。新 item 先入 spec + changelog 再加。
