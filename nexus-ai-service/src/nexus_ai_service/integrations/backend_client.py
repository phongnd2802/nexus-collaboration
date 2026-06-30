import base64
from typing import Any

import httpx

from nexus_ai_service.rag.schemas import FileSource


class BackendClient:
    def __init__(self, base_url: str, internal_api_key: str | None, timeout: float = 60.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.internal_api_key = internal_api_key
        self.timeout = timeout

    async def get_file_source(self, workspace_id: str, file_id: str, request_id: str | None = None) -> FileSource:
        payload = await self._request(
            "GET",
            f"/workspaces/{workspace_id}/rag/internal/files/{file_id}/source",
            workspace_id=workspace_id,
            request_id=request_id,
        )
        return FileSource.model_validate(payload)

    async def claim_job(self, workspace_id: str, job_id: str, request_id: str | None = None) -> dict[str, Any]:
        return await self._request(
            "POST",
            f"/workspaces/{workspace_id}/rag/internal/indexing-jobs/{job_id}/claim",
            workspace_id=workspace_id,
            request_id=request_id,
        )

    async def update_job(
        self,
        workspace_id: str,
        job_id: str,
        status: str,
        error_message: str | None = None,
        metadata: dict[str, Any] | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        return await self._request(
            "PATCH",
            f"/workspaces/{workspace_id}/rag/internal/indexing-jobs/{job_id}",
            workspace_id=workspace_id,
            request_id=request_id,
            json={"status": status, "error_message": error_message, "metadata": metadata or {}},
        )

    async def _request(
        self,
        method: str,
        path: str,
        workspace_id: str,
        request_id: str | None = None,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = {
            "X-Nexus-Workspace-ID": workspace_id,
            "X-Nexus-Source": "nexus-ai-service",
        }
        if self.internal_api_key:
            headers["X-API-Key"] = self.internal_api_key
        if request_id:
            headers["X-Nexus-Request-ID"] = request_id
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(method, f"{self.base_url}{path}", headers=headers, json=json)
            response.raise_for_status()
            return response.json()


def decode_file_source(source: FileSource) -> bytes:
    if not source.content_base64:
        return b""
    return base64.b64decode(source.content_base64)

