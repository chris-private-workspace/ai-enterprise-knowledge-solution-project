"""C11 — FastAPI Depends single switching point (W7 F1.3 pre-wire).

Per W7 plan §2 F1.3 a-revised:

    auth_dependency = get_current_user_mock if settings.feature_auth_mock
                       else get_current_user_msal

Centralised here so F1.3 D2 wiring on `backend/api/main.py` lifespan is a
one-import edit, and W8 D4 LIVE switch is a single `.env` flag flip.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from storage.settings import Settings, get_settings

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
    """Single switching point — mock vs real MSAL JWT validation.

    Selection collapses to a Settings flag check so neither mock nor real path
    sees the other's logic, and tests can override `feature_auth_mock` per-case.
    """

    if settings.feature_auth_mock:
        return authenticate_mock(credentials, settings)
    return authenticate_msal(credentials, settings)
