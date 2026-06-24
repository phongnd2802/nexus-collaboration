from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .sqlite import SQLiteStore, decode_json, encode_json


@dataclass(frozen=True)
class MemoryRecord:
    id: int
    memory_type: str
    content: str
    importance: int
    tags: list[str]
    metadata: dict[str, Any]


class MemoryRepository:
    def __init__(self, store: SQLiteStore) -> None:
        self.store = store

    def add(
        self,
        workspace_id: str,
        session_id: str | None,
        user_id: str | None,
        memory_type: str,
        content: str,
        importance: int = 5,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> int:
        with self.store.connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO memories (workspace_id, session_id, user_id, memory_type, content, importance, tags, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    workspace_id,
                    session_id,
                    user_id,
                    memory_type,
                    content,
                    importance,
                    encode_json(tags or []),
                    encode_json(metadata or {}),
                ),
            )
            return int(cursor.lastrowid)

    def recent(self, workspace_id: str, session_id: str | None = None, limit: int = 10) -> list[MemoryRecord]:
        params: list[object] = [workspace_id]
        clause = "workspace_id = ?"
        if session_id:
            clause += " AND (session_id = ? OR session_id IS NULL)"
            params.append(session_id)
        params.append(limit)

        with self.store.connect() as conn:
            rows = conn.execute(
                f"SELECT * FROM memories WHERE {clause} ORDER BY importance DESC, created_at DESC LIMIT ?",
                params,
            ).fetchall()

        return [
            MemoryRecord(
                id=int(row["id"]),
                memory_type=row["memory_type"],
                content=row["content"],
                importance=int(row["importance"]),
                tags=decode_json(row["tags"], []),
                metadata=decode_json(row["metadata"], {}),
            )
            for row in rows
        ]

