from nexus_ai.storage import MemoryRepository, SQLiteStore, TodoRepository


def test_memory_and_todo_storage(tmp_path):
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

    todos = TodoRepository(store)
    todo_id = todos.add("workspace", "session", "Check MCP")
    todos.update_status(todo_id, "completed")
    records = todos.list("workspace", "session")
    assert records[0].status == "completed"

