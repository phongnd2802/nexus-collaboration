from __future__ import annotations

DESTRUCTIVE_MARKERS = {
    "delete",
    "remove",
    "archive",
    "unarchive",
    "restore",
    "invite",
    "update_workspace_member_role",
}

WRITE_MARKERS = {
    "create",
    "update",
    "send",
    "schedule",
    "share",
    "bookmark",
    "unbookmark",
    "add",
}


def is_destructive_tool(tool_name: str) -> bool:
    lower = tool_name.lower()
    return any(marker in lower for marker in DESTRUCTIVE_MARKERS)


def is_write_tool(tool_name: str) -> bool:
    lower = tool_name.lower()
    return is_destructive_tool(lower) or any(marker in lower for marker in WRITE_MARKERS)


def is_code_mode_eligible(tool_name: str) -> bool:
    return not is_write_tool(tool_name)

