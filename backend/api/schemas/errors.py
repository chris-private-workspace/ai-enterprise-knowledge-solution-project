"""C08 — W7 D4 F4.1 API error contract schema.

Every endpoint surfaces errors in this shape so the frontend can render a
consistent error boundary (F4.2) without raw stack traces / 5xx leaking
implementation detail.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ApiErrorBody(BaseModel):
    code: str = Field(..., description="Stable machine-readable error code, e.g. 'auth.unauthorized'")
    message: str = Field(..., description="Human-readable message safe to show end users")
    actionable_hint: str | None = Field(
        default=None,
        description="Optional next-step suggestion (e.g. 'Sign in again', 'Retry in 5s')",
    )


class ApiErrorResponse(BaseModel):
    error: ApiErrorBody


# Stable error code constants — referenced from exception handlers + tests +
# E1-E14 mapping doc. Keep alphabetical within each group.
class ErrorCodes:
    # Auth / 401 / 403
    AUTH_UNAUTHORIZED = "auth.unauthorized"
    AUTH_FORBIDDEN = "auth.forbidden"
    # W13 F5 self-register hybrid auth (per ADR-0014)
    AUTH_INVALID_CREDENTIALS = "auth.invalid_credentials"
    AUTH_EMAIL_NOT_VERIFIED = "auth.email_not_verified"
    AUTH_EMAIL_ALREADY_EXISTS = "auth.email_already_exists"
    AUTH_VERIFICATION_FAILED = "auth.verification_failed"
    AUTH_VERIFICATION_EXPIRED = "auth.verification_expired"
    AUTH_RESEND_RATE_LIMITED = "auth.resend_rate_limited"

    # Rate limit / 429
    RATE_LIMIT_EXCEEDED = "rate_limit.exceeded"

    # Validation / 422
    VALIDATION_INVALID_PAYLOAD = "validation.invalid_payload"
    VALIDATION_QUERY_TOO_LONG = "validation.query_too_long"  # E6 architecture.md §7.3
    VALIDATION_INVALID_EMAIL = "validation.invalid_email"
    VALIDATION_WEAK_PASSWORD = "validation.weak_password"

    # Resource / 404 / 409
    RESOURCE_NOT_FOUND = "resource.not_found"
    RESOURCE_CONFLICT = "resource.conflict"

    # Pipeline / 502 / 503 / 504
    PIPELINE_RETRIEVAL_FAILED = "pipeline.retrieval_failed"
    PIPELINE_SYNTHESIS_FAILED = "pipeline.synthesis_failed"
    PIPELINE_LLM_TIMEOUT = "pipeline.llm_timeout"  # E5 architecture.md §7.3
    PIPELINE_RERANKER_OUTAGE = "pipeline.reranker_outage"  # E7 architecture.md §7.3

    # Refusal / 200 (RAG-grounded refusal — query has no relevant content)
    QUERY_NO_RELEVANT_CONTENT = "query.no_relevant_content"  # E1 architecture.md §7.3

    # Generic / 500
    INTERNAL_SERVER_ERROR = "internal.server_error"
