---
id: BUG-042
title: embedding 一次過送整份文件、無 sub-batch,超大文件撞 Azure 限額整份 abort
severity: Sev3          # 特定條件(超大 doc)下 ingest 失敗
status: done            # 2026-07-07 用戶 approve → fix landed + 2 subbatch test 全綠
reported: 2026-07-06
reporter: pipeline review(`docs/09-analysis/pipeline_review_20260706.md` I-R3,代碼核對)
backlog: B-13
related: BUG-040(同屬 ingest 健壯性)
---

# BUG-042 — embedding 無 sub-batch,大文件 abort

## 1. 現象(代碼核對)

ingest 時 embedding **把整份文件的所有 chunk 一次過送 `embed_batch`**(實測一份 drive 文件可達 369 chunk),經單一 Azure OpenAI `embeddings.create` 呼叫。無按 Azure input-array / token 上限分批。超大文件(chunk 數 / token 超限)會令單一呼叫撞限額 → **整份文件 `FailureRecord("embed")` abort**(前面的 parse/chunk/screenshot 白做)。

對比:index upsert(`populator`)有 1000/batch 分批,但 embedder 無 —— 兩者不對稱。

## 2. 根因(對 code first-hand 核對)

- `backend/ingestion/orchestrator.py:234`:所有 chunk 一次餵 `embedder.embed_batch`。
- `backend/retrieval/azure_openai_embedder.py:69-73`:`_embed_raw` 單一 `embeddings.create`,無 sub-batch 切分。
- 失敗處理:`orchestrator.py:235-246` 任何 embed 失敗 → abort 整 doc。

## 3. 建議修法(等 approve)

1. `azure_openai_embedder.embed_batch` 加 sub-batch:按 Azure OpenAI embedding input-array 上限(及/或 token 預算)切分,逐批呼叫再合併向量,保持輸出順序。
2. (可選)個別 sub-batch retry 已有 tenacity;確認合併邏輯對 partial 失敗的處理(整體仍 fail-fast 抑或收集)。

## 4. 驗收標準(等 approve 後據此驗)

- 超大文件(chunk 數 > 單次 input-array 上限)ingest **成功**,向量數 = chunk 數、順序正確。
- 小文件(< 上限)結果 bit-identical(單批路徑不變,production-preserve)。
- ruff / mypy clean;embedder 單元測試補 sub-batch 邊界 case。

## 5. 風險與注意

- 低:切分 + 順序合併是標準做法;主要注意向量順序與 chunk 對齊。
- 需查 Azure OpenAI 當前 input-array / token 實際上限值作為切分閾值。

## 6. Fix landed

- `azure_openai_embedder.py` — 抽 `_embed_one_call`(原 `embed_batch` body:`_embed_raw` + cost log + `EmbeddingResult` 建構);`embed_batch` 改為按 `_MAX_INPUTS_PER_CALL=2048` 切分,逐批呼叫 `_embed_one_call` 再 `extend` 合併(保序)。≤ cap 走單批路徑(bit-identical 輸出 + 一條 `embedding_call` log line,production-preserve)。
- **cap 依據(解 §5「需查上限」)**:Azure embeddings 限制 = input-array **2048 items** + 每 input **8191 token**;EKP layout-aware chunk ~2000 char 遠低於 8191 token → **只需按 array size 2048 切分,token 預算切分不需要**(單 chunk 唔會超 per-input token 上限)。
- `test_embedder.py` — 補 2 test:over-cap 分批(5 input / cap 2 → 3 call,向量數 + 順序保持)+ boundary(at-cap 單 call / cap+1 分 2 call)。
- **驗證全綠**:9 test passed / `ruff check` + `format` clean / `mypy` exit 0。orchestrator 呼叫點(`embedder.embed_batch`)無改,自動受惠(sub-batch 封裝喺 embedder 內)。

## 7. Changelog

| 日期 | 動作 | 決定人 |
|---|---|---|
| 2026-07-06 | 立案(pipeline review I-R3 → BUG-042,Sev3,`status: proposed`,未動 code) | pipeline review / 待用戶 approve |
| 2026-07-07 | 用戶 approve → fix landed(`embed_batch` 按 array cap 2048 分批保序,抽 `_embed_one_call`)+ 補 2 subbatch test + 9 test/ruff/mypy 全綠 → `status: done`。§5「需查上限」已解:array 2048 + per-input 8191 token,EKP chunk 遠低故只需 array 切分 | 用戶 approve / Claude |
