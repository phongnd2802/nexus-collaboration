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

    sessions.upsert(
        session_id="session",
        workspace_id="workspace",
        user_id="other-user",
        title="Other",
        messages=[],
        ui_messages=[],
    )
    sessions.upsert(
        session_id="session",
        workspace_id="other-workspace",
        user_id="user",
        title="Legacy",
        messages=[],
        ui_messages=[],
    )

    listed = sessions.list("workspace", "user")
    assert len(listed) == 1
    assert listed[0].session_id == "session"
    assert listed[0].ui_messages[0]["role"] == "user"
    assert sessions.list("workspace", "other-user")[0].title == "Other"
    assert sessions.list("other-workspace", "user")[0].title == "Legacy"

    record = sessions.get("workspace", "session", "user")
    assert record is not None
    assert record.title == "Hello"
    assert sessions.exists("workspace", "session") is True
    assert sessions.get("workspace", "session", "other-user") is not None
    assert sessions.get("other-workspace", "session", "user") is not None
    assert sessions.delete("workspace", "other-session", "user") is False
    assert sessions.delete("workspace", "session", "user") is True
    assert sessions.delete("workspace", "session", "other-user") is True
    assert sessions.exists("workspace", "session") is False
    assert sessions.get("workspace", "session", "user") is None
