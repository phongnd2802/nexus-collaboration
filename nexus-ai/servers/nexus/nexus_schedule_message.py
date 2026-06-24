from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_schedule_message(
    workspace_id: str,
    content: str,
    scheduledAt: str,
    contentHtml: Optional[str] = None,
    channelId: Optional[str] = None,
    threadId: Optional[str] = None,
    parentId: Optional[str] = None,
    attachments: Optional[list[Any]] = None,
    mentions: Optional[list[Any]] = None,
    linkedContent: Optional[list[Any]] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Schedule a channel message to be sent later.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        content: required; string; Message content.
        scheduledAt: required; string; Scheduled send time in ISO 8601 format.
        contentHtml: optional; string; HTML formatted content.
        channelId: optional; string; Channel ID for scheduled channel messages.
        threadId: optional; string; Root thread message ID if scheduling a thread reply.
        parentId: optional; string; Direct parent message ID if scheduling a reply.
        attachments: optional; array; File attachments with metadata.
        mentions: optional; array; Mentioned user IDs.
        linkedContent: optional; array; Linked notes, events, files, drive items, or polls. For polls, provide a full poll object in linkedContent[].poll.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'content': content,
        'scheduledAt': scheduledAt,
    }
    if contentHtml is not None:
        arguments['contentHtml'] = contentHtml
    if channelId is not None:
        arguments['channelId'] = channelId
    if threadId is not None:
        arguments['threadId'] = threadId
    if parentId is not None:
        arguments['parentId'] = parentId
    if attachments is not None:
        arguments['attachments'] = attachments
    if mentions is not None:
        arguments['mentions'] = mentions
    if linkedContent is not None:
        arguments['linkedContent'] = linkedContent
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_schedule_message', arguments)


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
        print("Testing nexus_schedule_message...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_schedule_message(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                content=_get_env(['NEXUS_TEST_CONTENT']),
                scheduledAt=_get_env(['NEXUS_TEST_SCHEDULED_AT']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
