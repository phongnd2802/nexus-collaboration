from typing import Any, Optional

try:
    from .server import call_tool, close
except ImportError:
    from server import call_tool, close


async def nexus_update_workspace_member_role(
    workspace_id: str,
    member_id: str,
    role: str,
    response_format: Optional[str] = None,
) -> str:
    """
    Update a workspace member role. Requires admin or owner permission.

    Args:
        workspace_id: required; string; Nexus workspace ID.
        member_id: required; string; Workspace member ID.
        role: required; string; New workspace role.
        response_format: optional; string; Output format. Use 'json' for structured processing or 'markdown' for readable summaries.


    Returns:
        Tool result as string.
    """
    arguments = {
        'workspace_id': workspace_id,
        'member_id': member_id,
        'role': role,
    }
    if response_format is not None:
        arguments['response_format'] = response_format
    return await call_tool('nexus_update_workspace_member_role', arguments)


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
        print("Testing nexus_update_workspace_member_role...")
        if os.environ.get("NEXUS_ALLOW_WRITE_TOOL_TEST") != "1":
            raise RuntimeError(
                "This tool can modify Nexus data. Set NEXUS_ALLOW_WRITE_TOOL_TEST=1 "
                "and provide explicit NEXUS_TEST_* env vars before testing it."
            )
        try:
            result = await nexus_update_workspace_member_role(
                workspace_id=_get_env(['NEXUS_TEST_WORKSPACE_ID', 'NEXUS_WORKSPACE_ID']),
                member_id=_get_env(['NEXUS_TEST_MEMBER_ID']),
                role=_get_env(['NEXUS_TEST_ROLE']),
            )
            print(str(result)[:1000])
        finally:
            await close()

    asyncio.run(test())
