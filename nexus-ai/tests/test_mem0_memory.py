import asyncio
import sys
from types import SimpleNamespace

from nexus_ai.context_pipeline import extract_and_store_memories
from nexus_ai.settings import load_settings
from nexus_ai.storage import MemoryRepository, create_memory_repository
from nexus_ai.storage.mem0 import Mem0MemoryRepository
from nexus_ai.storage.sqlite import SQLiteStore


class FakeAsyncMemory:
    last_config = None

    def __init__(self):
        self.add_calls = []
        self.results = [
            {
                "id": "mem-1",
                "memory": "Prefers concise responses",
                "metadata": {"memory_type": "preference", "importance": 8, "tags": ["preference"]},
            }
        ]

    @classmethod
    def from_config(cls, config):
        cls.last_config = config
        return cls()

    async def add(self, messages, **kwargs):
        self.add_calls.append((messages, kwargs))
        return {"results": [{"id": "mem-new"}]}

    async def get_all(self, **kwargs):
        return {"results": list(self.results)}


def test_create_memory_repository_uses_mem0_when_enabled(monkeypatch, tmp_path):
    monkeypatch.setitem(sys.modules, "mem0", SimpleNamespace(AsyncMemory=FakeAsyncMemory))
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:openai/gpt-4o-mini",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_MEM0_ENABLED": "true",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "OPENROUTER_API_KEY": "test-openrouter",
            "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
            "QDRANT_URL": "http://qdrant:6333",
            "QDRANT_MEM0_USER_COLLECTION": "mem0_user",
        }
    )

    repository = create_memory_repository(settings, store=None)

    assert isinstance(repository, Mem0MemoryRepository)
    assert (
        FakeAsyncMemory.last_config["vector_store"]["config"]["collection_name"]
        == "mem0_user__qwen_qwen3_embedding_8b_4096"
    )
    assert FakeAsyncMemory.last_config["vector_store"]["config"]["embedding_model_dims"] == 4096
    assert FakeAsyncMemory.last_config["llm"]["config"]["model"] == "openai/gpt-4o-mini"
    assert FakeAsyncMemory.last_config["embedder"]["config"]["model"] == "qwen/qwen3-embedding-8b"
    assert (tmp_path / "runtime" / "mem0").is_dir()
    assert FakeAsyncMemory.last_config["history_db_path"].endswith("/mem0/mem0_history.db")


def test_mem0_repository_scopes_memory_to_workspace_and_user(monkeypatch, tmp_path):
    monkeypatch.setitem(sys.modules, "mem0", SimpleNamespace(AsyncMemory=FakeAsyncMemory))
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:openai/gpt-4o-mini",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_MEM0_ENABLED": "true",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "OPENROUTER_API_KEY": "test-openrouter",
        }
    )

    repository = Mem0MemoryRepository(settings)

    async def run() -> None:
        memory_id = await repository.add(
            workspace_id="ws-1",
            session_id="session-1",
            user_id="user-1",
            memory_type="preference",
            content="Prefers concise responses",
            importance=8,
        )
        assert memory_id == "mem-new"

        memories = await repository.recent("ws-1", "session-1", "user-1", 10)
        assert len(memories) == 1
        assert memories[0].content == "Prefers concise responses"

        await extract_and_store_memories(
            repository,
            settings,
            workspace_id="ws-1",
            session_id="session-1",
            user_id="user-1",
            user_text="I prefer concise responses.",
            assistant_text="I will keep replies concise.",
        )

    asyncio.run(run())

    add_calls = repository._memory.add_calls
    assert add_calls[0][1]["user_id"] == "ws-1:user-1"
    assert add_calls[0][1]["infer"] is False
    assert add_calls[1][1]["user_id"] == "ws-1:user-1"
    assert add_calls[1][1]["infer"] is True


def test_local_memory_repository_still_uses_heuristic_pipeline(tmp_path):
    async def run() -> None:
        store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
        store.initialize()
        memory = MemoryRepository(store)
        settings = load_settings(
            {
                "NEXUS_AI_MODEL": "test",
                "NEXUS_MCP_URL": "http://localhost:3333/mcp",
                "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
                "NEXUS_AI_ENABLE_LANGFUSE": "false",
            }
        )

        await extract_and_store_memories(
            memory,
            settings,
            workspace_id="ws-1",
            session_id="session-1",
            user_id="user-1",
            user_text="I prefer concise answers.",
            assistant_text="I will keep responses concise.",
        )

        memories = await memory.recent("ws-1", "session-1", "user-1", 10)
        assert len(memories) == 2

    asyncio.run(run())
