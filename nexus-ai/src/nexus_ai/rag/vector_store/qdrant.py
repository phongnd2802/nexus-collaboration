from __future__ import annotations

import re
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from nexus_ai.rag.schemas import ChildChunk, FileSource
from nexus_ai.settings import Settings
from nexus_ai.storage.mem0 import mem0_collection_name


class QdrantVectorStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)

    async def ensure_collections(self, vector_size: int) -> None:
        await self._ensure_collection(self.settings.qdrant_document_collection, vector_size)
        await self._ensure_collection(self.settings.qdrant_chunk_collection, vector_size)
        await self._ensure_text_indexes()

    async def upsert_document(
        self,
        source: FileSource,
        summary: str,
        embedding: list[float],
        *,
        document_metadata: dict[str, Any] | None = None,
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
                        "source_metadata": source.metadata,
                        "document_metadata": document_metadata or {},
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
                        "mime_type": source.mime_type,
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
                        "source_metadata": source.metadata,
                        "chunk_metadata": chunk.metadata,
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
            self._point_to_result(result, source="dense")
            for result in response.points
        ]

    async def search_documents(
        self,
        workspace_id: str,
        query_embedding: list[float],
        *,
        limit: int,
        min_score: float,
        file_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        response = await self.client.query_points(
            collection_name=self.settings.qdrant_document_collection,
            query=query_embedding,
            query_filter=self._filter(workspace_id, file_ids=file_ids),
            limit=limit,
            score_threshold=min_score,
            with_payload=True,
        )
        return [self._point_to_result(point, source="document") for point in response.points]

    async def search_chunks_dense(
        self,
        workspace_id: str,
        query_embedding: list[float],
        *,
        limit: int,
        min_score: float,
        file_ids: list[str] | None = None,
        document_ids: list[str] | None = None,
        with_vectors: bool = False,
    ) -> list[dict[str, Any]]:
        response = await self.client.query_points(
            collection_name=self.settings.qdrant_chunk_collection,
            query=query_embedding,
            query_filter=self._filter(workspace_id, file_ids=file_ids, document_ids=document_ids),
            limit=limit,
            score_threshold=min_score,
            with_payload=True,
            with_vectors=with_vectors,
        )
        return [self._point_to_result(point, source="dense") for point in response.points]

    async def search_chunks_lexical(
        self,
        workspace_id: str,
        query: str,
        *,
        limit: int,
        file_ids: list[str] | None = None,
        document_ids: list[str] | None = None,
        with_vectors: bool = False,
    ) -> list[dict[str, Any]]:
        conditions = [
            models.FieldCondition(key="chunk_text", match=models.MatchText(text=query)),
            models.FieldCondition(key="raw_text", match=models.MatchText(text=query)),
        ]
        filter_ = self._filter(workspace_id, file_ids=file_ids, document_ids=document_ids)
        filter_.should = conditions
        points, _ = await self.client.scroll(
            collection_name=self.settings.qdrant_chunk_collection,
            scroll_filter=filter_,
            limit=limit,
            with_payload=True,
            with_vectors=with_vectors,
        )
        results = [self._point_to_result(point, source="lexical") for point in points]
        tokens = self._tokens(query)
        for result in results:
            haystack = f"{result.get('chunk_text', '')} {result.get('raw_text', '')} {result.get('title', '')}"
            overlap = len(tokens & self._tokens(haystack))
            result["score"] = float(overlap) / max(1, len(tokens))
        return sorted(results, key=lambda result: float(result.get("score") or 0.0), reverse=True)

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

    async def _ensure_text_indexes(self) -> None:
        for field_name in ("chunk_text", "raw_text"):
            try:
                await self.client.create_payload_index(
                    collection_name=self.settings.qdrant_chunk_collection,
                    field_name=field_name,
                    field_schema=models.TextIndexParams(
                        type=models.TextIndexType.TEXT,
                        tokenizer=models.TokenizerType.WORD,
                        lowercase=True,
                    ),
                )
            except Exception:
                continue

    def _filter(
        self,
        workspace_id: str,
        *,
        file_ids: list[str] | None = None,
        document_ids: list[str] | None = None,
    ) -> models.Filter:
        must: list[models.FieldCondition] = [
            models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace_id))
        ]
        if file_ids:
            must.append(models.FieldCondition(key="file_id", match=models.MatchAny(any=file_ids)))
        if document_ids:
            must.append(models.FieldCondition(key="file_id", match=models.MatchAny(any=document_ids)))
        return models.Filter(must=must)

    def _point_to_result(self, point: Any, *, source: str) -> dict[str, Any]:
        payload = dict(getattr(point, "payload", None) or {})
        vector = self._point_vector(point)
        result = {
            "id": str(point.id),
            "score": float(getattr(point, "score", 0.0) or 0.0),
            "retrieval_source": source,
            **payload,
        }
        if vector:
            result["_vector"] = vector
        return result

    def _point_vector(self, point: Any) -> list[float] | None:
        vector = getattr(point, "vector", None)
        if isinstance(vector, list):
            return [float(value) for value in vector]
        if isinstance(vector, dict):
            first = next(iter(vector.values()), None)
            if isinstance(first, list):
                return [float(value) for value in first]
        return None

    def _tokens(self, text: str) -> set[str]:
        return {token for token in re.findall(r"[\w-]+", text.lower()) if len(token) > 1}


async def ensure_qdrant_collections_for_runtime(settings: Settings) -> None:
    client = AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None)
    store = QdrantVectorStore(settings)
    store.client = client
    vector_size = settings.rag_embedding_dimensions

    if settings.rag_enabled:
        await store.ensure_collections(vector_size)

    if settings.mem0_enabled:
        await store._ensure_collection(mem0_collection_name(settings), vector_size)
