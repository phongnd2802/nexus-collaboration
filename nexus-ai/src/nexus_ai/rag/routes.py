from __future__ import annotations

import asyncio
from http import HTTPStatus

from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from nexus_ai.rag.indexer import RagIndexer
from nexus_ai.rag.schemas import RagIndexRequest, RagSearchRequest
from nexus_ai.settings import Settings


def rag_routes(settings: Settings) -> list[Route]:
    async def health(_request: Request) -> Response:
        return JSONResponse(
            {
                "ok": True,
                "enabled": settings.rag_enabled,
                "extractionProvider": settings.rag_extraction_provider,
                "chunkingStrategy": settings.rag_chunking_strategy,
                "embeddingModel": settings.rag_embedding_model,
                "qdrantUrl": settings.qdrant_url,
            }
        )

    async def index_file(request: Request) -> Response:
        auth = _require_internal(settings, request)
        if auth is not None:
            return auth
        workspace_id = request.path_params["workspace_id"]
        file_id = request.path_params["file_id"]
        payload = RagIndexRequest.model_validate(await request.json())
        indexer = RagIndexer(settings)
        asyncio.create_task(_run_index_job(indexer, workspace_id, file_id, payload.job_id))
        return JSONResponse({"accepted": True, "job_id": payload.job_id, "status": "queued"})

    async def search(request: Request) -> Response:
        auth = _require_internal(settings, request)
        if auth is not None:
            return auth
        payload = RagSearchRequest.model_validate(await request.json())
        indexer = RagIndexer(settings)
        results = await indexer.search(
            payload.workspace_id,
            payload.query,
            payload.limit,
            payload.min_score,
            payload.file_ids,
        )
        return JSONResponse({"results": results})

    async def poll(_request: Request) -> Response:
        return JSONResponse({"accepted": False, "message": "DB polling worker is not enabled in this deployment"})

    return [
        Route("/rag/health", health, methods=["GET"]),
        Route("/rag/internal/workspaces/{workspace_id}/files/{file_id}/index", index_file, methods=["POST"]),
        Route("/rag/internal/search", search, methods=["POST"]),
        Route("/rag/internal/workers/poll", poll, methods=["POST"]),
    ]


async def _run_index_job(indexer: RagIndexer, workspace_id: str, file_id: str, job_id: str) -> None:
    try:
        await indexer.index_file(workspace_id, file_id, job_id)
    except Exception:
        # The indexer already attempts to mark the job failed; this avoids
        # unhandled-task noise in the ASGI logs.
        return


def _require_internal(settings: Settings, request: Request) -> Response | None:
    expected = settings.internal_api_key
    provided = request.headers.get("x-api-key")
    source = request.headers.get("x-nexus-source")
    if not expected or provided != expected or source != "backend":
        return JSONResponse({"message": "Invalid internal request"}, status_code=HTTPStatus.UNAUTHORIZED)
    return None
