from __future__ import annotations

from nexus_ai.storage import MemoryStore
from nexus_ai.settings import Settings


def current_time_instruction(settings: Settings) -> str:
    current_time = settings.current_datetime()
    return (
        f"Current local time for the user is {current_time.isoformat()} in timezone {settings.timezone}. "
        "Interpret natural-language dates and times such as today, tomorrow, this afternoon, or 9am using this timezone unless the user specifies another one. "
        "For any Nexus tool that takes time-related arguments, send exact values that match this timezone. "
        "When a tool expects a datetime, use ISO 8601 with an explicit offset or Z. "
        "When a tool expects a date-only filter, use YYYY-MM-DD and do not send a datetime."
    )


async def memory_instruction(memory: MemoryStore, workspace_id: str, session_id: str, user_id: str | None) -> str:
    records = await memory.recent(workspace_id=workspace_id, session_id=session_id, user_id=user_id, limit=8)
    if not records:
        return "No private AI memories are currently available for this user."

    lines = [
        "Private AI memory for this user. These entries are internal chat context, not Nexus notes:"
    ]
    for record in records:
        lines.append(f"- ({record.memory_type}, importance {record.importance}) {record.content}")
    return "\n".join(lines)
