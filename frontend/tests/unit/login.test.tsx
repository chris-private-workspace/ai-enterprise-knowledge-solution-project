/**
 * Unit tests — `/login` strict-fidelity refactor (W20 F7.1 / F8.4).
 *
 * Verifies: SSO primary button at top of form + Divider "OR continue with
 * email" + email/password form secondary + Forgot password inline next to
 * Password label via `<DisabledAffordance>` (TIER 2 badge present) + bottom
 * mono dashed "Auth modes (Tier 1)" `<aside>` block.
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
  it('renders the SSO primary button + Divider + Sign in form + Forgot password DisabledAffordance + Auth modes aside', () => {
    render(<LoginPage />);
    // SSO primary at top of form.
    expect(
      screen.getByRole('button', { name: /sign in with microsoft/i }),
    ).toBeInTheDocument();
    // Divider label between SSO and email form.
    expect(screen.getByText(/or continue with email/i)).toBeInTheDocument();
    // Email + Password labels render.
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // Forgot password is wrapped in a DisabledAffordance — TIER 2 badge visible.
    expect(screen.getByText(/forgot password\?/i)).toBeInTheDocument();
    expect(screen.getByText('TIER 2')).toBeInTheDocument();
    // Sign in submit button (accent variant via className override).
    expect(screen.getByRole('button', { name: /^sign in →$/i })).toBeInTheDocument();
    // Auth modes mono dashed aside block at bottom.
    expect(
      screen.getByLabelText('Auth modes — Tier 1'),
    ).toBeInTheDocument();
    expect(screen.getByText(/auth modes \(tier 1\)/i)).toBeInTheDocument();
  });
});
