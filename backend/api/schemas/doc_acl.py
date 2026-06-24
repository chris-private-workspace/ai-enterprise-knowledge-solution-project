"""Per-document ACL override schemas (W92 P3a / ADR-0067 §Decision 1-2, G6).

Mirrors the per-KB `KbAcl*` schemas (`api/schemas/rbac.py`) but doc-scoped: a grant
targets one document inside a KB. Reuses `KbPrincipalType` / `KbAclRole` (same
user/group + manage/edit/query vocabulary). With ADR-0067 replace semantics, a doc
that has ANY doc_acl row is authoritative for its own `allowed_principals` (it no
longer inherits the KB's ACL); a doc with no rows inherits the KB (P2 behaviour).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from api.schemas.rbac import KbAclRole, KbPrincipalType


class DocAclEntry(BaseModel):
    """One explicit per-document access grant. Mirrors a `document_acls` table row."""

    id: int
    kb_id: str
    doc_id: str
    principal_type: KbPrincipalType
    principal_id: str = Field(..., description="User oid or group key.")
    access_role: KbAclRole
    granted_by: str | None = Field(
        default=None, description="Actor who created the grant; None for legacy rows."
    )
    created_at: datetime


class DocAclListResponse(BaseModel):
    """`GET /kb/{kb_id}/docs/{doc_id}/acl` payload — the doc's explicit ACL grants."""

    entries: list[DocAclEntry]
    total: int


class DocAclGrantRequest(BaseModel):
    """`POST /kb/{kb_id}/docs/{doc_id}/acl` body — grant a principal access to the doc."""

    principal_type: KbPrincipalType
    principal_id: str
    access_role: KbAclRole


class DocAclRoleChangeRequest(BaseModel):
    """`PATCH /kb/{kb_id}/docs/{doc_id}/acl/{entry_id}` body — change a grant's role."""

    access_role: KbAclRole
