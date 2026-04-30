"""Langfuse observability tracer (per architecture.md §3.1 + §7.4 day-2 readiness).

W1 stub: structlog JSON config + log Langfuse host (no SDK call yet).
W3 wires actual Langfuse SDK with public/secret keys for trace export.
"""

import structlog

from storage.settings import Settings


def init_tracer(settings: Settings) -> None:
    """Initialize observability layer.

    W1 scope: configure structlog JSON renderer (Langfuse correlation requires JSON output).
    W3 scope: actual Langfuse SDK init + flush hooks per query/retrieval/LLM stage.
    """
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(settings.log_level_int),
    )
    log = structlog.get_logger()
    log.info(
        "tracer_initialized",
        langfuse_host=settings.langfuse_host,
        environment=settings.environment,
        feature_auth_enabled=settings.feature_auth_enabled,
    )
