"""C07 — W7 D3 F3 audit log middleware.

Tags every request with `request_id` + `user_id` + `tenant_id` + `audit_action`
through structlog (JSON renderer wired by `observability.langfuse_tracer`).
The audit pipeline correlates downstream into Langfuse trace tags W3+ when
the SDK is wired.

F3.3 redaction policy (CLAUDE.md §5.5 H5): never log full request body / full
prompt payload to plaintext file. Only log:
  - request_id (uuid4)
  - user_id (mock or real `oid`)
  - tenant_id (mock or real `tid`)
  - audit_action (HTTP METHOD + path)
  - status_code
  - duration_ms
NEVER:
  - request body bytes
  - response body bytes
  - Authorization header value
  - Any header containing "secret" / "key" / "token" suffix

Karpathy §1.2 simplicity-first: BaseHTTPMiddleware single class, no external
dependency. structlog already configured by lifespan init_tracer.
"""

from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable, Iterable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from api.auth.mock_msal import authenticate_mock
from api.auth.msal_provider import authenticate_msal
from storage.settings import Settings

_logger = structlog.get_logger("ekp.audit")

REQUEST_ID_HEADER = "X-Request-ID"


def _parse_bearer(request: Request) -> str | None:
    auth = request.headers.get("Authorization")
    if not auth:
        return None
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _identity_for_audit(
    request: Request, settings: Settings
) -> tuple[str | None, str | None]:
    """Return (user_id, tenant_id) — both None when caller is unauthenticated.

    Reuses authenticate_{mock,msal} so audit identity matches F1.3 + F2 keys.
    Validation failure → (None, None) so the audit log still emits a row even
    for unauth requests (auth Depends produces the 401, but the audit trail
    needs to record attempted access).
    """
    from fastapi import HTTPException
    from fastapi.security import HTTPAuthorizationCredentials

    token = _parse_bearer(request)
    creds = (
        HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        if token
        else None
    )
    try:
        if settings.feature_auth_mock:
            user = authenticate_mock(creds, settings)
        else:
            user = authenticate_msal(creds, settings)
        return user.oid, user.tid
    except HTTPException:
        return None, None


class AuditLogMiddleware(BaseHTTPMiddleware):
    """Emit a redacted structured audit event for every request."""

    def __init__(
        self,
        app,
        *,
        settings: Settings,
        protected_prefixes: Iterable[str] | None = None,
    ) -> None:
        super().__init__(app)
        self._settings = settings
        # Default = audit *every* path so unauth probe attempts are captured
        # too. Pass an explicit list to scope down (e.g. exclude /health).
        self._prefixes = tuple(protected_prefixes) if protected_prefixes else None

    def _in_scope(self, path: str) -> bool:
        if self._prefixes is None:
            return True
        return any(path == p or path.startswith(f"{p}/") or path.startswith(p) for p in self._prefixes)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not self._in_scope(request.url.path):
            return await call_next(request)

        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id
        user_id, tenant_id = _identity_for_audit(request, self._settings)

        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers[REQUEST_ID_HEADER] = request_id
            return response
        finally:
            duration_ms = int((time.perf_counter() - start) * 1000)
            _logger.info(
                "audit_log",
                request_id=request_id,
                user_id=user_id,
                tenant_id=tenant_id,
                audit_action=f"{request.method} {request.url.path}",
                status_code=status_code,
                duration_ms=duration_ms,
            )
