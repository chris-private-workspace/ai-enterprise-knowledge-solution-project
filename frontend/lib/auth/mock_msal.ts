// C11 — W7 F1.2.1 frontend mock MSAL bearer provider.
//
// Returns a fixed dev-token + fixed _DEV_USER claim shape so C09 Admin /
// C10 Chat exercise the real auth wire format while real Entra ID redirect
// flow lands W8 D4. Activated by NEXT_PUBLIC_AUTH_MOCK=true in `.env.local`.

import type { AuthBearer, AuthenticatedUser } from "./types";

const DEV_USER: AuthenticatedUser = {
  oid: "00000000-0000-0000-0000-000000000001",
  tid: "00000000-0000-0000-0000-0000000000ff",
  preferredUsername: "dev-user@ekp.local",
  isMock: true,
};

const DEV_BEARER: AuthBearer = {
  scheme: "Bearer",
  token: "dev-token",
};

export function getMockBearer(): AuthBearer {
  return DEV_BEARER;
}

export function getMockUser(): AuthenticatedUser {
  return DEV_USER;
}

export async function loginMock(): Promise<AuthenticatedUser> {
  // No redirect, no popup — dev mode bypasses the Entra ID hosted login flow
  // entirely (W7 closeout F1.7-mock smoke). LIVE replacement W8 D4.
  return DEV_USER;
}

export async function logoutMock(): Promise<void> {
  // Mock backend `/auth/logout` is itself a no-op but we still call it so
  // the integration smoke (F1.7-mock D5) covers the full wire — request
  // travels through F1.3 auth Depends + F2 rate limiter + F3 audit log.
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
    await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${DEV_BEARER.token}` },
    });
  } catch {
    // Network blip during dev should not block UI sign-out — local store
    // clear is the user-facing source of truth.
  }
}

export async function refreshMock(): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  // Mock refresh returns the same fixed token. Real msal_provider W8 D2-D3
  // wiring will exchange a refresh token here.
  return { accessToken: DEV_BEARER.token, expiresIn: 3600 };
}
