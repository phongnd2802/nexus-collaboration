from __future__ import annotations

from collections.abc import Iterator, Mapping
from typing import Any

import httpx
from pydantic_ai.mcp import MCPToolset

from nexus_ai.request_context import get_request_context
from nexus_ai.settings import Settings


class _RequestScopedAuthorization(httpx.Auth):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _value(self) -> str:
        context = get_request_context()
        if context is not None:
            if context.authorization:
                return context.authorization
            if context.api_token:
                return f"Bearer {context.api_token}"
        if self._settings.api_token:
            return f"Bearer {self._settings.api_token}"
        return ""

    def auth_flow(self, request: httpx.Request) -> Iterator[httpx.Request]:
        value = self._value()
        if value:
            request.headers["Authorization"] = value
        yield request


class _RequestScopedHeaders(Mapping[str, str]):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def __bool__(self) -> bool:
        return True

    def _build(self) -> dict[str, str]:
        context = get_request_context()
        workspace_id = context.workspace_id if context and context.workspace_id else self._settings.workspace_id
        request_id = context.request_id if context and context.request_id else self._settings.request_id
        headers: dict[str, str] = {}
        if workspace_id:
            headers["X-Nexus-Workspace-ID"] = workspace_id
        if request_id:
            headers["X-Nexus-Request-ID"] = request_id
        return headers

    def __getitem__(self, key: str) -> str:
        return self._build()[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._build())

    def __len__(self) -> int:
        return len(self._build())


def create_nexus_mcp_capability(settings: Settings) -> Any:
    try:
        from pydantic_ai.capabilities import MCP
    except ImportError as exc:
        raise RuntimeError("Pydantic AI MCP capability is unavailable. Install pydantic-ai-slim[mcp].") from exc

    try:
        return MCP(
           # id='nexus-mcp',
            native=False,
            local=MCPToolset(
                settings.mcp_url,
                auth=_RequestScopedAuthorization(settings),
                headers=_RequestScopedHeaders(settings),
                include_instructions=True,
            ),
           # defer_loading=True,
        )
    except TypeError:
        # Older Pydantic AI versions may not support local MCP toolsets.
        # Keep the error explicit because Nexus MCP requires auth/workspace headers.
        raise RuntimeError(
            "Installed Pydantic AI MCP capability does not support local MCP toolsets. "
            "Upgrade pydantic-ai-slim[mcp] or add a local MCP transport wrapper."
        )
