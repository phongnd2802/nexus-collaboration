from __future__ import annotations

from dataclasses import replace
from typing import Any

from pydantic_ai import RunContext
from pydantic_ai.tools import ToolDefinition


def create_mcp_tool_preparation_capability() -> Any | None:
    try:
        from pydantic_ai.capabilities import PrepareTools
    except ImportError:
        return None
    return PrepareTools(prepare_func=prepare_mcp_tool_definitions)


async def prepare_mcp_tool_definitions(
    _ctx: RunContext[Any], tool_defs: list[ToolDefinition]
) -> list[ToolDefinition]:
    return [prepare_tool_definition(tool_def) for tool_def in tool_defs]


def prepare_tool_definition(tool_def: ToolDefinition) -> ToolDefinition:
    if tool_def.name.startswith("nexus_"):
        return replace(tool_def, defer_loading=True)
    return replace(tool_def, defer_loading=False)
