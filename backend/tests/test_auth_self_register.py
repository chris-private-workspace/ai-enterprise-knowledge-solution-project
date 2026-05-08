"""W13 D5 F5 — self-register hybrid auth backend cascade tests.

Coverage matrix (per plan F5.7 ≥80% target):
- security helpers: scrypt hash round-trip + verify mismatch + corrupted hash +
  validators (email + password strength) + token generators
- users_repo: register dup-check + find by email/oid + regenerate_verification_code
  + mark_verified idempotency + create_session + resolve_session expiry/missing-user
  + revoke_session
- POST /auth/register: happy + 409 duplicate + 422 invalid email + 422 weak
  password + 422 empty display_name
- POST /auth/verify-email: happy + idempotent already-verified + 401 wrong
  code + 401 expired + 401 unknown email + 401 malformed code
- POST /auth/login: happy + 401 wrong password + 401 unknown email + 403 unverified
- POST /auth/resend-verification: happy + 429 cooldown + already-verified silent
- dependency: session token resolves to AuthenticatedUser; mock fall-through preserved
- POST /auth/logout: revokes self-register session

Tests use a fresh FastAPI sub-app per fixture so module-level dependency
overrides do not leak across files (parallel to test_auth_routes.py pattern).
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from api.auth import users_repo
from api.auth.dependency import get_current_user
from api.auth.email_provider import EmailProvider, get_email_provider
from api.auth.models import AuthenticatedUser
from api.auth.security import (
    RESEND_COOLDOWN_SEC,
    SESSION_TOKEN_TTL_SEC,
    VERIFICATION_CODE_LENGTH,
    generate_session_token,
    generate_user_oid,
    generate_verification_code,
    hash_password,
    validate_email,
    validate_password_strength,
    verify_password,
)
from api.auth.users_repo import SELF_REGISTER_TID
from api.error_handlers import register_error_handlers
from api.routes.auth import router as auth_router
from storage.settings import Settings, get_settings

_VALID_PASSWORD = "Aa1secret!"
_VALID_DISPLAY = "Alice"


class CapturingEmailProvider:
    """Test double — records every send_verification call so assertions can
    reach the verification code without mucking with module-private repo state."""

    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    async def send_verification(
        self, *, to_email: str, code: str, display_name: str
    ) -> None:
        self.sent.append(
            {"to_email": to_email, "code": code, "display_name": display_name}
        )

    @property
    def last_code(self) -> str:
        assert self.sent, "no verification email sent"
        return self.sent[-1]["code"]


@pytest.fixture
def email_capture() -> CapturingEmailProvider:
    return CapturingEmailProvider()


@pytest.fixture
def app(email_capture: CapturingEmailProvider) -> Iterator[FastAPI]:
    users_repo.reset_repo()
    instance = FastAPI()
    register_error_handlers(instance)
    settings = Settings(feature_auth_mock=True)
    instance.dependency_overrides[get_settings] = lambda: settings
    instance.dependency_overrides[get_email_provider] = lambda: email_capture
    instance.include_router(auth_router)

    @instance.get("/protected")
    def _protected(user: AuthenticatedUser = Depends(get_current_user)) -> dict[str, Any]:  # noqa: B008
        return {"oid": user.oid, "tid": user.tid, "is_mock": user.is_mock}

    yield instance
    users_repo.reset_repo()


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    return TestClient(app)


def _register(client: TestClient, email: str = "alice@example.com") -> dict[str, Any]:
    response = client.post(
        "/auth/register",
        json={"email": email, "password": _VALID_PASSWORD, "display_name": _VALID_DISPLAY},
    )
    assert response.status_code == 201, response.text
    return response.json()


# --- security helpers --------------------------------------------------------


def test_hash_password_round_trip() -> None:
    stored = hash_password("Aa1secret!")
    assert stored.startswith("scrypt$")
    assert verify_password("Aa1secret!", stored) is True
    assert verify_password("wrong", stored) is False


def test_hash_password_different_salts() -> None:
    """Same password hashed twice produces different output (salting works)."""
    a = hash_password("Aa1secret!")
    b = hash_password("Aa1secret!")
    assert a != b
    assert verify_password("Aa1secret!", a) is True
    assert verify_password("Aa1secret!", b) is True


def test_verify_password_rejects_corrupted_format() -> None:
    assert verify_password("anything", "not-scrypt-hash") is False
    assert verify_password("anything", "scrypt$bad$1$1$xx$yy") is False
    assert verify_password("anything", "scrypt$1$1$1$nothex$alsonothex") is False


def test_validate_email_accepts_basic_shape() -> None:
    assert validate_email("alice@example.com") is True
    assert validate_email("user.name+tag@sub.example.co.uk") is True


def test_validate_email_rejects_malformed() -> None:
    assert validate_email("plainaddress") is False
    assert validate_email("@example.com") is False
    assert validate_email("alice@") is False
    assert validate_email("alice@no-tld") is False


def test_validate_password_strength_rules() -> None:
    assert validate_password_strength("short") is not None
    assert validate_password_strength("alllowercase1") is not None  # missing uppercase
    assert validate_password_strength("NoNumbersHere") is not None  # no digit/symbol
    assert validate_password_strength("Aa1secret!") is None
    assert validate_password_strength("Strong1Password") is None


def test_token_generators_shapes() -> None:
    code = generate_verification_code()
    assert len(code) == VERIFICATION_CODE_LENGTH
    assert code.isdigit()
    session = generate_session_token()
    assert len(session) >= 40  # token_urlsafe(32) ≈ 43 chars
    oid = generate_user_oid()
    assert oid.startswith("u-")
    # uniqueness sanity (collisions vanishingly rare)
    assert generate_session_token() != session


# --- users_repo --------------------------------------------------------------


def test_register_creates_user_and_verification_code() -> None:
    users_repo.reset_repo()
    record = users_repo.register(
        email="alice@example.com", password=_VALID_PASSWORD, display_name=_VALID_DISPLAY
    )
    assert record.email == "alice@example.com"
    assert record.verified is False
    assert record.verification_code is not None
    assert record.verification_code_expires_at is not None
    assert record.verification_code_expires_at > datetime.now(UTC)
    assert record.password_hash != _VALID_PASSWORD


def test_register_normalises_and_rejects_dup() -> None:
    users_repo.reset_repo()
    users_repo.register(email="ALICE@example.com", password=_VALID_PASSWORD, display_name="A")
    with pytest.raises(ValueError):
        users_repo.register(email="alice@example.com", password=_VALID_PASSWORD, display_name="A")


def test_find_by_email_and_oid() -> None:
    users_repo.reset_repo()
    record = users_repo.register(
        email="bob@example.com", password=_VALID_PASSWORD, display_name="Bob"
    )
    assert users_repo.find_by_email("bob@example.com") == record
    assert users_repo.find_by_email("BOB@example.com") == record  # case-insensitive
    assert users_repo.find_by_email("none@example.com") is None
    assert users_repo.find_by_oid(record.oid) == record
    assert users_repo.find_by_oid("u-missing") is None


def test_regenerate_verification_code() -> None:
    users_repo.reset_repo()
    record = users_repo.register(
        email="c@example.com", password=_VALID_PASSWORD, display_name="C"
    )
    original_code = record.verification_code
    refreshed = users_repo.regenerate_verification_code(record.oid)
    assert refreshed is not None
    assert refreshed.verification_code != original_code  # extremely unlikely collision
    assert refreshed.last_resend_at is not None


def test_regenerate_returns_none_on_unknown_or_verified() -> None:
    users_repo.reset_repo()
    assert users_repo.regenerate_verification_code("u-missing") is None
    record = users_repo.register(
        email="d@example.com", password=_VALID_PASSWORD, display_name="D"
    )
    users_repo.mark_verified(record.oid)
    assert users_repo.regenerate_verification_code(record.oid) is None


def test_mark_verified_idempotent() -> None:
    users_repo.reset_repo()
    assert users_repo.mark_verified("u-missing") is None
    record = users_repo.register(
        email="e@example.com", password=_VALID_PASSWORD, display_name="E"
    )
    first = users_repo.mark_verified(record.oid)
    assert first is not None
    assert first.verified is True
    assert first.verification_code is None
    second = users_repo.mark_verified(record.oid)
    assert second is not None
    assert second.verified is True


def test_session_create_and_resolve() -> None:
    users_repo.reset_repo()
    record = users_repo.register(
        email="f@example.com", password=_VALID_PASSWORD, display_name="F"
    )
    session = users_repo.create_session(record.oid)
    assert session.user_oid == record.oid
    resolved = users_repo.resolve_session(session.token)
    assert resolved is not None
    assert resolved.oid == record.oid
    assert resolved.tid == SELF_REGISTER_TID
    assert resolved.is_mock is False


def test_session_resolve_missing_or_expired() -> None:
    users_repo.reset_repo()
    assert users_repo.resolve_session("not-a-real-token") is None

    record = users_repo.register(
        email="g@example.com", password=_VALID_PASSWORD, display_name="G"
    )
    session = users_repo.create_session(record.oid)
    # Force expiry to past — direct dict mutation since this is a test fixture.
    expired = session.model_copy(update={"expires_at": datetime.now(UTC) - timedelta(seconds=1)})
    users_repo._sessions[session.token] = expired  # noqa: SLF001 — test-only direct write
    assert users_repo.resolve_session(session.token) is None


def test_session_resolve_returns_none_when_user_dropped() -> None:
    """Defensive: if the user record is gone (admin delete) but session lingers,
    resolve_session should NOT crash + NOT return a stale identity."""
    users_repo.reset_repo()
    record = users_repo.register(
        email="h@example.com", password=_VALID_PASSWORD, display_name="H"
    )
    session = users_repo.create_session(record.oid)
    del users_repo._users[record.oid]  # noqa: SLF001 — simulate admin delete
    assert users_repo.resolve_session(session.token) is None


def test_revoke_session() -> None:
    users_repo.reset_repo()
    record = users_repo.register(
        email="i@example.com", password=_VALID_PASSWORD, display_name="I"
    )
    session = users_repo.create_session(record.oid)
    assert users_repo.revoke_session(session.token) is True
    assert users_repo.revoke_session(session.token) is False
    assert users_repo.resolve_session(session.token) is None


# --- POST /auth/register -----------------------------------------------------


def test_register_happy_path(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    body = _register(client)
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["verified"] is False
    assert "password" not in body["user"]  # never serialise hash
    assert len(email_capture.sent) == 1
    assert email_capture.sent[0]["to_email"] == "alice@example.com"
    assert len(email_capture.last_code) == VERIFICATION_CODE_LENGTH


def test_register_rejects_duplicate(client: TestClient) -> None:
    _register(client)
    response = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": _VALID_PASSWORD, "display_name": _VALID_DISPLAY},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "auth.email_already_exists"


def test_register_rejects_invalid_email(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "not-an-email", "password": _VALID_PASSWORD, "display_name": _VALID_DISPLAY},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation.invalid_email"


def test_register_rejects_weak_password(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "z@example.com", "password": "weak", "display_name": _VALID_DISPLAY},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation.weak_password"


def test_register_rejects_empty_display_name(client: TestClient) -> None:
    response = client.post(
        "/auth/register",
        json={"email": "z@example.com", "password": _VALID_PASSWORD, "display_name": "  "},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation.invalid_payload"


# --- POST /auth/verify-email -------------------------------------------------


def test_verify_email_happy_path(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    _register(client)
    response = client.post(
        "/auth/verify-email",
        json={"email": "alice@example.com", "code": email_capture.last_code},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["verified"] is True


def test_verify_email_idempotent_on_already_verified(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    _register(client)
    code = email_capture.last_code
    client.post("/auth/verify-email", json={"email": "alice@example.com", "code": code})
    # Second call returns 200 + verified=True (idempotent).
    response = client.post(
        "/auth/verify-email",
        json={"email": "alice@example.com", "code": code},
    )
    assert response.status_code == 200
    assert response.json()["user"]["verified"] is True


def test_verify_email_rejects_wrong_code(client: TestClient) -> None:
    _register(client)
    response = client.post(
        "/auth/verify-email",
        json={"email": "alice@example.com", "code": "000000"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.verification_failed"


def test_verify_email_rejects_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/auth/verify-email",
        json={"email": "nobody@example.com", "code": "123456"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.verification_failed"


def test_verify_email_rejects_malformed_code(client: TestClient) -> None:
    _register(client)
    for bad_code in ("abc123", "1234", "1234567"):
        response = client.post(
            "/auth/verify-email",
            json={"email": "alice@example.com", "code": bad_code},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "auth.verification_failed"


def test_verify_email_rejects_expired_code(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    body = _register(client)
    oid = body["user"]["oid"]
    record = users_repo.find_by_oid(oid)
    assert record is not None
    # Force expiry to past via direct dict mutation (fixture-style only).
    users_repo._users[oid] = record.model_copy(  # noqa: SLF001
        update={"verification_code_expires_at": datetime.now(UTC) - timedelta(seconds=1)}
    )
    response = client.post(
        "/auth/verify-email",
        json={"email": "alice@example.com", "code": email_capture.last_code},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.verification_expired"


# --- POST /auth/login --------------------------------------------------------


def _verified_register(
    client: TestClient, email_capture: CapturingEmailProvider, email: str = "alice@example.com"
) -> str:
    _register(client, email=email)
    code = email_capture.last_code
    client.post("/auth/verify-email", json={"email": email, "code": code})
    return email


def test_login_happy_path(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    email = _verified_register(client, email_capture)
    response = client.post(
        "/auth/login", json={"email": email, "password": _VALID_PASSWORD}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] == SESSION_TOKEN_TTL_SEC
    assert body["user"]["verified"] is True
    assert len(body["access_token"]) >= 40


def test_login_rejects_wrong_password(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    email = _verified_register(client, email_capture)
    response = client.post(
        "/auth/login", json={"email": email, "password": "Wrong!1aaa"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.invalid_credentials"


def test_login_rejects_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/auth/login", json={"email": "ghost@example.com", "password": _VALID_PASSWORD}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "auth.invalid_credentials"


def test_login_rejects_unverified_email(client: TestClient) -> None:
    _register(client)
    response = client.post(
        "/auth/login", json={"email": "alice@example.com", "password": _VALID_PASSWORD}
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "auth.email_not_verified"


# --- POST /auth/resend-verification ------------------------------------------


def test_resend_verification_happy_path(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    _register(client)
    user = users_repo.find_by_email("alice@example.com")
    assert user is not None
    # Bypass cooldown by bumping last_resend_at into the past.
    users_repo._users[user.oid] = user.model_copy(  # noqa: SLF001
        update={"last_resend_at": datetime.now(UTC) - timedelta(seconds=RESEND_COOLDOWN_SEC + 1)}
    )
    initial_emails = len(email_capture.sent)
    response = client.post(
        "/auth/resend-verification", json={"email": "alice@example.com"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["cooldown_seconds"] == RESEND_COOLDOWN_SEC
    assert len(email_capture.sent) == initial_emails + 1


def test_resend_verification_rate_limited(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    _register(client)
    response = client.post(
        "/auth/resend-verification", json={"email": "alice@example.com"}
    )
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "auth.resend_rate_limited"


def test_resend_verification_silent_on_unknown_or_verified(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    """No info leak — returns 200 OK regardless to avoid email enumeration."""
    response = client.post(
        "/auth/resend-verification", json={"email": "ghost@example.com"}
    )
    assert response.status_code == 200

    _verified_register(client, email_capture, email="bob@example.com")
    response = client.post(
        "/auth/resend-verification", json={"email": "bob@example.com"}
    )
    assert response.status_code == 200


# --- dependency session branch -----------------------------------------------


def test_protected_route_accepts_session_token(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    """Session token issued by /auth/login resolves through the W13 F5.6
    branch in dependency.get_current_user — proves AuthenticatedUser shape parity."""
    email = _verified_register(client, email_capture)
    login = client.post(
        "/auth/login", json={"email": email, "password": _VALID_PASSWORD}
    )
    token = login.json()["access_token"]
    response = client.get(
        "/protected", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["tid"] == SELF_REGISTER_TID
    assert body["is_mock"] is False
    assert body["oid"] == login.json()["user"]["oid"]


def test_protected_route_mock_path_preserved_alongside_session(
    app: FastAPI, email_capture: CapturingEmailProvider
) -> None:
    """W7 baseline regression: mock bearer token still works after F5 lands."""
    settings = Settings(feature_auth_mock=True)
    app.dependency_overrides[get_settings] = lambda: settings
    client = TestClient(app)
    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {settings.auth_mock_bearer_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_mock"] is True


def test_protected_route_rejects_unknown_bearer(client: TestClient) -> None:
    """Unknown bearer fails session lookup AND mock token check → 401."""
    response = client.get(
        "/protected", headers={"Authorization": "Bearer not-a-real-session-token"}
    )
    assert response.status_code == 401


# --- email_provider stub -----------------------------------------------------


@pytest.mark.asyncio
async def test_console_email_provider_logs_without_raising() -> None:
    """Default Tier 1 stub must accept a send_verification call cleanly so /auth/
    register stays green even when no test override is wired (production path)."""
    from api.auth.email_provider import ConsoleEmailProvider

    provider = ConsoleEmailProvider()
    await provider.send_verification(
        to_email="t@example.com", code="123456", display_name="T"
    )  # no raise


def test_get_email_provider_returns_default_console() -> None:
    from api.auth.email_provider import ConsoleEmailProvider, get_email_provider

    assert isinstance(get_email_provider(), ConsoleEmailProvider)


# --- POST /auth/logout (session revoke) --------------------------------------


def test_logout_revokes_session_token(
    client: TestClient, email_capture: CapturingEmailProvider
) -> None:
    email = _verified_register(client, email_capture)
    login = client.post(
        "/auth/login", json={"email": email, "password": _VALID_PASSWORD}
    )
    token = login.json()["access_token"]

    # Logout with the session bearer
    logout = client.post(
        "/auth/logout", headers={"Authorization": f"Bearer {token}"}
    )
    assert logout.status_code == 200

    # Subsequent /protected with the same token now misses session lookup
    # AND fails mock bearer check → 401.
    response = client.get(
        "/protected", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401
