from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from .sqlite import decode_json, encode_json


@dataclass(frozen=True)
class MemoryRecord:
    id: int | str
    memory_type: str
    content: str
    importance: int
    tags: list[str]
    metadata: dict[str, Any]


class MemoryStore(Protocol):
    async def add(
        self,
        workspace_id: str,
        session_id: str | None,
        user_id: str | None,
        memory_type: str,
        content: str,
        importance: int = 5,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> int | str: ...

    async def recent(
        self,
        workspace_id: str,
        session_id: str | None = None,
        user_id: str | None = None,
        limit: int = 10,
    ) -> list[MemoryRecord]: ...


class MemoryRepository:
    def __init__(self, store) -> None:
        self.store = store

    async def add(
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
        return await self.store.execute_insert_id(
            """
            INSERT INTO memories (workspace_id, session_id, user_id, memory_type, content, importance, tags, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            """,
            workspace_id,
            session_id,
            user_id,
            memory_type,
            content,
            importance,
            encode_json(tags or []),
            encode_json(metadata or {}),
        )

    async def recent(
        self,
        workspace_id: str,
        session_id: str | None = None,
        user_id: str | None = None,
        limit: int = 10,
    ) -> list[MemoryRecord]:
        params: list[object] = [workspace_id, user_id]
        clause = "workspace_id = $1 AND (user_id = $2 OR user_id IS NULL)"
        if session_id:
            clause += " AND (session_id = $3 OR session_id IS NULL)"
            params.append(session_id)
            limit_param = "$4"
        else:
            limit_param = "$3"
        params.append(limit)
        rows = await self.store.fetch_all(
            f"SELECT * FROM memories WHERE {clause} ORDER BY importance DESC, created_at DESC LIMIT {limit_param}",
            *params,
        )

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
