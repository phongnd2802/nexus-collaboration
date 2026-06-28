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
            "NEXUS_RAG_OPENDATALOADER_HYBRID": "docling-fast",
            "NEXUS_RAG_OPENDATALOADER_HYBRID_URL": "http://127.0.0.1:5002",
        }
    )

    assert settings.model == "openrouter:test"
    assert settings.workspace_id == "workspace"
    assert settings.session_id == "request"
    assert settings.rag_llm_model == "openrouter:test-rag"
    assert settings.rag_enable_contextual_retrieval is True
    assert settings.rag_opendataloader_hybrid == "docling-fast"
    assert settings.rag_opendataloader_hybrid_url == "http://127.0.0.1:5002"
    assert settings.rag_query_transform == "multi_query_step_back"
    assert settings.rag_multi_query_count == 3
    assert settings.rag_document_route_top_k == 3
    assert settings.orchestration_mode == "multi"
    assert settings.mcp_headers["X-Nexus-Workspace-ID"] == "workspace"
