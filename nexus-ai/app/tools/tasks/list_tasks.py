from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from pydantic_ai import RunContext

from app.config import settings
from app.tools.utils import compact_value


async def _request_backend(
    *,
    user_id: str,
    workspace_id: str,
    method: str,
    path: str,
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> Any:
    if not settings.nexus_internal_api_token:
        raise HTTPException(status_code=500, detail="NEXUS_INTERNAL_API_TOKEN is not configured for nexus-ai")

    url = f"{settings.nexus_backend_base_url.rstrip('/')}/internal/agent/workspaces/{workspace_id}{path}"
    if query:
        filtered_query = {key: value for key, value in query.items() if value is not None}
        if filtered_query:
            url = f"{url}?{urlencode(filtered_query)}"

    headers = {
        "x-nexus-internal-token": settings.nexus_internal_api_token,
        "x-user-id": user_id,
        "x-workspace-id": workspace_id,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(method, url, json=body, headers=headers)

    if response.status_code >= 400:
        try:
            payload = response.json()
            detail = payload.get("message") or payload.get("error")
        except Exception:
            detail = response.text
        raise HTTPException(response.status_code, detail or "Nexus backend request failed")

    if response.status_code == 204:
        return None
    return response.json()


async def list_tasks(
    ctx: RunContext[Any],
    project_id: str | None = None,
    search: str | None = None,
    status: str | None = None,
    limit: int | None = 20,
) -> Any:
    """List tasks in one project or across the workspace."""
    if project_id:
        return compact_value(
            await _request_backend(
                user_id=ctx.deps.user_id,
                workspace_id=ctx.deps.workspace_id,
                method="GET",
                path=f"/projects/{project_id}/tasks",
                query={"status": status},
            )
        )
    return compact_value(
        await _request_backend(
            user_id=ctx.deps.user_id,
            workspace_id=ctx.deps.workspace_id,
            method="GET",
            path="/tasks",
            query={"search": search, "status": status, "limit": limit},
        )
    )
