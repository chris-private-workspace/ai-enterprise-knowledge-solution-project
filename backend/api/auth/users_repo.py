"""C12 — in-memory users + sessions repository (W13 D5 F5).

Tier 1 mock backing per plan §F5.1 — single-process FastAPI uvicorn worker. Keys
on email (lowercased) for register lookup; on oid for session resolution. Beta
hardening trigger (W11 retro CO18) → migrate to Postgres / Cosmos DB.

NOT thread-safe across worker processes — Tier 1 single-worker dev/POC scope.
TODO(Beta): asyncio.Lock + persistence + multi-worker shared store.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from threading import RLock

from pydantic import BaseModel, Field

from .models import AuthenticatedUser
from .security import (
    SESSION_TOKEN_TTL_SEC,
    VERIFICATION_TOKEN_TTL_SEC,
    generate_session_token,
    generate_user_oid,
    generate_verification_code,
    hash_password,
)

# Sentinel tenant id for self-register users — distinguishes from real Entra
# ID tenant in audit log + retrieval scope checks.
SELF_REGISTER_TID = "ekp-self-register"


class UserRecord(BaseModel):
    """Internal user record (includes password_hash — NEVER serialize externally)."""

    oid: str
    email: str
    display_name: str
    password_hash: str
    verified: bool = False
    verification_code: str | None = None
    verification_code_expires_at: datetime | None = None
    last_resend_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SessionRecord(BaseModel):
    token: str
    user_oid: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


# Module-level state — Tier 1 in-memory mock per ADR-0014 Consequences Negative
# (internal users table; Beta+ Postgres / Cosmos DB per W11 retro CO18).
_users: dict[str, UserRecord] = {}  # key = oid
_sessions: dict[str, SessionRecord] = {}  # key = session token
_lock = RLock()


def reset_repo() -> None:
    """Test fixture helper — wipes both users + sessions tables."""
    with _lock:
        _users.clear()
        _sessions.clear()


def find_by_email(email: str) -> UserRecord | None:
    target = email.strip().lower()
    with _lock:
        for user in _users.values():
            if user.email == target:
                return user
    return None


def find_by_oid(oid: str) -> UserRecord | None:
    with _lock:
        return _users.get(oid)


def register(*, email: str, password: str, display_name: str) -> UserRecord:
    """Create new user record + initial verification code. Caller must check
    duplicate via find_by_email() first; this raises ValueError on collision
    as a defense-in-depth contract."""
    normalized_email = email.strip().lower()
    with _lock:
        if any(u.email == normalized_email for u in _users.values()):
            raise ValueError(f"email_already_exists: {normalized_email}")
        record = UserRecord(
            oid=generate_user_oid(),
            email=normalized_email,
            display_name=display_name.strip(),
            password_hash=hash_password(password),
            verified=False,
            verification_code=generate_verification_code(),
            verification_code_expires_at=datetime.now(UTC)
            + timedelta(seconds=VERIFICATION_TOKEN_TTL_SEC),
            last_resend_at=datetime.now(UTC),
        )
        _users[record.oid] = record
        return record


def regenerate_verification_code(oid: str) -> UserRecord | None:
    """Mint a fresh code + reset 24h expiry + bump last_resend_at. Returns the
    updated user, or None if oid missing / already verified."""
    with _lock:
        user = _users.get(oid)
        if user is None or user.verified:
            return None
        updated = user.model_copy(
            update={
                "verification_code": generate_verification_code(),
                "verification_code_expires_at": datetime.now(UTC)
                + timedelta(seconds=VERIFICATION_TOKEN_TTL_SEC),
                "last_resend_at": datetime.now(UTC),
            }
        )
        _users[oid] = updated
        return updated


def mark_verified(oid: str) -> UserRecord | None:
    """Clear verification_code + flip verified=True. Idempotent — re-call on
    already-verified user is a no-op returning the existing record."""
    with _lock:
        user = _users.get(oid)
        if user is None:
            return None
        if user.verified:
            return user
        updated = user.model_copy(
            update={
                "verified": True,
                "verification_code": None,
                "verification_code_expires_at": None,
            }
        )
        _users[oid] = updated
        return updated


def create_session(user_oid: str) -> SessionRecord:
    """Mint a new session token tied to user_oid; 7-day expiry per F5.5."""
    with _lock:
        record = SessionRecord(
            token=generate_session_token(),
            user_oid=user_oid,
            expires_at=datetime.now(UTC) + timedelta(seconds=SESSION_TOKEN_TTL_SEC),
        )
        _sessions[record.token] = record
        return record


def resolve_session(token: str) -> AuthenticatedUser | None:
    """Look up active session and project to AuthenticatedUser shape so the
    F1.3 dependency can return the same model as mock/MSAL paths."""
    with _lock:
        session = _sessions.get(token)
        if session is None:
            return None
        if session.expires_at < datetime.now(UTC):
            del _sessions[token]
            return None
        user = _users.get(session.user_oid)
        if user is None:
            return None
        return AuthenticatedUser(
            oid=user.oid,
            tid=SELF_REGISTER_TID,
            preferred_username=user.email,
            is_mock=False,
        )


def revoke_session(token: str) -> bool:
    """Drop session token from the table. Returns True if a session existed."""
    with _lock:
        return _sessions.pop(token, None) is not None
