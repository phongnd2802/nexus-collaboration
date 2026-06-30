from dataclasses import dataclass, field
from typing import Any, Protocol

from nexus_ai_service.core.ids import new_id
from nexus_ai_service.core.time import utc_now_iso
from nexus_ai_service.streaming.events import StreamEvent


@dataclass
class ChatMessage:
    id: str
    session_id: str
    workspace_id: str
    user_id: str | None
    role: str
    content: str | None
    parts: list[dict[str, Any]]
    model: str | None = None
    usage: dict[str, Any] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)


@dataclass
class ChatSession:
    id: str
    workspace_id: str
    user_id: str | None
    title: str | None = None
    status: str = "active"
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=utc_now_iso)
    updated_at: str = field(default_factory=utc_now_iso)
    deleted_at: str | None = None


class SessionStore(Protocol):
    async def get_or_create_session(self, workspace_id: str, user_id: str | None, session_id: str | None = None) -> ChatSession: ...
    async def list_sessions(self, workspace_id: str) -> list[ChatSession]: ...
    async def get_session(self, workspace_id: str, session_id: str) -> ChatSession: ...
    async def delete_session(self, workspace_id: str, session_id: str) -> None: ...
    async def add_message(
        self,
        session: ChatSession,
        role: str,
        content: str | None,
        user_id: str | None = None,
        parts: list[dict[str, Any]] | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ChatMessage: ...
    async def messages_for_session(self, session_id: str) -> list[ChatMessage]: ...
    async def add_event(self, session_id: str, event: StreamEvent) -> StreamEvent: ...
    async def events_for_session(self, session_id: str, since_event_id: str | None = None) -> list[StreamEvent]: ...
    async def snapshot(self, workspace_id: str, session_id: str) -> dict[str, Any]: ...
    async def upsert_approval_decision(
        self,
        session_id: str,
        workspace_id: str,
        approval_id: str,
        user_id: str | None,
        decision: str,
        idempotency_key: str,
        message: str | None = None,
    ) -> dict[str, Any]: ...


class InMemorySessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ChatSession] = {}
        self._messages: dict[str, list[ChatMessage]] = {}
        self._events: dict[str, list[StreamEvent]] = {}

    async def get_or_create_session(
        self, workspace_id: str, user_id: str | None, session_id: str | None = None
    ) -> ChatSession:
        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            if session.workspace_id != workspace_id or session.status == "deleted":
                raise KeyError(session_id)
            return session
        new_session = ChatSession(id=session_id or new_id(), workspace_id=workspace_id, user_id=user_id)
        self._sessions[new_session.id] = new_session
        self._messages.setdefault(new_session.id, [])
        self._events.setdefault(new_session.id, [])
        return new_session

    async def list_sessions(self, workspace_id: str) -> list[ChatSession]:
        return sorted(
            [item for item in self._sessions.values() if item.workspace_id == workspace_id and item.status != "deleted"],
            key=lambda item: item.updated_at,
            reverse=True,
        )

    async def get_session(self, workspace_id: str, session_id: str) -> ChatSession:
        session = self._sessions[session_id]
        if session.workspace_id != workspace_id or session.status == "deleted":
            raise KeyError(session_id)
        return session

    async def delete_session(self, workspace_id: str, session_id: str) -> None:
        session = await self.get_session(workspace_id, session_id)
        session.status = "deleted"
        session.deleted_at = utc_now_iso()
        session.updated_at = session.deleted_at

    async def add_message(
        self,
        session: ChatSession,
        role: str,
        content: str | None,
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
            parts=parts or [{"type": "text", "content": content}] if content else [],
            model=model,
            metadata=metadata or {},
        )
        self._messages.setdefault(session.id, []).append(message)
        if role == "user" and not session.title and content:
            session.title = content.strip()[:80]
        session.updated_at = message.created_at
        return message

    async def messages_for_session(self, session_id: str) -> list[ChatMessage]:
        return list(self._messages.get(session_id, []))

    async def add_event(self, session_id: str, event: StreamEvent) -> StreamEvent:
        self._events.setdefault(session_id, []).append(event)
        return event

    async def events_for_session(self, session_id: str, since_event_id: str | None = None) -> list[StreamEvent]:
        events = list(self._events.get(session_id, []))
        if not since_event_id:
            return events
        for index, event in enumerate(events):
            if event.id == since_event_id:
                return events[index + 1 :]
        return events

    async def snapshot(self, workspace_id: str, session_id: str) -> dict[str, Any]:
        session = await self.get_session(workspace_id, session_id)
        messages = await self.messages_for_session(session_id)
        return {
            "sessionId": session.id,
            "title": session.title or "New chat",
            "items": [
                {"id": message.id, "role": message.role, "content": message.content, "createdAt": message.created_at}
                for message in messages
            ],
            "transcript": [
                {"id": message.id, "type": message.role, "text": message.content, "createdAt": message.created_at}
                for message in messages
            ],
            "uiMessages": [
                {"id": message.id, "role": message.role, "parts": message.parts, "createdAt": message.created_at}
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
        await self.get_session(workspace_id, session_id)
        return {
            "approval_id": approval_id,
            "session_id": session_id,
            "workspace_id": workspace_id,
            "user_id": user_id,
            "status": "approved" if decision == "approved" else "rejected",
            "idempotency_key": idempotency_key,
            "message": message,
        }
