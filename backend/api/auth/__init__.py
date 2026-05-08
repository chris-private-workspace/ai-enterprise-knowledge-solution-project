"""C11 + C12 Identity & Access scaffold (W7 F1.2 + W13 D5 F5 hybrid auth).

W7 dev mode runs through `mock_msal.py` (dev-token bearer → fixed _DEV_USER).
W8 D4 swaps to `msal_provider.py` (real Entra ID JWT validation) via
`Settings.feature_auth_mock=False` flip — single switching point in
`dependency.get_current_user` per FastAPI Depends pattern.

W13 D5 F5 (per ADR-0014 + ADR-0016) adds the self-register hybrid path:
session tokens minted by `POST /auth/login` are resolved via `users_repo`
ahead of the mock/MSAL fork, so all three providers project to the same
`AuthenticatedUser` shape downstream.
"""

from . import users_repo
from .dependency import get_current_user
from .email_provider import EmailProvider, get_email_provider
from .models import AuthenticatedUser

__all__ = [
    "AuthenticatedUser",
    "EmailProvider",
    "get_current_user",
    "get_email_provider",
    "users_repo",
]
