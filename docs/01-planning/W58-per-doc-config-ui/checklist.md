---
phase: W58
plan_ref: ./plan.md
status: active     # active | closed
last_updated: 2026-06-09
---

# W58 — Checklist

> 逐項 atomic;done → `[x]`,未做標 🚧 + 理由。Plan locked 2026-06-09(路徑 A 先擴 mockup)。

## Setup
- [x] S1 — ADR-0051 寫 + Proposed(mockup review 後 Accepted)+ README index
- [x] S2 — plan / checklist / progress committed(kickoff commit)

## F1 — 擴 doc-detail mockup(H7 gate)
- [x] F1.1 — `ekp-page-doc-detail.jsx` 加 tab strip:[Chunk inspector](現有 pipeline strip + image strip + 3-pane,wrap 入 `tab==="inspector"` fragment,視覺不變)+ [Per-doc 配置](新);mirror KB `.tabs`/`.tab` pattern
- [x] F1.2 — per-doc config 面(`DocConfigTab`):`answer_detail`(繼承 KB/concise/detailed 3-way seg)+ Citation expansion `DocTuneGroup` + Neighbour images + 圖片上限 `DocTuneGroup`(只 post-retrieval 旋鈕;`DocTuneKnob`/`DocTuneGroup`/`DocSwitchKnob` mirror KbTune*)
- [x] F1.3 — 繼承 KB / 已覆寫(此文件)badge + 還原至 KB affordance + scope 註(per-query > per-DOC > per-KB > 全域 · ADR-0050,banner + footer)+ 檢索入口旋鈕 explanatory card(KB-level only,IcShield)
- [x] F1.4 — per-doc config-test 面(`DocTestResultCard`/`DocTestMetric` mirror;A/B = 此文件 vs 繼承 KB;`POST /kb/{kb}/config-test · doc_id`;length-bias caveat)。babel JSX parse OK
- [ ] F1.5 — **用戶 review mockup(H7 gate)** — approve 後 ADR-0051 → Accepted,F2-F4 解鎖

## F2 — API client(gated on F1 approve)
- [ ] 🚧 F2.1 — `frontend/lib/api/doc-config.ts`:get/put/delete/list per-doc config
- [ ] 🚧 F2.2 — config-test client 加 `doc_id` 透傳

## F3 — 砌 doc-detail config tab(gated on F1 approve)
- [ ] 🚧 F3.1 — 抽出/重用 tuning 元件(`KbTuneGroup`/`KbTuneKnob`/config-test 元件;限抽出共用,唔改 KB 行為)
- [ ] 🚧 F3.2 — doc-detail 頁加 tab + per-doc config tab,100% match approved mockup
- [ ] 🚧 F3.3 — wire CRUD + scoped config-test API

## F4 — Test + fidelity(gated on F3)
- [ ] 🚧 F4.1 — Vitest + RTL component test
- [ ] 🚧 F4.2 — §12 H7 fidelity self-check(逐元素對齊 approved mockup)+ 既有 KB SettingsTab test 全綠(R2 抽出守)

## Closeout
- [ ] C1 — plan/checklist/progress closed;progress retro
- [ ] C2 — ff-merge → main(用戶確認);platform design doc §7 P2b 標 done
