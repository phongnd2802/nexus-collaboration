from types import SimpleNamespace
import importlib

import pytest
from fastapi import HTTPException

update_project_module = importlib.import_module("app.tools.projects.update_project")


@pytest.mark.asyncio
async def test_update_project_tool_prefers_form_data_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    async def fake_request_backend(**kwargs: object) -> dict[str, object]:
        captured.update(kwargs)
        return {"id": "proj_1", "name": "Renamed Project"}

    monkeypatch.setattr(update_project_module, "request_backend", fake_request_backend)

    ctx = SimpleNamespace(
        deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"),
        tool_call_metadata={
            "form_data": {
                "project_id": "proj_1",
                "name": "Renamed Project",
                "lead_id": "user_9",
                "kanban_stages": [{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}],
                "collaborative_data": {"default_assignee_ids": ["user_2"]},
            }
        },
    )

    result = await update_project_module.update_project(ctx, "ignored_project_id", name="Ignored")

    assert captured["path"] == "/projects/proj_1"
    assert captured["body"] == {
        "name": "Renamed Project",
        "lead_id": "user_9",
        "kanban_stages": [{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}],
        "collaborative_data": {"default_assignee_ids": ["user_2"]},
    }
    assert result == {"id": "proj_1", "name": "Renamed Project"}


@pytest.mark.asyncio
async def test_update_project_tool_requires_at_least_one_change() -> None:
    ctx = SimpleNamespace(
        deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"),
        tool_call_metadata={"form_data": {"project_id": "proj_1"}},
    )

    with pytest.raises(HTTPException) as error:
        await update_project_module.update_project(ctx, "proj_1")

    assert error.value.status_code == 400
    assert error.value.detail == "At least one project field must be provided"
