# W44 — Chunker Image-Density Deep Fix · Checklist

> Atomic items per deliverable(plan §2)。F1+ GATED on F0 PASS。

## F0 — H1 STOP+ask gate
- [ ] F0.1 Present ADR-0041 H1 boundary + 決策 2 切法選項(A/B/C/D)+ 風險(重切影響 recall)
- [ ] F0.2 Chris confirm H1 + 揀切法 + 定 `max_images_per_chunk` cap default + tolerance
- [ ] F0.3 ADR-0041 Status Proposed → Accepted(回填切法 + cap 決定)
- [ ] F0.4 plan §3 G1 回填 cap 具體值 + §7 changelog 記 F0 結果

## F1 — Chunker image-aware flush
- [ ] F1.1 `layout_aware.py` text flush 同步 reset `image_positions`(修 `:207`/`:213-218` pile-on)
- [ ] F1.2 `max_images_per_chunk` soft cap force-split(延續 `section_path`,prev/next 連續)
- [ ] F1.3 新 `Settings.chunker_max_images_per_chunk` knob(default = preserve;`None`/0 = 今日 bit-identical)
- [ ] F1.4 `LayoutAwareChunker.__init__` wire knob;orchestrator 傳遞(若需)
- [ ] F1.5 ruff + mypy --strict clean

## F2 — Chunker unit test(H6 mandatory)
- [ ] F2.1 新 image-flush 分配 test(圖隨 doc_order 落正確 sub-chunk)
- [ ] F2.2 `max_images_per_chunk` cap force-split test
- [ ] F2.3 default(`None`/0)= 今日行為 bit-identical regression test
- [ ] F2.4 既有 ADR-0033 merge + BUG-017 sibling-guard 無 regression(全 test_chunker pass)

## F3 — Re-index + presentation 驗證
- [ ] F3.1 pre-flight(Langfuse 200 / Postgres / backend venv restart 載新 code)
- [ ] F3.2 doc-level reindex 圖密文件(AR `test-kb-*`)重切
- [ ] F3.3 讀重切後 index 確認最大 single-chunk 圖數 ≤ cap(G1)
- [ ] F3.4 圖數分佈前後對比(G2)

## F4 — Eval no-regression gate(top risk)
- [ ] F4.1 重切前 baseline eval(R@5 + RAGAs 4-metric)snapshot
- [ ] F4.2 重切後 eval 對比(G3 R@5 / G4 faithfulness·correctness 唔跌)
- [ ] F4.3 Gate verdict(PASS / PARTIAL / FAIL per §3 policy)→ Chris 拍板

## F5 — Closeout
- [ ] F5.1 architecture.md §3.3 amend(inline-tag image-distribution + cap,沿 §3.4/§3.7 precedent)
- [ ] F5.2 ADR-0041 validation note(gate verdict + 實測前後圖數)
- [ ] F5.3 plan/checklist/progress flip closed + retro
- [ ] F5.4 session-start §10 W44 row + roadmap §3 W44 done + [AUDIT-A] 實測數回填
- [ ] F5.5 commit cascade(對應 progress Day-N,R2)
