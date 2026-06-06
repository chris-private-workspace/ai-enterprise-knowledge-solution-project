# W53 — Chunk-Strategy Recall Comparison · Checklist

> Atomic items per deliverable。不可刪未勾項(只 `[x]` 或標 🚧 + reason)。
> **heading_aware 改 chunking = H1 → ADR-0044 必寫**;**reuse W52 `run_synthetic_recall`**(零新 recall 數學)+ LayoutAwareChunker 基礎設施;**per-config 重生 QA = self-retrievability 非 controlled A/B** 誠實 framing(R1/R2);**H6** chunker + harness 同步 test。

## F0 — Phase kickoff
- [x] F0.1 plan/checklist/progress committed(R1);scope(heading_aware 真 strategy / per-config 重生 QA self-retrievability / 三 R6 發現)+ key design 鎖定;R6 grep 記 progress

## F1 — ADR-0044
- [ ] F1.1 `docs/adr/0044-heading-aware-chunk-strategy.md`(Context 三 R6 發現;Decision heading_aware section-bounded 語意 + _select_chunker dispatch;Alternatives;Consequences;References);Status=Accepted
- [ ] F1.2 ADR README index 加 0044 row

## F2 — heading_aware chunker + chunk_strategy wiring(C01)
- [ ] F2.1 `HeadingAwareChunker`(section-bounded:只 hard_cap split / 無 target-split / 無 min-merge;reuse layout_aware section-walk/token/image-cap;接 max_images_per_chunk)
- [ ] F2.2 `strategies.py select_chunker`:heading_aware → HeadingAwareChunker(移除 NotImplementedError)
- [ ] F2.3 `documents.py _select_chunker`:按 kb_config.chunk_strategy dispatch(heading_aware → HeadingAware(cap);else → LayoutAware path,bit-identical fall-through)→ reindex 真 honor strategy
- [ ] F2.4 mypy --strict(改檔零新 error)+ ruff check+format clean

## F3 — Strategy-recall 比較 harness + CLI(C06)
- [ ] F3.1 NEW `run_strategy_recall_comparison(...)`:per strategy set chunk_strategy → reindex → run_synthetic_recall → `StrategyRecallComparison`(recall + chunk 數 + sample 數 per strategy);依賴可注入
- [ ] F3.2 thin CLI `scripts/run_strategy_recall_comparison.py`(mirror run_synthetic_recall bootstrap;live smoke-deferred)
- [ ] F3.3 mypy + ruff clean

## F4 — Tests(H6)+ Doc-sync + closeout
- [ ] F4.1 test:`HeadingAwareChunker` section-bounded(無 target-split/merge;只 hard_cap split)→ 同 ParserResult heading_aware chunk 數 < layout_aware + image-cap 仍生效
- [ ] F4.2 test:`_select_chunker` dispatch(heading_aware → HeadingAwareChunker / else → LayoutAwareChunker + cap combine)
- [ ] F4.3 test:`run_strategy_recall_comparison` stub reindex_fn + stub recall → 比較報告正確 assemble
- [ ] F4.4 既有 backend test 0 regression(`pytest` — 重點 test_kb_reindex / chunker / eval)
- [ ] F4.5 Doc-sync:architecture.md §3.3/§3.5 + §5.5.5 W53 amendment + ADR-0044 cross-ref;eval-methodology.md §10.6 per-config confounding note;roadmap 兩者合一下半截 → ✅ W53 shipped + 修訂史;session-start §10 W53 row + W54+(local-only);plan status→closed + changelog
- [ ] F4.6 Phase Gate G1-G5 = PASS + retro + carry-overs(W54)+ checklist 全 tick(或 🚧 + reason)
