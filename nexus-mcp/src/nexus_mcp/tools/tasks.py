from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_payload, preview

TASK_FIELDS = {
    "title",
    "description",
    "status",
    "priority",
    "assigned_to",
    "due_date",
    "start_date",
    "estimated_hours",
    "labels",
}


async def list_tasks(args: dict[str, Any], context: NexusContext) -> Any:
    limit = args.get("limit")
    if isinstance(limit, str) and limit.isdigit():
        limit = int(limit)
    if not isinstance(limit, int):
        limit = None

    return await internal_api.list_tasks(
        context,
        search=args.get("search") if isinstance(args.get("search"), str) else None,
        status=args.get("status") if isinstance(args.get("status"), str) else None,
        limit=limit,
    )


async def create_task(args: dict[str, Any], context: NexusContext) -> Any:
    project_id = args.get("project_id")
    if not isinstance(project_id, str) or not project_id:
        raise ValueError("project_id is required")

    payload = clean_payload(args, TASK_FIELDS)
    if not payload.get("title"):
        raise ValueError("title is required")

    if not context.execute_actions:
        return preview("create_task", {"project_id": project_id, **payload})
    return await internal_api.create_task(context, project_id, payload)


async def update_task_status(args: dict[str, Any], context: NexusContext) -> Any:
    task_id = args.get("task_id")
    status = args.get("status")
    if not isinstance(task_id, str) or not task_id:
        raise ValueError("task_id is required")
    if not isinstance(status, str) or not status:
        raise ValueError("status is required")

    payload = {"status": status}
    if not context.execute_actions:
        return preview("update_task_status", {"task_id": task_id, **payload})
    return await internal_api.update_task(context, task_id, payload)


async def update_task(args: dict[str, Any], context: NexusContext) -> Any:
    task_id = args.get("task_id")
    if not isinstance(task_id, str) or not task_id:
        raise ValueError("task_id is required")

    payload = clean_payload(args, TASK_FIELDS)
    if not payload:
        raise ValueError("At least one task field is required")

    if not context.execute_actions:
        return preview("update_task", {"task_id": task_id, **payload})
    return await internal_api.update_task(context, task_id, payload)


async def delete_task(args: dict[str, Any], context: NexusContext) -> Any:
    task_id = args.get("task_id")
    if not isinstance(task_id, str) or not task_id:
        raise ValueError("task_id is required")

    if not context.execute_actions:
        return preview("delete_task", {"task_id": task_id})
    return await internal_api.delete_task(context, task_id)


TOOLS = [
    ToolSpec(
        name="list_tasks",
        description="List tasks in the current workspace with optional search/status filters.",
        input_schema={
            "type": "object",
            "properties": {
                "search": {"type": "string", "description": "Search tasks by title."},
                "status": {"type": "string", "description": "Filter by task status."},
                "limit": {"type": "integer", "description": "Maximum number of tasks to return."},
            },
        },
        handler=list_tasks,
    ),
    ToolSpec(
        name="create_task",
        description="Create a task in a project. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["project_id", "title"],
            "properties": {
                "project_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string"},
                "priority": {"type": "string"},
                "assigned_to": {"type": "array", "items": {"type": "string"}},
                "due_date": {"type": "string"},
                "start_date": {"type": "string"},
                "estimated_hours": {"type": "number"},
                "labels": {"type": "array", "items": {"type": "string"}},
            },
        },
        handler=create_task,
    ),
    ToolSpec(
        name="update_task_status",
        description="Update a task status. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["task_id", "status"],
            "properties": {"task_id": {"type": "string"}, "status": {"type": "string"}},
        },
        handler=update_task_status,
    ),
    ToolSpec(
        name="update_task",
        description="Update task fields. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["task_id"],
            "properties": {
                "task_id": {"type": "string"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "status": {"type": "string"},
                "priority": {"type": "string"},
                "assigned_to": {"type": "array", "items": {"type": "string"}},
                "due_date": {"type": "string"},
                "start_date": {"type": "string"},
                "estimated_hours": {"type": "number"},
                "labels": {"type": "array", "items": {"type": "string"}},
            },
        },
        handler=update_task,
    ),
    ToolSpec(
        name="delete_task",
        description="Delete a task. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["task_id"],
            "properties": {"task_id": {"type": "string"}},
        },
        handler=delete_task,
    ),
]

