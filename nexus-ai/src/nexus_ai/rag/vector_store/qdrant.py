from __future__ import annotations

from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from nexus_ai.rag.schemas import ChildChunk, FileSource
from nexus_ai.settings import Settings


class QdrantVectorStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)

    async def ensure_collections(self, vector_size: int) -> None:
        await self._ensure_collection(self.settings.qdrant_document_collection, vector_size)
        await self._ensure_collection(self.settings.qdrant_chunk_collection, vector_size)

    async def upsert_document(
        self,
        source: FileSource,
        summary: str,
        embedding: list[float],
        *,
        summary_model: str,
        summary_prompt_version: str,
    ) -> None:
        await self.client.upsert(
            collection_name=self.settings.qdrant_document_collection,
            points=[
                models.PointStruct(
                    id=source.id,
                    vector=embedding,
                    payload={
                        "workspace_id": source.workspace_id,
                        "file_id": source.id,
                        "file_name": source.name,
                        "summary": summary,
                        "mime_type": source.mime_type,
                        "file_hash": source.file_hash,
                        "summary_model": summary_model,
                        "summary_prompt_version": summary_prompt_version,
                        "embedding_model": self.settings.rag_embedding_model,
                    },
                )
            ],
        )

    async def upsert_chunks(self, source: FileSource, chunks: list[ChildChunk], embeddings: list[list[float]], job_id: str) -> None:
        points = []
        for chunk, embedding in zip(chunks, embeddings, strict=True):
            points.append(
                models.PointStruct(
                    id=chunk.child_id,
                    vector=embedding,
                    payload={
                        "workspace_id": source.workspace_id,
                        "file_id": source.id,
                        "content_type": "file",
                        "content_id": source.id,
                        "title": source.name,
                        "file_name": source.name,
                        "job_id": job_id,
                        "parent_id": chunk.parent_id,
                        "child_id": chunk.child_id,
                        "chunk_index": chunk.chunk_index,
                        "content": chunk.text,
                        "raw_text": chunk.text,
                        "chunk_text": chunk.contextual_text,
                        "parent_text": chunk.parent_text,
                        "contextual_header": chunk.contextual_header,
                        "context_source": chunk.context_source,
                        "context_prompt_version": chunk.context_prompt_version,
                        "page_numbers": chunk.page_numbers,
                        "bbox_refs": chunk.bbox_refs,
                        "heading_path": chunk.heading_path,
                        "chunking_strategy": self.settings.rag_chunking_strategy,
                        "embedding_model": self.settings.rag_embedding_model,
                        "file_hash": source.file_hash,
                    },
                )
            )
        await self.client.upsert(collection_name=self.settings.qdrant_chunk_collection, points=points)

    async def search_chunks(
        self,
        workspace_id: str,
        query_embedding: list[float],
        *,
        limit: int,
        min_score: float,
        file_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        must: list[models.FieldCondition] = [
            models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace_id))
        ]
        if file_ids:
            must.append(models.FieldCondition(key="file_id", match=models.MatchAny(any=file_ids)))
        response = await self.client.query_points(
            collection_name=self.settings.qdrant_chunk_collection,
            query=query_embedding,
            query_filter=models.Filter(must=must),
            limit=limit,
            score_threshold=min_score,
            with_payload=True,
        )
        return [
            {
                "id": str(result.id),
                "score": result.score,
                **(result.payload or {}),
            }
            for result in response.points
        ]

    async def _ensure_collection(self, name: str, vector_size: int) -> None:
        collections = await self.client.get_collections()
        if any(collection.name == name for collection in collections.collections):
            info = await self.client.get_collection(name)
            configured_size = self._configured_vector_size(info.config.params.vectors)
            if configured_size is not None and configured_size != vector_size:
                raise RuntimeError(
                    f"Qdrant collection {name!r} has vector size {configured_size}, expected {vector_size}. "
                    "Recreate the collection or switch to a matching embedding model."
                )
            return
        await self.client.create_collection(
            collection_name=name,
            vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
        )

    def _configured_vector_size(self, config: object) -> int | None:
        if isinstance(config, models.VectorParams):
            return config.size
        if isinstance(config, dict):
            for value in config.values():
                if isinstance(value, models.VectorParams):
                    return value.size
        return None
