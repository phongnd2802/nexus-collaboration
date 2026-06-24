from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_create_note(
    workspace_id: str,
    title: str,
    content: str,
    parent_id: Optional[str] = None,
    tags: Optional[list[Any]] = None,
    is_public: Optional[bool] = None,
    attachments: Optional[dict[str, Any]] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Create a Nexus note with title and content, and optional parent note, tags, cover image, icon, public flag, and attachments.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        title: required; string
        content: required; string
        parent_id: optional; string
        tags: optional; array
        is_public: optional; boolean
        attachments: optional; object
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'title': title,
        'content': content,
    }
    if parent_id is not None:
        arguments['parent_id'] = parent_id
    if tags is not None:
        arguments['tags'] = tags
    if is_public is not None:
        arguments['is_public'] = is_public
    if attachments is not None:
        arguments['attachments'] = attachments
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_create_note', arguments)


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
        print("Testing nexus_create_note...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_create_note(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                title=_get_env(['NEXUS_TEST_TITLE']),
                content=_get_env(['NEXUS_TEST_CONTENT']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
