# ADR-0048: Per-image `doc_order` propagation + document-order 圖片排序 / 揀圖(platform P1 / Gap C)

**Date**: 2026-06-08
**Status**: Accepted
**Approver**: Chris(2026-06-08)

## Context

CH-009(ADR-0046,decorative + document-order)+ CH-010(ADR-0047,chapter-overview pin)修咗 chat 圖片嘅裝飾 icon 同概覽 lead。但 2026-06-08 live(drive-images-1,GL03「How do I process and confirm journal voucher transactions?」)揭**第三個問題**,且帶出一個結構性根因:

- **用戶 Q3 — 步驟圖順序錯亂**:首 2 張概覽圖(pin)正確,但 figure 3+(§3.1.3 步驟圖)次序亂(用戶實測 figure 3 = Word page 24 嘅 import 圖,應排喺 page 21 step1 之後)。
- **用戶 Q1 — 完整性**:程序應出 ~35 圖(§3.1.1 → §3.1.5),實際出唔齊。

**根因(已查證 code)**:

1. **`ImageRef` 缺 per-image 文件位置欄位**。`ImageRef`(`backend/api/schemas/query.py` L8-18)只有 `blob_url / alt_text / checksum_sha256 / width / height / source_section`。前端 `dedupeCitationImages`(`frontend/lib/chat/citation-images.ts` L103-107)**只按 `source_section` lexical stable sort** —— 同一 section(§3.1.3 所有步驟共用一個 `source_section`)lexical key 相同 → stable sort 跌返後台 nearest-first 次序 = **唔係文件頁次**。前端註解(L100-102)自認假設「single-digit sub-sections」,呢假設喺「一個 section 一條長程序多圖」時崩。

2. **位置資料其實 ingest 已有,但用完即棄**。Parser 出 `EmbeddedImage.doc_order`(全文件單調遞增,headings/paragraphs/images 共用 counter);orchestrator(`backend/ingestion/orchestrator.py` L188-220)用 `"img@<doc_order>"` key 解析每圖砌 `ImageRef` 時,**stamp `blob_url/alt_text/checksum/width/height/source_section` 但唔 stamp `doc_order`**。`parse_embedded_images`(`backend/generation/citation_enrichment.py` L26-62)亦唔讀。

3. **完整性受多重 cap + nearest-first 揀圖**:`_find_section_neighbour_images`(`citation_image_neighbors.py` L210-273)按 chunk-distance **nearest-first** 揀夠 `max_aux` 即停 → 聚埋 lead 附近,**餓死頭尾 section**(§3.1.1 概覽 / §3.1.5 confirm);加 `cap_images_per_answer`(`citation_enrichment.py` L112)+ frontend inline cap → 結構性上限 < 35。

**Platform 脈絡**:本變更實作 `docs/02-architecture/per-document-config-platform-design.md` 嘅 **P1 / Gap C**(per-image 位置 + 相關性揀圖),係 per-document 配置平台 vision 嘅地基層。

改 `ImageRef` schema(§4.5)+ `embedded_images_json` 序列化(§3.6)+ 揀圖排序行為(§3.7)→ 觸 **H1**。

## Decision

引入 **per-image 文件位置 primitive(`doc_order`)** 並接通成條鏈,令圖片照**真文件位置**排序;揀圖由 nearest-first 改 **document-order span**。

**C-1 — 位置 primitive(解 Q3;需 re-index)**:
1. `ImageRef` 加 `doc_order: int = 0`(default 0 = production-preserve;legacy/未 re-index 影像為 0)。
2. `orchestrator.py` 砌 `ImageRef` 時由 `pos`(`"img@<N>"`)parse 出 `N` → stamp `ImageRef.doc_order=N`(**資料已喺手,純 propagate,零新 extraction**)。
3. Indexing(C03)序列化 `doc_order` 落 `embedded_images_json`(Pydantic `model_dump` 自動帶)。
4. `parse_embedded_images` 讀返 `doc_order`。
5. Frontend `dedupeCitationImages` 排序改用**真文件位置 `doc_order` 為主鍵**,`source_section` 為 legacy fallback / tiebreak(`doc_order` 全 0 → 退回現行 section 排序,bit-identical)。
6. **Re-index** drive-images KB(寫 `doc_order` 落 index;同 CH-009 dims re-index 同 pattern)。

> **附帶**:`doc_order` 單調遞增 → §3.1.1 overview(細)天然排 §3.1.3 步驟(大)之前 + 修正多位數 sub-section(§3.1.10 vs §3.1.2)lexical bug。CH-010 pin 仍負責 **attach** 未被 retrieve 嘅概覽,但「排頭」改由 `doc_order` 自然達成(pin 可簡化,本期不強制重構)。

**C-2 — document-span 揀圖(改善 Q1)**:
- `_find_section_neighbour_images` 嘅 cap 選擇由 nearest-first 改 **document-order span**(沿文件位置鋪開,而非聚埋 lead),令 capped 後嘅圖覆蓋程序頭→尾。
- 完整性「上限」(35 圖)由 per-KB `max_images_per_answer`(已存在,verify 時調大)+ frontend inline cap 控制;**per-DOCUMENT cap 粒度屬 P2(layer A),本期不做**。

**H4 硬邊界**:全程只用 `doc_order` / section / 文字信號;**嚴禁 image embedding / 視覺 multimodal 揀圖**(Tier 2 禁)。
**H7**:前端排序改動係**把 implementation 更貼近正確閱讀流程嘅 reverse-direction drift fix**(非 H7 deviation,per CLAUDE.md §5.7「修 visual drift bug」例外);verify 時確認 gallery 仍對齊 mockup。
**範圍**:只 re-index drive-images-1;**不**flip 全域 default;**不**改 `default_rerank_k` / retrieval 核心。

## Alternatives Considered

- **Query-time stamp `doc_order`(免 re-index)**:後台 citation 組裝時由已 fetch 嘅 doc_chunks 推 `(chunk_index, position)`。Reject — 要 thread 落 `build_citations`(該處唔 fetch doc_chunks)+ neighbour + pin 全鏈,較 invasive;ingest-time + re-index 乾淨且同 CH-009 dims 一致。
- **加 per-image cap 粒度落 P1**:Reject — per-DOC cap 屬 layer A / P2(per-document profile),本期守 Karpathy §1.2 唔提前做。
- **Image embedding 揀圖排序**:技術可行但 = Tier 2 multimodal(H4 禁)+ 新 vendor(H2)。Reject。
- **純前端 heuristic(用 alt_text / 檔名推位置)**:脆弱、唔可靠;`doc_order` 係 ground truth。Reject。

## Consequences

- **Positive**:圖片照真文件頁次排(解 Q3);揀圖 document-span 改善完整性覆蓋(Q1);修多位數 section lexical bug;`doc_order` 係 layer A/B/C 共用地基;production-preserve(default 0 / 全 0 fallback → 舊行為 bit-identical)。
- **Negative**:需 re-index drive-images KB(成本 + Free-tier semantic 402 用 `HYBRID_USE_SEMANTIC_RANKER=false` 繞);改 `embedded_images_json` schema(向後兼容:舊 chunk 缺 key → doc_order=0);完整性「上限」仍受 cap(完整 35 需 verify 時調大 per-KB cap,full per-doc 控制留 P2)。
- **Neutral**:其他 KB 未 re-index → doc_order 全 0 → 行為不變;CH-009 decorative + CH-010 pin + cap 不受影響(pin 仍 attach 概覽,排序由 doc_order 接手)。

## References

- 設計藍圖:`docs/02-architecture/per-document-config-platform-design.md`(P1 / Gap C / §3.3 layer C)
- CH-011 spec:`docs/03-implementation/changes/CH-011-per-image-doc-order-completeness/spec.md`
- 前置:ADR-0046(image dims + document-order)· ADR-0047(chapter-overview pin)· ADR-0034(neighbour image attach)· ADR-0040(per-KB config-scope)
- code:`backend/api/schemas/query.py`(ImageRef)· `backend/ingestion/orchestrator.py` L188-220 · `backend/generation/citation_enrichment.py`(parse)· `backend/generation/citation_image_neighbors.py`(揀圖)· `frontend/lib/chat/citation-images.ts`(排序)
- architecture.md §3.6(index embedded_images)/ §3.7(揀圖 / expansion)/ §4.5(schema)
- memory `project_chat_demo_rag_quality_followups`(跨文件 30-query eval baseline)
- H1(§3.6/§3.7/§4.5 schema + 揀圖行為)· H4(Tier 2 multimodal 邊界)· H7(frontend reverse-drift fix 例外)
