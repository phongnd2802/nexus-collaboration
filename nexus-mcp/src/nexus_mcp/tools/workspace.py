from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec


async def get_current_date_time(args: dict[str, Any], context: NexusContext) -> dict[str, Any]:
    timezone = args.get("timezone") or "UTC"
    try:
        tz = ZoneInfo(str(timezone))
    except ZoneInfoNotFoundError:
        timezone = "UTC"
        tz = UTC

    now = datetime.now(tz)
    return {
        "timezone": timezone,
        "iso": now.isoformat(),
        "date": now.date().isoformat(),
        "time": now.time().replace(microsecond=0).isoformat(),
    }


async def list_workspace_members(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.get_workspace_members(context)


async def list_projects(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_projects(
        context,
        status=args.get("status") if isinstance(args.get("status"), str) else None,
        project_type=args.get("type") if isinstance(args.get("type"), str) else None,
    )


TOOLS = [
    ToolSpec(
        name="get_current_date_time",
        description="Get the current date and time for the workspace assistant.",
        input_schema={
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "Optional IANA timezone label. Defaults to UTC.",
                }
            },
        },
        handler=get_current_date_time,
    ),
    ToolSpec(
        name="list_workspace_members",
        description="List members in the current workspace.",
        input_schema={"type": "object", "properties": {}},
        handler=list_workspace_members,
    ),
    ToolSpec(
        name="list_projects",
        description="List projects in the current workspace.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Optional project status filter."},
                "type": {"type": "string", "description": "Optional project type filter."},
            },
        },
        handler=list_projects,
    ),
]

