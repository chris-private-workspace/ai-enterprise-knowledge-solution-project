---
id: BUG-045
title: full `pytest -q` 在 blob 不可達時 hang/crawl — endpoint 測試觸真 azure.storage.blob.aio 未 mock
severity: Sev3          # 測試/CI 可靠性,無 production 影響;但令 CI full pytest 不可靠 + 阻塞 B-22（宣告 aiohttp）
status: done            # 2026-07-09 用戶 approve 方案 A+B + B-22 併入 → 落地 + 驗證(dead-blob 全套 1738 passed / 0 timeout / exit 0）
reported: 2026-07-09
reporter: B-23（BACKLOG E 區）— 2026-07-08 為 B-22 加 aiohttp 實測,CI full pytest 卡 4% ~12 分鐘
backlog: B-23
related: B-22（aiohttp base-dep 宣告,被本 BUG 阻塞）/ PR #6 commit `e9d943b`（`ScreenshotUploader` stub 已修 upload 路徑一半）/ ADR-0043（source_store best-effort persist 原始檔）/ ADR-0057（ScreenshotUploader 圖上傳）
---

# BUG-045 — full `pytest -q` 在 blob 不可達時 hang（endpoint 測試觸真 async blob client 未 mock）

## 1. 現象

- 2026-07-08 為 B-22 在 `backend/pyproject.toml` 宣告 `aiohttp` 後，CI `backend-ci` 的 `pytest -q` **卡在 4% 約 12 分鐘**（never 完成，最終被 job timeout 殺）。撤回 aiohttp 即恢復（PR #6 綠）。
- 本地跑無事 —— 因本地 **Azurite 正在跑**（`127.0.0.1:10000` 有回應），真 blob 呼叫成功，遮蔽咗問題。
- 淨效果：full `pytest -q` 只在「有 aiohttp + blob 不可達」（即乾淨 CI）時才 hang → **B-22 無法安全落地**，且 CI 對此類 regression 無防線。

## 2. 根因（診斷實證，非推斷）

**根因 = 多個 endpoint 測試經 app 觸發「真」`azure.storage.blob.aio` 呼叫，未被 mock。** blob 不可達時，其 best-effort `try/except` 只接得住**例外**（如無 aiohttp 的 `ImportError`、connection refused），接唔住**被阻塞的 socket 連線**（SYN 無回應 → 執行緒卡死）。

診斷方法（確定性重現，非估）：裝 `pytest-timeout`（dev 診斷工具，未入 deps），用 env 把 `azure_blob_connection_string` 指向**不可達位址** `10.255.255.1`（本地 Azurite 不動，只 env 覆蓋），全套跑 `--timeout=12 --timeout-method=thread`。已確認 hang 的測試（thread-timeout 在第一個 hang 就殺 process，故需逐輪排除）：

| 測試 | 觸發點 | 未 mock 的 blob 呼叫 |
|---|---|---|
| `tests/api/test_documents_route.py::test_upload_happy_path_returns_202_indexed`（及同檔全部 upload/reindex 測試，即原 CI 24 項）| `client.post("/kb/.../documents")` → `_run_ingest_pipeline` | `upload_source_document`（`documents.py:1071`，`doc_uploaded` 之後）— 存原始檔（W46/ADR-0043） |
| `tests/test_eval_endpoints.py::test_run_eval_happy_path`（`run_eval_pipeline` 已 mock 但仍 hang）| `client.post("/eval/run")` → app 層 | 同屬 app 觸 blob（choke point 相同） |

**共同咽喉點**：`ingestion/screenshots/uploader.py:24` + `ingestion/source_store.py:26` 都 `from azure.storage.blob.aio import BlobServiceClient`，並經 `BlobServiceClient.from_connection_string(...)`（`source_store.py:55,98`）構造真 async client。

**為何 PR #6（無 aiohttp）當時綠**：無 aiohttp 時 `from_connection_string` 的 async transport 一構造即 `ImportError` → 被 best-effort `try/except` 接住 → 測試 pass。加 aiohttp 後 transport 構造成功 → 去到真連線 → 不可達時卡死。`ScreenshotUploader` stub（PR #6）只蓋住 upload 路徑的**第一個** blob 呼叫，**第二個**（`upload_source_document`）+ 其他 endpoint 的 blob 呼叫未蓋。

**診斷 caveat（誠實標明）**：我用「連線 timeout」位址（`10.255.255.1`）重現，CI 實際係「連線 refused」（`127.0.0.1:10000` 死 Azurite）。CI 部分測試可能係「慢」（azure-core retry backoff 累積）而非「全 hang」——但無論 hang 定 crawl，**根因同修法一致**（測試唔應觸真 blob）。

**範圍非單檔**：至少 2 檔已確認，7 個測試檔 POST 到會觸 blob 的端點（`test_documents_route` / `test_kb_route_acl` / `test_eval_endpoints` / `test_eval_kb_id_bug037` / `test_kb_reindex` / `test_observability_routes` / `test_retrieval_test_endpoint`）→ **逐檔補 stub 係 whack-a-mole、脆弱**。修法應集中在咽喉點。

## 3. 建議修法（等 approve）

### 方案 A（推薦）— 全域 autouse fixture 攔截咽喉點

在 `tests/conftest.py` 加一個 **function-scoped autouse fixture**，把 `azure.storage.blob.aio.BlobServiceClient.from_connection_string` 換成一個回傳「正確形狀的 async-CM mock」的 factory（`__aenter__`/`__aexit__` async、`get_blob_client`/`get_container_client` 回 async-method mock、`download_blob` 拋 `ResourceNotFoundError` → `download_source_document` 得 `None`）。

- **一處覆蓋全部** — 任何測試經任何 endpoint 觸 blob 都攔到，唔使逐檔補。
- **唔干擾既有精細 mock** — `test_source_store.py` / `test_screenshots.py` 自己 `patch(...)` 同一 class method，在測試 body 內 apply（晚於 autouse）→ 佢哋贏；退出時還原一致。
- **鏡像現有 pattern** — 概念同 PR #6 的 `_stub_screenshot_uploader` 一樣，只係升到咽喉點 + 全域。

### 方案 B（推薦一併做）— CI 加 pytest-timeout 安全網

`pyproject.toml` dev extras 加 `pytest-timeout`（純 dev/test 工具，**H2 例外允許**，不入 runtime deps），CI `pytest` 命令加 `--timeout=60 --timeout-method=thread`。

- **唔係修 hang 本身**，係令**將來**任何未 mock 的 blob/網絡測試**快速失敗 + 印出確切 test 名**，而非再卡 15 分鐘 job timeout。防 B-23 類 regression 重演。

### 之後 → 解鎖 B-22
方案 A（+B）落地並驗證 full `pytest -q` 在 blob 不可達下**完整跑完**後，B-22（`pyproject.toml` 宣告 `aiohttp>=3.10`）即可安全落地，CI 仍綠。**建議 B-22 併入本 fix 一齊做**（同一 PR：先修 hang → 再加 aiohttp → 一次驗 CI 綠），避免又分兩輪。

## 4. 明確不做（YAGNI / 範圍控制）

- **不改 production code**（`source_store.py` / `uploader.py` 的 best-effort 語義不動）—— 除非用戶想順帶加「短 connect timeout 令 production 都 fail-fast 而非 hang」（可考慮但屬獨立增強，非本 BUG 必要）。
- **不逐檔補 stub**（whack-a-mole，方案 A 取代）。
- **不引入真 Azurite 依賴入 CI**（單元測試唔應需要真 backend）。

## 5. 驗證計劃

1. 落方案 A（+B）後，**用同一診斷法**（dead blob env + `--timeout`）跑 full `pytest -q` → 應**零 timeout、完整跑完**。
2. 本地正常跑（Azurite up）full `pytest -q` → 全綠（確認 fixture 唔破既有測試）。
3. 落 B-22（加 aiohttp）→ push → **CI `backend-ci` 綠**（真正證明 hang 已除 + aiohttp 安全）。
4. ruff / mypy clean。

## 6. 結果（2026-07-09 落地 + 驗證）

用戶 approve 方案 **A + B**，B-22 **併入同一 PR**。落地:

| 改動 | 檔案 |
|---|---|
| **A** 全域 autouse fixture `_block_real_async_blob_clients`（咽喉點 mock `BlobServiceClient.from_connection_string`）| `backend/tests/conftest.py` |
| **B** `pytest-timeout` dev 依賴 + CI `--timeout=60 --timeout-method=thread` | `backend/pyproject.toml`（dev extras）+ `.github/workflows/backend-ci.yml` + `backend-deploy.yml` |
| **B-22** 宣告 `aiohttp>=3.10` base-dep | `backend/pyproject.toml` |

**驗證（決定性）**:同一診斷法（`azure_blob_connection_string` 指 `10.255.255.1` 不可達 + `--timeout=30`）跑 full `pytest -q` → **1738 passed / 25 skipped / Timeout 0 / exit 0**（8:48 完整跑完;此前同條件卡 4% ~12 分鐘)。ruff clean。fixture 唔破任何既有測試（`test_source_store` / `test_screenshots` / `test_kb_reindex` 各自的精細 mock 仍贏)。CI 綠(push 後)= aiohttp 安全落地的最終證明。
