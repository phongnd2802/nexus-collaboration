from nexus_ai.settings import load_settings


def test_load_settings_from_env():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_REQUEST_ID": "request",
            "NEXUS_AI_RUNTIME_DIR": ".runtime-test",
            "NEXUS_AI_SQLITE_PATH": ".runtime-test/test.sqlite3",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_RAG_LLM_MODEL": "openrouter:test-rag",
            "NEXUS_RAG_ENABLE_CONTEXTUAL_RETRIEVAL": "true",
        }
    )

    assert settings.model == "openrouter:test"
    assert settings.workspace_id == "workspace"
    assert settings.session_id == "request"
    assert settings.rag_llm_model == "openrouter:test-rag"
    assert settings.rag_enable_contextual_retrieval is True
    assert settings.mcp_headers["X-Nexus-Workspace-ID"] == "workspace"
