# W77 checklist — profiling UI mockup

> tick 規則:完成 `→ [x]`;延後 `[ ]` + 🚧 + reason + target(不可刪)。每 commit 對應 ≥1 項(R2)。
> 全程 reuse 現有 `styles.css` primitives + `oklch(var(--token))`,零 hardcode 顏色(§3 H7 一致)。

## F1 — mock profile data(`ekp-data.jsx`)

- [ ] F1.1 每 doc 加 `profile` + `profile_confidence` + `signals`(13-field,mirror W76 `DocProfileInfo`)
- [ ] F1.2 cover P1_sop_imgdense(高信心)/ P2_prose / P4_scan / 低信心(黃旗)/ unprofiled(null)
- [ ] F1.3 shape 對齊 backend `DocProfileInfo`(profile / confidence / signals)

## F2 — L2 文件列表 profile badge(`ekp-page-kb.jsx` Documents table)

- [ ] F2.1 讀 Documents table 落點區(line 266-307)現有結構
- [ ] F2.2 加「Profile」欄:badge(P1/P2/P4 variant)+ 信心度;低信心 `badge-warning` 黃旗;unprofiled muted「未分析」
- [ ] F2.3 reuse `.badge` family + `badge-dot`;對齊現有 status 欄風格

## F3 — L3 文件畫像 section(`ekp-page-doc-detail.jsx` `DocConfigTab` line 410)

- [ ] F3.1 讀 DocConfigTab 落點區現有結構
- [ ] F3.2 config tab 頂加「文件畫像」card:profile + 信心度 badge + signals 透明展示(stat-grid / key-value)
- [ ] F3.3 override 下拉 `select`(換 profile)+ 低信心 `banner-warning`「待人手確認」
- [ ] F3.4 reuse `.card`/`.stat`/`.field`/`.select`/`.banner`;放現有 knobs 之上

## F4 — Settings 分類規則 tab(`ekp-page-settings-tabs.jsx` `tabs` line 9-15)

- [ ] F4.1 讀 tabs array + tab body 渲染結構
- [ ] F4.2 加第 7 tab「文件分類規則」:profile→preset mapping `table`(6 profile)+ threshold `field` + preset knob 摘要
- [ ] F4.3 reuse `.table`/`.card`/`.field`;對齊其他 tab 佈局

## F5 — L1 上載偵測 banner(`ekp-page-misc.jsx` `PageUploadWizard` StepExecute)

- [ ] F5.1 讀 StepExecute 落點區(line 63)
- [ ] F5.2 ingest 完成加「偵測為 X,已套 preset」`banner-success` + 即時 override 連結
- [ ] F5.3 reuse `.banner`;對齊現有 wizard step 視覺

## F6 — wire + browser 驗 + closeout

- [ ] F6.1 確認 4 處喺 `EKP Platform.html` render(mock data wire 補如需)
- [ ] F6.2 **browser 肉眼驗 4 處(DD-1)**:對應 route 視覺對齊現有 UI,無 drift
- [ ] F6.3 `PAGE_INVENTORY.md` / `DESIGN_README.md` 補 profiling UI 說明(如需)
- [ ] F6.4 closeout:plan closed + progress retro + memory append
