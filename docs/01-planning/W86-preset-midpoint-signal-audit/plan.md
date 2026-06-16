# W86 plan — preset 出廠中值 ingest 信號 audit（DD-14 降級版）

**Status**: active（2026-06-16 kickoff）
**Kickoff**: 2026-06-16
**Phase 類型**: diagnostic-first（純離線信號分析 + rationale 文件化；零或僅保守微調 production default）
**ADR**: 無（預期）。若 F2 揭某 default 明顯不合理需改 production 值 → 屆時評估是否寫 ADR（調參非架構，多數不觸 H1）。

---

## §1 Context / 緣起

用戶 status review 後（2026-06-16）對 5 個 defer 項分流：4 個紅燈維持 defer，**只執行 DD-14**（preset 出廠中值校準）。

**矛盾 surface + 降級決定**：DD-14 完整版的「實證校準」需要真實非圖密 KB + 可靠 GT，**兩者現缺**（用戶確認手上無真實非圖密 KB）。用戶選 **降級版 ingest 信號 audit**：用現有 `docs/06-reference/01-sample-doc/` 真實企業文件，跑 `profiler` 得每 profile 真實結構信號分布，據此 audit `profile_presets.py` 的 cap/旋鈕合理性 + 文件化 rationale。

**現狀（grounding，R6）**：
- `backend/ingestion/profile_presets.py:28` `PROFILE_PRESETS` 8 個 profile 的 preset 中，**唯一 `P1_sop_imgdense` 經實證校準**（drive-images-1 image-recall ~1.0，W59-68 cap=80/max_aux=40）；其餘 7 個（`P1_sop_text`/`P2_prose`/`P3_slide_imgdense`/`P3_slide_text`/`P4_scan_imgdense`/`P5_form`/None×2）是「ADR-0056 D1 描述 + D7 保守 default」，**中值未逐一實證**（見 `profile_presets.py:10-11` docstring 自承）。
- `scripts/profiler_accuracy_harness.py` 已完整 real-parse 全 corpus（30 docx/pptx/pdf + 7 scan）+ 跑 `DocumentProfiler` + GT 比對。**已產 `ProfileResult.signals`（`ProfileSignals`：images / img_density / tables / paragraphs / pdf_pages 等）但只用 family 命中,未消費 signal 分布** → 增量 = reuse 其 parse，額外按 profile group 收集 signal 分布並對照 preset cap。
- corpus 每 profile 真實 sample（per harness `EXPECTED`）：P1 ×8 / P2 ×3 / P3 ×14 / FORM(P5) ×2 / P4 ×7 / SMALL ×3。每可 audit profile ≥2 真實 sample。

**核心誠實邊界（決定 scope 的關鍵）**：
- **cap（`max_images_per_answer`）= 可數據驗證**：cap 應 ≥ 該 profile 真實文件典型圖量（否則截斷召回）；偏大不是問題（ADR-0054 dedup-before-cap + W83 末尾分組已處理 over-supply）。→ 用真實圖量分布**直接驗證**。
- **其他旋鈕（neighbour on/off、inline marker、answer_detail）= 策略開關,非圖量函數**：合理性靠「該 profile 結構特性」論證（如 P2 散文 neighbour off 避錯位 = ADR-0056 D1 已有 rationale），**不是**靠 sample 圖量校準。→ audit 對它們只做「對齊 D1 的 rationale 文件化」,**不宣稱數據校準**。
- **retrieval 品質最佳點仍 blocked**：cap 的「召回品質最佳值」終究需 retrieval GT，本 phase 做不到（要等真實 KB）。本 phase 只驗「cap 會否截斷」+ 文件化,**不是**完整校準。

---

## §2 Scope / Deliverables

### F1 — ingest 信號 audit script（零 production 改動，純離線 diagnostic）
- 寫 `scripts/dd14_preset_signal_audit.py`：reuse `profiler_accuracy_harness` 的 `parse_doc` + `PROFILER` + corpus glob → 跑每文件 → 按 **profile**（非 family）group 收集 `ProfileSignals`（images / img_density / paragraphs / tables / pdf_pages）→ 算每 profile 的 **圖量分布（min / 中位 / max）** + 文件數。
- 對照 `PROFILE_PRESETS[profile].max_images_per_answer` → 輸出 markdown audit 表：每 profile 真實典型圖量 vs cap default → 判 **OK（cap ≥ max 真實圖量,不截斷）/ TIGHT（cap 接近 max,邊界）/ LOOSE（cap 遠超,保守無害）/ RISK（cap < 典型圖量,會截斷）**。

### F2 — rationale 分析 + 文件化
- 據 F1 輸出，為每個 profile 的 cap 寫「有真實信號背書」的 rationale；對策略開關寫「對齊 D1 結構特性」的 rationale。
- 誠實標：哪些值已數據背書（cap 不截斷）/ 哪些仍需 retrieval GT（cap 召回最佳點）。
- 文件化落點 = 本 phase `progress.md` audit 表 + 結論（若有 production 改動才動 code/註解）。

### F3（conditional on F1 揭 RISK）— 保守微調 default
- **僅當** F1 揭某 profile cap < 真實典型圖量（會截斷召回）→ 保守上調該 cap（per D7「分錯寧保守」方向 = 寧 LOOSE 不 RISK）。
- 改 `profile_presets.py` default 須同步 affected test + 評估是否需 ADR + 更新 `docs/08-user-guide/` 03+06（若改 default，per CLAUDE.md §2 維護規則）。
- **預期**：多數 cap 已保守（8-80），F1 大概率全 OK/LOOSE → F3 不觸發,純文件化結案（如 W85）。

---

## §3 設計原則
1. **零或最小 production 改動** — F1/F2 純 diagnostic + 文件；F3 只在 RISK 時保守上調，絕不激進。
2. **cap 數據驗證 vs 開關 rationale 文件化分清** — 不宣稱「全旋鈕校準」（誠實邊界，反 Potemkin per `ekp-anti-patterns`）。
3. **reuse 不重寫** — F1 reuse harness parse，不改 harness（它是 AC1 gate，有自己職責,Karpathy §1.3 surgical）。
4. **誠實標 blocked 部分** — retrieval 品質最佳點仍需真實 KB，本 phase 明確不 close 該維度。

---

## §4 Non-goals（明確唔做）
- **不宣稱完整 DD-14 close** — retrieval GT 維度 blocked，本 phase 只做 ingest-side sanity + rationale。
- **不跑 retrieval / recall / config-test** — 無真實 KB + GT,跑了也 confounded（W85/W60 教訓）。
- **不碰那 4 個紅燈 defer**（DD-9/10/12/13）。
- **不改 harness**（reuse 其 parse helper）。
- **不新增旋鈕種類** — 只 audit 現有 `DocConfig` 欄位。

---

## §5 Risks
- **R1 sample 偏細 / 單檔子型** — 某 profile（如 P1_sop_text / P3_slide_text）真實 sample 少 → 緩解：誠實標樣本數，少於 2 的 profile audit 標「信號弱」不強下結論。
- **R2 圖量分布只驗「截斷」不驗「品質」** — cap LOOSE 不代表召回最佳 → 緩解：§1 已明標此邊界，F2 文件化誠實區分。
- **R3 parse 慢 / OneDrive contention** — Docling parse 30 文件可能數分鐘 → 緩解：background 跑 + 長 timeout，只輪詢（per memory loaded-machine startup 慢非 hang）。

---

## §6 紀律自檢（kickoff）
- **H1** ✅ F1/F2 零 production 改動；F3 保守調 cap default = 調參非架構（不改 §3/§4 component / vendor / storage / view layout / Tier），多數不觸 H1；若改 default 影響行為 → 評估 ADR。
- **H2** ✅ 零新 dep（reuse 現有 parser / profiler）。
- **H4** ✅ 純 rule signal 分析,無 Tier 2 feature。
- **H6** ✅ F1 純 script diagnostic 非 production module,不強制 test；F3 改 production default 則補 affected test。
- **H7** ✅ 無前端改動（純 backend / 文件）。
- **Karpathy** ✅ think（誠實 surface cap-vs-開關區分 + blocked 邊界 upfront）、simple（reuse harness parse 最輕,不建 live runner）、surgical（零/最小 production 改動,不改 harness）、goal（success = 每 profile cap 有真實圖量背書 + rationale 文件化 + 誠實標 blocked 維度）。

---

## §7 Changelog
- 2026-06-16 kickoff — 用戶 status review 後揀只執行 DD-14；矛盾 surface（完整校準需真實 KB,現缺）→ 用戶選降級版 ingest 信號 audit。Grounding 揭 harness 已 real-parse corpus 但只用 family 命中未消費 signal 分布 → 增量 = reuse parse 收集 per-profile 圖量分布對照 cap。核心誠實邊界定調：cap 可數據驗證（截斷）/ 開關靠 D1 rationale / retrieval 品質最佳點 blocked。
