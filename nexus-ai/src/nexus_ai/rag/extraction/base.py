from __future__ import annotations

from abc import ABC, abstractmethod

from nexus_ai.rag.schemas import ExtractedDocument, FileSource


class DocumentExtractor(ABC):
    @abstractmethod
    async def extract(self, source: FileSource, content: bytes) -> ExtractedDocument:
        raise NotImplementedError
