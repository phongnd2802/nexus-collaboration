from nexus_ai.agent import BASE_INSTRUCTIONS


def test_base_instructions_prefer_tools_and_distinguish_rag_from_notes() -> None:
    normalized = " ".join(BASE_INSTRUCTIONS.split()).lower()

    assert "prefer answering workspace questions by using nexus tools" in normalized
    assert "use the rag file search tool for indexed uploaded files and file content" in normalized
    assert "use nexus note tools for persisted documents in the notes module" in normalized
