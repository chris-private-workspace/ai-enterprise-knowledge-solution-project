'use client';

/**
 * C11 — auth state context (W7 D2 F1.4 login flow UI).
 *
 * Zustand store wrapping `lib/auth/index.ts` single switching point. Mock
 * mode (W7) auto-logs-in on mount; real MSAL (W8 D4 onwards) waits for the
 * user to click the login button which redirects to the Entra ID hosted page.
 */

import { create } from 'zustand';
import { useEffect, useRef } from 'react';

import { authMode, getCurrentUser, login, logout, refresh } from '@/lib/auth';
import type { AuthenticatedUser } from '@/lib/auth';
import { initMsal, getMsalUser } from '@/lib/auth/msal_provider';

type AuthState = {
  user: AuthenticatedUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  // BUG-039 — `idle` is ambiguous: the store STARTS at idle before the hydration
  // effect has even run, and lands back at idle after a definitive 401 / sign-out.
  // `hydrated` disambiguates: false until the first identity resolution attempt
  // completes, so the login-gate never flashes the sign-in CTA on first paint.
  hydrated: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  setUserFromCache: (user: AuthenticatedUser) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  hydrated: false,
  error: null,

  signIn: async () => {
    set({ status: 'loading', error: null });
    try {
      const user = await login();
      set({ user, status: 'authenticated', hydrated: true, error: null });
    } catch (e) {
      set({
        status: 'error',
        hydrated: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  signOut: async () => {
    // BUG-039 — hold `loading` while the logout request is in flight so the
    // login-gate shows the neutral spinner (not the sign-in CTA) during the
    // sign-out → /login navigation window.
    set({ status: 'loading', error: null });
    await logout();
    set({ user: null, status: 'idle', error: null });
  },

  setUserFromCache: (user: AuthenticatedUser) =>
    set({ user, status: 'authenticated', hydrated: true, error: null }),
}));

// Refresh slightly before Microsoft default 1-hour expiry so the cached
// bearer never goes stale mid-request. 50min = 3000s.
const REFRESH_INTERVAL_MS = 50 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { signIn, setUserFromCache, status } = useAuthStore();
  // CH-013 — cookie-mode hydration must run exactly once (see the cookie branch).
  const cookieHydratedRef = useRef(false);

  useEffect(() => {
    if (authMode === 'mock') {
      if (status === 'idle') {
        // W7 mock mode: auto-sign-in so dev sessions don't have to click a
        // button before each Admin / Chat view loads.
        void signIn();
      }
      return;
    }

    if (authMode === 'cookie') {
      // CH-013 — hydrate identity from the existing httpOnly ekp_session cookie
      // exactly once on mount. A 401 (no/invalid session) resolves to `idle`
      // (NOT `error`) so the login-gate shows the sign-in path normally. We do
      // NOT re-run on status changes — otherwise a sign-out (status → idle)
      // would immediately re-hydrate and undo the logout. Login itself goes
      // through the login page form (authApi.login → cookie) then store.signIn.
      if (!cookieHydratedRef.current) {
        cookieHydratedRef.current = true;
        void (async () => {
          useAuthStore.setState({ status: 'loading', error: null });
          try {
            const user = await login();
            setUserFromCache(user);
          } catch {
            // Definitively unauthenticated (401) — hydration attempt is complete.
            useAuthStore.setState({
              user: null,
              status: 'idle',
              hydrated: true,
              error: null,
            });
          }
        })();
      }
      return;
    }

    // W8 D3 LIVE msal-react path. handleRedirectPromise + active-account
    // restore from sessionStorage cache; no auto-redirect to Entra ID hosted
    // login — user must click sign-in CTA so we never get into an infinite
    // loop on startup if cred wiring is broken.
    let cancelled = false;
    void (async () => {
      try {
        await initMsal();
        if (cancelled) return;
        try {
          const user = getMsalUser();
          setUserFromCache(user);
        } catch {
          // Not authenticated yet — UserMenu shows sign-in CTA. The restore
          // attempt is complete either way (BUG-039).
          useAuthStore.setState({ hydrated: true });
        }
      } catch (e) {
        if (!cancelled) {
          // initMsal failure (config missing / network) surfaces via store
          // error state so ErrorBoundary can pick it up downstream.
          useAuthStore.setState({
            status: 'error',
            hydrated: true,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();

    // Periodic silent refresh while the tab is open — acquireTokenSilent
    // uses the refresh token kept in sessionStorage cache. Failure is
    // recovered by next request triggering 401 → frontend redirects to
    // login (handled at api-client.ts ApiError boundary).
    const interval = setInterval(() => {
      void refresh().catch(() => {
        // Silent — recoverable on next user action.
      });
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [signIn, setUserFromCache, status]);

  // Surface the current user via the store directly; consumers select what
  // they need rather than reading from an extra Context layer.
  return <>{children}</>;
}

export function useCurrentUser(): AuthenticatedUser | null {
  return useAuthStore((s) => s.user);
}

export function useAuthStatus(): AuthState['status'] {
  return useAuthStore((s) => s.status);
}

/** BUG-039 — true once the first identity-resolution attempt has completed.
 * The login-gate treats `!hydrated` like `loading` (neutral spinner, no CTA). */
export function useAuthHydrated(): boolean {
  return useAuthStore((s) => s.hydrated);
}

export { authMode, getCurrentUser };
