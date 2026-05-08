'use client';

/**
 * V8 Login page (`/login`) — public entry per architecture.md v6 §5.10 + ADR-0014.
 *
 * Layout per ui-design-reference-v6.md §2.8 wireframe: brand panel left + form
 * area right (split layout). Brand panel collapses < md per F3.8 responsive
 * acceptance.
 *
 * W13 D3 F3 scope: UI shell only. All auth wire deferred to W13 F5 cascade per
 * user instruction (plan §7 changelog 2026-06-10 D3) — both internal MSAL SSO
 * (existing useAuthStore W7 baseline) and external self-register POST /auth/login
 * stub w/ toast feedback ("auth wire pending F5"). F5 implementation will tie
 * the dual auth flows cleanly.
 *
 * Local state drives loading + error UX so visual polish (Loader2 spinner,
 * disabled buttons) demonstrates the flow without real backend dependency.
 *
 * Layout reference Dify Image 9 split auth (no code copy per ADR-0010); EKP
 * visual identity via tokens.ts Option C (brand panel uses bg-primary warm
 * charcoal).
 */

import { Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const F5_PENDING_MESSAGE =
  'Auth wire pending W13 F5 backend hybrid auth cascade. Self-register endpoint not yet live.';
const F5_PENDING_SSO_MESSAGE =
  'Auth wire pending W13 F5 cascade. MSAL SSO redirect will land via existing useAuthStore W7 baseline.';

export default function LoginPage() {
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
    // TODO(W13 F5): replace with real POST /auth/login self-register endpoint
    // call. Error.code → toast variant per ApiError envelope (invalid_cred /
    // unverified_email / locked_account) per checklist F3.7.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsFormPending(false);
    toast.info(F5_PENDING_MESSAGE);
  }

  async function handleSsoClick() {
    setIsSsoPending(true);
    // TODO(W13 F5): replace with useAuthStore.signIn() → MSAL redirect cascade
    // (existing W7 baseline ties cleanly via F5 batch).
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSsoPending(false);
    toast.info(F5_PENDING_SSO_MESSAGE);
  }

  const anyPending = isFormPending || isSsoPending;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <BrandPanel />
      <main className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back. Use your Ricoh account or sign in with email.
          </p>

          <form onSubmit={handleSelfSubmit} className="mt-8 space-y-4">
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
              <Label htmlFor="password">Password</Label>
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
            <Button type="submit" className="w-full" disabled={anyPending}>
              {isFormPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              or
            </span>
            <Separator className="flex-1" />
          </div>

          <Button
            variant="outline"
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
                <Building2 className="mr-2 h-4 w-4" />
                Sign in with Microsoft
              </>
            )}
          </Button>

          <div className="mt-6 flex items-center justify-between text-xs">
            <span
              className="cursor-not-allowed text-muted-foreground opacity-60"
              title="Forgot password — Tier 2 (post-Beta) per ADR-0014"
            >
              Forgot password?
            </span>
            <Link
              href="/register"
              className="text-foreground transition-colors hover:text-accent"
            >
              Don&apos;t have an account?{' '}
              <span className="font-medium underline-offset-4 hover:underline">
                Register
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground md:flex"
      aria-hidden="true"
    >
      {/* Subtle dot-grid pattern overlay — uses currentColor inherited from
          text-primary-foreground so it stays in token consumption (no hardcoded
          oklch). */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative z-10">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          EKP
        </Link>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-semibold leading-tight md:text-4xl">
          Knowledge,
        </p>
        <p className="text-3xl font-semibold leading-tight md:text-4xl">
          on demand.
        </p>
        <p className="mt-4 max-w-xs text-sm opacity-80">
          Cited answers from your internal manuals — Word, PDF, PowerPoint.
        </p>
      </div>
    </aside>
  );
}
