"""EKP FastAPI application entry point.

Per architecture.md §4.1 + §4.4: exposes 18 RESTful endpoints across 8 routers.
W1 scaffold: routes registered, return 501 for non-trivial endpoints (real impl per §6.1 sprint).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.routes import chunks, debug, documents, feedback, kb, query, screenshots
from api.routes import eval as eval_routes
from observability.langfuse_tracer import init_tracer
from storage.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_tracer(settings)
    yield


app = FastAPI(
    title="EKP API",
    description="Enterprise Knowledge Platform — Tier 1 Foundation",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe (Azure Container Apps health check target)."""
    return {"status": "ok"}


app.include_router(query.router, tags=["query"])
app.include_router(feedback.router, tags=["query"])
app.include_router(kb.router, tags=["kb"])
app.include_router(documents.router, tags=["documents"])
app.include_router(chunks.router, tags=["chunks"])
app.include_router(eval_routes.router, tags=["eval"])
app.include_router(debug.router, tags=["debug"])
app.include_router(screenshots.router, tags=["screenshots"])
