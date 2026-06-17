from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result


async def get_task(ctx: RunContext[Any], task_id: str) -> Any:
    """Get one task by ID."""
    return log_tool_result(
        "get_task",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="GET",
            path=f"/tasks/{task_id}",
        )
        ),
    )
