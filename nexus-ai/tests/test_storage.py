import asyncio
from datetime import datetime, timezone

from nexus_ai.agent_chat_store import _timestamp
from nexus_ai.storage import MemoryRepository, SQLiteStore


def test_memory_storage(tmp_path):
    async def run():
        store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
        store.initialize()

        memory = MemoryRepository(store)
        memory_id = await memory.add(
            workspace_id="workspace",
            session_id="session",
            user_id="user-1",
            memory_type="preference",
            content="Prefers concise summaries",
            importance=8,
        )
        assert memory_id > 0
        assert (await memory.recent("workspace", "session", "user-1"))[0].content == "Prefers concise summaries"
        assert await memory.recent("workspace", "session", "user-2") == []

    asyncio.run(run())


def test_timestamp_parses_iso_string():
    parsed = _timestamp("2026-07-01T11:57:59.849736+00:00")
    assert isinstance(parsed, datetime)
    assert parsed.tzinfo == timezone.utc
