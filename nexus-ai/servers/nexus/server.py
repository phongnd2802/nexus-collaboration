"""Nexus MCP Server configuration."""

from contextlib import AsyncExitStack
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_http_url = "http://127.0.0.1:3333/mcp"

_session: Optional[ClientSession] = None
_exit_stack: Optional[AsyncExitStack] = None
_connected = False


class MCPAuthRequiredError(Exception):
    """Raised when the server appears to require credentials we don't have."""


def _headers() -> dict[str, str]:
    import os

    token = os.environ.get("NEXUS_USER_ACCESS_TOKEN")
    workspace_id = os.environ.get("NEXUS_WORKSPACE_ID")
    missing = [
        name
        for name, value in (
            ("NEXUS_USER_ACCESS_TOKEN", token),
            ("NEXUS_WORKSPACE_ID", workspace_id),
        )
        if not value
    ]
    if missing:
        raise MCPAuthRequiredError(
            "Missing required Nexus HTTP credential env vars: "
            + ", ".join(missing)
            + ". Set them in nexus-ai/.env or the process environment."
        )

    return {
        "Authorization": f"Bearer {token}",
        "X-Nexus-Workspace-ID": workspace_id,
    }


async def ensure_connected() -> ClientSession:
    """Ensure the MCP session is connected, connecting once per process."""
    global _session, _exit_stack, _connected

    if not _connected:
        _exit_stack = AsyncExitStack()
        try:
            http_client = await _exit_stack.enter_async_context(
                httpx.AsyncClient(headers=_headers())
            )
            read, write, _ = await _exit_stack.enter_async_context(
                streamable_http_client(_http_url, http_client=http_client)
            )
            _session = await _exit_stack.enter_async_context(ClientSession(read, write))
            await _session.initialize()
            _connected = True
        except Exception as e:
            await close()
            msg = str(e).lower()
            if any(
                marker in msg
                for marker in (
                    "401",
                    "403",
                    "unauthorized",
                    "forbidden",
                    "credential",
                    "token",
                    "api key",
                    "auth",
                )
            ):
                raise MCPAuthRequiredError(
                    f"Nexus MCP rejected or required credentials: {e}. "
                    "Check NEXUS_USER_ACCESS_TOKEN and NEXUS_WORKSPACE_ID."
                ) from e
            raise

    if _session is None:
        raise RuntimeError("MCP session was not initialized")
    return _session


async def close() -> None:
    """Tear down the MCP session cleanly."""
    global _session, _exit_stack, _connected

    if _exit_stack is not None:
        await _exit_stack.aclose()
    _session = None
    _exit_stack = None
    _connected = False


async def call_tool(tool_name: str, arguments: dict) -> str:
    """Call a Nexus MCP tool and return its text content."""
    session = await ensure_connected()
    result = await session.call_tool(name=tool_name, arguments=arguments)

    if getattr(result, "isError", False):
        raise RuntimeError(f"Tool '{tool_name}' returned an error: {result.content}")

    content = getattr(result, "content", None)
    if isinstance(content, list) and content:
        parts = [block.text if hasattr(block, "text") else str(block) for block in content]
        return "\n".join(parts)
    return str(content) if content is not None else ""


if __name__ == "__main__":
    import asyncio
    import json

    async def discover_tools() -> None:
        print("Discovering tools from Nexus MCP server...")
        session = await ensure_connected()
        tools_result = await session.list_tools()
        tools = getattr(tools_result, "tools", [])

        print(f"\nFound {len(tools)} tools:\n")
        for tool in tools:
            print(f"Tool: {tool.name}")
            print(f"  Description: {tool.description}")
            schema = getattr(tool, "inputSchema", {}) or {}
            if schema.get("properties"):
                print("  Parameters (full schema, including nested objects):")
                print(json.dumps(schema, indent=4))
            print()

        await close()

    asyncio.run(discover_tools())
