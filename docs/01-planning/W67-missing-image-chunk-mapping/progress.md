# W67 — progress(漏網圖 chunk-level 映射)

## Day 1(2026-06-12)— kickoff

- 用戶同意 W66 建議:H1 揀武器前先零 code 定位漏網圖。
- R6:W59 catalog 現成有效(mtime 2026-06-10 > re-index 2026-06-08)+ 含 `owning_chunk_ids`;
  Q001 doc 同一份(`drive-user-manual-0601-ar-fna-ar-management-v0-03`)。
- 三件套 committed:`docs(planning): W67 missing-image chunk mapping kickoff`(`2d02109`)

### F1 — 資料集 ✅
- catalog 複用(mtime 2026-06-10 > re-index 2026-06-08);Q001 fresh capture ×2:
  persisted cap=50(unique=40,本 run dup-waste 較重)+ **cap=150 capture**(26 cits / raw=150 /
  unique=48,= W66 重現;**用呢份做映射基準**,抓完即復原 cap=50 readback PASS)。

### F2 — join 映射 ✅(AC1/AC2)
- **17 張漏網圖全部 in-catalog,owning chunk 全部 = CITED-CHUNK**,全部 source_section =
  `2.1.3 System Instruction for each step`(S04 mega-section,44 張圖嗰個)。
- **AC2 三類歸屬判決:三類都唔啱 — 出現第四類**:「owning chunk 被 cite,但該 citation 嘅
  圖被 cap 預算清零」。
- **預算時間線(決定性證據)**:citation 1–4(ci 7/6/8/5,每條 ~22–48 refs 嘅自有+neighbour
  aux)食盡 150 refs(48+40+40+22=150);**citation 5–26(22 條)refs_kept 全部 = 0**。
  漏網 17 張嘅 owning chunk 喺 citation 位置 9/13/24/25。
- **section 分佈**:漏網 17/44 全部喺 2.1.3;2.1.1/2.1.4/2.1.5 零漏網(佢哋嘅圖搭咗前置
  citation 嘅 neighbour aux 順風車)。

### F3 — 判決 ✅(AC3)— **W66「供給天花板」判決推翻**
1. **收割範圍唔係天花板**:26 條 citation 覆蓋 ci 5–30 = 成個 AR01 章節,**GT 65 張每張嘅
   owning chunk 都被 cite**。供給完整,reach 完整。
2. **真兇 = cap 預算機制**:`cap_images_per_answer` 計 refs(含跨 citation 重複)+ 順 citation
   次序走 — 前置 citation 每條揹 ~40 張 aux(互相高度重複:150 refs = 48 unique,68% 重複),
   任何合理 cap 都喺 citation 4 前後耗盡 → 後面 cited chunks 自有嘅 fresh 圖全部清零。
   要行到 citation 9(第一張漏網)需 cap≈360 — 抬 cap 係死路。
3. **W66 嘅 dedup-before-cap 降級判決推翻**:預算計 unique 嘅話(重複唔食預算),cap=65–70
   就行勻全部 26 條 citation → Q001 65/65 喺 reach 內。**dedup-before-cap 係 0.74 → 潛在 1.00
   嘅唯一槓桿**(W66 cap 60→150 zero-gain 嘅假象 = 前置 citation 重複密度高到 +90 refs 全係
   dup,單睇三軸唔夠,要第四軸 = per-citation 預算時間線)。
4. **武器揀定**:三岔口唔使去 (a) 章節收割新機制 / (b) caption — **dedup-before-cap(改
   `cap_images_per_answer` 預算計 unique)就夠**。屬 pipeline 行為改動 + 反轉 ADR-0040 明文
   「blunt no-dedup」決定 → **H1 route:STOP+ask 提案,本 phase 不實作**(per plan 非目標)。
5. 用戶可見傷害對應:citation 5–26 清零 = 答案後段步驟全部冇圖 — 同 chat UI 體感一致。

### Retro
- 方法論:raw/unique/GT 三軸(W66)都唔夠 — **per-citation 預算時間線**先睇到「cited 但被
  清零」呢個第四類;每層「天花板」都要問「呢個數係邊個機制產生」。
- W66 嘅誤判教訓:cap 60→150 zero-gain 唔等於「供給盡」— 增量 refs 嘅邊際 unique 率取決於
  citation 次序入面嘅重複密度,唔係供給總量。
- 零 code / 零 config 殘留(cap capture 後即復原 readback PASS);臨時分析腳本喺 temp,不入 repo。
