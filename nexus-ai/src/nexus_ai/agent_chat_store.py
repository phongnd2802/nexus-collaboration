from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic_ai.messages import ModelMessagesTypeAdapter

from nexus_ai.policies import is_destructive_tool, is_write_tool
from nexus_ai.storage.sqlite import decode_json, encode_json


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


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
    def __init__(self, store) -> None:
        self.store = store

    async def initialize(self) -> None:
        initialize = getattr(self.store, "initialize", None)
        if initialize:
            result = initialize()
            if hasattr(result, "__await__"):
                await result

    async def get_or_create_session(
        self,
        workspace_id: str,
        user_id: str | None,
        session_id: str | None = None,
    ) -> ChatSession:
        await self.initialize()
        if session_id:
            session = await self.get_session(workspace_id, session_id, user_id)
            if session:
                return session
        session_id = session_id or new_id()
        now = utc_now()
        await self.store.execute(
            """
            INSERT INTO sessions (session_id, workspace_id, user_id, title, metadata, all_messages_json, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            session_id,
            workspace_id,
            user_id,
            "New conversation",
            encode_json({}),
            None,
            now,
            now,
        )
        return ChatSession(session_id, workspace_id, user_id, "New conversation", {}, _iso(now))

    async def list_sessions(self, workspace_id: str, user_id: str | None, limit: int = 50) -> list[ChatSession]:
        await self.initialize()
        rows = await self.store.fetch_all(
            """
            SELECT session_id, workspace_id, user_id, title, metadata, updated_at
            FROM sessions
            WHERE workspace_id = $1 AND user_id = $2
            ORDER BY updated_at DESC
            LIMIT $3
            """,
            workspace_id,
            user_id,
            limit,
        )
        return [self._session_from_row(row) for row in rows]

    async def get_session(self, workspace_id: str, session_id: str, user_id: str | None) -> ChatSession | None:
        await self.initialize()
        row = await self.store.fetch_one(
            """
            SELECT session_id, workspace_id, user_id, title, metadata, updated_at
            FROM sessions
            WHERE workspace_id = $1 AND session_id = $2 AND user_id = $3
            """,
            workspace_id,
            session_id,
            user_id,
        )
        return self._session_from_row(row) if row else None

    async def delete_session(self, workspace_id: str, session_id: str, user_id: str | None) -> None:
        await self.initialize()
        session = await self.get_session(workspace_id, session_id, user_id)
        if not session:
            raise KeyError(session_id)
        await self.store.execute("DELETE FROM chat_messages WHERE session_id = $1", session_id)
        await self.store.execute("DELETE FROM chat_events WHERE session_id = $1", session_id)
        await self.store.execute("DELETE FROM approval_decisions WHERE session_id = $1", session_id)
        await self.store.execute(
            "DELETE FROM sessions WHERE workspace_id = $1 AND session_id = $2 AND user_id = $3",
            workspace_id,
            session_id,
            user_id,
        )

    async def add_message(
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
        await self.initialize()
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
            created_at=_iso(utc_now()),
        )
        created_at = _timestamp(message.created_at)
        await self.store.execute(
            """
            INSERT INTO chat_messages (id, session_id, workspace_id, user_id, role, content, parts, model, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
            message.id,
            message.session_id,
            message.workspace_id,
            message.user_id,
            message.role,
            message.content,
            encode_json(message.parts),
            message.model,
            encode_json(message.metadata),
            created_at,
        )
        title = content.strip()[:80] if role == "user" and content and session.title == "New conversation" else session.title
        await self.store.execute(
            "UPDATE sessions SET title = $1, updated_at = $2 WHERE session_id = $3",
            title,
            created_at,
            session.id,
        )
        return message

    async def messages_for_session(self, session_id: str) -> list[ChatMessage]:
        await self.initialize()
        rows = await self.store.fetch_all(
            """
            SELECT id, session_id, workspace_id, user_id, role, content, parts, model, metadata, created_at
            FROM chat_messages
            WHERE session_id = $1
            ORDER BY created_at ASC, id ASC
            """,
            session_id,
        )
        return [self._message_from_row(row) for row in rows]

    async def add_event(self, session_id: str, workspace_id: str, event_name: str, payload: dict[str, Any]) -> ChatEvent:
        await self.initialize()
        event = ChatEvent(new_id(), session_id, workspace_id, event_name, payload, _iso(utc_now()))
        created_at = _timestamp(event.created_at)
        await self.store.execute(
            """
            INSERT INTO chat_events (id, session_id, workspace_id, event_name, payload, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            event.id,
            event.session_id,
            event.workspace_id,
            event.event_name,
            encode_json(event.payload),
            created_at,
        )
        await self.store.execute("UPDATE sessions SET updated_at = $1 WHERE session_id = $2", created_at, session_id)
        return event

    async def events_for_session(self, session_id: str, since_event_id: str | None = None) -> list[ChatEvent]:
        await self.initialize()
        rows = await self.store.fetch_all(
            """
            SELECT id, session_id, workspace_id, event_name, payload, created_at
            FROM chat_events
            WHERE session_id = $1
            ORDER BY created_at ASC, id ASC
            """,
            session_id,
        )
        events = [self._event_from_row(row) for row in rows]
        if not since_event_id:
            return events
        for index, event in enumerate(events):
            if event.id == since_event_id:
                return events[index + 1 :]
        return events

    async def snapshot(self, workspace_id: str, session_id: str, user_id: str | None) -> dict[str, Any]:
        session = await self.get_session(workspace_id, session_id, user_id)
        if not session:
            raise KeyError(session_id)
        messages = await self.messages_for_session(session_id)
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

    async def upsert_approval_decision(
        self,
        session_id: str,
        workspace_id: str,
        approval_id: str,
        user_id: str | None,
        decision: str,
        idempotency_key: str,
        message: str | None = None,
    ) -> dict[str, Any]:
        await self.initialize()
        now = utc_now()
        record_id = new_id()
        status = "approved" if decision == "approved" else "rejected"
        await self.store.execute(
            """
            INSERT INTO approval_decisions (id, session_id, workspace_id, approval_id, user_id, decision, idempotency_key, message, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT(session_id, approval_id, idempotency_key)
            DO UPDATE SET decision = excluded.decision, message = excluded.message, status = excluded.status, updated_at = excluded.updated_at
            """,
            record_id,
            session_id,
            workspace_id,
            approval_id,
            user_id,
            decision,
            idempotency_key,
            message,
            status,
            now,
            now,
        )
        row = await self.store.fetch_one(
            """
            SELECT session_id, workspace_id, approval_id, user_id, decision, idempotency_key, message, status
            FROM approval_decisions
            WHERE session_id = $1 AND approval_id = $2 AND idempotency_key = $3
            """,
            session_id,
            approval_id,
            idempotency_key,
        )
        if not row:
            raise KeyError(session_id)
        return dict(row)

    async def get_message_history(self, workspace_id: str, session_id: str, user_id: str | None) -> list[Any] | None:
        await self.initialize()
        row = await self.store.fetch_one(
            "SELECT all_messages_json FROM sessions WHERE workspace_id = $1 AND session_id = $2 AND user_id = $3",
            workspace_id,
            session_id,
            user_id,
        )
        if not row or row["all_messages_json"] is None:
            return None
        return ModelMessagesTypeAdapter.validate_json(bytes(row["all_messages_json"]))

    async def save_message_history(
        self,
        workspace_id: str,
        session_id: str,
        user_id: str | None,
        all_messages_json: bytes,
        ) -> None:
        await self.initialize()
        updated = await self.store.execute(
            "UPDATE sessions SET all_messages_json = $1, updated_at = $2 WHERE workspace_id = $3 AND session_id = $4 AND user_id = $5",
            all_messages_json,
            utc_now(),
            workspace_id,
            session_id,
            user_id,
        )
        if updated == 0:
            raise KeyError(session_id)

    async def add_tool_audit(
        self,
        *,
        workspace_id: str,
        user_id: str | None,
        session_id: str,
        request_id: str | None,
        tool_call_id: str | None,
        tool_name: str,
        status: str,
        input_payload: Any = None,
        output_payload: Any = None,
        error: str | None = None,
        latency_ms: int | None = None,
    ) -> None:
        await self.initialize()
        await self.store.execute(
            """
            INSERT INTO tool_audit_logs (
              id, workspace_id, user_id, session_id, request_id, tool_call_id, tool_name,
              is_write_tool, is_destructive_tool, status, input, output, error, latency_ms, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            """,
            new_id(),
            workspace_id,
            user_id,
            session_id,
            request_id,
            tool_call_id,
            tool_name,
            is_write_tool(tool_name),
            is_destructive_tool(tool_name),
            status,
            encode_json(redact_payload(input_payload)),
            encode_json(redact_payload(output_payload)),
            error,
            latency_ms,
            utc_now(),
        )

    def _session_from_row(self, row: Any) -> ChatSession:
        return ChatSession(
            id=row["session_id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            title=row["title"],
            metadata=decode_json(row["metadata"], {}),
            updated_at=_iso(row["updated_at"]),
        )

    def _message_from_row(self, row: Any) -> ChatMessage:
        return ChatMessage(
            id=row["id"],
            session_id=row["session_id"],
            workspace_id=row["workspace_id"],
            user_id=row["user_id"],
            role=row["role"],
            content=row["content"],
            parts=decode_json(row["parts"], []),
            model=row["model"],
            metadata=decode_json(row["metadata"], {}),
            created_at=_iso(row["created_at"]),
        )

    def _event_from_row(self, row: Any) -> ChatEvent:
        return ChatEvent(
            id=row["id"],
            session_id=row["session_id"],
            workspace_id=row["workspace_id"],
            event_name=row["event_name"],
            payload=decode_json(row["payload"], {}),
            created_at=_iso(row["created_at"]),
        )


def _iso(value: Any) -> str:
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def _timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        return datetime.fromisoformat(value)
    raise TypeError(f"Unsupported timestamp value: {type(value)!r}")


SECRET_KEYS = {"authorization", "token", "api_key", "apikey", "password", "secret", "content_base64"}


def redact_payload(value: Any, *, max_string: int = 500) -> Any:
    if value is None:
        return {}
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            if any(marker in key.lower() for marker in SECRET_KEYS):
                redacted[key] = "[REDACTED]"
            else:
                redacted[key] = redact_payload(item, max_string=max_string)
        return redacted
    if isinstance(value, list):
        return [redact_payload(item, max_string=max_string) for item in value[:20]]
    if isinstance(value, str):
        return value if len(value) <= max_string else f"{value[:max_string]}...[TRUNCATED]"
    if isinstance(value, (int, float, bool)):
        return value
    return str(value)
