from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from nexus_ai.rag.indexer import RagIndexer
from nexus_ai.workspace_references import normalize_rag_results, rag_sources_from_results


async def rag_search(ctx: RunContext[Any], query: str, limit: int | None = None) -> list[dict[str, Any]]:
    """Search indexed workspace files with Nexus RAG."""
    return await _search_rag_results(ctx, query, limit)


async def search_rag(ctx: RunContext[Any], query: str, limit: int | None = None) -> dict[str, Any]:
    """Search authorized indexed workspace files and return normalized citations."""
    results = await _search_rag_results(ctx, query, limit)
    settings = ctx.deps.settings
    return {
        "query": query,
        "results": results,
        "sources": rag_sources_from_results(results, settings.workspace_id),
    }


async def _search_rag_results(ctx: RunContext[Any], query: str, limit: int | None = None) -> list[dict[str, Any]]:
    settings = ctx.deps.settings
    if not settings.user_id:
        return []
    execution_state = getattr(ctx.deps, "execution_state", None)
    if execution_state is None:
        execution_state = type("ExecutionState", (), {"rag_search_count": 0})()
        setattr(ctx.deps, "execution_state", execution_state)
    if execution_state.rag_search_count >= settings.rag_max_plan_searches:
        return []
    execution_state.rag_search_count += 1
    indexer = RagIndexer(settings)
    file_ids = await indexer.backend.get_authorized_file_ids(settings.workspace_id, settings.user_id)
    if not file_ids:
        return []
    results = await indexer.search(
        settings.workspace_id,
        query,
        limit=limit or settings.retrieval_top_k,
        min_score=settings.rag_min_score,
        file_ids=file_ids,
    )
    return normalize_rag_results(results, settings.workspace_id)
