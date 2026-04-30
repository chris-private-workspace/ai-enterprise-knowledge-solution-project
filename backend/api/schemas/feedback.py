"""Feedback Pydantic schemas (per architecture.md §4.4 #3)."""

from typing import Literal

from pydantic import BaseModel


class FeedbackRequest(BaseModel):
    trace_id: str
    rating: Literal["thumbs_up", "thumbs_down"]
    comment: str | None = None


class FeedbackResponse(BaseModel):
    accepted: bool
    feedback_id: str
