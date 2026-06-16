# W86 progress — preset 出廠中值 ingest 信號 audit（DD-14 降級版）

## Day 1（2026-06-16）

### Context
用戶 status review 後對 5 個 defer 項分流：4 個紅燈（DD-9/10/12/13）維持 defer，只執行 **DD-14**。
矛盾 surface：完整校準需真實非圖密 KB + GT（現缺）→ 用戶選**降級版 ingest 信號 audit**（AskUserQuestion 確認）。

### 做咗
- 建 W86 phase folder（plan / checklist / progress，R1）。
- 寫 `scripts/dd14_preset_signal_audit.py`：reuse `profiler_accuracy_harness` real-parse + `DocumentProfiler`，
  按 classified profile group 收集 `ProfileSignals` 圖量分布，對照 `PROFILE_PRESETS` cap 判截斷風險。
- 跑 audit（background，Docling parse ~30 文件 + 7 scan）。

### F1 audit 結果（首 run real-parse 全 30+7 成功；表格 print 撞 Windows cp1252 → 修 `sys.stdout.reconfigure(utf-8)` 重跑驗證）

每 profile 真實圖量分布（整份文件 `embedded_images`）對照 `PROFILE_PRESETS` cap：

| profile | cap | n | img min/中位/max | verdict |
|---|---|---|---|---|
| `P1_sop_imgdense` | 80 | 6 | 23/218/253 | QUERY-DEP（4/6 整份>80；**已 W59-68 retrieval 驗 ~1.0,引用既有**）|
| `P1_sop_text` | 20 | 2 | 0/0/0 | SAFE*（PDF 0 受 D8 缺口污染；docx runbook 真低圖）|
| `P2_prose` | 12 | 4 | 0/0/8 | SAFE（max 8 ≤ 12）|
| `P3_slide_imgdense` | 40 | 2 | 25/32/39 | SAFE（max 39 貼邊界 40）|
| `P3_slide_text` | 12 | 13 | 0/0/17 | QUERY-DEP（2/13 整份 17>12 — Session1 EN/ZH）|
| `P4_scan_imgdense` | 20 | 7 | N/A | N/A（scan embedded=0,圖=OCR pages）|
| `P5_form` | 8 | 2 | 0/0/0 | SAFE（form 本無/極少圖）|
| `too_small` | None | 1 | — | inherit |

per-doc 圖量峰值（透明度）：DRIVE AR=253/AP=248/FA=223/GL=213/CB=58/BM=23；P3 FY26-BP-DCE=39/Nagarro=25/Session1×2=17/FY26-Budget=12。

### F2 rationale 結論

**A. cap「絕不截斷」維度 — 本 phase 能 close（有真實圖量背書）**
- 4 個非/中圖密 profile 保守 cap 確認對真實樣本絕不截斷：`P2_prose`(8≤12) / `P5_form`(0≤8) / `P1_sop_text`(0≤20) / `P3_slide_imgdense`(39≤40)。**驗證 D7「保守 default 對低圖文件絕對夠」成立**。
- `P1_sop_imgdense` cap=80 整份圖量遠超(253),但 per-answer 召回最佳點**已 W59-68 retrieval 驗 ~1.0**,引用既有非本 phase 重驗。

**B. 揭 2 個 observation — 仍需 retrieval GT(blocked,記 DD-14 open 部分)**
- `P3_slide_text` cap=12 vs Session1 EN/ZH 各 17 圖：被 `img_density<0.12` 分到 text 子型但整份 17>cap。是否 under-serve 概覽 query **需 retrieval GT**；且根因可能是**分類 threshold** 非 cap → **不擅自調**(無 GT + 可能改錯層)。
- `P3_slide_imgdense` cap=40 樣本 max 39 貼邊界：更大簡報可能 TIGHT,記錄待 production 反映。

**C. 數據盲點 — 誠實標(污染本 audit 圖量信號)**
- **PDF 圖量全 0 受 ADR-0056 D8 PDF picture-ingestion 缺口污染**(harness 預設 converter `generate_picture_images=False` + no-OCR)→ PDF 類文件(Procedure.pdf / AI demonstration.pdf)圖量信號**不可信**,不能據此對 PDF 下 cap 結論。
- docx 圖 Pillow load 失敗(Guideline.docx warning)→ 個別 docx 圖量低估。

**D. 策略開關(neighbour/marker/answer_detail)— rationale 文件化非數據校準**
- 非圖量函數 → 對齊 ADR-0056 D1:`P2_prose` neighbour off 避散文錯位 / `P5_form` table 為主 / imgdense 開圖流程 + section 錨定 / text 子型低圖關 neighbour。皆 D1 既有設計理據,本 phase 確認自洽,**不宣稱數據校準**。

### F3 結論：**不觸發 production 改動**
無真正 RISK(cap < 典型圖量導致確定截斷);2 個 observation 屬 query-dependent 需 GT,per D7 + 無 GT **不擅自調 default**。純 diagnostic + 文件化結案(如 W85）。

### 淨結論
- **DD-14 部分 close**:非/中圖密 profile 的 cap「不截斷」維度有真實圖量背書(SAFE),D7 保守原則驗證成立。
- **DD-14 仍 blocked 部分**:cap「召回品質最佳點」需真實 KB + retrieval GT(P1_imgdense 已驗,P3_slide 等未驗);PDF 圖量信號待 D8 picture re-index 才可信。
- 零 production code 改動(只新增 diagnostic script `scripts/dd14_preset_signal_audit.py`)。
