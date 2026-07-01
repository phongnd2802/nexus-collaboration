from __future__ import annotations

from nexus_ai.rag.chunking.base import ChunkingStrategy
from nexus_ai.rag.chunking.strategies.document_routed_parent_child import DocumentRoutedParentChildStrategy
from nexus_ai.settings import Settings


def resolve_chunking_strategy(settings: Settings) -> ChunkingStrategy:
    if settings.rag_chunking_strategy == "document_routed_parent_child_v1":
        return DocumentRoutedParentChildStrategy(settings)
    return DocumentRoutedParentChildStrategy(settings)
