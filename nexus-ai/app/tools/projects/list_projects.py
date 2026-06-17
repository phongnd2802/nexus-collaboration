from typing import Any

from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result


async def list_projects(
    ctx: RunContext[Any],
    status: str | None = None,
    type: str | None = None,
) -> Any:
    """List projects in the current workspace, optionally filtered by status or type."""
    return log_tool_result(
        "list_projects",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="GET",
            path="/projects",
            query={"status": status, "type": type},
        )
        ),
    )
