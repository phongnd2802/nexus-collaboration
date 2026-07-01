from __future__ import annotations

import asyncio
from types import SimpleNamespace

from nexus_ai.agent_chat_store import AgentChatStore
from nexus_ai.api import _stream_chat, create_agent_chat_app
from nexus_ai.settings import load_settings
from nexus_ai.storage import MemoryRepository, SQLiteStore


class FakeRunResult:
    def __init__(self, output: str, run_id: str = "run-1") -> None:
        self.output = output
        self.run_id = run_id

    def all_messages_json(self) -> bytes:
        return b"[]"


class FakeStreamManager:
    async def __aenter__(self):
        async def iterator():
            yield FakeRunResult("Hello from Nexus AI")

        return iterator()

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeAgent:
    def run_stream_events(self, *args, **kwargs):
        return FakeStreamManager()


def test_agent_chat_routes_create_and_replay_session(tmp_path):
    sqlite_store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
    sqlite_store.initialize()
    agent_chat_store = AgentChatStore(sqlite_store)
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_MCP_URL": "http://127.0.0.1:3333/mcp",
            "NEXUS_API_TOKEN": "test-token",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_SQLITE_PATH": str(tmp_path / "nexus_ai.sqlite3"),
        }
    )
    runtime = SimpleNamespace(
        agent=FakeAgent(),
        deps=SimpleNamespace(settings=settings, memory=MemoryRepository(sqlite_store)),
    )

    app = create_agent_chat_app(runtime)
    route_paths = {route.path for route in app.routes}
    assert "/agent-chat/ui/workspaces/{workspace_id}/chat/completions" in route_paths
    assert "/agent-chat/workspaces/{workspace_id}/sessions" in route_paths
    assert "/agent-chat/workspaces/{workspace_id}/sessions/{session_id}" in route_paths

    async def run_stream() -> str:
        response = await _stream_chat(
            runtime,
            store=agent_chat_store,
            request=SimpleNamespace(headers={"x-nexus-user-id": "user-1", "x-nexus-request-id": "req-1"}),
            body={"messages": [{"role": "user", "parts": [{"type": "text", "text": "hello"}]}]},
            workspace_id="ws-1",
            session_id=None,
        )
        chunks: list[bytes] = []
        async for chunk in response.body_iterator:
            chunks.append(chunk)
        return b"".join(chunks).decode("utf-8")

    body = asyncio.run(run_stream())
    assert "data-session" in body
    assert "data-final_answer" in body
    assert "[DONE]" in body

    sessions = agent_chat_store.list_sessions("ws-1")
    assert len(sessions) == 1
    session_id = sessions[0].id

    payload = agent_chat_store.snapshot("ws-1", session_id)
    assert payload["sessionId"] == session_id
    assert payload["uiMessages"][-1]["role"] == "assistant"
    assert payload["uiMessages"][-1]["parts"][-1]["text"] == "Hello from Nexus AI"

    replay_events = agent_chat_store.events_for_session(session_id)
    assert any(event.payload.get("type") == "data-final_answer" for event in replay_events)

    agent_chat_store.delete_session("ws-1", session_id)

    assert agent_chat_store.get_session("ws-1", session_id) is None
