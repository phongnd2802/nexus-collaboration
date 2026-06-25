from __future__ import annotations

import base64

from nexus_ai.rag.chunking.registry import resolve_chunking_strategy
from nexus_ai.rag.embeddings.openrouter import OpenRouterEmbeddingClient
from nexus_ai.rag.extraction.registry import resolve_extractor
from nexus_ai.rag.source_client import BackendRagClient
from nexus_ai.rag.vector_store.qdrant import QdrantVectorStore
from nexus_ai.settings import Settings


class RagIndexer:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.backend = BackendRagClient(settings)

    async def index_file(self, workspace_id: str, file_id: str, job_id: str) -> None:
        if not self.settings.rag_enabled:
            await self.backend.update_job(workspace_id, job_id, "skipped", error_message="RAG indexing is disabled")
            return

        try:
            await self.backend.claim_job(workspace_id, job_id)
            source = await self.backend.get_file_source(workspace_id, file_id)
            content = base64.b64decode(source.content_base64)
            extractor = resolve_extractor(source.mime_type, source.name)
            document = await extractor.extract(source, content)
            chunks = resolve_chunking_strategy(self.settings).split(source, document)

            if not chunks:
                await self.backend.update_job(workspace_id, job_id, "skipped", error_message="No extractable text chunks")
                return

            embedder = OpenRouterEmbeddingClient(self.settings)
            vector_store = QdrantVectorStore(self.settings)
            summary = self._summary(document.text)
            vectors = await embedder.embed([summary, *[chunk.contextual_text for chunk in chunks]])
            await vector_store.ensure_collections(len(vectors[0]))
            await vector_store.upsert_document(source, summary, vectors[0])
            await vector_store.upsert_chunks(source, chunks, vectors[1:], job_id)
            await self.backend.update_job(
                workspace_id,
                job_id,
                "indexed",
                metadata={"chunks": len(chunks), "embedding_model": self.settings.rag_embedding_model},
            )
        except ValueError as exc:
            await self.backend.update_job(workspace_id, job_id, "skipped", error_message=str(exc))
        except Exception as exc:
            await self.backend.update_job(workspace_id, job_id, "failed", error_message=str(exc))
            raise

    async def search(self, workspace_id: str, query: str, limit: int, min_score: float, file_ids: list[str] | None = None) -> list[dict]:
        embedder = OpenRouterEmbeddingClient(self.settings)
        vector_store = QdrantVectorStore(self.settings)
        vector = (await embedder.embed([query]))[0]
        return await vector_store.search_chunks(
            workspace_id,
            vector,
            limit=limit,
            min_score=min_score,
            file_ids=file_ids,
        )

    def _summary(self, text: str) -> str:
        normalized = " ".join(text.split())
        return normalized[:4000]
