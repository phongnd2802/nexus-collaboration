from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_send_channel_message(
    workspace_id: str,
    channel_id: str,
    content: Optional[str] = None,
    content_html: Optional[str] = None,
    encrypted_content: Optional[str] = None,
    encryption_metadata: Optional[dict[str, Any]] = None,
    is_encrypted: Optional[bool] = None,
    thread_id: Optional[str] = None,
    parent_id: Optional[str] = None,
    attachments: Optional[list[Any]] = None,
    mentions: Optional[list[Any]] = None,
    linked_content: Optional[list[Any]] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Send a message to a channel.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        channel_id: required; string; Channel ID.
        content: optional; string; Plaintext message content. Usually provided for normal messages.
        content_html: optional; string; HTML formatted message content for rich text.
        encrypted_content: optional; string; Encrypted message content. Use with encryption_metadata and is_encrypted=true.
        encryption_metadata: optional; object; Encryption metadata for end-to-end encrypted messages.
        is_encrypted: optional; boolean; Whether this message is end-to-end encrypted.
        thread_id: optional; string; Root message ID of the thread. For the first reply in a thread, this is usually the same as parent_id.
        parent_id: optional; string; Direct parent message ID being replied to.
        attachments: optional; array; File attachments with metadata.
        mentions: optional; array; Mentioned user IDs.
        linked_content: optional; array; Linked notes, events, files, drive items, or polls.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'channel_id': channel_id,
    }
    if content is not None:
        arguments['content'] = content
    if content_html is not None:
        arguments['content_html'] = content_html
    if encrypted_content is not None:
        arguments['encrypted_content'] = encrypted_content
    if encryption_metadata is not None:
        arguments['encryption_metadata'] = encryption_metadata
    if is_encrypted is not None:
        arguments['is_encrypted'] = is_encrypted
    if thread_id is not None:
        arguments['thread_id'] = thread_id
    if parent_id is not None:
        arguments['parent_id'] = parent_id
    if attachments is not None:
        arguments['attachments'] = attachments
    if mentions is not None:
        arguments['mentions'] = mentions
    if linked_content is not None:
        arguments['linked_content'] = linked_content
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_send_channel_message', arguments)


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
        print("Testing nexus_send_channel_message...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_send_channel_message(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                channel_id=_get_env(['NEXUS_TEST_CHANNEL_ID']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
