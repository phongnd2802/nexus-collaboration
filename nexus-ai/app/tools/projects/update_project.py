from typing import Any

from fastapi import HTTPException
from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result, omit_none


async def update_project(
    ctx: RunContext[Any],
    project_id: str,
    name: str | None = None,
    description: str | None = None,
    lead_id: str | None = None,
    kanban_stages: list[dict[str, Any]] | None = None,
    collaborative_data: dict[str, Any] | None = None,
) -> Any:
    """Update basic project fields after explicit user approval."""
    tool_call_metadata = getattr(ctx, "tool_call_metadata", None)
    metadata = tool_call_metadata if isinstance(tool_call_metadata, dict) else {}
    form_data = metadata.get("form_data", {})

    final_project_id = form_data.get("project_id") if "project_id" in form_data else project_id
    if not final_project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")

    body = omit_none(
        {
            "name": form_data.get("name") if "name" in form_data else name,
            "description": form_data.get("description") if "description" in form_data else description,
            "lead_id": form_data.get("lead_id") if "lead_id" in form_data else lead_id,
            "kanban_stages": form_data.get("kanban_stages") if "kanban_stages" in form_data else kanban_stages,
            "collaborative_data": (
                form_data.get("collaborative_data") if "collaborative_data" in form_data else collaborative_data
            ),
        }
    )
    if not body:
        raise HTTPException(status_code=400, detail="At least one project field must be provided")

    return log_tool_result(
        "update_project",
        compact_value(
            await request_backend(
                user_id=ctx.deps.user_id,
                workspace_id=ctx.deps.workspace_id,
                method="PATCH",
                path=f"/projects/{final_project_id}",
                body=body,
            )
        ),
    )
