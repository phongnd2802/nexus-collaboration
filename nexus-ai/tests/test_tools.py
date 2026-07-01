import asyncio

from nexus_ai.agent import BASE_INSTRUCTIONS, build_runtime
from nexus_ai.capabilities.context import memory_instruction
from nexus_ai.capabilities.tool_preparation import prepare_tool_definition
from nexus_ai.settings import load_settings
from nexus_ai.storage import MemoryRepository, SQLiteStore
from pydantic_ai.tools import ToolDefinition


def test_runtime_uses_minimal_deps(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "test-token",
            "NEXUS_WORKSPACE_ID": "test-workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES": "true",
        }
    )

    runtime = build_runtime(settings)

    assert runtime.deps.settings is settings
    assert runtime.deps.memory is not None
    assert runtime.agent.output_type is str
    assert "Private AI memory is internal chat context" in BASE_INSTRUCTIONS
    assert "use private AI memory instead of creating a note" in BASE_INSTRUCTIONS

    tool_names = set(runtime.agent._function_toolset.tools)
    assert "store_private_memory" in tool_names
    assert "list_private_memories" in tool_names
    assert "remember" not in tool_names
    assert "list_memories" not in tool_names


def test_mcp_tools_are_marked_for_deferred_loading():
    mcp_tool = ToolDefinition(name="nexus_list_notes")
    local_tool = ToolDefinition(name="list_private_memories")

    prepared_mcp_tool = prepare_tool_definition(mcp_tool)
    prepared_local_tool = prepare_tool_definition(local_tool)

    assert prepared_mcp_tool.defer_loading is True
    assert prepared_local_tool.defer_loading is False


def test_memory_instruction_labels_private_ai_memory(tmp_path):
    async def run() -> None:
        store = SQLiteStore(tmp_path / "nexus_ai.sqlite3")
        store.initialize()
        memory = MemoryRepository(store)
        await memory.add(
            workspace_id="ws-1",
            session_id="session-1",
            user_id="user-1",
            memory_type="preference",
            content="Prefers concise replies",
            importance=8,
        )
        instruction = await memory_instruction(memory, "ws-1", "session-1", "user-1")
        assert "Private AI memory for this user" in instruction
        assert "not Nexus notes" in instruction
        assert "Prefers concise replies" in instruction

    asyncio.run(run())
