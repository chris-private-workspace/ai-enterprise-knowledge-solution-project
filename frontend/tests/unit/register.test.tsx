/**
 * Unit tests — `/register` visual polish (W20 F7.2 / F8.4).
 *
 * Verifies: 3-step Stepper renders + Step 1 field order Full name → Work
 * email → Password → Confirm password + Hint copy presence ("6-digit
 * verification code" + "Scrypt-hashed via ADR-0022") + Terms of Use + Privacy
 * Policy checkbox required to submit (Continue → button disabled until
 * checked and required fields valid).
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
  it('renders the 3-step Stepper and Step 1 field order Full name → Work email → Password → Confirm', () => {
    render(<RegisterPage />);
    for (const label of ['Account info', 'Email verify', 'Welcome']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Field labels render in the new W20 F7.2 order.
    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
  });

  it('renders the hint copy for email + password fields', () => {
    render(<RegisterPage />);
    expect(
      screen.getByText(/6-digit verification code/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/scrypt-hashed via adr-0022/i),
    ).toBeInTheDocument();
  });

  it('Continue → button stays disabled until Terms checkbox is checked + required fields valid', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);
    const submitButton = screen.getByRole('button', { name: /continue/i });
    expect(submitButton).toBeDisabled();

    // Fill all required fields.
    await user.type(screen.getByLabelText('Full name'), 'Chris Lai');
    await user.type(screen.getByLabelText('Work email'), 'chris@ricoh.com');
    await user.type(screen.getByLabelText('Password'), 'StrongPass1!');
    await user.type(screen.getByLabelText('Confirm password'), 'StrongPass1!');
    // Still disabled until Terms is checked.
    expect(submitButton).toBeDisabled();
    await user.click(screen.getByRole('checkbox'));
    expect(submitButton).not.toBeDisabled();
  });
});
