from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result, omit_none


async def create_task(
    ctx: RunContext[Any],
    project_id: str,
    title: str,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = "medium",
    assigned_to: list[str] | None = None,
    due_date: str | None = None,
) -> Any:
    """Create a task in a project after explicit user approval."""
    return log_tool_result(
        "create_task",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="POST",
            path=f"/projects/{project_id}/tasks",
            body=omit_none(
                {
                    "title": title,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "assigned_to": assigned_to,
                    "due_date": due_date,
                }
            ),
        )
        ),
    )
