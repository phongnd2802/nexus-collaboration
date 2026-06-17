from typing import Any

from fastapi import HTTPException
from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result, omit_none


async def create_project(
    ctx: RunContext[Any],
    name: str | None = None,
    description: str | None = None,
    lead_id: str | None = None,
    kanban_stages: list[dict[str, Any]] | None = None,
    collaborative_data: dict[str, Any] | None = None,
) -> Any:
    """Create a project after explicit user approval."""
    tool_call_metadata = getattr(ctx, "tool_call_metadata", None)
    metadata = tool_call_metadata if isinstance(tool_call_metadata, dict) else {}
    form_data = metadata.get("form_data", {})

    final_name = form_data.get("name") or name
    if not final_name:
        raise HTTPException(status_code=400, detail="Project name is required")

    final_description = form_data.get("description") if "description" in form_data else description
    final_lead_id = form_data.get("lead_id") if "lead_id" in form_data else (ctx.deps.user_id or lead_id)
    final_kanban_stages = form_data.get("kanban_stages") if "kanban_stages" in form_data else kanban_stages
    final_collaborative_data = (
        form_data.get("collaborative_data") if "collaborative_data" in form_data else collaborative_data
    )

    return log_tool_result(
        "create_project",
        compact_value(
        await request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="POST",
            path="/projects",
            body=omit_none(
                {
                    "name": final_name,
                    "description": final_description,
                    "lead_id": final_lead_id,
                    "kanban_stages": final_kanban_stages,
                    "collaborative_data": final_collaborative_data,
                }
            ),
        )
        ),
    )
