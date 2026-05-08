"""C12 — password hashing + token + validation helpers (W13 D5 F5).

Per ADR-0016: hashlib.scrypt (Python stdlib) replaces argon2-cffi due to R8
corp proxy blocking argon2 pip install. Scrypt is OWASP-approved memory-hard
KDF (Argon2id first choice; scrypt acceptable). Storage format
"scrypt$N$r$p$salt_hex$hash_hex" is forward-compatible with future param
tuning (re-hash on next login if config bumps detected — TODO Beta hardening).

Verification codes are 6-digit numeric (matches V9 wireframe Step 2 UX +
industry-standard OTP). Session tokens are URL-safe random 256-bit.
"""

from __future__ import annotations

import hashlib
import re
import secrets

# OWASP 2023 recommended scrypt params (~128 MB memory cost per verification).
# `maxmem` must be explicitly raised because Python defaults to OpenSSL's 32 MB
# cap which would reject N=2**17. Set ~256 MB headroom for forward param tuning.
_SCRYPT_N = 2**17
_SCRYPT_R = 8
_SCRYPT_P = 1
_SCRYPT_DKLEN = 64
_SCRYPT_MAXMEM = 256 * 1024 * 1024
_SALT_LEN = 16
_HASH_PREFIX = "scrypt"

# Verification + session token constants — used by users_repo + routes.
VERIFICATION_CODE_LENGTH = 6
VERIFICATION_TOKEN_TTL_SEC = 24 * 60 * 60  # 24h
SESSION_TOKEN_TTL_SEC = 7 * 24 * 60 * 60  # 7d
SESSION_TOKEN_BYTES = 32  # 256-bit
RESEND_COOLDOWN_SEC = 60  # F4.4 + F4.8 + plan §F5.3

PASSWORD_MIN_LENGTH = 8
_PASSWORD_SYMBOLS = "!@#$%^&*"
_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def hash_password(password: str) -> str:
    """Hash password via scrypt. Output format: scrypt$N$r$p$salt_hex$hash_hex."""
    salt = secrets.token_bytes(_SALT_LEN)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        maxmem=_SCRYPT_MAXMEM,
        dklen=_SCRYPT_DKLEN,
    )
    return f"{_HASH_PREFIX}${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${derived.hex()}"


def verify_password(password: str, stored: str) -> bool:
    """Constant-time compare against stored hash. False on any decode error."""
    parts = stored.split("$")
    if len(parts) != 6 or parts[0] != _HASH_PREFIX:
        return False
    try:
        n, r, p = int(parts[1]), int(parts[2]), int(parts[3])
        salt = bytes.fromhex(parts[4])
        expected = bytes.fromhex(parts[5])
    except (ValueError, TypeError):
        return False
    try:
        derived = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            maxmem=_SCRYPT_MAXMEM,
            dklen=len(expected),
        )
    except (ValueError, OverflowError):
        return False
    return secrets.compare_digest(derived, expected)


def generate_verification_code() -> str:
    """6-digit numeric code (000000-999999) — matches V9 Step 2 wireframe UX."""
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_session_token() -> str:
    """URL-safe 256-bit random token for self-register session bearer."""
    return secrets.token_urlsafe(SESSION_TOKEN_BYTES)


def generate_user_oid() -> str:
    """Stable principal id with `u-` prefix for human readability in logs."""
    return f"u-{secrets.token_urlsafe(12)}"


def validate_email(email: str) -> bool:
    """RFC-light email format check — sufficient for Tier 1 self-register."""
    return bool(_EMAIL_PATTERN.match(email))


def validate_password_strength(password: str) -> str | None:
    """Return None if valid; else error message matching V9 Step 1 client rules.

    Rules (parallel to frontend `validateAccountInfo`): min 8 chars + uppercase
    letter + (digit OR symbol from _PASSWORD_SYMBOLS).
    """
    if len(password) < PASSWORD_MIN_LENGTH:
        return f"Password must be at least {PASSWORD_MIN_LENGTH} characters."
    if not any(c.isupper() for c in password):
        return "Password must include an uppercase letter."
    if not any(c.isdigit() or c in _PASSWORD_SYMBOLS for c in password):
        return "Password must include a digit or symbol."
    return None
