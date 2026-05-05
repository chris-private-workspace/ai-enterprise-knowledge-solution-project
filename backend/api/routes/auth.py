"""C11 — auth endpoints (W7 D3 F1.5).

`POST /auth/refresh` — issue a fresh bearer (mock no-op return same dev-token;
real MSAL exchanges refresh token W8 D2-D3 cascade).
`POST /auth/logout` — invalidate session (mock no-op;real MSAL revokes
session + redirects to Entra ID logout endpoint W8 D2-D3).

Both endpoints flow through the F1.3 auth Depends so an unauthenticated caller
hits 401 before reaching the route body.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from api.auth.dependency import get_current_user
from api.auth.models import AuthenticatedUser
from api.schemas.auth import LogoutResponse, RefreshResponse
from storage.settings import Settings, get_settings

router = APIRouter(prefix="/auth", tags=["auth"])

CurrentUserDep = Annotated[AuthenticatedUser, Depends(get_current_user)]
SettingsDep = Annotated[Settings, Depends(get_settings)]

_MOCK_EXPIRES_IN_SECONDS = 3600


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(
    user: CurrentUserDep,
    settings: SettingsDep,
) -> RefreshResponse:
    """Reissue a bearer token without re-prompting for credentials.

    Mock mode (W7) returns the same fixed dev-token + 1h expiry. Real MSAL
    (W8 D4 onwards) calls `acquire_token_by_refresh_token` against Entra ID
    and surfaces the new access_token claim.
    """
    if settings.feature_auth_mock:
        return RefreshResponse(
            access_token=settings.auth_mock_bearer_token,
            expires_in=_MOCK_EXPIRES_IN_SECONDS,
            is_mock=True,
        )
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=(
            "Real MSAL refresh endpoint not yet wired (W8 D2-D3 trigger). "
            "Set Settings.feature_auth_mock=True for W7 dev mode."
        ),
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    user: CurrentUserDep,
    settings: SettingsDep,
) -> LogoutResponse:
    """Invalidate the current session.

    Mock mode is stateless so there is nothing server-side to invalidate; the
    frontend store clears its local user state. Real MSAL clears the MSAL
    cache + redirects to Entra ID logout endpoint W8 D2-D3.
    """
    return LogoutResponse(is_mock=settings.feature_auth_mock)
