from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result


async def list_tasks(
    ctx: RunContext[Any],
    project_id: str | None = None,
    search: str | None = None,
    status: str | None = None,
    limit: int | None = 20,
) -> Any:
    """List tasks in one project or across the workspace."""
    if project_id:
        return log_tool_result(
            "list_tasks",
            compact_value(
            await request_backend(
                user_id=ctx.deps.user_id,
                workspace_id=ctx.deps.workspace_id,
                method="GET",
                path=f"/projects/{project_id}/tasks",
                query={"status": status},
            )
            ),
        )
    return log_tool_result(
        "list_tasks",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="GET",
            path="/tasks",
            query={"search": search, "status": status, "limit": limit},
        )
        ),
    )
