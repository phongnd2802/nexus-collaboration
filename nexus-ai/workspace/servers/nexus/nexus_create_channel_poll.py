from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_create_channel_poll(
    workspace_id: str,
    channel_id: str,
    question: str,
    options: list[Any],
    content: Optional[str] = None,
    content_html: Optional[str] = None,
    allow_multiple_choice: Optional[bool] = None,
    show_results_before_voting: Optional[bool] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Create a poll in a channel by sending a message with poll linked content.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        channel_id: required; string; Channel ID.
        question: required; string; Poll question.
        options: required; array; Poll options. Provide between 2 and 10 non-empty options.
        content: optional; string; Optional plaintext message that accompanies the poll.
        content_html: optional; string; Optional HTML message that accompanies the poll.
        allow_multiple_choice: optional; boolean; Whether voters can select multiple options.
        show_results_before_voting: optional; boolean; Whether poll results are visible before the user votes.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'channel_id': channel_id,
        'question': question,
        'options': options,
    }
    if content is not None:
        arguments['content'] = content
    if content_html is not None:
        arguments['content_html'] = content_html
    if allow_multiple_choice is not None:
        arguments['allow_multiple_choice'] = allow_multiple_choice
    if show_results_before_voting is not None:
        arguments['show_results_before_voting'] = show_results_before_voting
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_create_channel_poll', arguments)


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
        print("Testing nexus_create_channel_poll...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_create_channel_poll(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                channel_id=_get_env(['NEXUS_TEST_CHANNEL_ID']),
                question=_get_env(['NEXUS_TEST_QUESTION']),
                options=_get_json(['NEXUS_TEST_OPTIONS']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
