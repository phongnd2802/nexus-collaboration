from __future__ import annotations

import asyncio
import math
import re
from dataclasses import dataclass
from typing import Any
import logging

from nexus_ai.rag.embeddings.openrouter import OpenRouterEmbeddingClient
from nexus_ai.rag.lexical_store import ElasticsearchLexicalStore
from nexus_ai.rag.llm import RagLlmClient
from nexus_ai.rag.vector_store.qdrant import QdrantVectorStore
from nexus_ai.settings import Settings


REASONING_TERMS = (
    "why",
    "how",
    "explain",
    "compare",
    "tradeoff",
    "trade-off",
    "impact",
    "reason",
    "tại sao",
    "như thế nào",
    "giải thích",
    "so sánh",
    "đánh đổi",
    "ảnh hưởng",
    "nguyên nhân",
)


@dataclass(frozen=True)
class QueryVariant:
    text: str
    kind: str


class RagRetrievalService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.embedder = OpenRouterEmbeddingClient(settings)
        self.vector_store = QdrantVectorStore(settings)
        self.lexical_store = ElasticsearchLexicalStore(settings)
        self.logger = logging.getLogger(__name__)

    async def search(
        self,
        *,
        workspace_id: str,
        query: str,
        limit: int,
        min_score: float,
        file_ids: list[str] | None = None,
        strategy: str | None = None,
        include_debug: bool = False,
    ) -> list[dict[str, Any]]:
        if file_ids is not None and not file_ids:
            return []
        variants = await self._query_variants(query, strategy=strategy)
        vectors = await self.embedder.embed([variant.text for variant in variants])
        vector_by_text = {variant.text: vector for variant, vector in zip(variants, vectors, strict=True)}

        routed_document_ids = await self._route_documents(
            workspace_id,
            variants,
            vector_by_text,
            min_score=min_score,
            file_ids=file_ids,
        )
        candidates = await self._retrieve_candidates(
            workspace_id,
            variants,
            vector_by_text,
            min_score=min_score,
            file_ids=file_ids,
            document_ids=routed_document_ids,
        )
        if not any(candidates) and routed_document_ids:
            candidates = await self._retrieve_candidates(
                workspace_id,
                variants,
                vector_by_text,
                min_score=min_score,
                file_ids=file_ids,
                document_ids=None,
            )

        fused = self._rrf(candidates)
        selected = self._mmr(fused, query_vector=vectors[0], limit=limit)
        for rank, result in enumerate(selected, start=1):
            result["rank"] = rank
            result["retrieval_mode"] = self._retrieval_mode(result)
            result["citation"] = self._citation(result)
            if include_debug:
                result["query_variants"] = [variant.__dict__ for variant in variants]
                result["routed_document_ids"] = routed_document_ids
            result.pop("_vector", None)
        return selected

    async def _query_variants(self, query: str, *, strategy: str | None) -> list[QueryVariant]:
        selected_strategy = strategy or self.settings.rag_query_transform
        variants = [QueryVariant(query.strip(), "raw")]
        if selected_strategy in {"none", "raw"}:
            return variants

        llm = RagLlmClient(self.settings)
        tasks = []
        if "multi_query" in selected_strategy and self.settings.rag_multi_query_count > 0:
            tasks.append(("rewrite", llm.generate_query_rewrites(query, count=self.settings.rag_multi_query_count)))
        if self.settings.rag_enable_step_back and self._should_step_back(query):
            tasks.append(("step_back", llm.generate_step_back_query(query)))

        if not tasks:
            return variants
        try:
            results = await asyncio.gather(*(task for _, task in tasks))
        except Exception:
            return variants

        for (kind, _), output in zip(tasks, results, strict=True):
            if kind == "rewrite" and isinstance(output, list):
                variants.extend(QueryVariant(text, "rewrite") for text in output if text and text != query)
            elif kind == "step_back" and isinstance(output, str) and output and output != query:
                variants.append(QueryVariant(output, "step_back"))
        return self._dedupe_variants(variants)

    async def _route_documents(
        self,
        workspace_id: str,
        variants: list[QueryVariant],
        vector_by_text: dict[str, list[float]],
        *,
        min_score: float,
        file_ids: list[str] | None,
    ) -> list[str]:
        if self.settings.rag_document_route_top_k <= 0:
            return []
        ranked_lists = []
        for variant in variants:
            results = await self.vector_store.search_documents(
                workspace_id,
                vector_by_text[variant.text],
                limit=self.settings.rag_document_route_top_k,
                min_score=min_score,
                file_ids=file_ids,
            )
            ranked_lists.append(results)
        routed = self._rrf(ranked_lists)
        return [
            str(result.get("file_id") or result.get("id"))
            for result in routed[: self.settings.rag_document_route_top_k]
            if result.get("file_id") or result.get("id")
        ]

    async def _retrieve_candidates(
        self,
        workspace_id: str,
        variants: list[QueryVariant],
        vector_by_text: dict[str, list[float]],
        *,
        min_score: float,
        file_ids: list[str] | None,
        document_ids: list[str] | None,
    ) -> list[list[dict[str, Any]]]:
        dense_tasks = [
            self.vector_store.search_chunks_dense(
                workspace_id,
                vector_by_text[variant.text],
                limit=self.settings.rag_dense_candidates,
                min_score=min_score,
                file_ids=file_ids,
                document_ids=document_ids,
                with_vectors=True,
            )
            for variant in variants
        ]
        dense_results = await asyncio.gather(*dense_tasks)
        lexical_results: list[list[dict[str, Any]]] = []
        if self.settings.rag_lexical_provider == "elasticsearch":
            lexical_tasks = [
                self.lexical_store.search_chunks(
                    workspace_id,
                    variant.text,
                    limit=self.settings.rag_lexical_candidates,
                    file_ids=file_ids,
                    document_ids=document_ids,
                )
                for variant in variants
            ]
            try:
                lexical_results = await asyncio.gather(*lexical_tasks)
            except Exception as exc:
                self.logger.warning("Elasticsearch lexical retrieval failed; continuing with dense-only results: %s", exc)
        return [*dense_results, *lexical_results]

    def _rrf(self, ranked_lists: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
        by_id: dict[str, dict[str, Any]] = {}
        scores: dict[str, float] = {}
        source_scores: dict[str, dict[str, float]] = {}
        rrf_k = max(1, self.settings.rag_rrf_k)

        for ranked in ranked_lists:
            for rank, item in enumerate(ranked, start=1):
                item_id = str(item.get("id") or item.get("child_id"))
                if not item_id:
                    continue
                by_id.setdefault(item_id, dict(item))
                source = str(item.get("retrieval_source") or "unknown")
                contribution = 1.0 / (rrf_k + rank)
                scores[item_id] = scores.get(item_id, 0.0) + contribution
                source_scores.setdefault(item_id, {})
                source_scores[item_id][source] = source_scores[item_id].get(source, 0.0) + contribution

        fused = []
        for item_id, item in by_id.items():
            item["score"] = scores[item_id]
            item["source_scores"] = source_scores[item_id]
            fused.append(item)
        fused.sort(key=lambda item: float(item.get("score") or 0.0), reverse=True)
        return self._dedupe_parents(fused)

    def _mmr(self, candidates: list[dict[str, Any]], *, query_vector: list[float], limit: int) -> list[dict[str, Any]]:
        if len(candidates) <= limit:
            return candidates[:limit]
        pool = list(candidates)
        selected: list[dict[str, Any]] = []
        lambda_ = min(1.0, max(0.0, self.settings.rag_mmr_lambda))

        while pool and len(selected) < limit:
            best_index = 0
            best_score = -math.inf
            for index, candidate in enumerate(pool):
                vector = candidate.get("_vector")
                relevance = self._cosine(query_vector, vector) if isinstance(vector, list) else float(candidate.get("score") or 0.0)
                diversity_penalty = 0.0
                for chosen in selected:
                    chosen_vector = chosen.get("_vector")
                    if isinstance(vector, list) and isinstance(chosen_vector, list):
                        diversity_penalty = max(diversity_penalty, self._cosine(vector, chosen_vector))
                score = lambda_ * relevance - (1.0 - lambda_) * diversity_penalty
                if score > best_score:
                    best_score = score
                    best_index = index
            selected.append(pool.pop(best_index))
        return selected

    def _dedupe_parents(self, candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        output: list[dict[str, Any]] = []
        for candidate in candidates:
            key = str(candidate.get("parent_id") or candidate.get("id"))
            if key in seen:
                continue
            seen.add(key)
            output.append(candidate)
        return output

    def _dedupe_variants(self, variants: list[QueryVariant]) -> list[QueryVariant]:
        seen: set[str] = set()
        output: list[QueryVariant] = []
        for variant in variants:
            normalized = " ".join(variant.text.lower().split())
            if not normalized or normalized in seen:
                continue
            seen.add(normalized)
            output.append(variant)
        return output

    def _should_step_back(self, query: str) -> bool:
        normalized = query.lower()
        return any(term in normalized for term in REASONING_TERMS)

    def _retrieval_mode(self, result: dict[str, Any]) -> str:
        sources = set((result.get("source_scores") or {}).keys())
        if {"dense", "lexical"}.issubset(sources):
            return "hybrid"
        if "lexical" in sources:
            return "lexical"
        return "dense"

    def _citation(self, result: dict[str, Any]) -> str:
        title = str(result.get("file_name") or result.get("title") or "workspace file")
        pages = result.get("page_numbers")
        if isinstance(pages, list) and pages:
            return f"{title}, page {pages[0]}"
        return title

    def _cosine(self, left: list[float], right: list[float]) -> float:
        if not left or not right or len(left) != len(right):
            return 0.0
        dot = sum(a * b for a, b in zip(left, right, strict=True))
        left_norm = math.sqrt(sum(a * a for a in left))
        right_norm = math.sqrt(sum(b * b for b in right))
        if left_norm == 0.0 or right_norm == 0.0:
            return 0.0
        return dot / (left_norm * right_norm)

    def _tokens(self, text: str) -> set[str]:
        return {token for token in re.findall(r"[\w-]+", text.lower()) if len(token) > 1}
