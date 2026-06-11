# ADR-0052: Chat RAG 質素旋鈕 production default flip(parent-doc retrieval + citation expansion)

**Date**: 2026-06-11
**Status**: Accepted
**Approver**: 用戶(laitim)

## Context

BUG-026 #1「列舉型 query 完整性」嘅 fix 由 3 個旋鈕組成,喺 W26–W37 期間以 **measurement-first
紀律** 建立(per ADR-0037 / W32 / W37):default 刻意保守(`False` / `2` / `0`),只透過 `.env`
override 做測量實驗。`settings.py` 對應註解明文寫住「measurement-first discipline, **NOT default
flip**」「production flip is a separate decision」—— 即 codebase 自己預期 production flip 係一個獨立
決定,要伴隨 ADR。

memory `project_chat_demo_rag_quality_followups` #1 記錄此 fix 嘅 eval 背書:

- **單檔 13-query**:faithfulness 0.949 → 0.9838 / correctness +2.5pp / Q-W25-I07 0.54 → passed。
- **跨檔 30-query**(重建 `drive_user_manuals` 6 模組 287 chunks):recall 1.0 flat / 0 attention
  regression(兩輪)/ +413ms p95。
- 4/4 runs 5/5 zero drift,control(Q-W25-I01)無 regression。

DD-4(`CONFIG_PLATFORM_W43-W58_ROLLUP.md` §3.2 + `DEFERRED_REGISTER.md`)= 把呢 3 個旋鈕由
「`.env` 輕量持久化」升為 **production default** 嘅純決策,eval 證據已齊,差一個用戶拍板。
用戶 2026-06-11 拍板執行 flip(DD-3 已 live 驗證 per-doc 配置 UI 真正可用,呢個 flip 令「無 override
即得 fix」對所有 KB 生效)。

## Decision

flip `backend/storage/settings.py` 3 個 default:

| 旋鈕 | 舊 default | 新 default |
|---|---|---|
| `enable_parent_doc_retrieval` | `False` | `True` |
| `citation_expansion_max_aux` | `2` | `10` |
| `citation_expansion_section_path_prefix_depth` | `0` | `1` |

`citation_expansion_window` 維持 `10`(非本 fix 一部分,memory 亦無動,不變)。

同步更新 `settings.py` 對應註解,把「NOT default flip」/「production flip is a separate decision」
嘅過時句改為指向本 ADR。

**解析鏈不變**(per ADR-0040 / ADR-0050):`per-query override > per-DOC profile > per-KB KbConfig >
global Settings`。本 flip 只改最底層 global default;per-KB / per-doc / per-query override 機制原封不動,
任何 KB / doc 仍可覆蓋調回保守值。

## Alternatives Considered

1. **維持 `.env` override(現狀)** — reject:每個部署都要記得設呢 3 行 `.env`,易漏 → fix 形同未
   生效;eval 已背書,無理由唔升 default。
2. **只 flip 部分旋鈕** — reject:memory 驗證嘅係 3 個嘅 **組合**(parent_doc + max_aux=10 +
   prefix_depth=1 一齊),拆開未經驗證。
3. **先 wire 進 production eval gate 至 flip** — reject:gate 整合係後續決定(rollup §5 non-goal),
   本 flip 唔依賴 gate;eval 證據已足夠拍板。

## Consequences

- **Positive**:chat 完整性 fix 成為所有 KB 嘅 production default,唔需逐部署設 `.env`;配合 DD-3
  已驗證嘅 per-doc 配置 UI,實現「無 override 即得 fix」。
- **Negative**:+413ms p95 latency(eval 實測);`parent_doc` retrieval ON + 更激進 citation expansion
  增加 synth context → 同 **DD-7**(mega-section synth timeout)風險疊加 —— 圖密 mega query 嘅 synth
  負擔喺 production 30s `synthesizer_request_timeout_s` 下更易觸發 `APITimeoutError`(DD-7 已登記跟進,
  評估 production timeout 上調 vs mega-section context 縮減)。
- **Neutral**:既有 `.env` 嘅呢 3 行 override 同值,無害(可選擇移除);per-KB / per-doc / per-query
  override 機制不變。

## References

- ADR-0037(Parent-Document / Section-Level Retrieval — 本 ADR flip 佢嘅 measurement-first default 立場)
- ADR-0040 / ADR-0050(per-KB / per-doc config-scope 解析鏈,override 機制不變)
- memory `project_chat_demo_rag_quality_followups` #1(eval 背書數據)
- `docs/01-planning/DEFERRED_REGISTER.md` DD-4(flip 決策來源)/ DD-7(疊加風險)
- `docs/01-planning/CONFIG_PLATFORM_W43-W58_ROLLUP.md` §3.2 + §5(DD-4 收尾項)
- BUG-026 #1(完整性 root-cause)
