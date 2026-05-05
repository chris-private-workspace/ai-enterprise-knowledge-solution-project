"""C11 — auth endpoint request/response schemas (W7 D3 F1.5)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RefreshResponse(BaseModel):
    """Response payload for `POST /auth/refresh`.

    Mock mode reissues the same dev-token; real MSAL exchanges the refresh
    token via the Entra ID `/oauth2/v2.0/token` endpoint W8 D2-D3.
    """

    access_token: str = Field(..., description="Bearer token to put in Authorization header")
    token_type: str = Field(default="Bearer")
    expires_in: int = Field(..., description="Seconds until access_token expires")
    is_mock: bool = Field(default=False)


class LogoutResponse(BaseModel):
    status: str = Field(default="ok")
    is_mock: bool = Field(default=False)
