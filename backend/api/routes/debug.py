"""Debug endpoint (per architecture.md §4.4 #17 + §5.7 Debug View)."""

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/debug/trace/{trace_id}")
async def get_trace(trace_id: str) -> dict:
    """Full trace detail (W3+ implementation per Langfuse correlation)."""
    _ = trace_id
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W3+ implementation per architecture.md §5.7",
    )
