from types import SimpleNamespace
import importlib

import pytest
from pydantic_ai import ToolReturn

list_projects_module = importlib.import_module("app.tools.projects.list_projects")


@pytest.mark.asyncio
async def test_list_projects_returns_tool_return_with_project_card_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_request_backend(**kwargs: object) -> list[dict[str, object]]:
        assert kwargs["path"] == "/projects"
        assert kwargs["query"] == {"status": "active", "type": "kanban"}
        return [
            {
                "id": "proj_1",
                "name": "Roadmap",
                "description": "Q4 roadmap",
                "status": "active",
                "type": "kanban",
                "owner_id": "user_1",
                "lead_id": "user_2",
                "updated_at": "2026-06-18T00:00:00Z",
                "collaborative_data": {"default_assignee_ids": ["user_2", "user_3"]},
                "ignored": "drop-me",
            }
        ]

    monkeypatch.setattr(list_projects_module, "request_backend", fake_request_backend)

    ctx = SimpleNamespace(
        deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"),
    )

    result = await list_projects_module.list_projects(ctx, status="active", type="kanban")

    assert isinstance(result, ToolReturn)
    assert result.return_value == [
        {
            "id": "proj_1",
            "name": "Roadmap",
            "description": "Q4 roadmap",
            "status": "active",
            "type": "kanban",
            "updated_at": "2026-06-18T00:00:00Z",
        }
    ]
    assert result.metadata == {
        "payload_type": "project_list",
        "title": "Projects",
        "items": [
            {
                "id": "proj_1",
                "name": "Roadmap",
                "description": "Q4 roadmap",
                "status": "active",
                "type": "kanban",
                "updatedAt": "2026-06-18T00:00:00Z",
                "memberCount": 3,
                "href": "/workspaces/ws_1/projects/proj_1",
            }
        ],
    }


@pytest.mark.asyncio
async def test_list_projects_omits_metadata_when_backend_returns_no_projects(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_request_backend(**_kwargs: object) -> list[dict[str, object]]:
        return []

    monkeypatch.setattr(list_projects_module, "request_backend", fake_request_backend)

    ctx = SimpleNamespace(
        deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"),
    )

    result = await list_projects_module.list_projects(ctx)

    assert isinstance(result, ToolReturn)
    assert result.return_value == []
    assert result.metadata is None
