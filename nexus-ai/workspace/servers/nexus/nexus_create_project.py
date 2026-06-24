from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_create_project(
    workspace_id: str,
    name: str,
    description: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    owner_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    estimated_hours: Optional[float] = None,
    budget: Optional[float] = None,
    is_template: Optional[bool] = None,
    kanban_stages: Optional[list[Any]] = None,
    attachments: Optional[dict[str, Any]] = None,
    collaborative_data: Optional[dict[str, Any]] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Create a project in a workspace.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        name: required; string; Project name.
        description: optional; string; Project description.
        type: optional; string; Project type.
        status: optional; string; Project status.
        priority: optional; string; Project priority.
        owner_id: optional; string; Owner user ID. Defaults to current user in backend.
        lead_id: optional; string; Lead user ID.
        start_date: optional; string; Project start date in ISO 8601 format.
        end_date: optional; string; Project end date in ISO 8601 format.
        estimated_hours: optional; number; Estimated hours for the project.
        budget: optional; number; Project budget.
        is_template: optional; boolean; Whether the project is a template.
        kanban_stages: optional; array; Custom kanban stages.
        attachments: optional; object; Linked notes, files, and events.
        collaborative_data: optional; object; Additional collaborative project metadata.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'name': name,
    }
    if description is not None:
        arguments['description'] = description
    if type is not None:
        arguments['type'] = type
    if status is not None:
        arguments['status'] = status
    if priority is not None:
        arguments['priority'] = priority
    if owner_id is not None:
        arguments['owner_id'] = owner_id
    if lead_id is not None:
        arguments['lead_id'] = lead_id
    if start_date is not None:
        arguments['start_date'] = start_date
    if end_date is not None:
        arguments['end_date'] = end_date
    if estimated_hours is not None:
        arguments['estimated_hours'] = estimated_hours
    if budget is not None:
        arguments['budget'] = budget
    if is_template is not None:
        arguments['is_template'] = is_template
    if kanban_stages is not None:
        arguments['kanban_stages'] = kanban_stages
    if attachments is not None:
        arguments['attachments'] = attachments
    if collaborative_data is not None:
        arguments['collaborative_data'] = collaborative_data
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_create_project', arguments)


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
        print("Testing nexus_create_project...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_create_project(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                name=_get_env(['NEXUS_TEST_NAME']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
