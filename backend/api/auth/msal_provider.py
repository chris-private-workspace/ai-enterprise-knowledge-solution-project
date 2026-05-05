"""C11 — W7 F1.2 MSAL Python SDK real-Entra-ID JWT validator (skeleton).

Wired to `dependency.get_current_user_msal` only when
`Settings.feature_auth_mock=False`. W7 D1 leaves the validator skeletal — full
JWKS fetch + signature verification + audience/issuer check + expiry check land
W8 D2-D3 once IT delivers `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` per
`beta-plan-v1.md §2 W8.F1`.

Until W8 D2: any code path reaching this validator (i.e. `feature_auth_mock=False`
without real MSAL wiring complete) raises HTTP 503 so dev never silently
bypasses auth.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from storage.settings import Settings

from .models import AuthenticatedUser


def authenticate_msal(
    credentials: HTTPAuthorizationCredentials | None,
    settings: Settings,
) -> AuthenticatedUser:
    """Validate a real Entra ID JWT and return the authenticated user.

    W7 D1: skeleton only — raises 503 to fail closed. Real implementation
    populates from `msal` SDK + `python-jose` JWT verification W8 D2-D3 once
    Q11 IT operational confirm cascade delivers tenant + client cred.
    """

    _ = credentials  # parking - W8 D2 implementation reads bearer token here
    _ = settings  # parking - W8 D2 reads tenant_id + client_id + jwks_uri

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Real MSAL validator not yet wired (W8 D2-D3 trigger). "
            "Set Settings.feature_auth_mock=True for W7 dev mode."
        ),
    )
