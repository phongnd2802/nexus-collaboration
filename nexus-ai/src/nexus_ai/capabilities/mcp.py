from __future__ import annotations

from typing import Any

from nexus_ai.settings import Settings


def create_nexus_mcp_capability(settings: Settings) -> Any:
    try:
        from pydantic_ai.capabilities import MCP
    except ImportError as exc:
        raise RuntimeError("Pydantic AI MCP capability is unavailable. Install pydantic-ai-slim[mcp].") from exc

    try:
        return MCP(settings.mcp_url, native=False, headers=settings.mcp_headers)
    except TypeError:
        # Older Pydantic AI versions may not support headers on MCP capability.
        # Keep the error explicit because Nexus MCP requires auth/workspace headers.
        raise RuntimeError(
            "Installed Pydantic AI MCP capability does not accept headers. "
            "Upgrade pydantic-ai-slim[mcp] or add a local MCP transport wrapper."
        )

