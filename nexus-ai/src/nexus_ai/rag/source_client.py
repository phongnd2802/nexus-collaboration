from __future__ import annotations

from typing import Any

import httpx

from nexus_ai.rag.schemas import FileSource
from nexus_ai.settings import Settings


class BackendRagClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = settings.backend_url.rstrip("/")

    async def get_file_source(self, workspace_id: str, file_id: str) -> FileSource:
        payload = await self._request(
            "GET",
            f"/workspaces/{workspace_id}/rag/internal/files/{file_id}/source",
            workspace_id=workspace_id,
        )
        return FileSource.model_validate(payload)

    async def claim_job(self, workspace_id: str, job_id: str) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/workspaces/{workspace_id}/rag/internal/indexing-jobs/{job_id}/claim",
            workspace_id=workspace_id,
        )

    async def update_job(
        self,
        workspace_id: str,
        job_id: str,
        status: str,
        *,
        error_message: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH",
            f"/workspaces/{workspace_id}/rag/internal/indexing-jobs/{job_id}",
            workspace_id=workspace_id,
            json={"status": status, "error_message": error_message, "metadata": metadata or {}},
        )

    async def get_authorized_file_ids(self, workspace_id: str, user_id: str) -> list[str]:
        payload = await self._request(
            "POST",
            f"/workspaces/{workspace_id}/rag/internal/authorized-file-ids",
            workspace_id=workspace_id,
            json={"user_id": user_id},
        )
        file_ids = payload.get("file_ids")
        return [str(file_id) for file_id in file_ids] if isinstance(file_ids, list) else []

    async def _request(
        self,
        method: str,
        path: str,
        *,
        workspace_id: str,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = {
            "Accept": "application/json",
            "X-API-Key": self.settings.internal_api_key,
            "X-Nexus-Source": "nexus-ai",
            "X-Nexus-Workspace-ID": workspace_id,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.request(method, f"{self.base_url}{path}", headers=headers, json=json)
        response.raise_for_status()
        return response.json()
