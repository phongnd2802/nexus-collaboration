from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_search(
    workspace_id: str,
    q: str,
    types: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Run universal search across Nexus workspace content. Supports optional type/filter/sort parameters accepted by the backend search endpoint.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        q: required; string; Search query text.
        types: optional; string; Optional comma-separated content types.
        limit: optional; integer; Maximum number of items to return, between 1 and 100.
        offset: optional; integer; Offset for paginated results.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'q': q,
    }
    if types is not None:
        arguments['types'] = types
    if limit is not None:
        arguments['limit'] = limit
    if offset is not None:
        arguments['offset'] = offset
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_search', arguments)


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
        print("Testing nexus_search...")
        try:
            result = await nexus_search(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                q=_get_env(['NEXUS_TEST_Q']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
