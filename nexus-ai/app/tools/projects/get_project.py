from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result


async def get_project(ctx: RunContext[Any], project_id: str) -> Any:
    """Get one project by ID."""
    return log_tool_result(
        "get_project",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="GET",
            path=f"/projects/{project_id}",
        )
        ),
    )
