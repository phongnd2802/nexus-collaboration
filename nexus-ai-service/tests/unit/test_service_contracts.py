from fastapi.testclient import TestClient
import base64

from nexus_ai_service.app import create_app


def test_health_contract() -> None:
    client = TestClient(create_app())
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "nexus-ai-service"


def test_chat_stream_creates_session_and_replays_events() -> None:
    client = TestClient(create_app())
    response = client.post(
        "/agent-chat/ui/workspaces/ws-1/chat/completions",
        headers={"Accept": "text/event-stream", "X-Nexus-User-ID": "user-1"},
        json={"messages": [{"role": "user", "parts": [{"type": "text", "text": "hello"}]}]},
    )
    assert response.status_code == 200
    text = response.text
    assert "event: session.created" in text
    assert "event: message.delta" in text
    assert "event: message.completed" in text
    assert "data: [DONE]" in text

    sessions = client.get("/agent-chat/workspaces/ws-1/sessions").json()["data"]
    assert len(sessions) == 1
    session_id = sessions[0]["sessionId"]

    replay = client.get(f"/agent-chat/workspaces/ws-1/sessions/{session_id}/events")
    assert replay.status_code == 200
    assert "event: message.completed" in replay.text


def test_rag_index_and_empty_authorized_search() -> None:
    client = TestClient(create_app())
    response = client.post(
        "/rag/internal/workspaces/ws-1/files/file-1/index",
        headers={"X-Nexus-Workspace-ID": "ws-1"},
        json={
            "job_id": "job-1",
            "reason": "file_uploaded",
            "filename": "demo.txt",
            "mime_type": "text/plain",
            "content_base64": base64.b64encode(b"Nexus deadline planning document").decode("ascii"),
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["accepted"] is True
    assert payload["status"] == "indexed"
    assert payload["metadata"]["chunk_count"] == 1

    search = client.post(
        "/rag/internal/search",
        json={"workspace_id": "ws-1", "query": "deadline", "file_ids": ["file-1"]},
    )
    assert search.status_code == 200
    results = search.json()["results"]
    assert len(results) == 1
    assert results[0]["source_id"] == "file-1"
