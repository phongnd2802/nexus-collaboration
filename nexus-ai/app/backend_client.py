from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException

from app.config import settings


class NexusBackendClient:
    def __init__(self, user_id: str, workspace_id: str) -> None:
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.base_url = settings.nexus_backend_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "NexusBackendClient":
        self._client = httpx.AsyncClient(timeout=30)
        return self

    async def __aexit__(self, *_args: object) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        *,
        query: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self.base_url}/internal/agent/workspaces/{self.workspace_id}{path}"
        if query:
            filtered_query = {key: value for key, value in query.items() if value is not None}
            if filtered_query:
                url = f"{url}?{urlencode(filtered_query)}"

        headers = {
            "x-nexus-internal-token": settings.nexus_internal_api_token,
            "x-user-id": self.user_id,
            "x-workspace-id": self.workspace_id,
        }

        if not settings.nexus_internal_api_token:
            raise HTTPException(
                status_code=500,
                detail="NEXUS_INTERNAL_API_TOKEN is not configured for nexus-ai",
            )

        client = self._client or httpx.AsyncClient(timeout=30)
        try:
            response = await client.request(method, url, json=body, headers=headers)
        finally:
            if self._client is None:
                await client.aclose()

        if response.status_code >= 400:
            try:
                detail = response.json().get("message") or response.json().get("error")
            except Exception:
                detail = response.text
            raise HTTPException(response.status_code, detail or "Nexus backend request failed")

        if response.status_code == 204:
            return None
        return response.json()

    async def list_projects(self, status: str | None = None, type: str | None = None) -> Any:
        return await self._request("GET", "/projects", query={"status": status, "type": type})

    async def get_project(self, project_id: str) -> Any:
        return await self._request("GET", f"/projects/{project_id}")

    async def create_project(self, payload: dict[str, Any]) -> Any:
        return await self._request("POST", "/projects", body=payload)

    async def update_project(self, project_id: str, payload: dict[str, Any]) -> Any:
        return await self._request("PATCH", f"/projects/{project_id}", body=payload)

    async def list_tasks(
        self,
        project_id: str | None = None,
        search: str | None = None,
        status: str | None = None,
        limit: int | None = None,
    ) -> Any:
        if project_id:
            return await self._request("GET", f"/projects/{project_id}/tasks", query={"status": status})
        return await self._request("GET", "/tasks", query={"search": search, "status": status, "limit": limit})

    async def get_task(self, task_id: str) -> Any:
        return await self._request("GET", f"/tasks/{task_id}")

    async def create_task(self, project_id: str, payload: dict[str, Any]) -> Any:
        return await self._request("POST", f"/projects/{project_id}/tasks", body=payload)

    async def update_task(self, task_id: str, payload: dict[str, Any]) -> Any:
        return await self._request("PATCH", f"/tasks/{task_id}", body=payload)
