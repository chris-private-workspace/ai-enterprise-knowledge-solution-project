"""C11 Identity & Access — auth scaffold (W7 F1.2 + F1.2.1 a-revised mock auth path).

W7 dev mode runs through `mock_msal.py` (dev-token bearer → fixed _DEV_USER).
W8 D4 swaps to `msal_provider.py` (real Entra ID JWT validation) via
`Settings.feature_auth_mock=False` flip — single switching point in
`dependency.get_current_user` per FastAPI Depends pattern.
"""

from .dependency import get_current_user
from .models import AuthenticatedUser

__all__ = ["AuthenticatedUser", "get_current_user"]
