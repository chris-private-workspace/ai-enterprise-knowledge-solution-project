// C11 — auth claim shape shared by mock + real MSAL paths (W7 F1.2).
// Mirrors backend `AuthenticatedUser` so the wire payload renders the same
// fields in C09 Admin / C10 Chat regardless of dev vs LIVE upstream.

export interface AuthenticatedUser {
  oid: string;
  tid: string;
  preferredUsername: string;
  isMock: boolean;
}

export interface AuthBearer {
  scheme: "Bearer";
  token: string;
}
