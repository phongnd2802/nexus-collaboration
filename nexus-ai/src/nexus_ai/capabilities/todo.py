from __future__ import annotations

from nexus_ai.storage import SQLiteStore, TodoRepository


def create_todo_repository(store: SQLiteStore) -> TodoRepository:
    return TodoRepository(store)

