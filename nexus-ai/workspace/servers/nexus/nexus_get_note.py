from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_get_note(
    workspace_id: str,
    note_id: str,
    include_deleted: Optional[bool] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Get note details by ID.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        note_id: required; string; Note ID.
        include_deleted: optional; boolean; Whether to include soft-deleted notes.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'note_id': note_id,
    }
    if include_deleted is not None:
        arguments['include_deleted'] = include_deleted
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_get_note', arguments)


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
        print("Testing nexus_get_note...")
        try:
            result = await nexus_get_note(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                note_id=_get_env(['NEXUS_TEST_NOTE_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
