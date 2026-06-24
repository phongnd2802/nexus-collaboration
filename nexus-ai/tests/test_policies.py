import pytest

from nexus_ai.policies import PathPolicy, ShellPolicy, is_code_mode_eligible, is_write_tool, redact_secrets


def test_path_policy_blocks_escape(tmp_path):
    policy = PathPolicy(tmp_path)
    with pytest.raises(PermissionError):
        policy.resolve("../outside")


def test_shell_policy_allows_simple_commands():
    assert ShellPolicy().validate("python -m pytest") == ["python", "-m", "pytest"]


def test_shell_policy_blocks_destructive_commands():
    with pytest.raises(PermissionError):
        ShellPolicy().validate("rm -rf .")


def test_tool_classification():
    assert is_write_tool("nexus_create_note")
    assert not is_code_mode_eligible("nexus_delete_note")
    assert is_code_mode_eligible("nexus_list_notes")


def test_secret_redaction():
    assert redact_secrets("Authorization: Bearer abcdefghijklmnopqrstuvwxyz") == "Authorization: [REDACTED]"

