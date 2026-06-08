---
bug_id: BUG-036
report_ref: ./report.md
status: investigating     # investigating | fixing | verifying | done
last_updated: 2026-06-08
---

# BUG-036 — Checklist

> 逐項 atomic;done → `→[x]`,未做標 🚧 + 理由。Sev2 → postmortem mandatory。

## Investigation
- [x] I1 — repro 確認（API 2 run：13 cites = 4 reranked + 9 expansion；CAR×2 穩定）
- [x] I2 — config 確認（answer_detail=detailed / expansion depth=1 max_aux=10 / parent_doc=false / rerank_k=5）
- [x] I3 — 鎖定唯一變數 = re-index 引入 CH-008 contextual embedding（always-on，無 toggle）
- [x] I4 — **重複行 = source-inherent**（2026-06-08）：§3.1.4 chunk 原文真有重複 heading（process-step-list 摘要表「1 Confirm Approval Request / 2 Approve General Journal / 3 Reject…」+ 逐步 section「Confirm Approval Request」heading + 「Confirm approval request」step + caption）。`detailed` synthesizer 忠實逐行列 → 可見重複。**非 synthesis 幻覺**；contextual embedding 令摘要表 chunk + 逐步 chunk 同時 surface 放大之
- [ ] I5 — lever 隔離（live A/B：expansion 收細 / answer_detail / 確認 contextual 影響）找出還原清晰格式且唔失完整性嘅最小改動

## Fix（方向待 I4/I5 + 用戶定）
- [ ] F1 — 實作（候選：synthesis dedup repeated-heading / 完整性 config 調整 / contextual-embedding per-KB toggle + re-index）
- [ ] F2 — regression test（如涉 code）

## Verify
- [ ] V1 — 重跑 §2 repro：清晰格式還原 + 完整性不退 + 重複行消失
- [ ] V2 — **CH-011 圖片 doc_order 順序不受影響**（回歸保護）
- [ ] V3 — 用戶 live 驗

## Closeout
- [ ] C1 — postmortem.md（Sev2 mandatory）— 重點：re-index 副作用未預警
- [ ] C2 — report status → done;ff-merge（用戶確認）
