/**
 * Unit tests — `/login` strict-fidelity refactor (W22 F2 rebuild per
 * `references/design-mockups/ekp-page-auth.jsx PageLogin`).
 *
 * Verifies: SSO primary button + Divider "OR continue with email" + email/
 * password form (mockup label "Work email") + Forgot password Tier 2 inline
 * chip + Sign in → submit + Auth modes (Tier 1) bottom mono dashed `<aside>`.
 *
 * W22 F8.7 rewrite (2026-05-18): W20 F8.4 baseline asserted DOM that the
 * W22 rebuild changed (label text "Email" → "Work email"; badge case
 * "TIER 2" → "Tier 2" per inline `.badge-muted`; structure preserved).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/providers/auth-provider', () => ({
  useAuthStore: (selector: (s: { signIn: () => Promise<void> }) => unknown) =>
    selector({ signIn: vi.fn(async () => {}) }),
}));
vi.mock('@/lib/api/auth', () => ({
  authApi: { login: vi.fn() },
  AuthErrorCodes: {
    INVALID_CREDENTIALS: 'auth.invalid_credentials',
    EMAIL_NOT_VERIFIED: 'auth.email_not_verified',
  },
}));

import LoginPage from '../../app/login/page';

describe('LoginPage', () => {
  it('renders the SSO primary button + Divider + Sign in form + Forgot password Tier 2 + Auth modes aside', () => {
    render(<LoginPage />);
    // SSO primary at top of form.
    expect(
      screen.getByRole('button', { name: /sign in with microsoft/i }),
    ).toBeInTheDocument();
    // Divider label between SSO and email form.
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    // Email + Password labels render (mockup uses "Work email" — W22 D11 audit).
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // Forgot password button has Tier 2 inline badge.
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    // Multiple Tier 2 badges may exist (Forgot password + Auth modes block);
    // assert at least one is present using getAllByText.
    expect(screen.getAllByText(/^tier 2$/i).length).toBeGreaterThan(0);
    // Sign in submit button (accent variant via className override).
    expect(screen.getByRole('button', { name: /^sign in →$/i })).toBeInTheDocument();
    // Auth modes mono dashed aside block at bottom.
    expect(
      screen.getByLabelText('Auth modes — Tier 1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/auth modes \(tier 1\)/i)).toBeInTheDocument();
  });
});
