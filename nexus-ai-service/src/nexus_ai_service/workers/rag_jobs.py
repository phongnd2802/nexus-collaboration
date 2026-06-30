from typing import Any

from arq.connections import RedisSettings

from nexus_ai_service.core.config import Settings, get_settings
from nexus_ai_service.integrations.backend_client import BackendClient
from nexus_ai_service.rag.indexing import RagIndexer
from nexus_ai_service.rag.retrieval import LocalHybridRetrievalService


RETRYABLE_EXCEPTIONS = (TimeoutError, ConnectionError)


async def rag_index_file(ctx: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    settings: Settings = ctx.get("settings") or get_settings()
    retrieval_service = ctx.get("retrieval_service") or LocalHybridRetrievalService()
    backend = BackendClient(settings.nexus_backend_base_url, settings.nexus_internal_api_key)
    workspace_id = str(payload["workspace_id"])
    file_id = str(payload["file_id"])
    job_id = str(payload["job_id"])
    request_id = payload.get("request_id")

    await backend.claim_job(workspace_id, job_id, request_id)
    source = await backend.get_file_source(workspace_id, file_id, request_id)
    indexer = RagIndexer(
        retrieval_service,
        opendataloader_options=opendataloader_options(settings),
        tokenizer_model=settings.nexus_ai_embedding_model,
    )

    try:
        result = await indexer.index_source(source)
    except ValueError as exc:
        result = {"status": "skipped", "reason": str(exc)}
    except RETRYABLE_EXCEPTIONS:
        raise
    except Exception as exc:
        await backend.update_job(workspace_id, job_id, "failed", error_message=str(exc), request_id=request_id)
        raise

    status = str(result.get("status", "indexed"))
    await backend.update_job(
        workspace_id,
        job_id,
        status,
        metadata={key: value for key, value in result.items() if key != "status"},
        request_id=request_id,
    )
    return {"workspace_id": workspace_id, "file_id": file_id, "job_id": job_id, **result}


async def startup(ctx: dict[str, Any]) -> None:
    ctx["settings"] = get_settings()
    ctx["retrieval_service"] = LocalHybridRetrievalService()


async def shutdown(ctx: dict[str, Any]) -> None:
    retrieval_service = ctx.get("retrieval_service")
    close = getattr(retrieval_service, "close", None)
    if callable(close):
        await close()


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


def opendataloader_options(settings: Settings) -> dict[str, object]:
    options: dict[str, object] = {
        "hybrid": settings.rag_opendataloader_hybrid,
        "threads": settings.rag_opendataloader_threads,
    }
    if settings.rag_opendataloader_hybrid_url:
        options["hybrid_url"] = settings.rag_opendataloader_hybrid_url
    return options


class WorkerSettings:
    functions = [rag_index_file]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = redis_settings()
    max_jobs = 4
    job_timeout = 600
    max_tries = 3

