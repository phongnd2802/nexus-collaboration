from pathlib import Path

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
        }
    )

    assert settings.model == "openrouter:test"
    assert settings.workspace_id == "workspace"
    assert settings.session_id == "request"
    assert settings.filesystem_root == Path(".runtime-test/workspaces/workspace/sessions/request/files")
    assert settings.mcp_headers["X-Nexus-Workspace-ID"] == "workspace"
