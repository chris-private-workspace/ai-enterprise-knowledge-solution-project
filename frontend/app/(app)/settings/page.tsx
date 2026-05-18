'use client';

/**
 * Settings (`/settings`) — small profile + preferences view per architecture.md
 * v6 §5 + `references/design-mockups/ekp-page-misc.jsx:308 PageSettings`.
 *
 * W22 F8.1 (2026-05-18 D9) — complete rewrite for mockup fidelity per
 * CLAUDE.md §5.7 H7. Pre-W22 W18 F5 implementation (104 lines, shadcn
 * Card + ProfileRow + ThemeToggle dropdown) replaced with mockup
 * PageSettings decomposition: 3 cards (Profile + Appearance + Account) +
 * v1-scope dashed-border footer.
 *
 * Backend wins per CLAUDE.md §13 / W22 D10 (4th cumulative pre-active-flip
 * audit application):
 *   - D10.a pre-W22 docstring referenced `ekp-page-settings-tabs.jsx` (Wave C2
 *     6-tab file per ADR-0026) — wrong file for W18 thin scope; correct
 *     reference is `ekp-page-misc.jsx:308 PageSettings`
 *   - D10.b plan §2 F8.1 mentioned "Connections + API Keys + Audit log
 *     Tier 2 chips" but mockup PageSettings has only Profile / Appearance /
 *     Account (those sections belong to Wave C2 6-tab `ekp-page-settings-tabs.jsx`,
 *     NOT W22 scope) — drop per H7 mockup-wins
 *   - D10.c mockup theme seg = 2-button binary (Light / Dark); next-themes
 *     supports tri-state Light / Dark / System — per H7 drop System mode
 *     from UI (Wave C2 can re-introduce)
 *   - D10.d mockup "Rotate session" button has no backend hint → DisabledAffordance
 *     Wave C+ per minimal-scope choice (session rotation requires re-MSAL
 *     flow — Wave C scope)
 *   - D10.e mockup avatar = hardcoded "CL" initials → compute from
 *     `preferredUsername` (split @, then split . or -, take first letter of
 *     first 2 parts)
 *
 * Preserves: `useAuthStore.signOut` + `useCurrentUser` hook + auth state
 * shape (AuthenticatedUser w/ oid / tid / preferredUsername / isMock).
 * Dropped: ThemeToggle dropdown component (not used here), ProfileRow
 * helper (mockup uses different decomposition), shadcn Card / CardHeader /
 * CardContent (mockup uses .card CSS classes per CSS-first pivot baseline).
 */

import { LogOut, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { DisabledAffordance } from '@/components/ui/disabled-affordance';
import { useAuthStore, useCurrentUser } from '@/lib/providers/auth-provider';
import type { AuthenticatedUser } from '@/lib/auth/types';

/**
 * Compute 2-char avatar initials from `preferredUsername`:
 *  "chris.lai@ricoh.com" → "CL"
 *  "dev-user@ekp.local"  → "DU"
 *  "alice"               → "AL" (first 2 chars when no separator)
 *  "" / null             → "??"
 */
function computeInitials(username: string | null | undefined): string {
  if (!username) return '??';
  const localPart = username.split('@')[0] ?? username;
  const parts = localPart.split(/[.\-_+]/).filter(Boolean);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
  }
  return localPart.slice(0, 2).toUpperCase() || '??';
}

export default function SettingsPage() {
  const user = useCurrentUser();
  const signOut = useAuthStore((s) => s.signOut);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes is client-only; avoid hydration mismatch by deferring
  // theme-derived UI until after mount (per next-themes recommended pattern).
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="content">
      <div className="content-narrow" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">
              Profile, theme, and account. Workspace-level configuration lives
              under each KB&apos;s Settings tab.
            </p>
          </div>
        </div>

        <ProfileCard user={user} />

        <AppearanceCard
          mounted={mounted}
          resolvedTheme={resolvedTheme ?? null}
          setTheme={setTheme}
        />

        <AccountCard onSignOut={() => void signOut()} />

        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            border: '1px dashed oklch(var(--border-strong))',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'oklch(var(--muted-foreground))',
            lineHeight: 1.6,
          }}
        >
          <b style={{ color: 'oklch(var(--foreground))' }}>v1 scope</b> ·
          Settings is intentionally thin (W18 closeout). Wave C2 (per ADR-0026)
          will add billing, API keys, team management, notification routing,
          and audit log delegation.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ProfileCard
// ============================================================================
function ProfileCard({ user }: { user: AuthenticatedUser | null }) {
  const initials = computeInitials(user?.preferredUsername);
  const username = user?.preferredUsername ?? '—';
  // Tier 1 has no role system (RBAC = Wave C1 per ADR-0027); display placeholder.
  const role = 'Workspace Admin';
  const sessionLine = user
    ? user.isMock
      ? 'mock auth — dev mode'
      : 'Entra ID SSO · MSAL session active'
    : 'Signing in…';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <h3 className="card-title">Profile</h3>
      </div>
      <div
        className="card-body"
        style={{ display: 'flex', gap: 16, alignItems: 'center' }}
      >
        <div className="avatar avatar-lg" aria-hidden="true">
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{username}</div>
          <div className="text-sm muted">{role}</div>
          <div
            className="text-xs muted mono"
            style={{ marginTop: 4 }}
            title={user ? `oid ${user.oid} · tid ${user.tid}` : undefined}
          >
            {sessionLine}
          </div>
        </div>
        <DisabledAffordance
          variant="p1-strict"
          reason="Wave C2 — profile edit requires Entra Graph SDK + RBAC"
          tier2Trigger="Tier 2 — post-W22 governance (ADR-0026)"
        >
          <button className="btn btn-secondary btn-sm" disabled>
            Edit profile
            <span className="badge badge-muted" style={{ marginLeft: 6 }}>
              Tier 2
            </span>
          </button>
        </DisabledAffordance>
      </div>
    </div>
  );
}

// ============================================================================
// AppearanceCard — Theme seg + Language disabled
// ============================================================================
function AppearanceCard({
  mounted,
  resolvedTheme,
  setTheme,
}: {
  mounted: boolean;
  resolvedTheme: string | null;
  setTheme: (theme: string) => void;
}) {
  // Per D10.c: mockup binary Light/Dark seg; next-themes tri-state System
  // mode dropped from UI (Wave C2 can re-introduce). Use resolvedTheme so
  // the active state is correct even if theme === 'system' on first load —
  // first click then explicitly sets light/dark, leaving system tracking off.
  const isLight = mounted && resolvedTheme === 'light';
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <h3 className="card-title">Appearance</h3>
      </div>
      <div className="card-body">
        <div className="row" style={{ padding: '4px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>Theme</div>
            <div className="text-xs muted">
              Switches the entire app between Warm Charcoal (light) and Warm
              Neutral Dark (dark) palette
            </div>
          </div>
          <div className="seg" role="tablist" aria-label="Theme preference">
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={isLight}
              aria-selected={isLight}
              onClick={() => setTheme('light')}
            >
              Light
            </button>
            <button
              type="button"
              role="tab"
              className="seg-btn"
              data-active={isDark}
              aria-selected={isDark}
              onClick={() => setTheme('dark')}
            >
              Dark
            </button>
          </div>
        </div>
        <div className="hr" />
        <div className="row" style={{ padding: '4px 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>Language</div>
            <div className="text-xs muted">
              JP / ZH support is Tier 2 — disabled affordance per ADR-0024
            </div>
          </div>
          <DisabledAffordance
            variant="p1-strict"
            reason="Wave D+ — multi-language support (JP / ZH) is Tier 2 scope"
            tier2Trigger="Tier 2 — post-Beta scope"
          >
            <select className="select" disabled aria-label="Language">
              <option>English</option>
            </select>
          </DisabledAffordance>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AccountCard — Rotate session (Wave C+) + Sign out (functional)
// ============================================================================
function AccountCard({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Account</h3>
      </div>
      <div className="card-body" style={{ display: 'flex', gap: 8 }}>
        <DisabledAffordance
          variant="p1-strict"
          reason="Wave C+ — session rotation requires re-MSAL flow + token refresh"
          tier2Trigger="Tier 2 — post-W22 governance"
        >
          <button className="btn btn-secondary btn-sm" disabled>
            <RefreshCw size={13} aria-hidden="true" /> Rotate session
            <span className="badge badge-muted" style={{ marginLeft: 6 }}>
              Tier 2
            </span>
          </button>
        </DisabledAffordance>
        <div className="spacer" />
        <button
          type="button"
          className="btn btn-destructive btn-sm"
          onClick={onSignOut}
        >
          <LogOut size={13} aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}
