# ADR-0040: Per-KB Tunable Retrieval / Citation Config — Config-Scope Resolution Model

**Date**: 2026-06-01
**Status**: Accepted(W43 F0 0.5 gate PASS 2026-06-01 — Chris confirm H1 boundary + Accept + stakeholder scope「三項都 confirm,開 F1」)。**Validated W43 closeout 2026-06-02 — Phase Gate STRONG PASS 7/7**:G2 live 2-KB(AR 保守 3cit/8img 完整 + DCE inherit 5/5,全域零改)+ F4.2 雙軸 no-regression(RAGAs recall 1.0 / faith 0.9956 / 0 attention)。eval-blindness 雙軸假設經 F4.2 證實(RAGAs 全綠卻睇唔到 AR 47-vs-8 圖洪差異)。圖洪水深層修 → W44+ ADR-0041。
**Approver**: Chris(技術 Lead)

## Context

EKP 嘅 retrieval / citation / image 擴張行為由一組旋鈕控制 —— `enable_parent_doc_retrieval` + `parent_doc_*`(§3.1 RAG core)、`enable_citation_post_hoc_expansion` + `citation_expansion_*`(§3.7 query orchestration,wire 喺 `synthesizer.py`)、`enable_citation_neighbour_images` + `citation_neighbour_*`(ADR-0034 §Implementation Mapping,wire 喺 `query.py`)。**呢組旋鈕目前全部係全域**(`storage/settings.py` `Settings`,經 `get_settings()` 讀,`.env` override)。

**問題 — 配置同內容格式耦合**:全域單一值服侍唔到結構不同嘅文件。
- 2026-05-30 為 DCE 文件(prose + §8 五子情境,缺 summary chunk → 列舉 query 需 expansion 拼 §8.1-8.5)調出激進 `.env`:`CITATION_EXPANSION_MAX_AUX=10` + `SECTION_PATH_PREFIX_DEPTH=1` + `ENABLE_PARENT_DOC_RETRIEVAL=true` + `CITATION_NEIGHBOUR_MAX_AUX_IMAGES=8`。
- 2026-06-01 換到 AR 圖密步驟手冊(`test-kb-20260531-v1`,221 圖/68 chunk、`section_path[0]` = 整個 AR01 模組)→ 同一激進配置造成 citation 數洪水(11)+ 圖洪水(31)。

**證偽實驗(2026-06-01)** 喺 AR KB 跑 Config 保守 vs 激進 × 具體/列舉 query 2×2 + variance ×5:
- **Fork A 確認**:AR 兩條 query 都係保守 config 較佳;DCE-調嘅激進 config 令 AR 兩條都變差(列舉答案由乾淨 5 步 conflated、圖 2→24)。「不同文件需不同配置」= 實證。
- **Fork B(query-intent gate)未獲證實**:AR 文件搵唔到「保守失敗、激進先得」嘅 query(列舉被 overview chunk 滿足)。query-adaptivity 必要性本身 doc-dependent。
- **圖洪水 ingestion-bound**:Q_specific 兩個 config 都 ~23 圖(chunk-0008 自帶 27 圖)→ runtime config 解唔到根本。
- **試跑 variance ~20%**:同 config 同 query ×5,figure dedup 24↔31 波動。

**eval-blindness finding(2026-06-01 chat,keystone)**:`drive_user_manuals` 30-query RAGAs eval 喺**激進配置(parent_doc on)**下 = recall 1.0 / faithfulness 0.989 / **zero regression → PASS**(memory `project_chat_demo_rag_quality_followups` #1),但同一配置就係會爆 flood。即 **RAGAs 量答案文字質素(faithfulness/correctness/recall),量唔到 presentation 維度(圖數/citation 數/marker 密度)** —— 而本 phase 要解嘅問題全在 presentation 軸。∴ 試跑 harness + no-regression gate 嘅**可信信號必須係雙軸:RAGAs(文字)+ presentation counters**;若 eval set 又缺窄 how-to query(原 30-query set 係 enumeration-focused),會雙重盲。呢條直接 bound 咗「測試效果」呢一步點先算可信。

**歷史脈絡**:per-KB config 已**兩度**被列為 alternative 後 defer —— ADR-0035(retrieval low-value soft-relax)+ ADR-0037(parent-doc retrieval)。當時 one-off defer 合理;但 content-coupling 已重複造成 regression,且 `KbConfig` 基礎設施已存在(ADR-0028 +4 multimodal 欄位先例)→ 到咗 formalize 為 first-class config-scope model 嘅時機。

**用戶 foundational vision(2026-06-01)**:系統(功能架構 + UI)讓用戶針對每份 KB 文件自行設置調整,平台試跑驗證後持久化到該 KB;視為 RAG 必經之路。(memory `project_per_kb_tunable_config_vision`)

## Decision

引入 **config-scope resolution model**,優先序 **per-query override > per-KB(`KbConfig`)> 全域 `Settings` default**:

1. **`KbConfig`(`api/schemas/kb.py`)擴 ~12 個 `Optional` retrieval/citation 旋鈕欄位**(`None` = inherit 全域 default)+ NEW `max_images_per_answer` 鈍刀上限。**`max_images_per_answer` 係 BUG-031(commit `508f979`)前端 hardcode `INLINE_IMAGE_CAP=8` 嘅後端 per-KB 可配置版**;兩者喺不同層(前端顯示 cap vs 後端 payload cap),落地時後端 per-KB 值為主、前端 fallback,避免兩個 cap 打架(BUG-031 嘅 pill-grouping 係正交渲染修正,不動)。
2. **NEW `EffectiveConfig` resolver**:request 入口砌一個 effective-config 物件,串落 pipeline,取代散落 `query.py` + `synthesizer.py` 嘅 `settings.*` 直讀。
3. **On-platform full-pipeline 試跑 harness**(擴 V4 retrieve-only → full pipeline):draft config 預覽 + multi-run variance,令用戶儲存前見到實際 citation/figure 效果。**harness 必須出雙軸信號** —— RAGAs(答案文字質素軸)+ presentation counters(圖/citation/marker per answer 軸);因為 RAGAs 對 presentation 失敗係盲嘅(見 Context「eval-blindness finding」),單靠 RAGAs 會放過 flood 配置。
4. **Production-preserve**:所有新欄位 default `None` → 無 explicit config 嘅 KB 行為同今日 **bit-identical**;migration-default 沿用 ADR-0028 做法,零 breaking change。

**MVP scope = runtime-only**:**唔掂 chunker / ingestion**。圖洪水深層修(`max_images_per_chunk` / 細分 / per-image metadata)因係 ingestion-bound(證偽實驗證),defer 至 W44+ NEW **ADR-0041**;本 ADR 對圖洪水只交付 runtime 鈍刀 `max_images_per_answer`。

## Alternatives Considered

- **維持全域配置(status quo)** — REJECTED:content-coupling 已重複造成 regression(DCE-調反噬 AR),證偽實驗證單一全域值服侍唔到兩類文件。
- **直接做 per-document scope(配置落到每份文件)** — DEFERRED:架構上更正確(mixed-format KB),但較重;MVP 先 per-KB(覆蓋當前 1-KB-1-doc 測試場景),per-doc 留 W44+。
- **Fork B query-intent gate(列舉 vs 具體 adaptive)** — DEFERRED:證偽實驗顯示 AR 文件未證明需要;留 seam,遇「缺 summary chunk」文件先 trigger。避免 over-engineer(Karpathy §1.2)+ 守 Tier 1 邊界(H4,重型 intent 分類屬 Tier 2)。
- **eval-driven 自動 tune(系統 sweep config 揀最佳)** — DEFERRED:更 scalable 但需 per-KB labeled eval set;MVP 先做 human-in-loop 試跑,auto-tune 留後期。
- **chunker 即時修圖洪水** — SPLIT OUT:H1 chunker change + re-ingest,屬獨立 ADR-0041 / W44+;唔混入本 runtime-config phase(scope 清晰 + 風險隔離)。
- **per-query 完整 expose 所有旋鈕** — PARTIAL:MVP 只 reuse 既有 `QueryRequest.top_k_*`;其餘 per-query override 留 resolver seam,診斷/進階用途後補。

## Consequences

- **Positive**:
  - 不同內容格式文件各用度身訂做配置,互不干擾(AR 保守 + DCE 激進並存,冇改全域)
  - 實現用戶 foundational vision 嘅閉環(配置 → 試跑 → 驗證 → 持久化)
  - reuse 既有 `KbConfig` + ADR-0028 migration 先例 → 低風險 additive
  - formalize 兩度被 defer 嘅 per-KB config,終止重複 one-off 爭論
- **Negative**:
  - config surface 複雜度升(~12 旋鈕)→ 靠 F3 UI 分組 + 進階收合 + 後期 profile 緩解
  - 改 hot query path 之 config 解析 → 需 back-compat test 嚴防 regression(G7)
  - **圖洪水唔解到根本** —— runtime cap 只鈍刀,「啟對嗰幾張圖」要 W44+ ingestion 工(誠實分流)
  - 試跑信號有 ~20% variance → harness 須 multi-run,單次唔可信
  - **「測試效果」嘅可信度依賴雙軸量度** —— RAGAs 單軸對 presentation flood 係盲嘅(Context eval-blindness finding),所以 harness + no-regression gate 必須加 presentation counters,且 eval set 要含窄 how-to query;否則自助 loop 會用「假綠燈」放過壞配置(比單一 sane 全域 default 更危險)
- **Neutral**:
  - production default 維持 = 今日行為(`None` inherit)— 零 production 變化直到用戶 explicit set per-KB config
  - per-document scope / Fork B / auto-tune / version history 留作 roadmap,本 ADR 唔關閉佢哋

## References

- W43 plan `docs/01-planning/W43-per-kb-tunable-retrieval-config/plan.md`(§5 H1 assessment + §4 R6 Day 0)
- 證偽實驗 2026-06-01(AR KB `test-kb-20260531-v1`,2×2 + variance ×5)
- ADR-0028(KbConfig +4 multimodal 欄位 — additive-field + migration-default 先例)
- ADR-0035 / ADR-0037(per-KB config 兩度 defer 作 alternative → 本 ADR formalize)
- ADR-0034(query expansion + neighbour-image Implementation Mapping)
- ADR-0021(V4 Retrieval Testing tab — F2 試跑 harness 擴展對象)
- BUG-031(commit `508f979`,2026-06-01 — chat image flood + citation marker run-together 顯示層止血;前端 `INLINE_IMAGE_CAP=8` + pill grouping;本 ADR `max_images_per_answer` = 其後端 per-KB 可配置版,須對齊)
- architecture.md §3.1(RAG core retrieval — parent_doc)+ §3.7(query orchestration — citation_expansion)+ §5.5(KB Detail Settings tab)
- CLAUDE.md §5.1 H1(config 解析變動 → ADR route)
- memory `project_per_kb_tunable_config_vision` / `project_chat_demo_rag_quality_followups` / `project_v4_retrieve_only_vs_query_pipeline`
- **W44+ follow-on**:NEW ADR-0041(chunker / ingestion 圖洪水深層修 — `max_images_per_chunk` / per-image metadata;H1 + re-ingest)
