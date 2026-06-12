# W68 — checklist(dedup-before-cap,ADR-0054)

## F1 — ADR
- [x] `docs/adr/0054-dedup-before-cap-image-budget.md`(Accepted,approver Chris 2026-06-12)
- [x] `docs/adr/README.md` index 加行

## F2 — code
- [x] `cap_images_per_answer` 改寫(unique 預算 + dup 剪走;None passthrough 不變)+ docstring 指 ADR-0054(`16301ed`)
- [x] ruff check + format clean

## F3 — tests
- [x] 改寫 `test_cap_trims_cumulative_total_across_citations` + `test_cap_above_total_keeps_objects_untrimmed`(`img_offset` distinct checksums,註明 ADR-0054 理由)
- [x] 新增:dup 唔食預算(W67 形態)/ dup 喺預算內都剪 / within-citation dup
- [x] 48 passed(effective_config + ch010 + config_test_route)+ 6 passed(query_per_kb_config)

## F4 — A/B 驗證
- [x] backend 重啟(載新 code)+ health
- [x] 9/9 run @ cap=70 → **mean 0.995 / precision 0.988**;Q001+Q036 1.00(65/65)/ Q005 1.00 / 對照持平(AC3 ✅)
- [x] Q043 0.96(returned 70 = 撞 cap)→ R3 amendment cap 80 → 單條驗證 **73/73 = 1.00**

## F5 — persist
- [x] cap 50→70 → (R3) →**80** + readback;終態 80/10/40

## F6 — 收爐
- [x] rollup + memory + plan closeout + progress retro
