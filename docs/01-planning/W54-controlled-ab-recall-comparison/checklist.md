# W54 — Controlled Shared-Question A/B Recall Comparison · Checklist

> Atomic items per deliverable。不可刪未勾項(只 `[x]` 或標 🚧 + reason)。
> **收 W53 明文 deferred controlled A/B**;**reuse EvalRunner keyword mode**(R6 發現 1,零新 recall 數學)+ `_collect_chunks` + W52 generator pattern;**section_path strategy-invariant**(R6 發現 2)做文字錨點;**W53 dataclass 不可 reuse**(R6 發現 3,self-retrievability framing → W54 自有 controlled dataclass);**仍 synthetic + lexical-containment proxy** 誠實 framing(R1);**無 H1 → 無 ADR**;**H6** QA 生成 + harness 同步 test。

## F0 — Phase kickoff
- [x] F0.1 plan/checklist/progress committed(R1);scope(controlled A/B 收 W53 deferred / section-anchored shared QA / keyword-mode reuse / 誠實限制)+ key design 鎖定;R6 grep 三發現記 progress

## F1 — Text-anchored shared QA 生成(C06)
- [ ] F1.1 NEW `backend/eval/controlled_comparison.py`:`TextAnchoredQAPair`(question/expected_keywords/source_doc_id/source_section_path/source_text)+ `KeywordQAGenerateFn` type alias
- [ ] F1.2 `make_qa_keyword_generator(settings) -> KeywordQAGenerateFn | None`(judge `gpt-5.4-mini` + `patch_for_gpt5`;單 call 返 `(question, keywords)` JSON;parse fail / 無 cred → None;mirror W52 graceful)
- [ ] F1.3 `build_section_passages(chunks)`:group by `(doc_id, tuple(section_path))` → concat 文字(newline join)→ 截斷 `max_passage_chars` → 丟空/過短
- [ ] F1.4 `generate_text_anchored_qa(passages, generate_fn, *, sample_size, seed, max_concurrency)`:seeded 抽樣 + sorted 穩定;無 keyword pair 丟
- [ ] F1.5 `to_keyword_eval_set_payload(pairs, *, kb_id, seed)`:EvalRunner keyword-mode entries(`validated=False` + `acceptable_chunk_ids=[]` + `expected_answer_keywords` 填值 → 保證 keyword path)
- [ ] F1.6 ruff check+format clean;mypy --strict controlled_comparison.py 零 error(exit 純跨模組 pre-existing)

## F2 — Controlled 比較 harness(C06)
- [ ] F2.1 `build_shared_eval_set(engine, kb_id, *, generate_fn, output_path, sample_size, seed) -> int`(collect chunks → passages → generate → 寫 frozen YAML → 返 pair 數;空 → raise 自有 error)
- [ ] F2.2 `ControlledStrategyResult`(strategy/recall_at_k/sample_size/chunk_count/errored)+ `ControlledStrategyComparison`(kb_id/top_k/eval_set_version/results/best_strategy;**docstring 明標 controlled A/B + lexical-containment proxy 非人手 ground truth**)
- [ ] F2.3 `run_controlled_strategy_comparison(kb_id, strategies, *, reindex_with_strategy_fn, score_fn, top_k)`:per strategy reindex → score_fn() 跑同一 frozen set → 收;best=最高 recall;依賴可注入(W53 loop shape parallel,但 W54 自有 controlled dataclass)
- [ ] F2.4 ruff clean;mypy strategy/harness 零 error

## F3 — CLI driver(scripts)
- [ ] F3.1 thin CLI `scripts/run_controlled_ab_comparison.py`(`async with lifespan(app)` 攞 populated state + Request shim;build_shared_eval_set 一次 → per strategy update_config→run_kb_reindex→EvalRunner keyword mode 跑同一 frozen set;輸出報告 + 誠實 caveat;live smoke-deferred)
- [ ] F3.2 ruff clean;mypy 零 error

## F4 — Tests(H6)+ Doc-sync + closeout
- [ ] F4.1 test `test_controlled_comparison.py`:`build_section_passages`(group by doc_id+section_path / concat / 截斷 / 丟空)+ `generate_text_anchored_qa`(seeded 穩定 / 無 keyword pair 丟 / stub generator)
- [ ] F4.2 test:`to_keyword_eval_set_payload` 餵 EvalRunner → **assert mode=="keyword"**(stub engine 返含 keyword 文字 → recall 計算正確;R4 保護:確認唔誤入 strict)
- [ ] F4.3 test:`run_controlled_strategy_comparison` stub reindex+score(同一 frozen set,per strategy 唔同 recall)→ 報告 assemble + best pick + empty case
- [ ] F4.4 0 regression:test_controlled_comparison + eval suite(synthetic_qa/strategy_comparison/eval_runner)全 pass;ruff clean;mypy 改檔零 error
- [ ] F4.5 Doc-sync:architecture.md §5.5.5 W54 amendment(controlled A/B harness;NON-architectural eval extension 標明無 H1)+ W53 cross-ref;eval-methodology.md §10.6 W54 controlled-but-lexical 限制 note;roadmap line 112/§3 → ✅ W54 shipped + 修訂史;session-start §10 W54 closed row + W55+(local-only);plan status→closed + changelog
- [ ] F4.6 Phase Gate G1-G5 = PASS + retro + carry-overs(W55+)+ R5 recheck(無 §3/§4 touch → 無 ADR)+ checklist 全 tick(無 🚧)
