from dataclasses import dataclass

from nexus_ai_service.rag.chunking import ChunkingService
from nexus_ai_service.rag.extraction import ExtractorRegistry
from nexus_ai_service.rag.retrieval import LocalHybridRetrievalService
from nexus_ai_service.rag.schemas import FileSource


@dataclass(frozen=True)
class AcceptedIndexJob:
    workspace_id: str
    file_id: str
    job_id: str
    status: str = "queued"


class RagIndexer:
    def __init__(
        self,
        retrieval_service: LocalHybridRetrievalService,
        extractor: ExtractorRegistry | None = None,
        chunker: ChunkingService | None = None,
        opendataloader_options: dict[str, object] | None = None,
        tokenizer_model: str | None = None,
    ) -> None:
        self.retrieval_service = retrieval_service
        self.extractor = extractor or ExtractorRegistry(opendataloader_options)
        self.chunker = chunker or ChunkingService(tokenizer_model=tokenizer_model)

    async def index_source(self, source: FileSource) -> dict[str, object]:
        document = self.extractor.extract(source)
        chunks = self.chunker.split(source, document)
        if not chunks:
            await self.retrieval_service.delete_file(source.workspace_id, source.id)
            return {"status": "skipped", "chunk_count": 0, "reason": "no_extractable_text"}
        await self.retrieval_service.index(source, chunks)
        return {
            "status": "indexed",
            "chunk_count": len(chunks),
            "extractor": document.metadata.get("extractor"),
            "index_version": "local-bm25-v1",
        }
