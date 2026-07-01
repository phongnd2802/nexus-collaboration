from __future__ import annotations

from abc import ABC, abstractmethod

from nexus_ai.rag.schemas import ChildChunk, ExtractedDocument, FileSource


class ChunkingStrategy(ABC):
    @abstractmethod
    def split(self, source: FileSource, document: ExtractedDocument) -> list[ChildChunk]:
        raise NotImplementedError
