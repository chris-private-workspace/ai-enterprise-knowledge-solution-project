---
change_id: CH-008
spec_ref: ./spec.md
---

# CH-008 — Checklist

> 逐項 atomic;done → `→[x]`,未做標 🚧 + 理由(per CLAUDE.md sacred rule)。

## Implementation
- [x] I1 — `build_contextual_document(section_path, chunk_text)` helper(`retrieval/contextual.py`);section_path 空 → fallback 純 chunk_text
- [x] I2 — `cohere.py` rerank document 用 helper(+ docstring 更新)
- 🚧 I2b — `azure_semantic.py` rerank document 用 helper(一致性)— **deviation**:azure_semantic **唔砌 document list**(re-issue `queryType=semantic` search,排序由 index `ekp-semantic-config` 決定)→ 無 document 可注入;Azure semantic 非 production reranker(Cohere H2 lock)+ chat 行 semantic OFF。建議 drop(該路徑經 I3 embedding re-index 間接受惠);真正注入需改 index schema(額外 H1,Karpathy §1.2 reject)。**待 Chris 確認**(spec §6 changelog 記)
- [x] I3 — ingestion embedding input 用 helper(`orchestrator.py:153` embed_inputs,stored chunk_text 原文不變)
- [x] I7a — architecture.md §3.6 文字更新(rerank document + embedding input = section context + chunk_text;CH-008 amendment block)
- [x] I7b — C04(rerank)+ C01(embedding input)design note bump(C03 §3.6 doc 已 amend;component 名 C03→C01 修正)

## Tests (H6)
- [x] T1 — `build_contextual_document`:有 path → `"<path>\n<text>"`;空/None path → 純 text;多層 path join;whitespace-only entries drop(4 tests)
- [x] T2 — `cohere.py` rerank document 構造用 contextual(mock；assert payload documents[0] 含 section、documents[1] fallback)
- [x] T3 — embedding-input 構造用 contextual(capturing embedder → assert embed 收到 context-prefixed 串;stored chunk_text 不變)

## Re-index + Verification
- [x] V1 — backend pytest(`test_contextual_retrieval_ch008` + `test_reranker` + `test_orchestrator` 27 passed)+ ruff(all pass)+ mypy(改檔 0 新 error;17 個 pre-existing 全喺未 touch 檔)
- [ ] V2 — `drive-images-1` in-place re-index(I3 embedding 生效)
- [ ] V3 — retrieval-test(GL)before/after:top-8 由 §5.1.3 GL05 #1 + §2.1.x → GL03 為主、off-topic 清走(AC4)
- [ ] V4 — 現有 eval set 無 regression(AC5)
- [ ] V5 — chat live 驗(用戶):GL 答案錨 GL03 + 圖由 Create 行先(配合已 merge Finding D)

## Closeout
- [ ] C1 — spec status → done;progress closeout
- [ ] C2 — ADR-0045 Proposed → Accepted
- [ ] C3 — commits 對應 Day-N(R2);ff-merge 入 main(用戶確認)
