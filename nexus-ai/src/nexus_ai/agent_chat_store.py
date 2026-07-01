from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic_ai.messages import ModelMessagesTypeAdapter

from nexus_ai.storage.sqlite import SQLiteStore, decode_json, encode_json


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return uuid4().hex


@dataclass(frozen=True)
class ChatSession:
    id: str
    workspace_id: str
    user_id: str | None
    title: str
    metadata: dict[str, Any]
    updated_at: str


@dataclass(frozen=True)
class ChatMessage:
    id: str
    session_id: str
    workspace_id: str
    user_id: str | None
    role: str
    content: str | None
    parts: list[dict[str, Any]]
    model: str | None
    metadata: dict[str, Any]
    created_at: str


@dataclass(frozen=True)
class ChatEvent:
    id: str
    session_id: str
    workspace_id: str
    event_name: str
    payload: dict[str, Any]
    created_at: str


class AgentChatStore:
    def __init__(self, sqlite: SQLiteStore) -> None:
        self.sqlite = sqlite

    def get_or_create_session(self, workspace_id: str, user_id: str | None, session_id: str | None = None) -> ChatSession:
        if session_id:
            session = self.get_session(workspace_id, session_id)
            if session:
                return session
        session_id = session_id or new_id()
        now = utc_now_iso()
        with self.sqlite.connect() as conn:
            conn.execute(
                """
                INSERT INTO sessions (session_id, workspace_id, user_id, title, metadata, all_messages_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, workspace_id, user_id, "New conversation", "{}", None, now, now),
            )
        return ChatSession(
            id=session_id,
            workspace_id=workspace_id,
            user_id=user_id,
            title="New conversation",
            metadata={},
            updated_at=now,
        )

    def list_sessions(self, workspace_id: str, limit: int = 50) -> list[ChatSession]:
        with self.sqlite.connect() as conn:
            rows = conn.execute(
                """
                SELECT session_id, workspace_id, user_id, title, metadata, updated_at
                FROM sessions
                WHERE workspace_id = ?
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (workspace_id, limit),
            ).fetchall()
        return [self._session_from_row(row) for row in rows]

    def get_session(self, workspace_id: str, session_id: str) -> ChatSession | None:
        with self.sqlite.connect() as conn:
            row = conn.execute(
                """
                SELECT session_id, workspace_id, user_id, title, metadata, updated_at
                FROM sessions
                WHERE workspace_id = ? AND session_id = ?
                """,
                (workspace_id, session_id),
            ).fetchone()
        return self._session_from_row(row) if row else None

    def delete_session(self, workspace_id: str, session_id: str) -> None:
        with self.sqlite.connect() as conn:
            deleted = conn.execute(
                "DELETE FROM sessions WHERE workspace_id = ? AND session_id = ?",
                (workspace_id, session_id),
            ).rowcount
            conn.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM chat_events WHERE session_id = ?", (session_id,))
            conn.execute("DELETE FROM approval_decisions WHERE session_id = ?", (session_id,))
        if deleted == 0:
            raise KeyError(session_id)

    def add_message(
        self,
        session: ChatSession,
        role: str,
        content: str | None,
        *,
        user_id: str | None = None,
        parts: list[dict[str, Any]] | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ChatMessage:
        message = ChatMessage(
            id=new_id(),
            session_id=session.id,
            workspace_id=session.workspace_id,
            user_id=user_id,
            role=role,
            content=content,
            parts=parts or ([{"type": "text", "text": content}] if content else []),
            model=model,
            metadata=metadata or {},
            created_at=utc_now_iso(),
        )
        with self.sqlite.connect() as conn:
            conn.execute(
                """
                INSERT INTO chat_messages (id, session_id, workspace_id, user_id, role, content, parts, model, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    message.id,
                    message.session_id,
                    message.workspace_id,
                    message.user_id,
                    message.role,
                    message.content,
                    encode_json(message.parts),
                    message.model,
                    encode_json(message.metadata),
                    message.created_at,
                ),
            )
            title = session.title
            if role == "user" and content and title == "New conversation":
                title = content.strip()[:80]
            conn.execute(
                "UPDATE sessions SET title = ?, updated_at = ? WHERE session_id = ?",
                (title, message.created_at, session.id),
            )
        return message

    def messages_for_session(self, session_id: str) -> list[ChatMessage]:
        with self.sqlite.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, session_id, workspace_id, user_id, role, content, parts, model, metadata, created_at
                FROM chat_messages
                WHERE session_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (session_id,),
            ).fetchall()
        return [
            ChatMessage(
                id=row["id"],
                session_id=row["session_id"],
                workspace_id=row["workspace_id"],
                user_id=row["user_id"],
                role=row["role"],
                content=row["content"],
                parts=decode_json(row["parts"], []),
                model=row["model"],
                metadata=decode_json(row["metadata"], {}),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def add_event(self, session_id: str, workspace_id: str, event_name: str, payload: dict[str, Any]) -> ChatEvent:
        event = ChatEvent(
            id=new_id(),
            session_id=session_id,
            workspace_id=workspace_id,
            event_name=event_name,
            payload=payload,
            created_at=utc_now_iso(),
        )
        with self.sqlite.connect() as conn:
            conn.execute(
                """
                INSERT INTO chat_events (id, session_id, workspace_id, event_name, payload, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (event.id, event.session_id, event.workspace_id, event.event_name, encode_json(event.payload), event.created_at),
            )
            conn.execute(
                "UPDATE sessions SET updated_at = ? WHERE session_id = ?",
                (event.created_at, session_id),
            )
        return event

    def events_for_session(self, session_id: str, since_event_id: str | None = None) -> list[ChatEvent]:
        with self.sqlite.connect() as conn:
            rows = conn.execute(
                """
                SELECT id, session_id, workspace_id, event_name, payload, created_at
                FROM chat_events
                WHERE session_id = ?
                ORDER BY created_at ASC, id ASC
                """,
                (session_id,),
            ).fetchall()
        events = [
            ChatEvent(
                id=row["id"],
                session_id=row["session_id"],
                workspace_id=row["workspace_id"],
                event_name=row["event_name"],
                payload=decode_json(row["payload"], {}),
                created_at=row["created_at"],
            )
            for row in rows
        ]
        if not since_event_id:
            return events
        for index, event in enumerate(events):
            if event.id == since_event_id:
                return events[index + 1 :]
        return events

    def snapshot(self, workspace_id: str, session_id: str) -> dict[str, Any]:
        session = self.get_session(workspace_id, session_id)
        if not session:
            raise KeyError(session_id)
        messages = self.messages_for_session(session_id)
        return {
            "sessionId": session.id,
            "title": session.title,
            "items": [
                {"id": message.id, "role": message.role, "content": message.content, "createdAt": message.created_at}
                for message in messages
            ],
            "transcript": [
                {
                    "id": message.id,
                    "role": message.role,
                    "parts": message.parts,
                    "metadata": {"timestamp": message.created_at},
                }
                for message in messages
            ],
            "uiMessages": [
                {
                    "id": message.id,
                    "role": message.role,
                    "parts": message.parts,
                    "metadata": {"timestamp": message.created_at},
                }
                for message in messages
            ],
            "updatedAt": session.updated_at,
        }

    def upsert_approval_decision(
        self,
        session_id: str,
        workspace_id: str,
        approval_id: str,
        user_id: str | None,
        decision: str,
        idempotency_key: str,
        message: str | None = None,
    ) -> dict[str, Any]:
        now = utc_now_iso()
        record_id = new_id()
        with self.sqlite.connect() as conn:
            conn.execute(
                """
                INSERT INTO approval_decisions (id, session_id, workspace_id, approval_id, user_id, decision, idempotency_key, message, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(session_id, approval_id, idempotency_key)
                DO UPDATE SET decision = excluded.decision, message = excluded.message, status = excluded.status, updated_at = excluded.updated_at
                """,
                (
                    record_id,
                    session_id,
                    workspace_id,
                    approval_id,
                    user_id,
                    decision,
                    idempotency_key,
                    message,
                    "approved" if decision == "approved" else "rejected",
                    now,
                    now,
                ),
            )
            row = conn.execute(
                """
                SELECT session_id, workspace_id, approval_id, user_id, decision, idempotency_key, message, status
                FROM approval_decisions
                WHERE session_id = ? AND approval_id = ? AND idempotency_key = ?
                """,
                (session_id, approval_id, idempotency_key),
            ).fetchone()
        if not row:
            raise KeyError(session_id)
        return dict(row)

    def get_message_history(self, workspace_id: str, session_id: str) -> list[Any] | None:
        with self.sqlite.connect() as conn:
            row = conn.execute(
                "SELECT all_messages_json FROM sessions WHERE workspace_id = ? AND session_id = ?",
                (workspace_id, session_id),
            ).fetchone()
        if not row or row["all_messages_json"] is None:
            return None
        return ModelMessagesTypeAdapter.validate_json(row["all_messages_json"])

    def save_message_history(self, workspace_id: str, session_id: str, all_messages_json: bytes) -> None:
        with self.sqlite.connect() as conn:
            updated = conn.execute(
                "UPDATE sessions SET all_messages_json = ?, updated_at = ? WHERE workspace_id = ? AND session_id = ?",
                (all_messages_json, utc_now_iso(), workspace_id, session_id),
            ).rowcount
        if updated == 0:
            raise KeyError(session_id)

    def _session_from_row(self, row: Any) -> ChatSession:
        return ChatSession(
            id=row["session_id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            title=row["title"],
            metadata=decode_json(row["metadata"], {}),
            updated_at=row["updated_at"],
        )
