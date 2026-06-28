from fastapi.testclient import TestClient

from nexus_ai.rag.test_api import create_rag_test_app
from nexus_ai.settings import load_settings


def test_rag_test_api_index_endpoint(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_INTERNAL_API_KEY": "secret-key",
        }
    )

    async def fake_index_file_direct(self, workspace_id: str, file_id: str, job_id: str | None = None):
        return {
            "workspace_id": workspace_id,
            "file_id": file_id,
            "job_id": job_id or "manual-job",
            "status": "indexed",
            "metadata": {"chunks": 3},
        }

    monkeypatch.setattr("nexus_ai.rag.indexer.RagIndexer.index_file_direct", fake_index_file_direct)

    client = TestClient(create_rag_test_app(settings))
    response = client.post(
        "/index",
        headers={"x-api-key": "secret-key"},
        json={"workspace_id": "workspace", "file_id": "file-1", "job_id": "job-1"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "accepted": True,
        "status": "indexed",
        "workspace_id": "workspace",
        "file_id": "file-1",
        "job_id": "job-1",
        "metadata": {"chunks": 3},
    }


def test_rag_test_api_requires_key():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_INTERNAL_API_KEY": "secret-key",
        }
    )
    client = TestClient(create_rag_test_app(settings))
    response = client.post("/index", json={"workspace_id": "workspace", "file_id": "file-1"})

    assert response.status_code == 401


def test_rag_test_api_upload_and_index_endpoint(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_INTERNAL_API_KEY": "secret-key",
        }
    )

    async def fake_index_source(self, source, *, job_id: str):
        assert source.workspace_id == "workspace"
        assert source.name == "notes.txt"
        assert source.mime_type == "text/plain"
        assert source.metadata["source"] == "rag-test-upload"
        assert source.metadata["requested_file_id"] == "upload-1"
        return {"chunks": 1}

    monkeypatch.setattr("nexus_ai.rag.indexer.RagIndexer.index_source", fake_index_source)

    client = TestClient(create_rag_test_app(settings))
    response = client.post(
        "/upload-and-index",
        headers={"x-api-key": "secret-key"},
        data={"workspace_id": "workspace", "file_id": "upload-1", "job_id": "job-2"},
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["metadata"]["internal_file_id"], str)
    assert response.json() == {
        "accepted": True,
        "status": "indexed",
        "workspace_id": "workspace",
        "file_id": "upload-1",
        "job_id": "job-2",
        "metadata": {"chunks": 1, "internal_file_id": body["metadata"]["internal_file_id"]},
    }
