from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_list_notes(
    workspace_id: str,
    parent_id: Optional[str] = None,
    is_deleted: Optional[bool] = None,
    is_archived: Optional[bool] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    List notes in a workspace, optionally filtering by parent, deleted status, or archived status.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        parent_id: optional; string; Optional parent note/folder ID.
        is_deleted: optional; boolean; True for deleted notes, false for active notes.
        is_archived: optional; boolean; True for archived notes, false for non-archived notes.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
    }
    if parent_id is not None:
        arguments['parent_id'] = parent_id
    if is_deleted is not None:
        arguments['is_deleted'] = is_deleted
    if is_archived is not None:
        arguments['is_archived'] = is_archived
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_list_notes', arguments)


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
        print("Testing nexus_list_notes...")
        try:
            result = await nexus_list_notes(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
