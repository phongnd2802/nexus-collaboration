from __future__ import annotations

import asyncio
import base64

from nexus_ai.rag.chunking.registry import resolve_chunking_strategy
from nexus_ai.rag.embeddings.openrouter import OpenRouterEmbeddingClient
from nexus_ai.rag.extraction.registry import resolve_extractor
from nexus_ai.rag.llm import CONTEXT_PROMPT_VERSION, SUMMARY_PROMPT_VERSION, RagLlmClient
from nexus_ai.rag.schemas import ChildChunk, FileSource, ParentChunk
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

            llm_client = RagLlmClient(self.settings)
            embedder = OpenRouterEmbeddingClient(self.settings)
            vector_store = QdrantVectorStore(self.settings)
            summary = await llm_client.generate_document_summary(source, document)
            chunks = await self._apply_contextual_retrieval(source, chunks, llm_client)
            vectors = await embedder.embed([summary, *[chunk.contextual_text for chunk in chunks]])
            await vector_store.ensure_collections(len(vectors[0]))
            await vector_store.upsert_document(
                source,
                summary,
                vectors[0],
                summary_model=self.settings.rag_llm_model,
                summary_prompt_version=SUMMARY_PROMPT_VERSION,
            )
            await vector_store.upsert_chunks(source, chunks, vectors[1:], job_id)
            await self.backend.update_job(
                workspace_id,
                job_id,
                "indexed",
                metadata={
                    "chunks": len(chunks),
                    "embedding_model": self.settings.rag_embedding_model,
                    "summary_model": self.settings.rag_llm_model,
                    "context_model": self.settings.rag_llm_model if self.settings.rag_enable_contextual_retrieval else None,
                    "summary_prompt_version": SUMMARY_PROMPT_VERSION,
                    "context_prompt_version": CONTEXT_PROMPT_VERSION if self.settings.rag_enable_contextual_retrieval else None,
                },
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

    async def _apply_contextual_retrieval(
        self,
        source: FileSource,
        chunks: list[ChildChunk],
        llm_client: RagLlmClient,
    ) -> list[ChildChunk]:
        if not self.settings.rag_enable_contextual_retrieval:
            for chunk in chunks:
                chunk.contextual_text = chunk.text
                chunk.context_source = "none"
                chunk.context_prompt_version = None
            return chunks

        parents = {chunk.parent_id: chunk.parent_text for chunk in chunks}
        parent_indexes = {
            chunk.parent_id: int(chunk.metadata.get("parent_index", 0)) if isinstance(chunk.metadata.get("parent_index", 0), int) else 0
            for chunk in chunks
        }
        page_numbers = {chunk.parent_id: chunk.page_numbers for chunk in chunks}
        heading_paths = {chunk.parent_id: chunk.heading_path for chunk in chunks}
        tasks = []
        for chunk in chunks:
            parent = ParentChunk(
                parent_id=chunk.parent_id,
                text=parents[chunk.parent_id],
                parent_index=parent_indexes[chunk.parent_id],
                page_numbers=page_numbers[chunk.parent_id],
                heading_path=heading_paths[chunk.parent_id],
                metadata=chunk.metadata,
            )
            tasks.append(llm_client.generate_child_context(source, parent, chunk))
        headers = await asyncio.gather(*tasks)
        for chunk, header in zip(chunks, headers, strict=True):
            chunk.contextual_header = header
            chunk.contextual_text = f"{header}\n\n{chunk.text}"
            chunk.context_source = "llm"
            chunk.context_prompt_version = CONTEXT_PROMPT_VERSION
        return chunks
