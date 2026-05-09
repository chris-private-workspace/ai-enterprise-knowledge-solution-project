"""C13 — Email Verification Service (W13 D5 F5 stub + F6 ACS integration).

Two providers behind the same `EmailProvider` Protocol:

* `ConsoleEmailProvider` (default Tier 1) — logs the verification code so the
  dev path works without ACS resource provisioned (parallel to W7 D1 F1.2.1
  mock-auth pattern + R8 corp-proxy graceful path). Active when
  `feature_email_mock=True` OR `acs_connection_string` is empty.

* `AcsEmailProvider` (W13 F6 production / Beta) — wraps `azure-communication-
  email` SDK with tenacity retry on 5xx + fail-soft semantics so the register
  flow stays green when ACS is degraded (V9 Step 2 surfaces "Check your inbox"
  + Resend Button regardless of underlying delivery state). The SDK import is
  lazy so the module loads even when the package is not installed (R8 corp-
  proxy install blocker — same constraint that drove ADR-0016 for argon2-cffi).

Factory `get_email_provider()` selects based on Settings; FastAPI Depends caches
per-request, and tests can override via `app.dependency_overrides` (parallel to
the F5 CapturingEmailProvider test double).
"""

from __future__ import annotations

import asyncio
from typing import Any, Protocol

import structlog
from tenacity import (
    AsyncRetrying,
    RetryError,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from storage.settings import Settings, get_settings

_log = structlog.get_logger(__name__)


class EmailSendError(Exception):
    """Raised when email delivery fails permanently after retry exhaustion or
    when the ACS SDK is not installed in this environment."""


class EmailProvider(Protocol):
    """Contract honoured by both ConsoleEmailProvider and AcsEmailProvider."""

    async def send_verification(
        self, *, to_email: str, code: str, display_name: str
    ) -> None: ...


# --- email templates (F6.2 — plain text + HTML; no template engine Tier 1) ---

_SUBJECT = "Your EKP verification code"

_PLAIN_TEMPLATE = """\
Hi {display_name},

Your Enterprise Knowledge Platform verification code is:

    {code}

This code expires in 24 hours. If you didn't request an EKP account, you can
safely ignore this email.

— The EKP Team
"""

_HTML_TEMPLATE = """\
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; line-height: 1.5; color: #181818; max-width: 480px; margin: 32px auto; padding: 0 16px;">
  <h2 style="font-weight: 600; margin-bottom: 16px;">Hi {display_name},</h2>
  <p>Your Enterprise Knowledge Platform verification code is:</p>
  <p style="font-size: 28px; letter-spacing: 4px; font-family: 'JetBrains Mono', ui-monospace, monospace; padding: 16px 24px; background: #F4F4F4; border-radius: 8px; display: inline-block; margin: 16px 0;"><strong>{code}</strong></p>
  <p style="color: #737373; font-size: 14px;">This code expires in 24 hours. If you didn't request an EKP account, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #E8E8E8; margin: 24px 0;" />
  <p style="color: #737373; font-size: 12px;">— The EKP Team</p>
</body>
</html>
"""


def render_plain_text(*, display_name: str, code: str) -> str:
    return _PLAIN_TEMPLATE.format(display_name=display_name, code=code)


def render_html(*, display_name: str, code: str) -> str:
    return _HTML_TEMPLATE.format(display_name=display_name, code=code)


# --- Console provider (Tier 1 dev / mock fallback) ---------------------------


class ConsoleEmailProvider:
    """Default Tier 1 stub — logs verification code to backend logs.

    Active when `feature_email_mock=True` OR `acs_connection_string` empty.
    Per F6.5 mock mode design intent — production ACS path falls back to this
    behaviour even after F6 lands, when env explicitly enables mock mode.
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


# --- ACS provider (W13 F6 production / Beta) ---------------------------------


# Tenacity treats Exception by default; we narrow to "transient" errors so 4xx
# config bugs don't burn retries. Real ACS exceptions live under azure.core
# but importing them eagerly defeats the lazy-load design — caller maps generic
# exception types here.
_TRANSIENT_EXCEPTION_TYPES: tuple[type[BaseException], ...] = (
    OSError,  # network / DNS / connection refused
    asyncio.TimeoutError,
    TimeoutError,
)


class AcsEmailProvider:
    """Real ACS Email Client wrapper (Azure Communication Services per Q22).

    Lazy SDK import — the `azure.communication.email` package is loaded only
    when this class is instantiated, so the module can be imported in
    environments where the SDK isn't installed yet (R8 corp-proxy). Construction
    raises `EmailSendError` with an actionable message when the SDK is missing.

    Sync SDK is wrapped via `asyncio.to_thread` so the FastAPI event loop is
    not blocked. Tenacity retries transient OSError / TimeoutError up to
    `max_retries` attempts with exponential backoff.
    """

    def __init__(
        self,
        *,
        connection_string: str,
        sender_address: str,
        timeout_s: float = 30.0,
        max_retries: int = 3,
    ) -> None:
        try:
            from azure.communication.email import EmailClient
        except ImportError as exc:  # pragma: no cover — exercised via mocked import in tests
            raise EmailSendError(
                "azure-communication-email is not installed. Install it via "
                "`pip install azure-communication-email` OR set "
                "FEATURE_EMAIL_MOCK=true to fall back to ConsoleEmailProvider."
            ) from exc

        self._client: Any = EmailClient.from_connection_string(connection_string)
        self._sender = sender_address
        self._timeout_s = timeout_s
        self._max_retries = max_retries

    async def send_verification(
        self, *, to_email: str, code: str, display_name: str
    ) -> None:
        message = {
            "senderAddress": self._sender,
            "recipients": {
                "to": [{"address": to_email, "displayName": display_name}],
            },
            "content": {
                "subject": _SUBJECT,
                "plainText": render_plain_text(display_name=display_name, code=code),
                "html": render_html(display_name=display_name, code=code),
            },
        }

        def _send_sync() -> None:
            poller = self._client.begin_send(message)
            poller.result(timeout=self._timeout_s)

        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(self._max_retries),
                wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
                retry=retry_if_exception_type(_TRANSIENT_EXCEPTION_TYPES),
                reraise=True,
            ):
                with attempt:
                    await asyncio.to_thread(_send_sync)
        except RetryError as exc:
            raise EmailSendError(
                f"ACS verification email send failed after {self._max_retries} attempts"
            ) from exc
        except Exception as exc:
            # Non-transient (4xx / config) — surface immediately, no retry.
            raise EmailSendError(f"ACS verification email send failed: {exc}") from exc

        _log.info(
            "verification_email_sent",
            provider="acs",
            to_email=to_email,
            display_name=display_name,
            sender_address=self._sender,
        )


# --- factory + singleton -----------------------------------------------------


_provider_instance: EmailProvider | None = None


def _build_provider_from_settings(settings: Settings) -> EmailProvider:
    """Pure factory — picks ConsoleEmailProvider OR AcsEmailProvider based on
    the same `feature_email_mock` flag the Auth Provider uses for mock vs MSAL.

    Defensive `acs_connection_string` empty-string check so a misconfigured Beta
    deploy degrades to logging instead of 5xx-ing every register/resend call.
    """
    if settings.feature_email_mock or not settings.acs_connection_string.strip():
        _log.info(
            "email_provider_init",
            mode="console",
            reason="feature_email_mock_or_empty_connection_string",
        )
        return ConsoleEmailProvider()
    _log.info(
        "email_provider_init",
        mode="acs",
        sender_address=settings.acs_sender_address,
    )
    return AcsEmailProvider(
        connection_string=settings.acs_connection_string,
        sender_address=settings.acs_sender_address,
        timeout_s=settings.acs_request_timeout_s,
        max_retries=settings.acs_max_retries,
    )


def get_email_provider() -> EmailProvider:
    """FastAPI Depends factory — overridable via app.dependency_overrides.

    Singleton across requests so AcsEmailProvider's underlying EmailClient (HTTP
    client + auth state) is reused. Tests reset via `reset_provider_for_tests`.
    """
    global _provider_instance
    if _provider_instance is None:
        _provider_instance = _build_provider_from_settings(get_settings())
    return _provider_instance


def reset_provider_for_tests() -> None:
    """Drop the cached singleton — call between tests that swap settings."""
    global _provider_instance
    _provider_instance = None
