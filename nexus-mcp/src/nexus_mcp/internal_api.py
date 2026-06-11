from typing import Any

import httpx

from .config import settings
from .context import NexusContext


class NexusInternalApi:
    def __init__(self) -> None:
        self._base_url = settings.nexus_internal_api_url.rstrip("/")
        self._headers = {"x-nexus-internal-token": settings.nexus_internal_api_token}
        self._timeout = settings.request_timeout_seconds

    async def get_workspace_members(self, context: NexusContext) -> Any:
        return await self._get(
            f"/workspaces/{context.workspace_id}/members",
            context,
        )

    async def list_projects(
        self,
        context: NexusContext,
        status: str | None = None,
        project_type: str | None = None,
    ) -> Any:
        params: dict[str, Any] = {}
        if status:
            params["status"] = status
        if project_type:
            params["type"] = project_type

        return await self._get(
            f"/workspaces/{context.workspace_id}/projects",
            context,
            params=params,
        )

    async def get_project_details(self, context: NexusContext, project_id: str) -> Any:
        return await self._get(
            f"/workspaces/{context.workspace_id}/projects/{project_id}",
            context,
        )

    async def create_project(self, context: NexusContext, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/projects",
            context,
            json=payload,
        )

    async def update_project(
        self,
        context: NexusContext,
        project_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PATCH",
            f"/workspaces/{context.workspace_id}/projects/{project_id}",
            context,
            json=payload,
        )

    async def delete_project(self, context: NexusContext, project_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/projects/{project_id}",
            context,
        )

    async def list_tasks(
        self,
        context: NexusContext,
        search: str | None = None,
        status: str | None = None,
        limit: int | None = None,
    ) -> Any:
        params: dict[str, Any] = {}
        if search:
            params["search"] = search
        if status:
            params["status"] = status
        if limit:
            params["limit"] = limit

        return await self._get(
            f"/workspaces/{context.workspace_id}/tasks",
            context,
            params=params,
        )

    async def create_task(
        self,
        context: NexusContext,
        project_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/projects/{project_id}/tasks",
            context,
            json=payload,
        )

    async def update_task(
        self,
        context: NexusContext,
        task_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PATCH",
            f"/workspaces/{context.workspace_id}/tasks/{task_id}",
            context,
            json=payload,
        )

    async def delete_task(self, context: NexusContext, task_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/tasks/{task_id}",
            context,
        )

    async def _get(
        self,
        path: str,
        context: NexusContext,
        params: dict[str, Any] | None = None,
    ) -> Any:
        headers = {
            **self._context_headers(context),
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(f"{self._base_url}{path}", headers=headers, params=params)
            response.raise_for_status()
            return response.json()

    async def _request(
        self,
        method: str,
        path: str,
        context: NexusContext,
        json: dict[str, Any] | None = None,
    ) -> Any:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.request(
                method,
                f"{self._base_url}{path}",
                headers=self._context_headers(context),
                json=json,
            )
            response.raise_for_status()
            if not response.content:
                return None
            return response.json()

    def _context_headers(self, context: NexusContext) -> dict[str, str]:
        return {
            **self._headers,
            "x-nexus-user-id": context.user_id,
            "x-nexus-workspace-id": context.workspace_id,
        }


internal_api = NexusInternalApi()
