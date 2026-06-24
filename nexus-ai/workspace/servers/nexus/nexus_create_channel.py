from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_create_channel(
    workspace_id: str,
    name: str,
    description: Optional[str] = None,
    type: Optional[str] = None,
    is_private: Optional[bool] = None,
    member_ids: Optional[list[Any]] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Create a new channel in a workspace. Accepts name, optional description, optional type, private flag, and optional member IDs for private channels.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        name: required; string; Channel name.
        description: optional; string; Channel description.
        type: optional; string; Channel type.
        is_private: optional; boolean; Whether this channel is private.
        member_ids: optional; array; User IDs to add as members for private channels.
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
    if is_private is not None:
        arguments['is_private'] = is_private
    if member_ids is not None:
        arguments['member_ids'] = member_ids
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_create_channel', arguments)


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
        print("Testing nexus_create_channel...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_create_channel(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                name=_get_env(['NEXUS_TEST_NAME']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
