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
  // No-op: there is no real session to invalidate in mock mode.
}
