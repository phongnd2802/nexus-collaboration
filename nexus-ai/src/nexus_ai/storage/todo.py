from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .sqlite import SQLiteStore, decode_json, encode_json


@dataclass(frozen=True)
class TodoRecord:
    id: int
    title: str
    status: str
    parent_id: int | None
    metadata: dict[str, Any]


class TodoRepository:
    def __init__(self, store: SQLiteStore) -> None:
        self.store = store

    def add(self, workspace_id: str, session_id: str, title: str, parent_id: int | None = None, metadata: dict[str, Any] | None = None) -> int:
        with self.store.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO todos (workspace_id, session_id, parent_id, title, metadata)
                VALUES (?, ?, ?, ?, ?)
                """,
                (workspace_id, session_id, parent_id, title, encode_json(metadata or {})),
            )
            return int(cursor.lastrowid)

    def update_status(self, todo_id: int, status: str) -> None:
        with self.store.connect() as conn:
            conn.execute(
                "UPDATE todos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, todo_id),
            )

    def list(self, workspace_id: str, session_id: str) -> list[TodoRecord]:
        with self.store.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM todos WHERE workspace_id = ? AND session_id = ? ORDER BY created_at ASC",
                (workspace_id, session_id),
            ).fetchall()
        return [
            TodoRecord(
                id=int(row["id"]),
                title=row["title"],
                status=row["status"],
                parent_id=row["parent_id"],
                metadata=decode_json(row["metadata"], {}),
            )
            for row in rows
        ]

