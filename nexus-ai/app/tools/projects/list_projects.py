from typing import Any

from pydantic_ai import RunContext, ToolReturn
from pydantic_ai.ui.vercel_ai.response_types import DataChunk

from app.tools.backend_client import request_backend
from app.tools.utils import compact_value, log_tool_result


def _project_member_count(project: dict[str, Any]) -> int | None:
    member_ids: set[str] = set()
    for key in ("owner_id", "lead_id"):
        value = project.get(key)
        if isinstance(value, str) and value.strip():
            member_ids.add(value)

    collaborative_data = project.get("collaborative_data")
    if isinstance(collaborative_data, dict):
        default_assignees = collaborative_data.get("default_assignee_ids") or collaborative_data.get("default_assignees")
        if isinstance(default_assignees, list):
            for value in default_assignees:
                if isinstance(value, str) and value.strip():
                    member_ids.add(value)

    return len(member_ids) or None


def _project_card_payload(workspace_id: str, projects: Any) -> DataChunk | None:
    if not isinstance(projects, list):
        return None

    items: list[dict[str, Any]] = []
    for project in projects[:20]:
        if not isinstance(project, dict):
            continue
        project_id = project.get("id")
        project_name = project.get("name")
        if not isinstance(project_id, str) or not project_id.strip() or not isinstance(project_name, str) or not project_name.strip():
            continue

        items.append(
            {
                "id": project_id,
                "name": project_name,
                "description": project.get("description") if isinstance(project.get("description"), str) else None,
                "status": project.get("status") if isinstance(project.get("status"), str) else None,
                "type": project.get("type") if isinstance(project.get("type"), str) else None,
                "updatedAt": project.get("updated_at") if isinstance(project.get("updated_at"), str) else None,
                "memberCount": _project_member_count(project),
                "href": f"/workspaces/{workspace_id}/projects/{project_id}",
            }
        )

    if not items:
        return None

    return DataChunk(
        type="data-project_list",
        data={
            "title": "Projects",
            "items": items,
        },
    )


async def list_projects(
    ctx: RunContext[Any],
    status: str | None = None,
    type: str | None = None,
) -> Any:
    """List projects in the current workspace, optionally filtered by status or type."""
    projects = await request_backend(
        user_id=ctx.deps.user_id,
        workspace_id=ctx.deps.workspace_id,
        method="GET",
        path="/projects",
        query={"status": status, "type": type},
    )
    result = ToolReturn(
        compact_value(projects),
        metadata=_project_card_payload(ctx.deps.workspace_id, projects),
    )
    return log_tool_result(
        "list_projects",
        result,
    )
