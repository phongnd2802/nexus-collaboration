from __future__ import annotations

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.schemas import ExtractedDocument, FileSource


class UnsupportedExtractor(DocumentExtractor):
    async def extract(self, source: FileSource, content: bytes) -> ExtractedDocument:
        raise ValueError(f"Unsupported file type for RAG indexing: {source.mime_type or source.name}")
