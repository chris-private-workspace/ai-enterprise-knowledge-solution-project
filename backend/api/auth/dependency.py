"""C11 — FastAPI Depends single switching point (W7 F1.3 + W13 D5 F5.6).

W7 baseline:

    auth_dependency = get_current_user_mock if settings.feature_auth_mock
                       else get_current_user_msal

W13 F5.6 extension (per ADR-0014 hybrid auth) — session token branch sits in
front of the mock/MSAL fork: self-register users present a session bearer
issued by `POST /auth/login`, which we resolve via `users_repo.resolve_session`
and return as the same `AuthenticatedUser` shape so downstream code stays
provider-agnostic. Mock + MSAL paths remain untouched (W7 baseline preserved).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from storage.settings import Settings, get_settings

from . import users_repo
from .mock_msal import authenticate_mock
from .models import AuthenticatedUser
from .msal_provider import authenticate_msal

_bearer = HTTPBearer(auto_error=False)

BearerDep = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_current_user(
    credentials: BearerDep,
    settings: SettingsDep,
) -> AuthenticatedUser:
    """Single switching point — session → mock vs real MSAL JWT validation.

    Order:
      1. Session token (self-register users via `POST /auth/login`) — resolved
         from in-memory sessions repo. Hit returns AuthenticatedUser; miss
         falls through to step 2 so the mock bearer + MSAL paths stay intact.
      2. Mock vs LIVE selection collapses to `feature_auth_mock` flag.

    Tests can override `feature_auth_mock` per-case AND seed the sessions repo
    via `users_repo.create_session(...)` to exercise the new branch.
    """

    if credentials is not None and credentials.scheme.lower() == "bearer":
        session_user = users_repo.resolve_session(credentials.credentials)
        if session_user is not None:
            return session_user

    if settings.feature_auth_mock:
        return authenticate_mock(credentials, settings)
    return authenticate_msal(credentials, settings)
