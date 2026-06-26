# W97 Progress — 乙類緩解:coverage-oriented synthesis

> 接 W96 完整度 gate + DD-16。北極星 §15:答案忠實還原原文段落 → 嗰段圖自然得文字錨。

## Day 1 — 2026-06-25

### ADR-0069 Accept + phase kickoff

- **ADR-0069 由 decision owner 拍板 Accept**(Proposed → Accepted)→ §5.1 H1 解鎖,W97 plan draft → active。
- 補齊 phase 三件套:`plan.md`(active)+ `checklist.md`(F1-F5 atomic)+ 本 `progress.md`。
- F5.1 ADR Accept 先 tick(其餘 F5 phase 收尾做)。

### 範圍提醒(承 ADR-0069)

- 緩解 = additive coverage rule **閘新 config knob default OFF**(mirror `_MARKER_RULE` Rule 9),只喺 `answer_detail=detailed` 之上 compose 變體 / 替代分支 / scenario 子流程 enumerate。
- **驗收靠 W96 gate A/B**(`run_completeness_ab.py`),唔憑感覺;研究反證「prompt 消除位置偏置」(0-3)→ 效果未保證,要量到清楚正向 delta(大過 gate ±0.15 解析度)先考慮 flip default。
- production default flip = 另一決定(out-of-scope)。

### 風險載入(plan §4)

- 🔴 length-bias + synth-timeout(DD-7,120s `synthesizer_request_timeout_s`)→ F4 必驗 mega-procedure。
- 🔴 backend reload=False → 改 prompt code 後重啟驗(`project_stale_backend_no_reload`)。
- 🟡 過度 extractive / 效果 < gate 解析度 → 後者觸發先補 DD-15 fixed-answer。

### F1-F3 落地(code + 測試)

- **F1 config knob 四層**:`enable_complete_coverage` 加入 `Settings`(default OFF)/ `KbConfig` / `DocConfig` / `PerQueryOverrides` + `EffectiveConfig` + `resolve_effective_config`(mirror `enable_inline_image_markers` `_resolve`+`_layer`)。
- **F2 prompt rule**:`prompt_builder.py` 加 `_COVERAGE_RULE`(labelled,非 digit-numbered → compose 喺 optional Rule 9 marker 之後無 collision)+ `build_prompt(complete_coverage=...)`;gate = `complete_coverage and detail_level=="detailed"`(concise no-op);OFF byte-identical pre-W97。
- **F3 wire**:`synthesizer.py` synthesize + synthesize_stream `getattr` 讀 knob → `build_prompt`;**query.py 零改動**(knob 經 `EffectiveConfig` 自動流通,per-query seam 預設 None fall-through)。
- **驗證**:新 `test_complete_coverage_w97.py` 16 測試 + 既有 affected(answer_detail / effective_config / inline_image_markers)= **75 passed**。ruff clean(import 排序 auto-fix)。mypy:`effective_config` / `prompt_builder` 自身 clean;`synthesizer.py` 嘅 `create()` overload error 喺 **HEAD pre-W97 已有 3 個**(grep 確認),W97 零新 error。
- production-preserve:全部 OFF path byte-identical;default OFF → 未跑 A/B 前 production 行為不變。

### F4 A/B 驗證 → NEGATIVE,phase REVERT

承 F1-F3(commits `fd45db5` + `34a1475` per-query lever)。重啟 backend(stale，per `project_stale_backend_no_reload`)+ semantic ranker off。

**Iter-1**(5 query,K=3,`reports/completeness_w96_coverage_ab.yaml`):mean A=0.806 / B=0.806 / **delta 0.000**;C001 +0.08 / C002 −0.07 / C003 +0.15 / C004 0.00 / **C005 −0.17**;勝負 2:2:1。乙類 target 改善但 no-variant 反退,淨零。

**Iter-2 精修**(commit `89c25ee` — `_COVERAGE_RULE` 只 enumerate 真實變體 + 禁 pad/杜撰;C001/C003 target + C005 control,K=15,`reports/completeness_w97_variant_ab.yaml`):mean A=0.828 / B=0.797 / **delta −0.031**;**C005 反退冇修好 −0.16**;targets 入噪聲(C001 +0.05 / C003 +0.01);C003 OFF 由 0.64 跳 0.88(同 config)。

**判決**:G-W97 未通過。乙類 prompt 緩解(原版 + 精修)= null-to-negative + 可重現下行 + 無可靠上行;乙類 gap 實證 **stochastic 非 systematic**;fixed-answer 精準路 blocked on `gpt-5.5`(H2 拒 temp≠1)。

**REVERT**(用戶 decision owner 揀選項 2):還原 8 backend 檔到 pre-W97 + 刪 `test_complete_coverage_w97.py` + 兩個 w97-variant eval-set;保留 ADR-0069(§Outcome)+ 本 plan/progress 作「試過點解唔得」記錄。3 個實驗 commit(`fd45db5`/`34a1475`/`89c25ee`)留喺 history。

### 教訓

- 乙類 over-summarisation 唔係穩定可 prompt-fix 嘅系統性缺陷;per-answer 高 stochasticity(W96/DD-15 已證)令「gap」本身浮動,prompt 規則對 variant-heavy 案有細幫助但對 no-variant 案有對等拖累 → 淨零。
- W96 gate 方法本身 valid(成功量到 intervention 無效 + 捉到 C005 反退);失敗嘅係被測 intervention,唔係尺。
- 後續若再碰乙類:方向應離開 synthesis prompt(接受 stochasticity / 非 prompt 手段),勿重提本 rule。
