from nexus_ai.policies import is_code_mode_eligible, is_write_tool, redact_secrets


def test_tool_classification():
    assert is_write_tool("nexus_create_note")
    assert not is_code_mode_eligible("nexus_delete_note")
    assert is_code_mode_eligible("nexus_list_notes")


def test_secret_redaction():
    assert redact_secrets("Authorization: Bearer abcdefghijklmnopqrstuvwxyz") == "Authorization: [REDACTED]"
