/**
 * Unit tests — `/register` strict-fidelity refactor (W22 F2 rebuild per
 * `references/design-mockups/ekp-page-auth.jsx PageRegister`).
 *
 * Verifies: Step 1 fields (Full name / Work email / Password — mockup has
 * NO Confirm password field per W22 D11 audit) + 6-digit verification hint
 * (backend wins per CLAUDE.md §13 — mockup magic-link replaced by 6-digit) +
 * Terms checkbox required to enable Continue button.
 *
 * W22 F8.7 rewrite (2026-05-18): W20 F7.2 baseline asserted DOM that the
 * W22 rebuild changed — visible stepper bar dropped (mockup PageRegister
 * uses view-switching not stepper UI per F5b precedent), Confirm password
 * field dropped (mockup line 133-174), scrypt-via-ADR-0022 hint removed.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock('@/lib/api/auth', () => ({
  authApi: { register: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn() },
  AuthErrorCodes: {
    EMAIL_ALREADY_EXISTS: 'auth.email_already_exists',
    INVALID_EMAIL: 'auth.invalid_email',
    WEAK_PASSWORD: 'auth.weak_password',
    VERIFICATION_EXPIRED: 'auth.verification_expired',
    VERIFICATION_FAILED: 'auth.verification_failed',
    RESEND_RATE_LIMITED: 'auth.resend_rate_limited',
  },
}));

import RegisterPage from '../../app/register/page';

describe('RegisterPage', () => {
  it('renders Step 1 fields (Full name / Work email / Password) per mockup PageRegister', () => {
    render(<RegisterPage />);
    // Field labels render in mockup-faithful order (NO Confirm password field).
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    // Mockup PageRegister has NO Confirm password field (W22 D11 audit).
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it('renders the 6-digit verification code hint (backend wins vs mockup magic-link)', () => {
    render(<RegisterPage />);
    // 6-digit code subtitle appears in Step 1's email-hint copy.
    expect(
      screen.getByText(/6-digit verification code/i),
    ).toBeInTheDocument();
  });

  it('Create account → button stays disabled until Terms checkbox is checked + required fields valid', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    expect(submitButton).toBeDisabled();

    // Fill all required fields (no Confirm password — mockup drops it).
    await user.type(screen.getByLabelText('Full name'), 'Chris Lai');
    await user.type(screen.getByLabelText('Work email'), 'chris@ricoh.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    // Still disabled until Terms is checked.
    expect(submitButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(submitButton).not.toBeDisabled();
  });
});
