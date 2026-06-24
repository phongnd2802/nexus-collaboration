from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_update_task(
    workspace_id: str,
    task_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    task_type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sprint_id: Optional[str] = None,
    parent_task_id: Optional[str] = None,
    assigned_to: Optional[list[Any]] = None,
    assignee_team_member_id: Optional[str] = None,
    reporter_team_member_id: Optional[str] = None,
    due_date: Optional[str] = None,
    story_points: Optional[float] = None,
    actual_hours: Optional[float] = None,
    labels: Optional[list[Any]] = None,
    attachments: Optional[dict[str, Any]] = None,
    custom_fields: Optional[list[Any]] = None,
    completed_by: Optional[str] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Update a task by ID.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        task_id: required; string; Task ID.
        title: optional; string; Task title.
        description: optional; string; Task description.
        task_type: optional; string; Task type.
        status: optional; string; Task status or kanban stage ID.
        priority: optional; string; Task priority.
        sprint_id: optional; string; Sprint ID.
        parent_task_id: optional; string; Parent task ID.
        assigned_to: optional; array; Assigned user IDs.
        assignee_team_member_id: optional; string; Assignee team member ID.
        reporter_team_member_id: optional; string; Reporter team member ID.
        due_date: optional; string; Task due date in ISO 8601 format.
        story_points: optional; number; Story points.
        actual_hours: optional; number; Actual hours spent.
        labels: optional; array; Task labels.
        attachments: optional; object; Linked notes, files, and events.
        custom_fields: optional; array; Per-task custom fields.
        completed_by: optional; string; User ID who completed the task.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'task_id': task_id,
    }
    if title is not None:
        arguments['title'] = title
    if description is not None:
        arguments['description'] = description
    if task_type is not None:
        arguments['task_type'] = task_type
    if status is not None:
        arguments['status'] = status
    if priority is not None:
        arguments['priority'] = priority
    if sprint_id is not None:
        arguments['sprint_id'] = sprint_id
    if parent_task_id is not None:
        arguments['parent_task_id'] = parent_task_id
    if assigned_to is not None:
        arguments['assigned_to'] = assigned_to
    if assignee_team_member_id is not None:
        arguments['assignee_team_member_id'] = assignee_team_member_id
    if reporter_team_member_id is not None:
        arguments['reporter_team_member_id'] = reporter_team_member_id
    if due_date is not None:
        arguments['due_date'] = due_date
    if story_points is not None:
        arguments['story_points'] = story_points
    if actual_hours is not None:
        arguments['actual_hours'] = actual_hours
    if labels is not None:
        arguments['labels'] = labels
    if attachments is not None:
        arguments['attachments'] = attachments
    if custom_fields is not None:
        arguments['custom_fields'] = custom_fields
    if completed_by is not None:
        arguments['completed_by'] = completed_by
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_update_task', arguments)


if __name__ == "__main__":
    import asyncio
    import json
    import os

    def _get_env(names: list[str]) -> str:
        for name in names:
            value = os.environ.get(name)
            if value:
                return value
        raise RuntimeError("Missing required test env var. Tried: " + ", ".join(names))

    def _get_int(names: list[str]) -> int:
        return int(_get_env(names))

    def _get_float(names: list[str]) -> float:
        return float(_get_env(names))

    def _get_bool(names: list[str]) -> bool:
        return _get_env(names).lower() in ("1", "true", "yes", "on")

    def _get_json(names: list[str]) -> Any:
        return json.loads(_get_env(names))

    async def test() -> None:
        print("Testing nexus_update_task...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_update_task(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                task_id=_get_env(['NEXUS_TEST_TASK_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
