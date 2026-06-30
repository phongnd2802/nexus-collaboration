from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager, nullcontext
from typing import Any

from nexus_ai.settings import Settings


def instrument_pydantic_ai(settings: Settings) -> None:
    if not settings.enable_langfuse:
        return
    try:
        from langfuse import get_client
        from pydantic_ai.agent import Agent
    except ImportError as exc:
        raise RuntimeError("Pydantic AI is required for Langfuse instrumentation.") from exc

    # Explicitly initialize the Langfuse client before enabling agent instrumentation.
    get_client()
    Agent.instrument_all()


@contextmanager
def langfuse_attributes(settings: Settings, user_id: str | None = None) -> Iterator[None]:
    if not settings.enable_langfuse:
        with nullcontext():
            yield
        return

    try:
        from langfuse import propagate_attributes
    except ImportError as exc:
        raise RuntimeError("Langfuse SDK is unavailable. Install langfuse.") from exc

    with propagate_attributes(
        user_id=user_id,
        session_id=settings.session_id,
        tags=["nexus-ai", "agent", settings.environment],
        metadata={
            "workspace_id": settings.workspace_id,
            "mcp_url": settings.mcp_url,
            "mcp_urls": settings.active_mcp_urls,
            "model": settings.model,
        },
        version="0.1.0",
    ):
        yield


def flush_langfuse(settings: Settings) -> None:
    if not settings.enable_langfuse:
        return
    try:
        from langfuse import get_client
    except ImportError:
        return
    client: Any = get_client()
    client.flush()
