import base64

import pytest

from nexus_ai_service.rag.schemas import FileSource
from nexus_ai_service.workers import rag_jobs


class FakeBackend:
    def __init__(self, *_args, **_kwargs) -> None:
        self.updated = []

    async def claim_job(self, workspace_id: str, job_id: str, request_id: str | None = None):
        return {"id": job_id, "workspace_id": workspace_id, "request_id": request_id}

    async def get_file_source(self, workspace_id: str, file_id: str, request_id: str | None = None) -> FileSource:
        return FileSource(
            id=file_id,
            workspace_id=workspace_id,
            name="worker.txt",
            mime_type="text/plain",
            content_base64=base64.b64encode(b"worker indexed deadline context").decode("ascii"),
        )

    async def update_job(
        self,
        workspace_id: str,
        job_id: str,
        status: str,
        error_message: str | None = None,
        metadata: dict | None = None,
        request_id: str | None = None,
    ):
        self.updated.append((workspace_id, job_id, status, error_message, metadata, request_id))
        return {"status": status}


@pytest.mark.anyio
async def test_rag_worker_claims_indexes_and_updates_job(monkeypatch) -> None:
    fake_backend = FakeBackend()
    monkeypatch.setattr(rag_jobs, "BackendClient", lambda *_args, **_kwargs: fake_backend)

    ctx = {}
    await rag_jobs.startup(ctx)
    result = await rag_jobs.rag_index_file(
        ctx,
        {
            "workspace_id": "ws-1",
            "file_id": "file-1",
            "job_id": "job-1",
            "request_id": "req-1",
        },
    )

    assert result["status"] == "indexed"
    assert result["chunk_count"] == 1
    assert fake_backend.updated[0][2] == "indexed"


def test_worker_queue_idempotency_key() -> None:
    from nexus_ai_service.integrations.redis import RedisQueue

    key = RedisQueue("redis://localhost:6379/0").idempotency_key(
        {"workspace_id": "ws-1", "file_id": "file-1", "job_id": "job-1"}
    )
    assert key == "rag:index:ws-1:file-1:job-1"

