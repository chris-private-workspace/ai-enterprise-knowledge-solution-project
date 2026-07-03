/**
 * Unit tests — auth store sign-out transition + hydration flag (BUG-039).
 *
 * The sign-out window used to land the store on `idle` while the user was still
 * on a gated page, flashing the "Sign in to continue" CTA. Fix: `signOut` holds
 * `loading` while the logout request is in flight (the gate shows the neutral
 * spinner), and the store carries a `hydrated` flag so the initial `idle` state
 * (pre-hydration) is distinguishable from a definitive 401 idle.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth', () => ({
  authMode: 'cookie',
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 0))),
  refresh: vi.fn(),
}));
vi.mock('@/lib/auth/msal_provider', () => ({
  initMsal: vi.fn(),
  getMsalUser: vi.fn(),
}));

import { useAuthStore } from '@/lib/providers/auth-provider';

describe('auth store sign-out + hydration (BUG-039)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      status: 'idle',
      hydrated: false,
      error: null,
    });
  });

  it('starts unhydrated — the gate treats first-paint idle as loading', () => {
    expect(useAuthStore.getState().hydrated).toBe(false);
    expect(useAuthStore.getState().status).toBe('idle');
  });

  it('signOut holds loading while in flight, then lands on idle (no CTA window)', async () => {
    useAuthStore.setState({ status: 'authenticated', hydrated: true });
    const pending = useAuthStore.getState().signOut();
    // While the logout request is in flight the gate must show the spinner.
    expect(useAuthStore.getState().status).toBe('loading');
    await pending;
    expect(useAuthStore.getState().status).toBe('idle');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setUserFromCache marks the store hydrated', () => {
    useAuthStore.getState().setUserFromCache({
      oid: 'u1',
      tid: 't1',
      preferredUsername: 'test@example.com',
      isMock: false,
    });
    expect(useAuthStore.getState().hydrated).toBe(true);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
