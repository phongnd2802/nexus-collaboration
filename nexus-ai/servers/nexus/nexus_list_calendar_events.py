from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_list_calendar_events(
    workspace_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    statuses: Optional[str] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    List calendar events in a workspace with date range and optional text/status/category filters.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        start_date: optional; string; Optional ISO start date filter.
        end_date: optional; string; Optional ISO end date filter.
        search: optional; string; Optional search query for title or description.
        statuses: optional; string; Optional comma-separated statuses.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
    }
    if start_date is not None:
        arguments['start_date'] = start_date
    if end_date is not None:
        arguments['end_date'] = end_date
    if search is not None:
        arguments['search'] = search
    if statuses is not None:
        arguments['statuses'] = statuses
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_list_calendar_events', arguments)


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
        print("Testing nexus_list_calendar_events...")
        try:
            result = await nexus_list_calendar_events(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
