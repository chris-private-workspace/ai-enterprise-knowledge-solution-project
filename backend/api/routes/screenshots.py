"""Screenshot redirect endpoint (per architecture.md §4.4 #18 + §4.6)."""

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.get("/screenshots/{kb_id}/{doc_id}/{img_id}")
async def get_screenshot_redirect(kb_id: str, doc_id: str, img_id: str) -> dict:
    """Redirect to SAS URL of self-hosted screenshot.

    POC = Public read (internal demo); Beta+ = Private + 5min SAS expiry per §4.6.
    """
    _ = kb_id, doc_id, img_id
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W2 implementation per architecture.md §4.6 (image self-host pipeline)",
    )
