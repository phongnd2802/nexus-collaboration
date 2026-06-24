from __future__ import annotations

from datetime import UTC, datetime

from nexus_ai.storage import MemoryRepository


def current_time_instruction() -> str:
    return f"Current UTC time is {datetime.now(UTC).isoformat()}."


def memory_instruction(memory: MemoryRepository, workspace_id: str, session_id: str) -> str:
    records = memory.recent(workspace_id=workspace_id, session_id=session_id, limit=8)
    if not records:
        return "No stored Nexus AI memories are currently available."

    lines = ["Relevant stored memories:"]
    for record in records:
        lines.append(f"- ({record.memory_type}, importance {record.importance}) {record.content}")
    return "\n".join(lines)

