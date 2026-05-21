"""C16 — `/users` Members tab endpoints (W24c F4 per ADR-0027 Option A).

4 endpoints, all admin-gated by the router-level `require_role("admin")`:
  - GET   /users               — list every workspace member (newest-first)
  - POST  /users/invite        — pre-authorise an email + role (status='invited')
  - POST  /users/{oid}/suspend — set status='suspended'
  - PATCH /users/{oid}/role    — change RBAC role

The Members-tab list returns the backend-tracked user subset — the mockup's
analytics columns (queries_7d / kbs_owned / last_login / auth source / Entra
group) are not Tier 1 backend state (CLAUDE.md §13).

Mutations write to the audit log (`user.invited` / `user.suspended` /
`role.changed`) when an audit backend is wired on `app.state`. Power User is
Tier 2 (CLAUDE.md H4) — rejected with 422 on invite + role change.
"""

from __future__ import annotations

from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status

from api.auth import AuthenticatedUser, get_current_user, users_repo
from api.auth.users_store import UserRecord
from api.middleware.acl import require_role
from api.schemas.audit_log import AuditAction
from api.schemas.rbac import RoleKey
from api.schemas.user import (
    InviteRequest,
    RoleChangeRequest,
    UserDisplayStatus,
    UserListResponse,
    UserSummary,
)
from storage.audit_log_storage import AuditLogBackend

router = APIRouter(
    prefix="/users",
    tags=["users"],
    dependencies=[Depends(require_role("admin"))],
)

# Tier 1.5 grantable roles — Power User is Tier 2 (CLAUDE.md H4).
_TIER1_ROLES = {"admin", "editor", "user"}


def _reject_tier2_role(role: str) -> None:
    """Reject a Power User assignment — Tier 2 per CLAUDE.md H4."""
    if role not in _TIER1_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Power User is a Tier 2 role and cannot be assigned (per CLAUDE.md H4).",
        )


def _to_summary(record: UserRecord) -> UserSummary:
    """Project a stored UserRecord onto the Members-tab row shape.

    Derives the display `pending` (email unverified) — `UserRecord.status`
    only stores active / invited / suspended.
    """
    display: UserDisplayStatus
    if record.status == "suspended":
        display = "suspended"
    elif record.status == "invited":
        display = "invited"
    elif not record.verified:
        display = "pending"
    else:
        display = "active"
    return UserSummary(
        oid=record.oid,
        email=record.email,
        display_name=record.display_name,
        role=cast(RoleKey, record.role),
        status=display,
        created_at=record.created_at,
    )


async def _audit(
    request: Request,
    *,
    actor: str,
    action: AuditAction,
    resource: str,
    payload: dict[str, object],
) -> None:
    """Write a Members-tab mutation to the audit log when a backend is wired."""
    audit: AuditLogBackend | None = getattr(
        request.app.state, "audit_log_backend", None
    )
    if audit is not None:
        await audit.append(
            actor=actor, action=action, resource=resource, payload=payload
        )


@router.get("", response_model=UserListResponse)
async def list_all_users() -> UserListResponse:
    """Every workspace member, newest-first. The filter segment is client-side."""
    records = users_repo.list_users()
    return UserListResponse(
        users=[_to_summary(r) for r in records], total=len(records)
    )


@router.post(
    "/invite", response_model=UserSummary, status_code=status.HTTP_201_CREATED
)
async def invite_member(
    body: InviteRequest,
    request: Request,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserSummary:
    """Pre-authorise an email + role. The invite email + accept flow is a
    deferred follow-up — this lands the `status='invited'` record."""
    _reject_tier2_role(body.role)
    try:
        record = users_repo.invite_user(
            email=body.email, role=body.role, display_name=body.display_name
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with that email already exists.",
        ) from exc
    await _audit(
        request,
        actor=current_user.preferred_username,
        action="user.invited",
        resource=f"users/{record.oid}",
        payload={"email": record.email, "role": record.role},
    )
    return _to_summary(record)


@router.post("/{oid}/suspend", response_model=UserSummary)
async def suspend_member(
    oid: Annotated[str, Path(min_length=1)],
    request: Request,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserSummary:
    """Set the member's account status to 'suspended'."""
    record = users_repo.set_user_status(oid, "suspended")
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )
    await _audit(
        request,
        actor=current_user.preferred_username,
        action="user.suspended",
        resource=f"users/{oid}",
        payload={"email": record.email},
    )
    return _to_summary(record)


@router.patch("/{oid}/role", response_model=UserSummary)
async def change_member_role(
    oid: Annotated[str, Path(min_length=1)],
    body: RoleChangeRequest,
    request: Request,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> UserSummary:
    """Change the member's RBAC role (admin / editor / user)."""
    _reject_tier2_role(body.role)
    record = users_repo.set_user_role(oid, body.role)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="user_not_found"
        )
    await _audit(
        request,
        actor=current_user.preferred_username,
        action="role.changed",
        resource=f"users/{oid}",
        payload={"email": record.email, "role": record.role},
    )
    return _to_summary(record)
