from types import SimpleNamespace
import importlib

import pytest

from app.config import settings

create_project_module = importlib.import_module("app.tools.projects.create_project")


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
async def test_create_project_tool_filters_payload_and_compacts_response(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(
        FakeResponse(
            {
                "id": "proj_1",
                "name": "Roadmap",
                "description": None,
                "status": "active",
                "type": "kanban",
                "priority": None,
                "ignored": "drop-me",
            }
        )
    )
    monkeypatch.setattr(create_project_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    ctx = SimpleNamespace(deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"))

    result = await create_project_module.create_project(ctx, name="Roadmap", description=None, priority=None)

    assert client.calls == [
        (
            "POST",
            "http://backend.test/api/v1/internal/agent/workspaces/ws_1/projects",
            {"name": "Roadmap", "type": "kanban", "status": "active"},
            {
                "x-nexus-internal-token": "token",
                "x-user-id": "user_1",
                "x-workspace-id": "ws_1",
            },
        )
    ]
    assert result == {
        "id": "proj_1",
        "name": "Roadmap",
        "status": "active",
        "type": "kanban",
    }
