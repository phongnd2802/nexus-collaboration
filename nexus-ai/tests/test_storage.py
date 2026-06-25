from nexus_ai.storage import MemoryRepository, SessionRepository, SQLiteStore


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


def test_session_storage(tmp_path):
    store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
    store.initialize()

    sessions = SessionRepository(store)
    sessions.upsert(
        session_id="session",
        workspace_id="workspace",
        user_id="user",
        title="Hello",
        messages=[{"kind": "request"}],
        ui_messages=[{"role": "user", "parts": [{"type": "text", "text": "Hello"}]}],
    )

    listed = sessions.list("workspace")
    assert len(listed) == 1
    assert listed[0].session_id == "session"
    assert listed[0].ui_messages[0]["role"] == "user"

    record = sessions.get("workspace", "session")
    assert record is not None
    assert record.title == "Hello"
    assert sessions.delete("workspace", "session") is True
    assert sessions.get("workspace", "session") is None
