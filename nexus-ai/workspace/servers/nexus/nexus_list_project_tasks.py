from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_list_project_tasks(
    workspace_id: str,
    project_id: str,
    sprintId: Optional[str] = None,
    status: Optional[str] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    List tasks for a project, optionally filtered by sprint ID or status.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        project_id: required; string; Project ID.
        sprintId: optional; string; Optional sprint ID filter.
        status: optional; string; Optional task status filter.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'project_id': project_id,
    }
    if sprintId is not None:
        arguments['sprintId'] = sprintId
    if status is not None:
        arguments['status'] = status
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_list_project_tasks', arguments)


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
        print("Testing nexus_list_project_tasks...")
        try:
            result = await nexus_list_project_tasks(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                project_id=_get_env(['NEXUS_TEST_PROJECT_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
