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
        "list_calendar_events",
        "list_upcoming_events",
        "search_calendar_events",
        "create_calendar_event",
        "get_calendar_event",
        "update_calendar_event",
        "delete_calendar_event",
        "respond_to_calendar_event",
        "list_notes",
        "search_notes",
        "create_note",
        "get_note",
        "update_note",
        "delete_note",
        "archive_note",
        "unarchive_note",
        "restore_note",
        "duplicate_note",
        "share_note",
        "merge_notes",
        "list_folders",
        "create_folder",
        "update_folder",
        "move_folder",
        "delete_folder",
        "restore_folder",
        "list_files",
        "search_files",
        "list_recent_files",
        "list_starred_files",
        "get_file",
        "update_file",
        "move_file",
        "copy_file",
        "delete_file",
        "restore_file",
        "share_file",
        "universal_search",
        "search_suggestions",
        "semantic_search",
        "find_similar_content",
    }.issubset(names)



@pytest.mark.asyncio
async def test_tool_requires_trusted_context() -> None:
    try:
        await call_tool("get_current_date_time", {})
    except ValueError as exc:
        assert "Missing trusted Nexus context" in str(exc)
    else:
        raise AssertionError("Expected missing context error")
