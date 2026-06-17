from types import SimpleNamespace
import importlib

import pytest

from app.config import settings

list_tasks_module = importlib.import_module("app.tools.tasks.list_tasks")


class FakeResponse:
    def __init__(self, payload: dict[str, object], status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.text = ""

    def json(self) -> dict[str, object]:
        return self._payload


class FakeAsyncClient:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.calls: list[tuple[str, str, dict | None, dict | None]] = []

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def request(
        self,
        method: str,
        url: str,
        *,
        json: dict | None = None,
        headers: dict | None = None,
    ) -> FakeResponse:
        self.calls.append((method, url, json, headers))
        return self.response


@pytest.mark.asyncio
async def test_list_tasks_uses_project_endpoint_when_project_id_is_present(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse({"id": "task_1", "title": "Todo", "status": "todo"}))
    monkeypatch.setattr(list_tasks_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    ctx = SimpleNamespace(deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"))

    result = await list_tasks_module.list_tasks(ctx, project_id="proj_1", status="todo", search="ignored", limit=10)

    assert result == {"id": "task_1", "title": "Todo", "status": "todo"}
    assert client.calls == [
        (
            "GET",
            "http://backend.test/api/v1/internal/agent/workspaces/ws_1/projects/proj_1/tasks?status=todo",
            None,
            {
                "x-nexus-internal-token": "token",
                "x-user-id": "user_1",
                "x-workspace-id": "ws_1",
            },
        )
    ]


@pytest.mark.asyncio
async def test_list_tasks_uses_workspace_endpoint_without_project_id(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse({"id": "task_1", "title": "Roadmap", "status": "todo"}))
    monkeypatch.setattr(list_tasks_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    ctx = SimpleNamespace(deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"))

    result = await list_tasks_module.list_tasks(ctx, search="roadmap", status="todo", limit=10)

    assert result == {"id": "task_1", "title": "Roadmap", "status": "todo"}
    assert client.calls == [
        (
            "GET",
            "http://backend.test/api/v1/internal/agent/workspaces/ws_1/tasks?search=roadmap&status=todo&limit=10",
            None,
            {
                "x-nexus-internal-token": "token",
                "x-user-id": "user_1",
                "x-workspace-id": "ws_1",
            },
        )
    ]
