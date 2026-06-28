from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from nexus_ai.rag.indexer import RagIndexer


async def rag_search(ctx: RunContext[Any], query: str, limit: int | None = None) -> list[dict[str, Any]]:
    """Search indexed workspace files with Nexus RAG."""
    settings = ctx.deps.settings
    indexer = RagIndexer(settings)
    return await indexer.search(
        settings.workspace_id,
        query,
        limit=limit or settings.retrieval_top_k,
        min_score=settings.rag_min_score,
    )
