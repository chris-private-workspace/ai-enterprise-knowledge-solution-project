'use client';

/**
 * V8 Login page (`/login`) — public entry per architecture.md v6 §5.10 + ADR-0014.
 *
 * Layout per `references/design-mockups/ekp-page-auth.jsx` mockup
 * (canonical visual spec, CLAUDE.md §3.2.1 design fidelity rule). Brand panel
 * left + form pane right (split via flex-col md:flex-row). Form pane visual
 * hierarchy (W20 F7.1 strict-fidelity realign 2026-05-17):
 *   1. SSO primary button (Sign in with Microsoft, full-width, top)
 *   2. Divider "OR continue with email"
 *   3. Email + Password form (secondary)
 *      · Forgot password inline next to Password label, right-aligned,
 *        Tier 2 badge via shared <DisabledAffordance variant="p3-preview">
 *   4. Sign in submit button (full-width)
 *   5. "Don't have an account?" → /register link
 *   6. Bottom mono dashed "Auth modes (Tier 1)" block — surfaces the hybrid
 *      auth contract per ADR-0014 + ADR-0022 for operator awareness
 *
 * Previous (W17 F2 + W18 F7) layout had email primary + SSO secondary; that
 * order pre-dated the high-fidelity mockup landing in W19. The mock-auth
 * default dev reality (Q11 Track A pending W16+) is unchanged — the SSO
 * button still calls `useAuthStore.signIn` (mock_msal in dev / real MSAL
 * Beta+); only the visual ordering moves to match the mockup.
 *
 * W17 F2 (per ADR-0022): self-register path POSTs `/auth/login`; the backend
 * sets the httpOnly `ekp_session` cookie + `ekp_csrf` cookie on the response
 * (the browser / `/api/backend` proxy carry it), so the page no longer
 * persists the token in localStorage. Error.code from the ApiError envelope
 * drives toast variants per F3.7.
 *
 * W18 F7 (per ADR-0024): successful sign-in routes to `/dashboard`. Stays
 * OUTSIDE the `app/(app)/` shell — the login page gets no app chrome
 * (the BrandPanel split layout is its own).
 */

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { BrandPanel } from '@/components/auth/brand-panel';
import { Button } from '@/components/ui/button';
import { DisabledAffordance } from '@/components/ui/disabled-affordance';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ApiError } from '@/lib/api-client';
import { AuthErrorCodes, authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/providers/auth-provider';

export default function LoginPage() {
  const router = useRouter();
  const ssoSignIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isFormPending, setIsFormPending] = useState(false);
  const [isSsoPending, setIsSsoPending] = useState(false);

  async function handleSelfSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      toast.error('Email and password required');
      return;
    }
    setIsFormPending(true);
    try {
      const response = await authApi.login({ email, password });
      toast.success(`Welcome back, ${response.user.display_name}!`);
      router.push('/dashboard');
    } catch (err) {
      handleAuthError(err, 'Sign in failed.');
    } finally {
      setIsFormPending(false);
    }
  }

  async function handleSsoClick() {
    setIsSsoPending(true);
    try {
      await ssoSignIn();
      toast.success('Signed in with Microsoft.');
      router.push('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('Microsoft sign-in failed.', { description: message });
    } finally {
      setIsSsoPending(false);
    }
  }

  const anyPending = isFormPending || isSsoPending;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your Ricoh corporate account or with email.
            </p>
          </header>

          {/* Primary: Entra ID SSO */}
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleSsoClick}
            disabled={anyPending}
          >
            {isSsoPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              <>
                <MicrosoftIcon className="mr-2 h-4 w-4" />
                Sign in with Microsoft
              </>
            )}
          </Button>

          <DividerWithLabel label="OR continue with email" />

          <form onSubmit={handleSelfSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@ricoh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={anyPending}
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center">
                <Label htmlFor="password" className="flex-1">
                  Password
                </Label>
                <DisabledAffordance
                  variant="p3-preview"
                  reason="Password recovery — coming in a later tier (post-Beta)"
                  tier2Trigger="Tier 2 — per ADR-0014"
                  showBadge
                >
                  <span className="text-xs text-muted-foreground">
                    Forgot password?
                  </span>
                </DisabledAffordance>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={anyPending}
                required
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-accent text-accent-foreground shadow hover:bg-accent/90"
              disabled={anyPending}
            >
              {isFormPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in →'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-accent transition-colors hover:underline"
            >
              Create one
            </Link>
          </p>

          {/* Auth modes (Tier 1) — operator-awareness mono block per mockup */}
          <aside
            className="mt-6 rounded-md border border-dashed border-border p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
            aria-label="Auth modes — Tier 1"
          >
            <p className="font-semibold text-foreground">Auth modes (Tier 1)</p>
            <p>· Hybrid: Entra ID SSO primary + email self-register fallback (ADR-0022)</p>
            <p>· httpOnly cookie + CSRF double-submit + /auth/refresh</p>
            <p>· Mock-auth default in dev (Track A IT cred populate W16+)</p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function DividerWithLabel({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <Separator className="flex-1" />
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Separator className="flex-1" />
    </div>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
    </svg>
  );
}

function handleAuthError(err: unknown, fallbackMessage: string): void {
  if (err instanceof ApiError) {
    const code = err.code;
    if (code === AuthErrorCodes.INVALID_CREDENTIALS) {
      toast.error('Email or password is incorrect.', {
        description: 'Check your credentials and try again.',
      });
    } else if (code === AuthErrorCodes.EMAIL_NOT_VERIFIED) {
      toast.error('Verify your email first.', {
        description: err.actionableHint ?? 'Check your inbox or resend the code.',
      });
    } else {
      toast.error(err.message, {
        description: err.actionableHint ?? undefined,
      });
    }
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  toast.error(fallbackMessage, { description: message });
}
