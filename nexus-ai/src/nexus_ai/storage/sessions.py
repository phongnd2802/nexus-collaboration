from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .sqlite import SQLiteStore, decode_json, encode_json


@dataclass(frozen=True)
class SessionRecord:
    row_id: int
    session_id: str
    workspace_id: str
    user_id: str
    title: str
    messages: list[dict[str, Any]]
    ui_messages: list[dict[str, Any]]
    metadata: dict[str, Any]
    updated_at: str


class SessionRepository:
    def __init__(self, store: SQLiteStore) -> None:
        self.store = store

    def upsert(
        self,
        session_id: str,
        workspace_id: str,
        user_id: str,
        title: str,
        metadata: dict[str, Any] | None = None,
        messages: list[dict[str, Any]] | None = None,
        ui_messages: list[dict[str, Any]] | None = None,
    ) -> None:
        with self.store.connect() as conn:
            conn.execute(
                """
                INSERT INTO sessions (session_id, workspace_id, user_id, title, messages, ui_messages, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(workspace_id, user_id, session_id) DO UPDATE SET
                  workspace_id = excluded.workspace_id,
                  user_id = excluded.user_id,
                  title = excluded.title,
                  messages = excluded.messages,
                  ui_messages = excluded.ui_messages,
                  metadata = excluded.metadata,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (
                    session_id,
                    workspace_id,
                    user_id,
                    title,
                    encode_json(messages or []),
                    encode_json(ui_messages or []),
                    encode_json(metadata or {}),
                ),
            )

    def list(self, workspace_id: str, user_id: str, limit: int = 50) -> list[SessionRecord]:
        with self.store.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE workspace_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT ?",
                (workspace_id, user_id, limit),
            ).fetchall()
        return [self._record_from_row(row) for row in rows]

    def get(self, workspace_id: str, session_id: str, user_id: str) -> SessionRecord | None:
        with self.store.connect() as conn:
            row = conn.execute(
                "SELECT * FROM sessions WHERE workspace_id = ? AND session_id = ? AND user_id = ?",
                (workspace_id, session_id, user_id),
            ).fetchone()
        if row is None:
            return None
        return self._record_from_row(row)

    def exists(self, workspace_id: str, session_id: str) -> bool:
        with self.store.connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM sessions WHERE workspace_id = ? AND session_id = ?",
                (workspace_id, session_id),
            ).fetchone()
        return row is not None

    def delete(self, workspace_id: str, session_id: str, user_id: str) -> bool:
        with self.store.connect() as conn:
            cursor = conn.execute(
                "DELETE FROM sessions WHERE workspace_id = ? AND session_id = ? AND user_id = ?",
                (workspace_id, session_id, user_id),
            )
            return cursor.rowcount > 0

    def _record_from_row(self, row: Any) -> SessionRecord:
        return SessionRecord(
            row_id=int(row["id"]),
            session_id=row["session_id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            title=row["title"],
            messages=decode_json(row["messages"], []),
            ui_messages=decode_json(row["ui_messages"], []),
            metadata=decode_json(row["metadata"], {}),
            updated_at=row["updated_at"],
        )
