from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .json_codec import decode_json, encode_json


@dataclass(frozen=True)
class SessionRecord:
    session_id: str
    workspace_id: str
    user_id: str | None
    title: str
    metadata: dict[str, Any]


class SessionRepository:
    def __init__(self, store) -> None:
        self.store = store

    def upsert(self, session_id: str, workspace_id: str, user_id: str | None, title: str, metadata: dict[str, Any] | None = None) -> None:
        with self.store.connect() as conn:
            conn.execute(
                """
                INSERT INTO sessions (session_id, workspace_id, user_id, title, metadata)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                  workspace_id = excluded.workspace_id,
                  user_id = excluded.user_id,
                  title = excluded.title,
                  metadata = excluded.metadata,
                  updated_at = CURRENT_TIMESTAMP
                """,
                (session_id, workspace_id, user_id, title, encode_json(metadata or {})),
            )

    def list(self, workspace_id: str, limit: int = 50) -> list[SessionRecord]:
        with self.store.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM sessions WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT ?",
                (workspace_id, limit),
            ).fetchall()
        return [
            SessionRecord(
                session_id=row["session_id"],
                workspace_id=row["workspace_id"],
                user_id=row["user_id"],
                title=row["title"],
                metadata=decode_json(row["metadata"], {}),
            )
            for row in rows
        ]
