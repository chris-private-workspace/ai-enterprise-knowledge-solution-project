---
change_id: CH-008
spec_ref: ./spec.md
checklist_ref: ./checklist.md
status: in-progress     # in-progress | closed
---

# CH-008 — Progress

> Day-N entries + closeout。每 commit 對應 Day-N mention(R2)。

---

## Day 1 — 2026-06-08

### Context
接 BUG-034 問題1 底層診斷。Finding D(圖按文件次序,presentation)已 merge;但純 rerank top-8 證 reranker 揀錯章節(§5.1.3 GL05 #1、§2.1.x GL02 #3/#4,GL03-Create 沉 #5-8),因為 reranker 只餵 `chunk_text`、section heading 又 generic 重複。74-chunk Cohere rerank A/B 實驗(2026-06-07)PASS:加 section context 後 off-topic 清走、GL03 升頂 7/8。用戶選全套(rerank + embedding,要 re-index)。

### Done
- (kickoff)ADR-0045 寫(Proposed)+ 入 ADR index;CH-008 spec(approved)+ checklist + progress committed(R1.change + R5 滿足)。
- (pending I1-I7 + re-index + eval + closeout)

### Decisions
- 全域 contextual retrieval(非 per-KB);format = `" > ".join(section_path) + "\n" + chunk_text`;section_path 空 → fallback 純 chunk_text(零 regression)。
- Stored `chunk_text` 維持原文(citation/listing/Finding D 不受影響);只 embedding 向量 + rerank document 加 context。
- 本期只 re-index `drive-images-1`(有真實 source、in-place、唔佔 Free-tier 新槽);其他 KB 多 stub source,另議。

### Blockers
- 無。

### Effort
- Planned ~0.5-1 day;Actual:_(填)_

### Commits
| Hash | Subject |
|---|---|
| _(待)_ | docs(adr+change): ADR-0045 + CH-008 kickoff |

---

## Day 2 — 2026-06-08

### Context
ADR-0045 Chris Accept → code 解 gate(H1)。落 I1→I3 + tests + I7 docs。

### Done
- **I1** `retrieval/contextual.py` `build_contextual_document(section_path, chunk_text)` — `" > ".join` + `\n` + text;空/None/whitespace-only path → fallback 純 chunk_text。
- **I2** `cohere.py:94` rerank documents 用 helper(+ docstring 更新 §3.2/§3.6 ref)。
- **I3** `orchestrator.py:153` embed input 用 helper(`embed_inputs`);stored `ChunkRecord.chunk_text=spec.chunk_text` 原文不變(line 212)。
- **I4/T1-T3** `tests/test_contextual_retrieval_ch008.py`(4 helper + 1 cohere + 1 orchestrator = 6 新 test)。
- **I7a** architecture.md §3.6 加 CH-008 amendment block(rerank document + embedding input = section context + chunk_text;stored chunk_text 不變;Azure semantic 注入不適用解釋)。
- **I7b** C04(rerank)+ C01(embedding input)design note bump。
- **V1** pytest 27 passed(ch008 6 + reranker 9 + orchestrator 12)+ ruff all pass + mypy 改檔 0 新 error(17 個 pre-existing 全喺 docling parsers / base.py / schemas.py 等未 touch 檔)。

### Decisions
- **C03→C01 修正**(R6 plan-text contamination):embedding input 改喺 `ingestion/orchestrator.py` = C01 Ingestion,非 C03 Indexing;spec 原寫「C03 Ingestion」component 名張冠李戴。`affects_components` 改 `[C04, C01, C03]`(C03 只係 §3.6 doc 文字)。
- **I2b deviation → 🚧 待 Chris**:`azure_semantic.py` 唔砌 document list(re-issue semantic search,排序由 `ekp-semantic-config` 決定)→ 無 document 可注入;Azure semantic 非 production reranker(Cohere H2 lock)+ chat 行 semantic OFF。建議 drop(經 I3 embedding re-index 間接受惠);真正注入需改 index schema(額外 H1,Karpathy §1.2 reject)。

### Blockers
- **V2-V5(re-index + eval + live 驗)** 待:(1) Chris 確認 I2b drop;(2) backend + Azure + Cohere live 環境就緒。
- ADR-0045 已 Proxxx→Accepted(Chris 2026-06-08);README index 同步。C1/C3 closeout 待 V2-V5。

### Effort
- Planned ~0.5-1 day;Actual:I1-I7 + tests ~實作完成(Day 2 上半)。

### Commits
| Hash | Subject |
|---|---|
| 328e579 | docs(adr+change): ADR-0045 + CH-008 kickoff |
| _(本次)_ | feat(retrieval): contextual retrieval — section-context inject (I1-I3+tests+docs) |

---

**End of CH-008 progress (Day 2 in-progress — code+tests+docs done;V2-V5 待環境+I2b 確認)**
