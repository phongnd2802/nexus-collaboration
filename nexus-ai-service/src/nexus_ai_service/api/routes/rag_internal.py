from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from nexus_ai_service.integrations.redis import RedisQueue
from nexus_ai_service.rag.indexing import RagIndexer
from nexus_ai_service.rag.schemas import RagSearchRequest
from nexus_ai_service.security.auth_context import assert_internal_api_key

router = APIRouter(prefix="/rag/internal")


class IndexFileRequest(BaseModel):
    job_id: str
    reason: str
    file_hash: str | None = None
    mime_type: str | None = None
    filename: str | None = None
    content_base64: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagSearchBody(BaseModel):
    workspace_id: str
    query: str
    limit: int = Field(default=8, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0)
    file_ids: list[str] | None = None
    strategy: str = "hybrid"
    include_debug: bool = False


@router.post("/workspaces/{workspace_id}/files/{file_id}/index")
async def index_file(request: Request, workspace_id: str, file_id: str, body: IndexFileRequest) -> dict[str, Any]:
    assert_internal_api_key(request)
    header_workspace = request.headers.get("x-nexus-workspace-id")
    if header_workspace and header_workspace != workspace_id:
        raise HTTPException(status_code=400, detail="Workspace header does not match path")
    settings = request.app.state.settings
    try:
        if body.content_base64:
            from nexus_ai_service.rag.schemas import FileSource

            indexer = RagIndexer(
                request.app.state.retrieval_service,
                opendataloader_options=opendataloader_options(settings),
                tokenizer_model=settings.nexus_ai_embedding_model,
            )
            source = FileSource(
                id=file_id,
                workspace_id=workspace_id,
                name=body.filename or file_id,
                mime_type=body.mime_type,
                file_hash=body.file_hash,
                metadata=body.metadata,
                content_base64=body.content_base64,
            )
        else:
            queue = RedisQueue(settings.redis_url)
            await queue.enqueue_rag_index(
                {
                    "workspace_id": workspace_id,
                    "file_id": file_id,
                    "job_id": body.job_id,
                    "reason": body.reason,
                    "file_hash": body.file_hash,
                    "request_id": request.headers.get("x-nexus-request-id"),
                }
            )
            return {
                "accepted": True,
                "job_id": body.job_id,
                "status": "queued",
                "workspace_id": workspace_id,
                "file_id": file_id,
            }
        result = await indexer.index_source(source)
        status = str(result.get("status", "indexed"))
    except Exception as exc:
        if body.content_base64:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        return {
            "accepted": True,
            "job_id": body.job_id,
            "status": "queued",
            "workspace_id": workspace_id,
            "file_id": file_id,
            "warning": str(exc),
        }
    return {
        "accepted": True,
        "job_id": body.job_id,
        "status": status,
        "workspace_id": workspace_id,
        "file_id": file_id,
        "metadata": result,
    }


@router.post("/search")
async def search(request: Request, body: RagSearchBody) -> dict[str, Any]:
    assert_internal_api_key(request)
    search_request = RagSearchRequest.model_validate(body.model_dump())
    results = await request.app.state.retrieval_service.search(search_request)
    return {"results": [item.model_dump() for item in results]}


def opendataloader_options(settings: Any) -> dict[str, object]:
    options: dict[str, object] = {
        "hybrid": settings.rag_opendataloader_hybrid,
        "threads": settings.rag_opendataloader_threads,
    }
    if settings.rag_opendataloader_hybrid_url:
        options["hybrid_url"] = settings.rag_opendataloader_hybrid_url
    return options
