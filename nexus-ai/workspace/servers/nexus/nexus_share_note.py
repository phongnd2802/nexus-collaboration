from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_share_note(
    workspace_id: str,
    note_id: str,
    user_ids: list[Any],
    permission: Optional[str] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Share a note with workspace members by user IDs.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        note_id: required; string; Note ID.
        user_ids: required; array
        permission: optional; string
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'note_id': note_id,
        'user_ids': user_ids,
    }
    if permission is not None:
        arguments['permission'] = permission
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_share_note', arguments)


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
        print("Testing nexus_share_note...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_share_note(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                note_id=_get_env(['NEXUS_TEST_NOTE_ID']),
                user_ids=_get_json(['NEXUS_TEST_USER_IDS']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
