"""C13 — Email Verification Service (W13 D5 F5 stub; F6 fills with ACS).

Plan F6 owns the real Azure Communication Services integration (per Q22
Resolved 2026-06-10);F5 stub uses a console provider that logs the
verification code so the dev path works without ACS resource provisioned
(parallel to W7 D1 F1.2.1 mock-auth pattern + R8 corp-proxy graceful path).

DI via FastAPI Depends so tests can override with a CapturingEmailProvider
that records sent codes for assertion. F6 will swap the default provider
factory to ACS-backed implementation behind the same Protocol contract.
"""

from __future__ import annotations

from typing import Protocol

import structlog

_log = structlog.get_logger(__name__)


class EmailProvider(Protocol):
    """Contract honoured by both ConsoleEmailProvider (F5) and AcsEmailProvider (F6)."""

    async def send_verification(
        self, *, to_email: str, code: str, display_name: str
    ) -> None: ...


class ConsoleEmailProvider:
    """Default Tier 1 stub — logs verification code to backend logs.

    Per F6.5: this is the mock-mode behaviour the production ACS path will
    fall back to when `FEATURE_EMAIL_MOCK=true` even after F6 lands.
    """

    async def send_verification(
        self, *, to_email: str, code: str, display_name: str
    ) -> None:
        _log.info(
            "verification_email_sent",
            provider="console",
            to_email=to_email,
            display_name=display_name,
            verification_code=code,
        )


_default_provider: EmailProvider = ConsoleEmailProvider()


def get_email_provider() -> EmailProvider:
    """FastAPI Depends factory — overridable via app.dependency_overrides."""
    return _default_provider
