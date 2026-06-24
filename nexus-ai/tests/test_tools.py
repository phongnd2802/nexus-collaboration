from nexus_ai.agent import build_runtime
from nexus_ai.settings import load_settings
from nexus_ai.policies import PathPolicy, ShellPolicy
from nexus_ai.tools import LocalFilesystemTools, LocalShellTools


def test_filesystem_tools_are_sandboxed(tmp_path):
    tools = LocalFilesystemTools(PathPolicy(tmp_path))
    tools.write_file("drafts/report.md", "hello")

    assert tools.read_file("drafts/report.md") == "hello"
    assert "drafts" in tools.list_files(".")
    assert tools.search_files("hello")[0]["path"] == "drafts/report.md"


def test_shell_tools_run_in_sandbox(tmp_path):
    tools = LocalShellTools(PathPolicy(tmp_path), ShellPolicy(), timeout_seconds=5)
    result = tools.run_shell("pwd")

    assert result["returncode"] == 0
    assert str(tmp_path) in result["stdout"]


def test_runtime_exposes_console_backend(tmp_path):
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

    assert type(runtime.deps.backend).__name__ == "AsyncSandboxAdapter"
    assert runtime.deps.backend.unwrap().root_dir == settings.filesystem_root
    assert runtime.deps.backend.unwrap().execute_enabled is True
