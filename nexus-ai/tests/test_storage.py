from nexus_ai.storage import MemoryRepository, SQLiteStore


def test_memory_storage(tmp_path):
    store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
    store.initialize()

    memory = MemoryRepository(store)
    memory_id = memory.add(
        workspace_id="workspace",
        session_id="session",
        user_id=None,
        memory_type="preference",
        content="Prefers concise summaries",
        importance=8,
    )
    assert memory_id > 0
    assert memory.recent("workspace", "session")[0].content == "Prefers concise summaries"
