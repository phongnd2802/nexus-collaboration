import pytest

from nexus_ai.policies import PathPolicy, is_code_mode_eligible, is_write_tool, redact_secrets


def test_path_policy_blocks_escape(tmp_path):
    policy = PathPolicy(tmp_path)
    with pytest.raises(PermissionError):
        policy.resolve("../outside")


def test_tool_classification():
    assert is_write_tool("nexus_create_note")
    assert not is_code_mode_eligible("nexus_delete_note")
    assert is_code_mode_eligible("nexus_list_notes")


def test_secret_redaction():
    assert redact_secrets("Authorization: Bearer abcdefghijklmnopqrstuvwxyz") == "Authorization: [REDACTED]"
