# ROADMAP — 自助可調配置 Vision(per-KB / per-document tunable config)

> **性質**:策略藍圖(candidate roadmap)。**唔係** pre-created phase plans —— 每期 kickoff 先正式建 `W{NN}-*/plan.md`(守 CLAUDE.md §10 rolling JIT R1)。本文件純為「睇清全圖 + 拍板決策」用。
> **建立**:2026-06-02(W43 closeout 後)
> **Owner**:Chris(技術 Lead)
> **錨點**:ADR-0040(per-KB config-scope,Accepted)+ memory `project_per_kb_tunable_config_vision`(foundational vision)+ W43 phase folder

---

## §1 Vision(用戶 foundational framing)

> 唔同文件因格式內容唔同,需要唔同嘅 **process(切 chunk / 解析)+ retrieval(查詢時)策略**。呢啲策略要可以落到 **per-KB(或 per-document)**作用域;UI 要備齊**完整詳細嘅配置**,畀用戶**自己調整 + 平台試跑驗證,直至滿意先持久化**到該 KB —— 而**唔係**好似開發階段噉,一直喺後台代碼改 / 修。

落到工程,vision 拆成 **2 條正交軸 + 1 個自助閉環**:

```
              Process(切 chunk / 解析)       Retrieval(查詢時策略)
              ─────────────────────         ──────────────────────
  全域          (今日基線)                     (今日基線)
  per-KB        ❌ 未做 → W44 / W45            ✅ W43 已做
  per-document  ❌ 未做 → W46(視乎決策 1)      ❌ 未做 → W46(視乎決策 1)

  + UI 自助配置面 + 平台試跑 loop:
      Retrieval 側 ✅ W43 已做 | Process 側 ❌ 未做(W45)
```

memory 嘅 3 正交層對應:
- **Layer A — per-document profile** → 本 roadmap 決策點 1 + W46
- **Layer B — query-intent gate**(列舉 vs 具體)→ 條件觸發期
- **Layer C — image relevance**(揀啱嗰幾張圖)→ W44(位置/章節,Tier 1)+ 深層語意揀圖(Tier 2 閘)

---

## §2 已交付:W43(地基,STRONG PASS 2026-06-02)

填咗 **「Retrieval × per-KB + 自助 loop」** 嗰格:
- 12 個 runtime 旋鈕(parent_doc / citation_expansion / citation_neighbour + `max_images_per_answer`),`KbConfig` Optional 欄位,`None`=繼承全域。
- `EffectiveConfig` resolver:**per-query > per-KB > 全域** 優先序。
- `POST /kb/{id}/config-test` 平台試跑 harness(multi-run + variance band + A/B)。
- UI:KB Settings 配置面(分組 + 進階收合 + 繼承/覆寫態)+ 試跑面板。
- 驗證:G2 live 2-KB(AR 保守 3cit/8img + DCE inherit 5/5,全域零改)+ 雙軸 no-regression。

**局限**(誠實):圖洪水只做到 `max_images_per_answer` **鈍刀 cap**(砍到 N 張,但揀唔到邊 N 張先啱)。單一 mega-chunk 自帶 33 圖(ingestion-bound)runtime 解唔到根。

---

## §3 多期 Roadmap(candidate)

| 期 | 區塊 | 解決乜 | Tier | 依賴 | 關鍵決策 |
|---|---|---|---|---|---|
| ✅ **W43** | per-KB retrieval 配置 + UI + 試跑 loop | retrieval 策略自助,唔使改後台 | T1 | — | (已完成) |
| **W44** | Chunker 深層修(ADR-0041)| 圖洪**根治** + process 策略基礎 | T1 | — | 決策 2(切法)|
| **W45** | UI 開放 ingestion 配置 + **真** re-index | process 策略**上 UI 自助** | T1 | W44 + 真 reindex pipeline | 決策 4(re-index 投資)|
| **W46** | per-document scope | 一個 KB 溝多格式文件 | T1 | W43 resolver(加一層)| **決策 1(per-KB 夠未)** |
| 條件觸發 | Query-intent gate(Layer B)| 自動辨查詢類型揀配置 | T1(heuristic)| W43 | 需唔需要 |
| ⚠️ Tier 2 | Image relevance ranking(Layer C 深層)| 按**相關性**揀圖 | **T2** | W44 metadata | 決策 3(Tier 2 閘)|
| 操作期 | config 版本史 / presets / who-can-edit 審計 | 配置生命週期成熟度 | T1 | W43 | 決策 5(優先序)|

### 逐期重點

- **W44 — Chunker 深層修(最高價值 next)**
  - 根因(W43 live 證):`chunk-0031` 自帶 33 圖、`chunk-0033` 20 圖 → 切 chunk 時把成節「System Instruction」連截圖塞晒入一個 chunk。
  - 做乜:圖密章節**細分** + 標 per-image metadata,令檢索攞到「啱嗰幾張」而非一嚿 33 圖。
  - 為何另起一期:改 `architecture.md §3.3` chunker + **要重新索引** → H1 架構改動 → **ADR-0041**。
  - 純 Tier 1,唔使等 Azure/Track-A。

- **W45 — UI 開放 ingestion 配置 + 真 re-index**
  - 今日 `chunk_strategy` / embedding 喺 UI **locked**;`POST /kb/{id}/reindex` 目前係 **stub**(假 task_id,no-op,per `kb.py`)。
  - 要做到「用戶自助調 process 策略」必須先有**真 re-index pipeline**(重解析 + 重嵌入 + v1→v2 索引原子切換 + R@5 gate)。
  - ⚠️ 真 re-index 落 Azure = 觸及 **W16 Track-A IT cred**(成本 + 部署)。

- **W46 — per-document scope**
  - resolver 加一層:**per-query > per-document > per-KB > 全域**(additive,延伸 W43)。
  - 觸發條件 = 決策 1(KB 會唔會溝多格式)。

- **Layer B — query-intent gate(條件觸發,非排定)**
  - 證偽實驗已證 AR **唔需要**(避免 over-engineer per Karpathy §1.2);留 seam,遇「缺 summary chunk」文件先觸發。

- **Layer C — image relevance(深層,Tier 2 閘)**
  - ⚠️ 「按語意相關性揀圖」需 vision/relevance 模型 = **multi-modal retrieval = Tier 2**(H4 邊界)。
  - W44 嘅 chunker 切分(按位置 / 章節)係 **Tier 1 能做到嘅上限**;再要語意揀圖要開 Tier 2(需新 ADR + stakeholder)。

---

## §4 依賴關係

```
W43(done)
  ├─→ W44 chunker(ADR-0041)──→ W45 UI ingestion 配置(+ 真 reindex pipeline ⚠️Track-A)
  │                          └─→ Layer C 深層(⚠️ Tier 2 閘)
  ├─→ W46 per-document(resolver 加層;視乎決策 1)
  ├─→ Layer B query-intent(條件觸發)
  └─→ 操作期(版本史 / presets / 審計)
```

---

## §5 你要拍板嘅 5 個決策點

| # | 決策 | 影響 | 預設傾向 |
|---|---|---|---|
| **1** | **per-KB 夠,定要 per-document?** | 決定 W46 做唔做 | KB 放同類文件 → per-KB 夠;會溝格式 → 要 per-document |
| **2** | **W44 切法策略** | 圖密章節點切(按圖數上限 / 子標題 / 段落)| W44 kickoff 時 ADR-0041 評 |
| **3** | **Tier 2 閘** | 「按相關性揀圖」要開 Tier 2 multi-modal?定 Tier 1 chunker 切分為止? | 預設守 Tier 1(H4)|
| **4** | **真 re-index pipeline 投資** | W45 前置;而家投(觸 Azure/Track-A)定 demo 用 local seed 頂? | 視 Beta 時間表 |
| **5** | **深度 vs 廣度優先** | 先 W44(根治圖洪)定先 W46(覆蓋更多文件)? | 建議深度優先(W44)|

---

## §6 建議下一步

**W44 chunker 深層修**(深度優先):(a) 圖洪係反覆撞到嘅具體痛點;(b) W44 係 process 策略地基,W45 自助 UI + Layer C 都靠佢;(c) 純 Tier 1,唔使等 Azure/Track-A。per-document(W46)等決策點 1 拍板先排。

---

## §7 Cross-ref
- ADR-0040 — per-KB config-scope(Accepted;W43 validated STRONG PASS)
- W43 phase folder `docs/01-planning/W43-per-kb-tunable-retrieval-config/`(plan / checklist / progress)
- memory `project_per_kb_tunable_config_vision`(foundational vision + 證偽實驗)
- memory `project_chat_demo_rag_quality_followups`(#7 圖洪 + #8 W43 F1 + ingestion-bound 證據)
- architecture.md §3.3(chunker — W44 觸及)/ §3.1 + §3.7(retrieval config — W43 已改)

---

**狀態**:living roadmap。每期 kickoff 正式建 phase folder 時,回頭 update 本表對應行(done / 決策已拍板)。
