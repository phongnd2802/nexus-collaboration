from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_get_scheduled_messages(
    workspace_id: str,
    status: Optional[str] = None,
    channelId: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    List scheduled channel messages for the current user, optionally filtered by status or channel.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        status: optional; string; Optional status filter.
        channelId: optional; string; Optional channel filter.
        limit: optional; integer; Maximum number of items to return, between 1 and 100.
        offset: optional; integer; Number of items to skip for offset pagination.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
    }
    if status is not None:
        arguments['status'] = status
    if channelId is not None:
        arguments['channelId'] = channelId
    if limit is not None:
        arguments['limit'] = limit
    if offset is not None:
        arguments['offset'] = offset
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_get_scheduled_messages', arguments)


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
        print("Testing nexus_get_scheduled_messages...")
        try:
            result = await nexus_get_scheduled_messages(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
