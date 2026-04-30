"""Knowledge Base management endpoints (per architecture.md §4.4 #4-8 + §3.4)."""

from fastapi import APIRouter, HTTPException, status

from api.schemas.kb import KbConfig, KbStatus

router = APIRouter()


@router.get("/kb", response_model=list[KbStatus])
async def list_kbs() -> list[KbStatus]:
    """List all KBs (W2 implementation per §3.4 multi-KB architecture)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §3.4",
    )


@router.post("/kb", response_model=KbStatus, status_code=status.HTTP_201_CREATED)
async def create_kb(_config: KbConfig) -> KbStatus:
    """Create KB (W2 implementation; first KB = drive_user_manuals)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §3.4",
    )


@router.get("/kb/{kb_id}", response_model=KbStatus)
async def get_kb(kb_id: str) -> KbStatus:
    """KB detail + stats (W2 implementation)."""
    _ = kb_id
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §3.4",
    )


@router.delete("/kb/{kb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kb(kb_id: str) -> None:
    """Delete KB + cleanup (W2 implementation)."""
    _ = kb_id
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §3.4",
    )


@router.patch("/kb/{kb_id}/settings", response_model=KbConfig)
async def update_kb_settings(kb_id: str, _config: KbConfig) -> KbConfig:
    """Update KB config: embedding model, chunk strategy (W2 implementation)."""
    _ = kb_id
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §3.4",
    )
