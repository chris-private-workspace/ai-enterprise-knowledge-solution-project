// C11 — frontend single switching point analogous to backend Depends pattern.
//
// `NEXT_PUBLIC_AUTH_MOCK=true` (W7 dev) → mock_msal.ts.
// `NEXT_PUBLIC_AUTH_MOCK=false` or unset (W8 D4 onwards) → msal_provider.ts.
//
// Consumers (api-client.ts, providers/auth-provider.tsx) import from this
// barrel only — keeps the swap to a single env-var flip.

import {
  getMockBearer,
  getMockUser,
  loginMock,
  logoutMock,
  refreshMock,
} from "./mock_msal";
import {
  getMsalBearer,
  getMsalUser,
  loginMsal,
  logoutMsal,
  refreshMsal,
} from "./msal_provider";
import type { AuthBearer, AuthenticatedUser } from "./types";

export type { AuthBearer, AuthenticatedUser };

const isMockMode = process.env.NEXT_PUBLIC_AUTH_MOCK === "true";

export function getBearer(): AuthBearer {
  return isMockMode ? getMockBearer() : getMsalBearer();
}

export function getCurrentUser(): AuthenticatedUser {
  return isMockMode ? getMockUser() : getMsalUser();
}

export async function login(): Promise<AuthenticatedUser> {
  return isMockMode ? loginMock() : loginMsal();
}

export async function logout(): Promise<void> {
  return isMockMode ? logoutMock() : logoutMsal();
}

export async function refresh(): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  return isMockMode ? refreshMock() : refreshMsal();
}

export const authMode: "mock" | "msal" = isMockMode ? "mock" : "msal";
