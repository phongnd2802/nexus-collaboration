from __future__ import annotations

from datetime import UTC, datetime

from nexus_ai.storage import MemoryStore


def current_time_instruction() -> str:
    return f"Current UTC time is {datetime.now(UTC).isoformat()}."


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
