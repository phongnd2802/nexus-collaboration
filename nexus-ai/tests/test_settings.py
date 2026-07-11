from datetime import timedelta

from nexus_ai.settings import load_settings
from nexus_ai.request_context import RequestContext, reset_request_context, set_request_context


def test_load_settings_from_env():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_REQUEST_ID": "request",
            "NEXUS_AI_RUNTIME_DIR": ".runtime-test",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_API_KEY": "legacy-key",
        }
    )

    assert settings.model == "openrouter:test"
    assert settings.workspace_id == "workspace"
    assert settings.session_id == "request"
    assert settings.enable_code_mode is True
    assert settings.audit_tool_calls is True
    assert settings.rag_enabled is True
    assert settings.rag_lexical_provider == "elasticsearch"
    assert settings.elasticsearch_rag_chunk_index == "nexus_rag_chunks_v1"
    assert settings.history_recent_turns == 12
    assert settings.session_summary_model == "openrouter:test"
    assert settings.summary_trigger_turns == 10
    assert settings.memory_max_items_per_turn == 3
    assert settings.mem0_enabled is False
    assert settings.openrouter_base_url == "https://openrouter.ai/api/v1"
    assert settings.qdrant_mem0_user_collection == "nexus_mem0_user_memories"
    assert settings.internal_api_key == "legacy-key"
    assert settings.rag_embedding_dimensions == 4096


def test_session_summary_model_can_be_overridden():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:chat-model",
            "NEXUS_AI_SESSION_SUMMARY_MODEL": "openrouter:summary-model",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )

    assert settings.model == "openrouter:chat-model"
    assert settings.session_summary_model == "openrouter:summary-model"


def test_request_context_overrides_workspace_and_auth():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )

    token = set_request_context(
        RequestContext(
            authorization="Bearer runtime-token",
            workspace_id="runtime-workspace",
            user_id="user-1",
            request_id="req-1",
            session_id="session-1",
        )
    )
    try:
        assert settings.api_token == "runtime-token"
        assert settings.workspace_id == "runtime-workspace"
        assert settings.user_id == "user-1"
        assert settings.session_id == "session-1"
    finally:
        reset_request_context(token)


def test_request_context_timezone_is_validated_and_used():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )

    token = set_request_context(
        RequestContext(
            workspace_id="runtime-workspace",
            timezone="Asia/Ho_Chi_Minh",
        )
    )
    try:
        assert settings.timezone == "Asia/Ho_Chi_Minh"
        assert settings.current_datetime().utcoffset() == timedelta(hours=7)
    finally:
        reset_request_context(token)


def test_invalid_request_context_timezone_falls_back_to_utc():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )

    token = set_request_context(RequestContext(timezone="Mars/Phobos"))
    try:
        assert settings.timezone == "UTC"
    finally:
        reset_request_context(token)
