---
id: BUG-039
title: login-gate 初始 idle 第一幀 + 登出過渡閃「Sign in to continue」CTA
severity: Sev4          # cosmetic / UX,無功能損失
status: done            # triaged → 用戶 2026-07-03 approve 範圍 B → fix landed + 驗證全綠
reported: 2026-07-03
reporter: 用戶(browser 實測)
related: BUG-038(範圍 A 已修 loading 分支;本 bug = 當時明文剔出 scope 嘅兩個殘餘面)
---

# BUG-039 — login-gate 初始 idle / 登出過渡閃 sign-in CTA

## 1. 現象(用戶 2026-07-03 報告)

「Sign in to continue」出現喺**所有地方** —— 平常轉頁(hard reload)時、登出時都閃呢句文字;用戶預期**只有剛登入 / 確定未登入時**先應該見到。

## 2. 根因(對 code first-hand 核對)

BUG-038 範圍 A 只修咗 `status === 'loading'` 分支(`a5484e6`,純 spinner)。**但有兩個面當時明文剔出 scope**(BUG-038 report §4 次要 + §5 out-of-scope),而家由用戶 browser 實測證實可見:

- **面 1 — 初始 idle 第一幀**:`auth-provider.tsx` store 初始 `status: 'idle'`(line 29);hydration effect 喺首次 paint **之後**先設 `loading`。所以每次 hard load(F5 / 直接入 URL / dev 重編譯後),第一幀 status 係 `idle` → `login-gate.tsx:54-68` 落入「確定未登入」分支 → 閃 CTA,直到 effect 跑起 → spinner → authenticated。**Gate 無法區分「未 hydrate 嘅 idle」vs「401 後確定未登入嘅 idle」**。
- **面 2 — 登出過渡**:`user-menu.tsx:141` `signOut().then(() => router.push('/login'))` —— `signOut` 先把 status 設 `idle`,**然後**先 navigate;中間 gate render idle 分支 = CTA 閃現,直到 `/login` 載入。

BUG-038 T5 manual browser smoke 當時 deferred(W87 OneDrive 環境),所以呢兩個面直到今次用戶實測先浮面。

## 3. 建議修法(範圍 B — 等 approve)

1. **`auth-provider.tsx`**:store 加 `hydrated: boolean`(初始 `false`;hydration effect 完成——無論 authenticated / 401-idle——先設 `true`)。
2. **`login-gate.tsx`**:`!hydrated || status === 'loading'` → 純 spinner(無 CTA);CTA 只喺 `hydrated && (idle | error)` 顯示 —— 即「確定未登入」。
3. **`user-menu.tsx`**:登出改為先 `router.push('/login')` 再(或並行)`signOut()`,登出過渡唔經 gate 嘅 idle 分支。
4. Regression test 補 3 case:未 hydrate idle → 無 CTA;hydrated idle → 有 CTA;signOut 流程 → 無 CTA 閃。

**風險**:低 — 只動 gate 顯示邏輯 + 登出次序;唔動認證本身;mock 模式(pass-through)零影響。

## 4. Fix landed(範圍 B,2026-07-03)

| 檔案 | 改動 |
|---|---|
| `lib/providers/auth-provider.tsx` | store 加 `hydrated: boolean`(初始 `false`);signIn 成功/失敗、cookie hydration 成功/401、MSAL restore 成功/失敗/init error 全部終態設 `true`;`signOut` 改為 in-flight 期間 hold `loading`(唔即刻落 idle);新 export `useAuthHydrated()` |
| `components/auth/login-gate.tsx` | `!hydrated \|\| status==='loading'` → 純 spinner;CTA 只喺 `hydrated && (idle\|error)` = 確定未登入先出現 |
| `components/auth/user-menu.tsx` | 登出改「先 `router.push('/login')` 後 `signOut()` 並行」— gate 未見到 idle 已 unmount |
| `tests/unit/login-gate.test.tsx` | 加 pre-hydration idle regression case(hydrated=false + idle → 無 CTA)+ 原 4 case 補 hydrated mock |
| `tests/unit/auth-signout.test.ts` | 新檔 3 case:初始 unhydrated / signOut in-flight hold loading → idle / setUserFromCache 設 hydrated |

## 5. 驗證

- vitest **8/8 pass**(login-gate 5 + auth-signout 3)
- `tsc --noEmit` exit 0 / `eslint` exit 0(5 個改動檔)
- manual browser smoke:留用戶按需確認(hard reload 不再閃 CTA / 登出過渡 spinner)

## 6. Changelog

| 日期 | 動作 | 原因 | 決定人 |
|---|---|---|---|
| 2026-07-03 | Initial triage(Sev4,範圍 B 提案,status=triaged 未動 code) | 用戶 browser 實測報告;BUG-038 out-of-scope 殘餘 | 用戶 |
| 2026-07-03 | 用戶 approve 範圍 B → fix landed(hydrated flag + gate 分流 + 登出次序)+ 驗證全綠 → status `triaged`→`done` | 修法已批准,vitest 8/8 + tsc/eslint exit 0 | 用戶(2026-07-03) |
