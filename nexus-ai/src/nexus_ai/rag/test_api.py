from __future__ import annotations

import asyncio
import base64
import hashlib
import uuid
from http import HTTPStatus

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile

from nexus_ai.rag.indexer import RagIndexer
from nexus_ai.rag.schemas import FileSource, RagDirectIndexRequest, RagDirectIndexResponse
from nexus_ai.settings import Settings


def create_rag_test_app(settings: Settings) -> FastAPI:
    app = FastAPI(
        title="Nexus AI RAG Test API",
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    @app.get("/health")
    async def health() -> dict[str, object]:
        return {
            "ok": True,
            "enabled": settings.rag_enabled,
            "docs": "/rag/test/docs",
        }

    @app.post("/index", response_model=RagDirectIndexResponse)
    async def index_file(
        payload: RagDirectIndexRequest,
        x_api_key: str | None = Header(default=None, alias="x-api-key"),
    ) -> RagDirectIndexResponse:
        _require_test_api_key(settings, x_api_key)
        indexer = RagIndexer(settings)

        if payload.async_mode:
            asyncio.create_task(indexer.index_file_direct(payload.workspace_id, payload.file_id, payload.job_id))
            return RagDirectIndexResponse(
                accepted=True,
                status="queued",
                workspace_id=payload.workspace_id,
                file_id=payload.file_id,
                job_id=payload.job_id or "generated-at-runtime",
            )

        result = await indexer.index_file_direct(payload.workspace_id, payload.file_id, payload.job_id)
        return RagDirectIndexResponse(
            accepted=True,
            status=str(result["status"]),
            workspace_id=str(result["workspace_id"]),
            file_id=str(result["file_id"]),
            job_id=str(result["job_id"]),
            metadata=dict(result["metadata"]),
        )

    @app.post("/upload-and-index", response_model=RagDirectIndexResponse)
    async def upload_and_index(
        workspace_id: str = Form(...),
        file: UploadFile = File(...),
        file_id: str | None = Form(default=None),
        job_id: str | None = Form(default=None),
        async_mode: bool = Form(default=False),
        x_api_key: str | None = Header(default=None, alias="x-api-key"),
    ) -> RagDirectIndexResponse:
        _require_test_api_key(settings, x_api_key)
        indexer = RagIndexer(settings)
        content = await file.read()
        requested_file_id = file_id or f"upload-{uuid.uuid4()}"
        generated_file_id = _coerce_point_id(workspace_id, requested_file_id)
        effective_job_id = job_id or f"manual-{uuid.uuid4()}"
        source = FileSource(
            id=generated_file_id,
            workspace_id=workspace_id,
            name=file.filename or "upload.bin",
            mime_type=file.content_type or "application/octet-stream",
            size=len(content),
            file_hash=hashlib.sha256(content).hexdigest(),
            metadata={
                "source": "rag-test-upload",
                "requested_file_id": requested_file_id,
            },
            content_base64=base64.b64encode(content).decode("utf-8"),
        )

        if async_mode:
            asyncio.create_task(indexer.index_source(source, job_id=effective_job_id))
            return RagDirectIndexResponse(
                accepted=True,
                status="queued",
                workspace_id=workspace_id,
                file_id=requested_file_id,
                job_id=effective_job_id,
                metadata={"internal_file_id": generated_file_id},
            )

        metadata = await indexer.index_source(source, job_id=effective_job_id)
        return RagDirectIndexResponse(
            accepted=True,
            status="indexed",
            workspace_id=workspace_id,
            file_id=requested_file_id,
            job_id=effective_job_id,
            metadata={**metadata, "internal_file_id": generated_file_id},
        )

    return app


def _require_test_api_key(settings: Settings, provided: str | None) -> None:
    expected = settings.internal_api_key
    if not expected or provided != expected:
        raise HTTPException(status_code=HTTPStatus.UNAUTHORIZED, detail="Invalid x-api-key")


def _coerce_point_id(workspace_id: str, requested_file_id: str) -> str:
    try:
        return str(uuid.UUID(requested_file_id))
    except ValueError:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{workspace_id}:{requested_file_id}"))
