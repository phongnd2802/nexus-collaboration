import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass
class SessionState:
    session_id: str
    user_id: str
    workspace_id: str
    messages: list[Any] = field(default_factory=list)


@dataclass
class RunState:
    run_id: str
    session_id: str
    user_id: str
    workspace_id: str
    messages: list[Any] = field(default_factory=list)
    pending_tool_calls: dict[str, dict[str, Any]] = field(default_factory=dict)


class MemoryStore:
    """Abstraction placeholder for future persistent memory/RAG backends."""

    def __init__(self) -> None:
        self._items: dict[str, list[dict[str, Any]]] = {}

    def append(self, session_id: str, item: dict[str, Any]) -> None:
        self._items.setdefault(session_id, []).append(item)

    def list(self, session_id: str) -> list[dict[str, Any]]:
        return list(self._items.get(session_id, []))


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionState] = {}

    def get_or_create(self, user_id: str, workspace_id: str, session_id: str | None = None) -> SessionState:
        if session_id and session_id in self._sessions:
            session = self._sessions[session_id]
            if session.user_id != user_id or session.workspace_id != workspace_id:
                raise KeyError("Session does not belong to this user/workspace")
            return session

        new_session = SessionState(
            session_id=session_id or f"sess_{uuid.uuid4().hex}",
            user_id=user_id,
            workspace_id=workspace_id,
        )
        self._sessions[new_session.session_id] = new_session
        return new_session

    def get(self, session_id: str) -> SessionState:
        return self._sessions[session_id]

    def save_messages(self, session_id: str, messages: list[Any]) -> None:
        self._sessions[session_id].messages = messages


class RunStore:
    def __init__(self) -> None:
        self._runs: dict[str, RunState] = {}

    def create(self, session: SessionState) -> RunState:
        run = RunState(
            run_id=f"run_{uuid.uuid4().hex}",
            session_id=session.session_id,
            user_id=session.user_id,
            workspace_id=session.workspace_id,
        )
        self._runs[run.run_id] = run
        return run

    def get(self, run_id: str, session_id: str | None = None) -> RunState:
        run = self._runs[run_id]
        if session_id and run.session_id != session_id:
            raise KeyError("Run does not belong to this session")
        return run

    def save(self, run: RunState) -> None:
        self._runs[run.run_id] = run


memory_store = MemoryStore()
session_store = SessionStore()
run_store = RunStore()
