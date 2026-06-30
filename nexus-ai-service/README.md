# Nexus AI Service

FastAPI service for Nexus Collaboration agent chat, custom SSE streaming, RAG indexing/search contracts, and future Pydantic AI orchestration.

This service is intentionally separate from the legacy `nexus-ai` package.

## Run

```bash
cd nexus-ai-service
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
uvicorn nexus_ai_service.app:create_app --factory --reload --port 8000
```

Run the RAG worker:

```bash
nexus-ai-worker
```

## Implemented Contracts

- `GET /health`
- `POST /agent-chat/ui/workspaces/{workspace_id}/chat/completions`
- `POST /agent-chat/ui/workspaces/{workspace_id}/sessions/{session_id}/chat/completions`
- `GET /agent-chat/workspaces/{workspace_id}/sessions`
- `GET /agent-chat/workspaces/{workspace_id}/sessions/{session_id}`
- `DELETE /agent-chat/workspaces/{workspace_id}/sessions/{session_id}`
- `GET /agent-chat/workspaces/{workspace_id}/sessions/{session_id}/events`
- `POST /agent-chat/workspaces/{workspace_id}/sessions/{session_id}/approvals/{approval_id}/decision`
- `POST /rag/internal/workspaces/{workspace_id}/files/{file_id}/index`
- `POST /rag/internal/search`

The current runtime uses deterministic development responses and in-memory persistence. Provider, vector, queue, and database integrations live behind Nexus-owned boundaries so they can be replaced with OpenRouter, Qdrant, Redis, and Postgres implementations without changing API routes.

## Workers

`nexus-ai-worker` runs the `arq` worker settings in `nexus_ai_service.workers.rag_jobs`.

The RAG index endpoint enqueues `rag_index_file` jobs to Redis when backend sends only job metadata. The worker claims the backend job, fetches the file source, extracts/chunks/indexes the content, and patches backend job status to `indexed`, `skipped`, or `failed`.

For local tests only, `/rag/internal/workspaces/{workspace_id}/files/{file_id}/index` still accepts `content_base64` and indexes inline without Redis.
