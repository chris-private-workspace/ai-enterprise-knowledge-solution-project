/**
 * Playwright E2E + pixel diff baseline harness config — W15 D4 F4 deliverable
 * per architecture.md v6 §5.8 + design ref §6 W15 scope + CLAUDE.md §3.2
 * test framework "Vitest + React Testing Library baseline preserved; Playwright
 * additive" (per W15 plan §F4 deliverable spec ref).
 *
 * Tier 1 baseline scope per W15 plan §3 Success Criteria:
 * - Chromium-only (Desktop Chrome) — Karpathy §1.2 simplicity drop firefox/webkit
 * - Sequential test execution (fullyParallel: false) — avoid race conditions on
 *   shared in-memory KB state baseline
 * - Trace + screenshot + video retain-on-failure (debugging aid)
 * - webServer auto-starts `pnpm dev` (port 3001) with NEXT_PUBLIC_AUTH_MOCK=true
 *   so tests bypass real Entra ID via mock MSAL
 * - Backend uvicorn (port 8000) = user-driven separately per CLAUDE.md §13 dev
 *   server policy (Claude Code can't run long-lived servers)
 *
 * User smoke usage:
 *   1. `! cd backend && .venv/Scripts/python.exe -m uvicorn api.server:app --port 8000`
 *   2a. `! cd frontend && npx playwright install chromium` (one-time bundled-Chromium download), OR
 *   2b. (R8 corp-proxy CDN block — ADR-0017 Plan B) skip the download and drive an
 *       already-installed system Chrome/Edge instead:
 *         `! cd frontend && PW_CHANNEL=chrome pnpm test:e2e`   (or `PW_CHANNEL=msedge`)
 *       — `PW_CHANNEL` is unset by default (uses the bundled Chromium), so this is
 *       purely an opt-in escape hatch; no CI behaviour change.
 *   3. `! cd frontend && pnpm test:e2e`                 (auto-starts pnpm dev)
 *   4. `! cd frontend && pnpm test:e2e:update-snapshots` (capture pixel diff baseline)
 *
 * CI integration deferred to W16+ Beta hardening per plan §F4.5 PARTIAL PASS
 * acceptance "local-only baseline OK Tier 1".
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// ADR-0017 Plan B — `npx playwright install chromium` is blocked by the Ricoh
// corp-proxy CDN (ECONNRESET at cdn.playwright.dev, confirmed 2026-05-09 + still
// active 2026-05-13). If a system Chrome/Edge is already installed (it is, on the
// corp-managed dev box), set `PW_CHANNEL=chrome` (or `msedge`) to have Playwright
// drive that instead of the bundled Chromium. Unset → bundled Chromium (default).
const PW_CHANNEL = process.env.PW_CHANNEL || undefined;
// `video: 'retain-on-failure'` needs the ffmpeg binary, which lives in the same
// blocked-CDN bucket as the Chromium download — so under Plan B (PW_CHANNEL set)
// turn video off (trace + screenshot don't need ffmpeg, so those stay on).
const PW_VIDEO = PW_CHANNEL ? ('off' as const) : ('retain-on-failure' as const);

export default defineConfig({
  testDir: './tests/e2e',
  // W23 F2: 30s timeout 喺 OneDrive-synced repo + Next.js dev server first-route
  // compile 經常 timeout(Windows OneDrive filesystem sync delay + dev mode
  // route-on-demand build = 30-40s per cold route)。Lift to 60s preserves
  // CI Beta hardening signal while allowing dev cold-start.
  timeout: 60_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // 1% diff tolerance for anti-aliasing / sub-pixel rendering jitter
      maxDiffPixelRatio: 0.01,
    },
  },
  // Tier 1: sequential to avoid in-memory KB state race conditions
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: PW_VIDEO,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: PW_CHANNEL },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_AUTH_MOCK: 'true',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    },
  },
});
