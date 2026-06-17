from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result, omit_none


async def update_task(
    ctx: RunContext[Any],
    task_id: str,
    title: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: list[str] | None = None,
    due_date: str | None = None,
) -> Any:
    """Update basic task fields after explicit user approval."""
    return log_tool_result(
        "update_task",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="PATCH",
            path=f"/tasks/{task_id}",
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
