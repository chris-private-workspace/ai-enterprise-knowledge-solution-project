"""Audit log entry schema (W24-wave-c1 F4.8 per ADR-0026 forward-compat retention).

`audit_log` Postgres table is **additive** in Tier 1 — F2 PATCH/test/rotate +
F3 PATCH + F4 PATCH alert-threshold write rows. Read endpoint
(`GET /admin/audit-log`) is Wave C2 / F5 SettingsAccount surface; Tier 1
ships write-only so the retention history exists when the UI lands.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

AuditAction = Literal[
    # F2 admin_provider_configs
    "connection_patch",
    "connection_test",
    "connection_rotate_secret",
    # F3 admin_identity_config
    "identity_patch",
    # F4 admin_api_keys
    "api_keys_alert_threshold_patch",
    # W24c F4 — RBAC user management (per ADR-0027); W24c F7 adds the kb.* actions.
    "user.invited",
    "user.suspended",
    "role.changed",
]


class AuditLogEntry(BaseModel):
    """One audit log row. Stored in Postgres with id auto-incremented."""

    id: int | None = Field(default=None, description="Auto-assigned by Postgres SERIAL on insert.")
    actor: str | None = Field(
        default=None,
        description=(
            "User email / principal who triggered the action. None for system actions. "
            "Wave C2 promotes when ADR-0027 wires actor extraction at middleware level."
        ),
    )
    action: AuditAction
    resource: str = Field(
        ...,
        description="The mutated entity, e.g. 'admin_provider_configs/azure_openai' or 'admin_identity_config/tenant'.",
    )
    payload: dict[str, object] | None = Field(
        default=None,
        description=(
            "Sanitized PATCH diff. Secret values NEVER included — only kv_ref names. "
            "F2 rotate-secret writes {'kv_ref': ..., 'masked_preview': '***xY1z'}."
        ),
    )
    created_at: datetime


class AuditLogPage(BaseModel):
    """One page of audit log entries + the cursor for the next (older) page.

    Wave C2 (W24b F6) wraps the former bare-list `GET /admin/audit-log`
    response so the SettingsAccount surface can drive cursor pagination.
    """

    entries: list[AuditLogEntry]
    next_cursor: int | None = Field(
        default=None,
        description=(
            "The `id` of the oldest row on this page when more rows exist — "
            "pass it back as `cursor` to fetch the next older page. "
            "None means this is the last page."
        ),
    )
