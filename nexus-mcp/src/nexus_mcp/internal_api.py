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

    async def list_calendar_events(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/calendar/events", context, params)

    async def list_upcoming_events(self, context: NexusContext, days: int | None = None) -> Any:
        params = {"days": days} if days else None
        return await self._get(f"/workspaces/{context.workspace_id}/calendar/upcoming", context, params)

    async def search_calendar_events(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(
            f"/workspaces/{context.workspace_id}/calendar/events/search",
            context,
            params,
        )

    async def create_calendar_event(self, context: NexusContext, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/calendar/events",
            context,
            json=payload,
        )

    async def get_calendar_event(self, context: NexusContext, event_id: str) -> Any:
        return await self._get(
            f"/workspaces/{context.workspace_id}/calendar/events/{event_id}",
            context,
        )

    async def update_calendar_event(
        self,
        context: NexusContext,
        event_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PATCH",
            f"/workspaces/{context.workspace_id}/calendar/events/{event_id}",
            context,
            json=payload,
        )

    async def delete_calendar_event(self, context: NexusContext, event_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/calendar/events/{event_id}",
            context,
        )

    async def respond_to_calendar_event(
        self,
        context: NexusContext,
        event_id: str,
        response: str,
    ) -> Any:
        return await self._request(
            "PUT",
            f"/workspaces/{context.workspace_id}/calendar/events/{event_id}/respond",
            context,
            json={"response": response},
        )

    async def list_notes(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/notes", context, params)

    async def search_notes(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/notes/search", context, params)

    async def create_note(self, context: NexusContext, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/notes",
            context,
            json=payload,
        )

    async def get_note(self, context: NexusContext, note_id: str) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/notes/{note_id}", context)

    async def update_note(
        self,
        context: NexusContext,
        note_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PATCH",
            f"/workspaces/{context.workspace_id}/notes/{note_id}",
            context,
            json=payload,
        )

    async def delete_note(self, context: NexusContext, note_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/notes/{note_id}",
            context,
        )

    async def note_action(
        self,
        context: NexusContext,
        note_id: str,
        action: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/notes/{note_id}/{action}",
            context,
            json=payload,
        )

    async def merge_notes(self, context: NexusContext, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/notes/merge",
            context,
            json=payload,
        )

    async def list_folders(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/files/folders", context, params)

    async def create_folder(self, context: NexusContext, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/files/folders",
            context,
            json=payload,
        )

    async def update_folder(
        self,
        context: NexusContext,
        folder_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PUT",
            f"/workspaces/{context.workspace_id}/files/folders/{folder_id}",
            context,
            json=payload,
        )

    async def move_folder(
        self,
        context: NexusContext,
        folder_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PUT",
            f"/workspaces/{context.workspace_id}/files/folders/{folder_id}/move",
            context,
            json=payload,
        )

    async def delete_folder(self, context: NexusContext, folder_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/files/folders/{folder_id}",
            context,
        )

    async def restore_folder(self, context: NexusContext, folder_id: str) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/files/folders/{folder_id}/restore",
            context,
        )

    async def list_files(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/files", context, params)

    async def search_files(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/files/search", context, params)

    async def list_recent_files(self, context: NexusContext, limit: int | None = None) -> Any:
        params = {"limit": limit} if limit else None
        return await self._get(f"/workspaces/{context.workspace_id}/files/recent", context, params)

    async def list_starred_files(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/files/starred", context, params)

    async def get_file(self, context: NexusContext, file_id: str) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/files/{file_id}", context)

    async def update_file(
        self,
        context: NexusContext,
        file_id: str,
        payload: dict[str, Any],
    ) -> Any:
        return await self._request(
            "PUT",
            f"/workspaces/{context.workspace_id}/files/{file_id}",
            context,
            json=payload,
        )

    async def move_file(self, context: NexusContext, file_id: str, payload: dict[str, Any]) -> Any:
        return await self._request(
            "PUT",
            f"/workspaces/{context.workspace_id}/files/{file_id}/move",
            context,
            json=payload,
        )

    async def copy_file(self, context: NexusContext, file_id: str, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/files/{file_id}/copy",
            context,
            json=payload,
        )

    async def delete_file(self, context: NexusContext, file_id: str) -> Any:
        return await self._request(
            "DELETE",
            f"/workspaces/{context.workspace_id}/files/{file_id}",
            context,
        )

    async def restore_file(self, context: NexusContext, file_id: str) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/files/{file_id}/restore",
            context,
        )

    async def share_file(self, context: NexusContext, file_id: str, payload: dict[str, Any]) -> Any:
        return await self._request(
            "POST",
            f"/workspaces/{context.workspace_id}/files/{file_id}/share",
            context,
            json=payload,
        )

    async def universal_search(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/search", context, params)

    async def search_suggestions(self, context: NexusContext, query: str) -> Any:
        return await self._get(
            f"/workspaces/{context.workspace_id}/search/suggestions",
            context,
            {"q": query},
        )

    async def semantic_search(self, context: NexusContext, params: dict[str, Any]) -> Any:
        return await self._get(f"/workspaces/{context.workspace_id}/search/semantic", context, params)

    async def find_similar_content(
        self,
        context: NexusContext,
        content_type: str,
        content_id: str,
        limit: int | None = None,
    ) -> Any:
        params = {"limit": limit} if limit else None
        return await self._get(
            f"/workspaces/{context.workspace_id}/search/semantic/similar/{content_type}/{content_id}",
            context,
            params,
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
