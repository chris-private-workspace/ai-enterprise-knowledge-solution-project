"""User management schemas — /users Members tab (W24c F4 per ADR-0027 Option A).

C16 Users Service. `GET /users` returns the backend-tracked subset of each
user. The mockup `ekp-page-users.jsx` MOCK_USERS carries extra columns
(queries_7d / kbs_owned / last_login / auth source / Entra group) that the
Tier 1 backend does NOT track — per-user query volume needs a query log
(Q6 open), KB ownership needs an ownership model — so they are out of this
response (CLAUDE.md §13: on a data-contract gap, backend wins on field shape).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from api.schemas.rbac import RoleKey

# Display status — 4 states. `pending` is derived: `UserRecord` has no such
# state, it is a user whose email is unverified. `active` / `invited` /
# `suspended` come straight from `UserRecord.status`.
UserDisplayStatus = Literal["active", "pending", "invited", "suspended"]


class UserSummary(BaseModel):
    """One row of the /users Members tab."""

    oid: str
    email: str
    display_name: str
    role: RoleKey
    status: UserDisplayStatus
    created_at: datetime


class UserListResponse(BaseModel):
    """`GET /users` — every workspace member, newest-first.

    No server-side filter: the mockup's filter segment (all / admin / editor /
    user / pending) is a client-side concern (mockup `UsersTab` filters
    `MOCK_USERS` in-component) and Tier 1 member counts are small.
    """

    users: list[UserSummary]
    total: int


class InviteRequest(BaseModel):
    """`POST /users/invite` body — pre-authorise an email + role."""

    email: str = Field(..., min_length=3, description="Invitee email address.")
    role: RoleKey = Field(default="user", description="Role to grant on accept.")
    display_name: str | None = Field(
        default=None,
        description="Optional; defaults to the email local-part when omitted.",
    )


class RoleChangeRequest(BaseModel):
    """`PATCH /users/{oid}/role` body."""

    role: RoleKey
