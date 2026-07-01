import asyncio

from pydantic_ai.messages import ModelRequest, ModelResponse, SystemPromptPart, TextPart, UserPromptPart

from nexus_ai.agent_chat_store import AgentChatStore
from nexus_ai.context_pipeline import (
    _generate_session_summary,
    build_prompt_message_history,
    extract_and_store_memories,
    schedule_session_summary_update,
    update_session_summary,
)
from nexus_ai.settings import load_settings
from nexus_ai.storage import MemoryRepository, SQLiteStore


def test_build_prompt_message_history_prepends_summary_and_keeps_recent_turns():
    raw_history = [
        ModelRequest(parts=[UserPromptPart("turn 1")]),
        ModelResponse(parts=[TextPart("reply 1")]),
        ModelRequest(parts=[UserPromptPart("turn 2")]),
        ModelResponse(parts=[TextPart("reply 2")]),
        ModelRequest(parts=[UserPromptPart("turn 3")]),
        ModelResponse(parts=[TextPart("reply 3")]),
    ]

    history = build_prompt_message_history(raw_history, "Earlier summary", 1)

    assert len(history) == 3
    assert isinstance(history[0], ModelRequest)
    assert isinstance(history[0].parts[0], SystemPromptPart)
    assert "Earlier summary" in history[0].parts[0].content
    assert isinstance(history[1].parts[0], UserPromptPart)
    assert history[1].parts[0].content == "turn 3"


def test_summary_and_memory_pipeline(tmp_path):
    async def run() -> None:
        sqlite_store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
        sqlite_store.initialize()
        store = AgentChatStore(sqlite_store)
        session = await store.get_or_create_session("ws-1", "user-1")

        for turn in range(1, 5):
            await store.add_message(session, "user", f"user turn {turn}", user_id="user-1")
            await store.add_message(session, "assistant", f"assistant reply {turn}", user_id="user-1")

        settings = load_settings(
            {
                "NEXUS_AI_MODEL": "test",
                "NEXUS_MCP_URL": "http://localhost:3333/mcp",
                "NEXUS_AI_ENABLE_LANGFUSE": "false",
                "NEXUS_AI_HISTORY_RECENT_TURNS": "1",
                "NEXUS_AI_SUMMARY_TRIGGER_TURNS": "1",
                "NEXUS_AI_MEMORY_MAX_ITEMS_PER_TURN": "3",
            }
        )

        await update_session_summary(
            store,
            settings,
            workspace_id="ws-1",
            session_id=session.id,
            user_id="user-1",
        )

        summary = await store.get_session_summary("ws-1", session.id, "user-1")
        assert summary is not None
        assert summary.summarized_user_turns == 3
        assert "Earlier chat context:" in summary.summary_text
        assert "User said:" in summary.summary_text
        assert "Assistant replied:" in summary.summary_text
        assert "user turn 1" in summary.summary_text

        memory_repo = MemoryRepository(sqlite_store)
        await extract_and_store_memories(
            memory_repo,
            settings,
            workspace_id="ws-1",
            session_id=session.id,
            user_id="user-1",
            user_text="I prefer concise answers. My name is Philip. Don't mention secrets.",
            assistant_text="I will keep responses concise.",
        )
        memories = await memory_repo.recent("ws-1", session.id, "user-1", 10)
        contents = [item.content for item in memories]
        assert any("I prefer concise answers" in content for content in contents)
        assert any("My name is Philip" in content for content in contents)
        assert any("Don't mention secrets" in content for content in contents)

    asyncio.run(run())


def test_generate_session_summary_uses_dedicated_summary_model(monkeypatch):
    seen: list[str] = []

    class FakeSummaryAgent:
        async def run(self, prompt: str):
            assert "New conversation segment:" in prompt
            return type("Result", (), {"output": "summary from dedicated model"})()

    def fake_summary_agent(model_name: str):
        seen.append(model_name)
        return FakeSummaryAgent()

    async def run() -> None:
        settings = load_settings(
            {
                "NEXUS_AI_MODEL": "openrouter:chat-model",
                "NEXUS_AI_SESSION_SUMMARY_MODEL": "openrouter:summary-model",
                "NEXUS_MCP_URL": "http://localhost:3333/mcp",
                "NEXUS_AI_ENABLE_LANGFUSE": "false",
            }
        )
        monkeypatch.setattr("nexus_ai.context_pipeline._summary_agent", fake_summary_agent)
        output = await _generate_session_summary(
            settings,
            existing_summary=None,
            delta_messages=[],
        )
        assert output == "summary from dedicated model"

    asyncio.run(run())
    assert seen == ["openrouter:summary-model"]


def test_schedule_session_summary_update_runs_in_background(tmp_path):
    sqlite_store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
    sqlite_store.initialize()
    store = AgentChatStore(sqlite_store)

    async def run() -> None:
        session = await store.get_or_create_session("ws-1", "user-1")
        await store.add_message(session, "user", "hello", user_id="user-1")
        await store.add_message(session, "assistant", "hi", user_id="user-1")
        settings = load_settings(
            {
                "NEXUS_AI_MODEL": "test",
                "NEXUS_AI_SESSION_SUMMARY_MODEL": "test",
                "NEXUS_MCP_URL": "http://localhost:3333/mcp",
                "NEXUS_AI_ENABLE_LANGFUSE": "false",
            }
        )
        task = schedule_session_summary_update(
            store,
            settings,
            workspace_id="ws-1",
            session_id=session.id,
            user_id="user-1",
        )
        assert isinstance(task, asyncio.Task)
        await task

    asyncio.run(run())
