from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_invite_workspace_member(
    workspace_id: str,
    email: str,
    role: Optional[str] = None,
    message: Optional[str] = None,
    response_format: Optional[str] = None,
) -> str:
    """
    Invite a member to a workspace. Requires admin or owner permission. Accepts email, optional role, and optional message.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        email: required; string; Email address to invite.
        role: optional; string; Workspace role for the invited member.
        message: optional; string; Optional invitation message.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'email': email,
    }
    if role is not None:
        arguments['role'] = role
    if message is not None:
        arguments['message'] = message
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_invite_workspace_member', arguments)


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
        print("Testing nexus_invite_workspace_member...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_invite_workspace_member(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                email=_get_env(['NEXUS_TEST_EMAIL']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
