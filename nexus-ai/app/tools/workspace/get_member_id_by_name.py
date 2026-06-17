from typing import Any

from fastapi import HTTPException
from pydantic_ai import RunContext

from app.tools.backend_client import request_backend
from app.tools.utils import log_tool_result


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def _member_summary(member: dict[str, Any]) -> dict[str, Any]:
    user = member.get("user") or {}
    return {
        "user_id": member.get("user_id"),
        "name": user.get("name"),
        "username": user.get("username"),
        "email": user.get("email"),
        "role": member.get("role"),
    }


def _unique_matches(members: list[dict[str, Any]], needle: str, field: str) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    seen_user_ids: set[str] = set()

    for member in members:
        user = member.get("user") or {}
        if _normalize(user.get(field)) != needle:
            continue

        user_id = member.get("user_id")
        if not user_id or user_id in seen_user_ids:
            continue

        seen_user_ids.add(user_id)
        matches.append(member)

    return matches


async def get_member_id_by_name(ctx: RunContext[Any], name: str) -> dict[str, Any]:
    """Resolve one workspace member user_id from exact name, username, or email match."""
    needle = _normalize(name)
    if not needle:
        raise HTTPException(status_code=400, detail="name must not be empty")

    members = await request_backend(
        user_id=ctx.deps.user_id,
        workspace_id=ctx.deps.workspace_id,
        method="GET",
        path="/members",
    )

    if not isinstance(members, list):
        raise HTTPException(status_code=500, detail="Unexpected workspace members response")

    for field in ("name", "username", "email"):
        matches = _unique_matches(members, needle, field)
        if len(matches) == 1:
            match = matches[0]
            return log_tool_result("get_member_id_by_name", {
                "matched": True,
                "user_id": match.get("user_id"),
                "member": _member_summary(match),
                "matched_by": field,
            })
        if len(matches) > 1:
            return log_tool_result("get_member_id_by_name", {
                "matched": False,
                "reason": "ambiguous",
                "matched_by": field,
                "candidates": [_member_summary(member) for member in matches],
            })

    return log_tool_result("get_member_id_by_name", {
        "matched": False,
        "reason": "not_found",
        "candidates": [],
    })
