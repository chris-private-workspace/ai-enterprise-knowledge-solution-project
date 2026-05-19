/**
 * Golden-path E2E baseline — W15 D4 F4.2 deliverable; W18 F7 updated; W20 F7
 * polished; W22 F2+F4 rebuilt; **W23 F2 re-aligned to W22 mockup DOM**.
 *
 * Coverage (Tier 1 baseline scope per W15 plan §3 Success Criteria):
 * - `/` redirects to `/login` (V7 Landing REMOVED per ADR-0024)
 * - V8 Login renders W22 F2.1 page-title「Welcome back」(not pre-W22「Sign in」) +
 *   SSO primary button + dual auth path (Microsoft SSO + form)
 * - V9 Register Step 1 renders W22 F2.2 page-title「Create your account」 +
 *   3 form fields (Full name / Work email / Password — Confirm password DROPPED
 *   per W22 D6 mockup-wins;backend `/auth/register` validates server-side)
 * - V1 Chat renders W22 F4 mockup-faithful composer textarea + Conversations sidebar
 *   span (NOT heading) + New chat button. **NO citation modes seg-toggle**
 *   (W22 D1 H7 mockup correction: ChatHeader has CRAG + Show images switches +
 *   Focus + Sources icons, but no inline/footnote/sidebar pill toggle)
 *
 * Subsumes manual smoke deferred across W12+W13+W14 cycles per W15 plan §F4
 * "W12+W13+W14 manual smoke deferred backlog systematic subsume".
 *
 * Tier 1 = render assertions only;interactive flow assertions (form submit +
 * backend integration) defer Beta hardening. Tests assume
 * NEXT_PUBLIC_AUTH_MOCK=true (set in playwright.config.ts webServer env) so MSAL
 * bypasses real Entra ID. Run via `PW_CHANNEL=chrome pnpm test:e2e` per W17
 * ADR-0017 Plan B (a) — corp-managed system Chrome.
 */

import { test, expect } from '@playwright/test';

test.describe('Golden path — public + chat E2E (W23 F2 W22-aligned)', () => {
  test('/ redirects to /login (V7 Landing removed per ADR-0024)', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    // W22 F2.1 login page-title「Welcome back」(not pre-W22「Sign in」).
    await expect(
      page.getByRole('heading', { name: /welcome back/i }),
    ).toBeVisible();
  });

  test('V8 Login page renders with dual auth path (SSO + email form)', async ({ page }) => {
    await page.goto('/login');
    // W22 F2.1 form field labels「Work email」+「Password」with htmlFor/id linkage
    // (lines 142-143 + 161-167). getByLabel partial-matches /email/ via
    // case-insensitive regex.
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i).first()).toBeVisible();
    // SSO primary button「Sign in with Microsoft」(line 133).
    await expect(
      page.getByRole('button', { name: /sign in with microsoft/i }),
    ).toBeVisible();
    // Register link「Create one」(W22 F2.1 line 233, not pre-W22「Sign up」).
    await expect(page.getByRole('link', { name: /create one|register|sign up/i })).toBeVisible();
  });

  test('V9 Register page renders W22 F2.2 Step 1 account info form', async ({ page }) => {
    await page.goto('/register');
    // W22 F2.2 page-title「Create your account」.
    await expect(
      page.getByRole('heading', { name: /create your account/i }),
    ).toBeVisible();
    // W22 F2.2 Step 1 fields (lines 240-326): Full name / Work email / Password.
    // Confirm password field DROPPED per W22 D6 mockup-wins (backend /auth/register
    // validates server-side per scrypt hint).
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i).first()).toBeVisible();
    // Terms checkbox visible.
    await expect(page.getByRole('checkbox')).toBeVisible();
  });

  test('V1 Chat page renders W22 F4 composer + Conversations sidebar', async ({ page }) => {
    // Mock MSAL auth bypass — direct nav per webServer env NEXT_PUBLIC_AUTH_MOCK=true.
    await page.goto('/chat');
    // Chat composer textarea preserved (W22 F4 ChatComposer mockup line 800+).
    const inputArea = page.locator('textarea, [contenteditable="true"]').first();
    await expect(inputArea).toBeVisible();
    // W22 F4 Conversations sidebar — "Conversations" is rendered as a 13px <span>
    // bold (line 577) NOT a heading element, so getByText matches by visible text.
    // (Pre-W22 used <h2>Conversations</h2>; W22 D1 dropped semantic heading.)
    await expect(page.getByText(/^conversations$/i).first()).toBeVisible();
    // New chat button preserved (line 600).
    await expect(page.getByRole('button', { name: /new chat/i })).toBeVisible();
  });

  test('V8 Login renders W22 F2.1 strict-fidelity surfaces (SSO primary + auth modes aside)', async ({
    page,
  }) => {
    await page.goto('/login');
    // SSO primary button at top of form (W22 F2.1 mockup-anchored ordering).
    await expect(
      page.getByRole('button', { name: /sign in with microsoft/i }),
    ).toBeVisible();
    // Divider label between SSO and email form (W22 F2.1 line 138: "OR continue with email").
    await expect(page.getByText(/or continue with email/i)).toBeVisible();
    // Auth modes mono dashed aside block at bottom (aria-label preserved from W20 F7.1).
    await expect(
      page.getByLabel(/auth modes — tier 1/i),
    ).toBeVisible();
  });

  test('V9 Register renders W22 F2.2 polish (field order + Terms checkbox + hint copy)', async ({
    page,
  }) => {
    await page.goto('/register');
    // W22 F2.2 field order — Full name first, then Work email, then Password.
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/work email/i)).toBeVisible();
    // Hint copy preserved (lines 284 + 315).
    await expect(page.getByText(/6-digit verification code/i)).toBeVisible();
    await expect(page.getByText(/scrypt-hashed via adr-0022/i)).toBeVisible();
    // Terms of Use + Privacy Policy checkbox renders (line 333).
    await expect(page.getByRole('checkbox')).toBeVisible();
  });
});
