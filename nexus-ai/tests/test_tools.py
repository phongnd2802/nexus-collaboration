from nexus_ai.agent import build_runtime
from nexus_ai.capabilities.tool_preparation import prepare_tool_definition
from nexus_ai.settings import load_settings
from pydantic_ai.tools import ToolDefinition


def test_runtime_defaults_to_hybrid_routing(tmp_path):
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
    assert runtime.orchestrator is not None
    assert runtime.router is not None
    assert runtime.routing_mode == "hybrid"
    assert runtime.direct_workspace_agent is not None


def test_runtime_can_use_deprecated_single_agent_fallback(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "test-token",
            "NEXUS_WORKSPACE_ID": "test-workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES": "true",
            "NEXUS_AI_ORCHESTRATION_MODE": "single",
        }
    )

    runtime = build_runtime(settings)

    assert runtime.deps.settings is settings
    assert runtime.agent.output_type is str
    assert runtime.orchestrator is None
    assert runtime.router is None
    assert runtime.direct_workspace_agent is not None
    assert any("deprecated" in warning for warning in runtime.capability_warnings)


def test_runtime_can_use_multi_agent_orchestrator(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "test-token",
            "NEXUS_WORKSPACE_ID": "test-workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES": "false",
            "NEXUS_AI_ORCHESTRATION_MODE": "multi",
        }
    )

    runtime = build_runtime(settings)

    assert runtime.deps.settings is settings
    assert runtime.orchestrator is not None
    assert runtime.router is None


def test_mcp_tools_are_marked_for_deferred_loading():
    mcp_tool = ToolDefinition(name="nexus_list_notes")
    local_tool = ToolDefinition(name="list_memories")

    prepared_mcp_tool = prepare_tool_definition(mcp_tool)
    prepared_local_tool = prepare_tool_definition(local_tool)

    assert prepared_mcp_tool.defer_loading is True
    assert prepared_local_tool.defer_loading is False
