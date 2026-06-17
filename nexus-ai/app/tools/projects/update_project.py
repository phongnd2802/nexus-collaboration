from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result, omit_none


async def update_project(
    ctx: RunContext[Any],
    project_id: str,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
) -> Any:
    """Update basic project fields after explicit user approval."""
    return log_tool_result(
        "update_project",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="PATCH",
            path=f"/projects/{project_id}",
            body=omit_none(
                {
                    "name": name,
                    "description": description,
                    "status": status,
                    "priority": priority,
                }
            ),
        )
        ),
    )
