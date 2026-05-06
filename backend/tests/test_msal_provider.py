"""W8 D2 F1.6 — real Microsoft Entra ID JWT validation tests.

Generates a fresh RSA keypair per session, builds a JWKS dict around it,
patches the JWKS fetcher, and exercises the validator against signed JWTs
covering the W8 plan §2 F1.6 acceptance matrix:

  - valid signed JWT 200
  - expired JWT 401
  - audience mismatch 401
  - issuer mismatch 401
  - missing kid 401
  - JWKS fetch failure 503
  - missing oid/tid claim 401
  - malformed JWT 401
"""

from __future__ import annotations

import time
from typing import Any

import pytest
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwk, jwt

from api.auth import msal_provider
from api.auth.msal_provider import authenticate_msal, reset_jwks_cache
from storage.settings import Settings

KID = "test-kid-001"
TENANT = "00000000-0000-0000-0000-000000000aaa"
CLIENT = "00000000-0000-0000-0000-000000000bbb"
ISSUER = f"https://login.microsoftonline.com/{TENANT}/v2.0"


@pytest.fixture(scope="module")
def rsa_keypair() -> tuple[str, str]:
    """Generate a single RSA keypair for the whole test module."""
    private = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend(),
    )
    private_pem = private.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = (
        private.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    return private_pem, public_pem


@pytest.fixture
def jwks(rsa_keypair: tuple[str, str]) -> dict[str, Any]:
    """JWKS dict the patched fetcher returns."""
    _, public_pem = rsa_keypair
    public_jwk = jwk.construct(public_pem, algorithm="RS256").to_dict()
    public_jwk["kid"] = KID
    public_jwk["use"] = "sig"
    public_jwk["alg"] = "RS256"
    return {"keys": [public_jwk]}


@pytest.fixture(autouse=True)
def _patch_jwks_and_reset(
    monkeypatch: pytest.MonkeyPatch, jwks: dict[str, Any]
) -> None:
    reset_jwks_cache()
    monkeypatch.setattr(msal_provider, "_fetch_jwks", lambda uri: jwks)


@pytest.fixture
def settings() -> Settings:
    return Settings(
        feature_auth_mock=False,
        azure_tenant_id=TENANT,
        azure_client_id=CLIENT,
    )


def _sign_jwt(
    private_pem: str,
    *,
    audience: str = CLIENT,
    issuer: str = ISSUER,
    expires_in_s: int = 300,
    oid: str | None = "user-oid-1",
    tid: str | None = TENANT,
    preferred_username: str | None = "user@ricoh.com",
    kid: str | None = KID,
) -> str:
    now = int(time.time())
    claims: dict[str, Any] = {
        "aud": audience,
        "iss": issuer,
        "iat": now,
        "nbf": now,
        "exp": now + expires_in_s,
    }
    if oid is not None:
        claims["oid"] = oid
    if tid is not None:
        claims["tid"] = tid
    if preferred_username is not None:
        claims["preferred_username"] = preferred_username

    headers: dict[str, Any] | None = {"kid": kid} if kid else None
    return jwt.encode(claims, private_pem, algorithm="RS256", headers=headers)


def _bearer(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


def test_valid_signed_jwt_returns_authenticated_user(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem)

    user = authenticate_msal(_bearer(token), settings)

    assert user.oid == "user-oid-1"
    assert user.tid == TENANT
    assert user.preferred_username == "user@ricoh.com"
    assert user.is_mock is False


def test_falls_back_to_upn_when_preferred_username_absent(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    # Manually craft claims w/ upn instead of preferred_username.
    now = int(time.time())
    claims = {
        "aud": CLIENT,
        "iss": ISSUER,
        "iat": now,
        "exp": now + 300,
        "oid": "guest-oid-1",
        "tid": TENANT,
        "upn": "guest@partner.com",
    }
    token = jwt.encode(claims, private_pem, algorithm="RS256", headers={"kid": KID})

    user = authenticate_msal(_bearer(token), settings)

    assert user.preferred_username == "guest@partner.com"


# ---------------------------------------------------------------------------
# Failure paths
# ---------------------------------------------------------------------------


def test_expired_jwt_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem, expires_in_s=-60)

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


def test_audience_mismatch_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem, audience="wrong-audience")

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401
    assert "claims invalid" in exc.value.detail.lower()


def test_issuer_mismatch_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem, issuer="https://attacker.example.com/v2.0")

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401
    assert "claims invalid" in exc.value.detail.lower()


def test_missing_kid_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    # Build JWT without kid in header — jose still produces it but the JWKS
    # selector should reject.
    now = int(time.time())
    claims = {
        "aud": CLIENT,
        "iss": ISSUER,
        "iat": now,
        "exp": now + 300,
        "oid": "x",
        "tid": TENANT,
    }
    # Pass an empty headers dict; jose will not include kid.
    token = jwt.encode(claims, private_pem, algorithm="RS256", headers={})

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401


def test_unknown_kid_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem, kid="not-in-jwks")

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401


def test_missing_oid_claim_rejects_401(
    rsa_keypair: tuple[str, str], settings: Settings
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem, oid=None)

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 401
    assert "oid/tid" in exc.value.detail


def test_malformed_jwt_rejects_401(settings: Settings) -> None:
    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer("not-a-jwt"), settings)
    assert exc.value.status_code == 401


def test_missing_credentials_rejects_401(settings: Settings) -> None:
    with pytest.raises(HTTPException) as exc:
        authenticate_msal(None, settings)
    assert exc.value.status_code == 401


def test_jwks_fetch_failure_returns_503(
    rsa_keypair: tuple[str, str],
    settings: Settings,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    private_pem, _ = rsa_keypair
    token = _sign_jwt(private_pem)

    def _boom(uri: str) -> dict[str, Any]:
        raise RuntimeError("network down")

    reset_jwks_cache()
    monkeypatch.setattr(msal_provider, "_fetch_jwks", _boom)

    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer(token), settings)
    assert exc.value.status_code == 503


def test_incomplete_config_returns_503(rsa_keypair: tuple[str, str]) -> None:
    """Settings without azure_tenant_id / azure_client_id fail closed."""
    settings = Settings(feature_auth_mock=False)  # tenant_id + client_id default ""
    with pytest.raises(HTTPException) as exc:
        authenticate_msal(_bearer("any.token.here"), settings)
    assert exc.value.status_code == 503


# ---------------------------------------------------------------------------
# Cache behaviour
# ---------------------------------------------------------------------------


def test_jwks_cache_reused_within_ttl(
    rsa_keypair: tuple[str, str],
    settings: Settings,
    jwks: dict[str, Any],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Two consecutive calls fetch JWKS once."""
    private_pem, _ = rsa_keypair
    fetch_count = {"n": 0}

    def _counting_fetch(uri: str) -> dict[str, Any]:
        fetch_count["n"] += 1
        return jwks

    reset_jwks_cache()
    monkeypatch.setattr(msal_provider, "_fetch_jwks", _counting_fetch)

    token = _sign_jwt(private_pem)
    authenticate_msal(_bearer(token), settings)
    authenticate_msal(_bearer(token), settings)

    assert fetch_count["n"] == 1
