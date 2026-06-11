from nexus_mcp.tools.registry import call_tool, list_tool_definitions
import pytest


def test_lists_initial_tools() -> None:
    names = {tool.name for tool in list_tool_definitions()}
    assert {
        "get_current_date_time",
        "list_workspace_members",
        "list_projects",
        "list_tasks",
        "create_task",
        "update_task_status",
        "update_task",
        "delete_task",
        "create_project",
        "update_project",
        "delete_project",
        "get_project_details",
    }.issubset(names)



@pytest.mark.asyncio
async def test_tool_requires_trusted_context() -> None:
    try:
        await call_tool("get_current_date_time", {})
    except ValueError as exc:
        assert "Missing trusted Nexus context" in str(exc)
    else:
        raise AssertionError("Expected missing context error")
