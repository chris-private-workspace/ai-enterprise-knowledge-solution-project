"""C16 — `/kb/{kb_id}/docs/{doc_id}/acl` per-document ACL endpoints (W92 P3a / ADR-0067 G6).

Mirrors `kb_acl.py` but document-scoped. 4 CRUD endpoints, all gated by the router-level
`require_kb_acl("manage")` — managing a doc's access list requires `manage` on its KB
(workspace admins always pass):
  - GET    /kb/{kb_id}/docs/{doc_id}/acl              — explicit ACL grants on the doc
  - POST   /kb/{kb_id}/docs/{doc_id}/acl              — grant a user/group access
  - PATCH  /kb/{kb_id}/docs/{doc_id}/acl/{entry_id}   — change a grant's role
  - DELETE /kb/{kb_id}/docs/{doc_id}/acl/{entry_id}   — revoke a grant

ADR-0067 replace semantics: once a doc has ANY grant, those principals REPLACE the KB
inheritance for that doc's chunks. Every mutation therefore re-stamps the doc's chunks'
`allowed_principals` in the live index (best-effort — the grant persists regardless, and
the next ingest re-resolves via `resolve_doc_principals`). PATCH / DELETE are scoped by
`(kb_id, doc_id)` so a manager can't reach another doc's grants by guessing the entry id.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status

from api.auth import AuthenticatedUser, get_current_user
from api.middleware.acl import require_kb_acl, resolve_doc_principals
from api.schemas.audit_log import AuditAction
from api.schemas.doc_acl import (
    DocAclEntry,
    DocAclGrantRequest,
    DocAclListResponse,
    DocAclRoleChangeRequest,
)
from kb_management.doc_acl_store import DocAclStore
from storage.audit_log_storage import AuditLogBackend

router = APIRouter(
    tags=["doc-acl"],
    dependencies=[Depends(require_kb_acl("manage"))],
)


def _get_doc_acl_store(request: Request) -> DocAclStore:
    """Resolve the lifespan-wired per-doc ACL store, or 503 when unwired."""
    store = getattr(request.app.state, "doc_acl_store", None)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="doc_acl_store not initialized — check lifespan logs",
        )
    return store  # type: ignore[no-any-return]


async def _restamp_doc(request: Request, kb_id: str, doc_id: str) -> None:
    """Re-stamp the doc's chunks' `allowed_principals` after a doc_acl mutation.

    Best-effort: the doc_acl row is the source of truth (already persisted). A restamp
    miss (Azure down / populator unwired / doc not yet ingested) is logged but never
    fails the ACL write — the next ingest re-resolves via `resolve_doc_principals`. The
    new principal set follows ADR-0067 replace semantics (doc has rows → doc principals;
    no rows → KB inheritance).
    """
    populator = getattr(request.app.state, "index_populator", None)
    if populator is None:
        return  # Azure not configured — grant persists, reindex will stamp later.
    store = getattr(request.app.state, "doc_acl_store", None)
    rbac_backend = getattr(request.app.state, "rbac_backend", None)
    principals = await resolve_doc_principals(store, rbac_backend, kb_id, doc_id)
    try:
        await populator.update_doc_principals(kb_id, doc_id, principals)
    except Exception:  # noqa: BLE001 — restamp is best-effort; grant already persisted
        import structlog

        structlog.get_logger(__name__).warning(
            "doc_acl_restamp_failed", kb_id=kb_id, doc_id=doc_id
        )


async def _audit(
    request: Request,
    *,
    actor: str,
    action: AuditAction,
    resource: str,
    payload: dict[str, object],
) -> None:
    """Write a per-doc ACL mutation to the audit log when a backend is wired."""
    audit: AuditLogBackend | None = getattr(request.app.state, "audit_log_backend", None)
    if audit is not None:
        await audit.append(actor=actor, action=action, resource=resource, payload=payload)


@router.get("/kb/{kb_id}/docs/{doc_id}/acl", response_model=DocAclListResponse)
async def list_doc_acl(
    kb_id: Annotated[str, Path(min_length=1)],
    doc_id: Annotated[str, Path(min_length=1)],
    request: Request,
) -> DocAclListResponse:
    """Every explicit ACL grant on the document."""
    store = _get_doc_acl_store(request)
    entries = await store.list_for_doc(kb_id, doc_id)
    return DocAclListResponse(entries=entries, total=len(entries))


@router.post(
    "/kb/{kb_id}/docs/{doc_id}/acl",
    response_model=DocAclEntry,
    status_code=status.HTTP_201_CREATED,
)
async def grant_doc_access(
    kb_id: Annotated[str, Path(min_length=1)],
    doc_id: Annotated[str, Path(min_length=1)],
    body: DocAclGrantRequest,
    request: Request,
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> DocAclEntry:
    """Grant a user or group access to the document (upserts an existing grant).

    Replaces the doc's KB-inherited ACL with its own once the first grant lands
    (ADR-0067 replace semantics); the doc's chunks are re-stamped accordingly.
    """
    store = _get_doc_acl_store(request)
    entry = await store.add(
        kb_id=kb_id,
        doc_id=doc_id,
        principal_type=body.principal_type,
        principal_id=body.principal_id,
        access_role=body.access_role,
        granted_by=current_user.preferred_username,
    )
    await _restamp_doc(request, kb_id, doc_id)
    await _audit(
        request,
        actor=current_user.preferred_username,
        action="doc.access.granted",
        resource=f"kb/{kb_id}/docs/{doc_id}",
        payload={
            "principal_type": entry.principal_type,
            "principal_id": entry.principal_id,
            "access_role": entry.access_role,
        },
    )
    return entry


@router.patch("/kb/{kb_id}/docs/{doc_id}/acl/{entry_id}", response_model=DocAclEntry)
async def change_doc_acl_role(
    kb_id: Annotated[str, Path(min_length=1)],
    doc_id: Annotated[str, Path(min_length=1)],
    entry_id: Annotated[int, Path(ge=1)],
    body: DocAclRoleChangeRequest,
    request: Request,
) -> DocAclEntry:
    """Change an existing grant's role. (Role rank gates writes; principal set
    unchanged, so no re-stamp needed — kept for symmetry / audit completeness.)"""
    store = _get_doc_acl_store(request)
    entry = await store.set_role(kb_id, doc_id, entry_id, body.access_role)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="acl_entry_not_found")
    return entry


@router.delete(
    "/kb/{kb_id}/docs/{doc_id}/acl/{entry_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def revoke_doc_access(
    kb_id: Annotated[str, Path(min_length=1)],
    doc_id: Annotated[str, Path(min_length=1)],
    entry_id: Annotated[int, Path(ge=1)],
    request: Request,
) -> None:
    """Revoke a grant. Re-stamps the doc (removing the last grant reverts the doc to
    KB inheritance via `resolve_doc_principals`)."""
    store = _get_doc_acl_store(request)
    removed = await store.remove(kb_id, doc_id, entry_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="acl_entry_not_found")
    await _restamp_doc(request, kb_id, doc_id)
