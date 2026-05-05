// C11 — W7 F1.2 msal-react real Entra ID provider (skeleton).
//
// Full PublicClientApplication + MsalProvider + redirect/login flow lands
// W8 D2-D3 once IT delivers AZURE_TENANT_ID + AZURE_CLIENT_ID per
// beta-plan-v1.md §2 W8.F1. W7 D1 leaves a fail-closed stub so any code path
// reaching this without LIVE wiring complete throws loudly.

import type { AuthBearer, AuthenticatedUser } from "./types";

const NOT_WIRED = new Error(
  "Real msal-react provider not yet wired (W8 D2-D3 trigger). " +
    "Set NEXT_PUBLIC_AUTH_MOCK=true for W7 dev mode.",
);

export function getMsalBearer(): AuthBearer {
  throw NOT_WIRED;
}

export function getMsalUser(): AuthenticatedUser {
  throw NOT_WIRED;
}

export async function loginMsal(): Promise<AuthenticatedUser> {
  throw NOT_WIRED;
}

export async function logoutMsal(): Promise<void> {
  throw NOT_WIRED;
}
