# W97 Checklist — 乙類緩解:coverage-oriented synthesis

> Status active(2026-06-25 ADR-0069 Accept 後解鎖)。每項 atomic;daily tick。
> production-preserve 紀律:knob OFF 行為 byte-identical pre-ADR。

## F1 — Config knob(四層 resolve per ADR-0040,default OFF)

- [x] F1.1 schema:`enable_complete_coverage` 加入 `Settings`(`storage/settings.py`)/ `KbConfig`(`api/schemas/kb.py`)/ `DocConfig`(`api/schemas/doc_config.py`)/ `PerQueryOverrides` + `EffectiveConfig`(`generation/effective_config.py`)
- [x] F1.2 `Settings.enable_complete_coverage` default = **OFF**(production-preserve)
- [x] F1.3 四層 resolve 正確(per-query > per-doc > KB > Settings)— mirror `enable_inline_image_markers`(`_resolve` + `_layer`)
- [x] F1.4 `EffectiveConfig.enable_complete_coverage` 帶 knob 出去
- [x] F1.5 單元測試:resolve 優先序 4 case + default OFF + schema default None(`test_complete_coverage_w97.py` T4)

## F2 — `prompt_builder.py` additive coverage rule

- [x] F2.1 `_COVERAGE_RULE` 常數(mirror `_MARKER_RULE` append pattern,labelled 非 digit-numbered 避 collision)— 變體 / 替代分支 / scenario 子流程 enumerate 指令
- [x] F2.2 append 邏輯:`complete_coverage` ON **且** `detail_level=="detailed"` 先 compose;concise = no-op
- [x] F2.3 DEDUP 校準措辭(REFINES the DEDUP rule — 真實 conditional branch 永不當 duplicate)
- [x] F2.4 測試:knob OFF → system prompt **byte-identical** pre-ADR(concise + detailed,byte 比對);ON detailed → 含 COVERAGE;ON concise no-op;compose after marker(`test_complete_coverage_w97.py` T1-T3)

## F3 — Wire knob → build_prompt

- [x] F3.1 `synthesizer.py` synthesize + synthesize_stream 讀 `getattr(effective_config, "enable_complete_coverage")` → `build_prompt(complete_coverage=...)`;query.py 零改動(knob 經 `EffectiveConfig` 自動流通)
- [x] F3.2 測試:thread coverage into system prompt(ON 含 COVERAGE / OFF byte-identical detailed,`test_complete_coverage_w97.py` T5);75 既有 affected 測試全綠(零 regression)

## F4 — A/B 驗證(W96 gate)→ **NEGATIVE,觸發 revert**

- [x] F4.1 `run_completeness_ab.py` config-A(OFF)vs config-B(ON)經 per-query `--config-a/-b`(需補 `QueryRequest` per-query seam,commit `34a1475`)
- [x] F4.2 跑乙類變體案:iter-1 C001-C005(K=3)+ iter-2 C001/C003 target + C005 control(K=15)
- [x] F4.3 完整度 paired delta **未達清楚正向** ❌ — iter-1 mean 0.000 / iter-2 −0.031;C005 反退 −0.17→−0.16 可重現;targets 入噪聲(精修後 C001 +0.05 / C003 +0.01)
- [~] F4.4 faithfulness:此 harness 唔量(留待若日後重啟方向再驗;本 phase 因 F4.3 反證提前收)
- [x] F4.5 **無 synth-timeout regression** ✅ — 兩輪全 run 零 ERROR(DD-7 風險未發生)

## F5 — Doc-sync + close(NEGATIVE)

- [x] F5.1 ADR-0069 Status Accepted → 加 §Outcome(實作 + 兩輪 A/B 反證 + revert)
- [x] F5.2 DD-16 close(DEFERRED_REGISTER:乙類 prompt 緩解 = 反證,prompt 路 exhausted)
- [x] F5.3 memory `project_completeness_eval_gate_w96` 同步 W97 反證結局(eval-methodology §2.5 無需改 — gate 方法本身 valid,只係被測 intervention 失敗)
- [x] F5.4 production default flip = N/A(code 已 revert,無 knob 可 flip)
- [x] F5.5 **code REVERT**(commit:還原 8 backend 檔 + 刪 test/eval-set;保留 ADR-0069 + plan/progress;用戶 decision owner 揀選項 2)
