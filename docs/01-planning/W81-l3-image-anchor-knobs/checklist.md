# W81 checklist — L3 image-anchor knobs UI(缺口 A,ADR-0060)

> tick 規則:完成 `→ [x]`;延後 `[ ]` + 🚧 + reason + target(不可刪)。每 commit 對應 ≥1 項(R2)。

## F1 — L3 image-anchor 旋鈕組(frontend)

- [ ] F1.1 `doc-config.ts` `DocConfig` interface 加三 optional 欄位(`enable_inline_image_markers` / `enable_section_anchored_aux_images` / `section_anchor_max_per_anchor`,mirror backend)
- [ ] F1.2 `doc-config-tab.tsx` `DOC_TUNE_KNOB_KEYS` 加三 key(自動納入 setKnob/buildDraftConfig/dirty/overriddenCount/saveMutation)
- [ ] F1.3 新 `DocTuneGroup`「Inline 圖文錨定」(icon=Tag)插「Citation neighbour images」組後:toggle=`enable_inline_image_markers` + children(`DocSwitchKnob` section 錨定 + `DocTuneKnob` 每錨點 cap)+ hint 文案
- [ ] F1.4 type-check 0 + lint 零新 warning + build ✓;視覺用既有 component(零發明)

## F2 — 驗證 + browser

- [ ] F2.1 type-check / lint / build 全綠
- [ ] F2.2 browser(playwright)驗 L3 顯示「Inline 圖文錨定」組 + 三旋鈕可調 → 改值 → `PUT /config` persist → GET /config 確認(drive-images-1 一 doc;改完還原免污染)

## F3 — closeout

- [ ] F3.1 type-check/lint/build + browser 全綠
- [ ] F3.2 closeout:plan closed + progress retro + ADR-0060 README index + memory append
