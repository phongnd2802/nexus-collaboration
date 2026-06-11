from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_payload, preview

PROJECT_FIELDS = {
    "name",
    "description",
    "type",
    "status",
    "priority",
    "lead_id",
    "start_date",
    "end_date",
    "estimated_hours",
    "budget",
    "is_template",
}


async def create_project(args: dict[str, Any], context: NexusContext) -> Any:
    payload = clean_payload(args, PROJECT_FIELDS)
    if not payload.get("name"):
        raise ValueError("name is required")

    if not context.execute_actions:
        return preview("create_project", payload)
    return await internal_api.create_project(context, payload)


async def update_project(args: dict[str, Any], context: NexusContext) -> Any:
    project_id = args.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise ValueError("project_id is required")

    payload = clean_payload(args, PROJECT_FIELDS)
    if not payload:
        raise ValueError("At least one project field is required")

    if not context.execute_actions:
        return preview("update_project", {"project_id": project_id, **payload})
    return await internal_api.update_project(context, project_id, payload)


async def delete_project(args: dict[str, Any], context: NexusContext) -> Any:
    project_id = args.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise ValueError("project_id is required")

    if not context.execute_actions:
        return preview("delete_project", {"project_id": project_id})
    return await internal_api.delete_project(context, project_id)


async def get_project_details(args: dict[str, Any], context: NexusContext) -> Any:
    project_id = args.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise ValueError("project_id is required")
    return await internal_api.get_project_details(context, project_id)


PROJECT_PROPERTIES = {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "type": {"type": "string"},
    "status": {"type": "string"},
    "priority": {"type": "string"},
    "lead_id": {"type": "string"},
    "start_date": {"type": "string"},
    "end_date": {"type": "string"},
    "estimated_hours": {"type": "number"},
    "budget": {"type": "number"},
    "is_template": {"type": "boolean"},
}


TOOLS = [
    ToolSpec(
        name="create_project",
        description="Create a project. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["name"],
            "properties": PROJECT_PROPERTIES,
        },
        handler=create_project,
    ),
    ToolSpec(
        name="update_project",
        description="Update project fields. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {"project_id": {"type": "string"}, **PROJECT_PROPERTIES},
        },
        handler=update_project,
    ),
    ToolSpec(
        name="delete_project",
        description="Delete a project. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {"project_id": {"type": "string"}},
        },
        handler=delete_project,
    ),
    ToolSpec(
        name="get_project_details",
        description="Get details for a project in the current workspace.",
        input_schema={
            "type": "object",
            "required": ["project_id"],
            "properties": {"project_id": {"type": "string"}},
        },
        handler=get_project_details,
    ),
]

