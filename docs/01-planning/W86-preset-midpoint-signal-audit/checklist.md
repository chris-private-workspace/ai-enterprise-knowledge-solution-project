# W86 checklist — preset 出廠中值 ingest 信號 audit（DD-14 降級版）

## F1 — ingest 信號 audit script（零 production 改動）
- [x] 寫 `scripts/dd14_preset_signal_audit.py`（reuse harness parse + profiler）
- [x] 跑 audit over corpus → 每 profile 圖量分布 + cap 對照 verdict（首 run real-parse 全成功）
- [x] 修 cp1252 編碼 bug（`sys.stdout.reconfigure utf-8`）→ 重跑驗證表格輸出
- [x] 確認每可 audit profile ≥2 真實 sample（P1×6/P2×4/P3×15/P5×2/P4×7；少於 2 已標信號弱）

## F2 — rationale 分析 + 文件化
- [x] 據 F1 為每 profile cap 寫真實信號背書 rationale（A:4 profile SAFE 有背書）
- [x] 對策略開關（neighbour/marker/answer_detail）寫對齊 D1 rationale（D 段）
- [x] 誠實標：cap 已數據背書（截斷）/ retrieval 品質最佳點 blocked（淨結論）
- [x] 文件化落 progress.md audit 表 + 結論

## F3（conditional on F1 揭 RISK）— 保守微調 default
- [x] 確認**不觸發**：無真正 RISK；2 個 observation 屬 query-dependent 需 GT，per D7 不擅自調
- [x] 純文件化結案（如 W85）

## Closeout
- [x] progress.md retro + 結論
- [ ] 更新 `DEFERRED_REGISTER.md` DD-14 現況（audit done 部分 vs 仍 blocked 部分）
- [ ] commit（待用戶確認）
