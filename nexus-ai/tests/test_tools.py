from nexus_ai.agent import build_runtime
from nexus_ai.settings import load_settings
from nexus_ai.policies import PathPolicy
from nexus_ai.tools import LocalFilesystemTools


def test_filesystem_tools_are_sandboxed(tmp_path):
    tools = LocalFilesystemTools(PathPolicy(tmp_path))
    tools.write_file("drafts/report.md", "hello")

    assert tools.read_file("drafts/report.md") == "hello"
    assert "drafts" in tools.list_files(".")
    assert tools.search_files("hello")[0]["path"] == "drafts/report.md"


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
