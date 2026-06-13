import json
from typing import Any

from mcp.types import TextContent, Tool

from nexus_mcp.tools.common import ToolSpec, context_from_args
from nexus_mcp.tools.calendar import TOOLS as CALENDAR_TOOLS
from nexus_mcp.tools.files import TOOLS as FILE_TOOLS
from nexus_mcp.tools.notes import TOOLS as NOTE_TOOLS
from nexus_mcp.tools.projects import TOOLS as PROJECT_TOOLS
from nexus_mcp.tools.search import TOOLS as SEARCH_TOOLS
from nexus_mcp.tools.tasks import TOOLS as TASK_TOOLS
from nexus_mcp.tools.workspace import TOOLS as WORKSPACE_TOOLS

TOOL_SPECS: dict[str, ToolSpec] = {
    tool.name: tool
    for tool in [
        *WORKSPACE_TOOLS,
        *TASK_TOOLS,
        *PROJECT_TOOLS,
        *CALENDAR_TOOLS,
        *NOTE_TOOLS,
        *FILE_TOOLS,
        *SEARCH_TOOLS,
    ]
}


def list_tool_definitions() -> list[Tool]:
    return [
        Tool(
            name=tool.name,
            description=tool.description,
            inputSchema=tool.input_schema,
        )
        for tool in TOOL_SPECS.values()
    ]


async def call_tool(name: str, arguments: dict[str, Any] | None) -> list[TextContent]:
    tool = TOOL_SPECS.get(name)
    if tool is None:
        raise ValueError(f"Unknown tool: {name}")

    args = dict(arguments or {})
    context = context_from_args(args)
    output = await tool.handler(args, context)
    text = output if isinstance(output, str) else json.dumps(output, ensure_ascii=False)
    return [TextContent(type="text", text=text)]
