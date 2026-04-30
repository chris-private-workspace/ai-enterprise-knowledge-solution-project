"""Evaluation Pydantic schemas (per architecture.md §4.5)."""

from pydantic import BaseModel


class FailedQueryDetail(BaseModel):
    query_id: str
    query: str
    expected: str
    got: str
    metric_failed: list[str]


class EvalReport(BaseModel):
    recall_at_5: float
    faithfulness: float
    correctness: float | None
    image_association: float
    p95_latency_ms: int
    failed_queries: list[FailedQueryDetail]
    crag_trigger_rate: float
    avg_cost_per_query_usd: float
