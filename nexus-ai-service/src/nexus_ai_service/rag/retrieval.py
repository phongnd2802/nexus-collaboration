import math
import re
from dataclasses import dataclass

from nexus_ai_service.rag.schemas import ChildChunk, FileSource, RagSearchRequest, RagSearchResult


@dataclass(frozen=True)
class IndexedChunk:
    source: FileSource
    chunk: ChildChunk


class LocalHybridRetrievalService:
    def __init__(self) -> None:
        self._chunks: dict[str, IndexedChunk] = {}

    async def index(self, source: FileSource, chunks: list[ChildChunk]) -> None:
        await self.delete_file(source.workspace_id, source.id)
        for chunk in chunks:
            self._chunks[chunk.id] = IndexedChunk(source=source, chunk=chunk)

    async def delete_file(self, workspace_id: str, file_id: str) -> None:
        stale = [
            chunk_id
            for chunk_id, indexed in self._chunks.items()
            if indexed.source.workspace_id == workspace_id and indexed.source.id == file_id
        ]
        for chunk_id in stale:
            del self._chunks[chunk_id]


    async def search(self, request: RagSearchRequest) -> list[RagSearchResult]:
        if request.file_ids is not None and len(request.file_ids) == 0:
            return []
        query_terms = tokenize(request.query)
        if not query_terms:
            return []
        candidates = [
            indexed
            for indexed in self._chunks.values()
            if indexed.source.workspace_id == request.workspace_id
            and (request.file_ids is None or indexed.source.id in request.file_ids)
        ]
        rank_bm25_results = self._rank_with_rank_bm25(request, candidates, query_terms)
        if rank_bm25_results is not None:
            return rank_bm25_results
        scored = []
        total_docs = max(len(candidates), 1)
        doc_freq = {
            term: sum(1 for indexed in candidates if term in set(tokenize(indexed.chunk.text)))
            for term in set(query_terms)
        }
        avg_len = sum(len(tokenize(indexed.chunk.text)) for indexed in candidates) / max(len(candidates), 1)
        for indexed in candidates:
            terms = tokenize(indexed.chunk.text)
            score = bm25_score(query_terms, terms, doc_freq, total_docs, avg_len)
            if score >= request.min_score:
                scored.append((score, indexed))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [self._result(score, indexed, request.strategy) for score, indexed in scored[: request.limit]]

    def _rank_with_rank_bm25(
        self, request: RagSearchRequest, candidates: list[IndexedChunk], query_terms: list[str]
    ) -> list[RagSearchResult] | None:
        try:
            from rank_bm25 import BM25Okapi
        except Exception:
            return None
        tokenized = [tokenize(indexed.chunk.text) for indexed in candidates]
        if not tokenized:
            return []
        bm25 = BM25Okapi(tokenized)
        scores = bm25.get_scores(query_terms)
        ranked = sorted(zip(scores, candidates, strict=False), key=lambda item: float(item[0]), reverse=True)
        return [
            self._result(round(float(score), 6), indexed, request.strategy)
            for score, indexed in ranked
            if float(score) >= request.min_score
        ][: request.limit]

    def _result(self, score: float, indexed: IndexedChunk, mode: str) -> RagSearchResult:
        title = indexed.source.name
        snippet = indexed.chunk.text[:280]
        return RagSearchResult(
            id=indexed.chunk.id,
            source_id=indexed.source.id,
            source_type="file",
            workspace_id=indexed.source.workspace_id,
            title=title,
            snippet=snippet,
            content=indexed.chunk.text[:4000],
            citation=title,
            page=None,
            score=score,
            dense_score=None,
            lexical_score=score,
            retrieval_mode="bm25" if mode == "bm25" else "hybrid",
            metadata={
                "file_hash": indexed.source.file_hash,
                "mime_type": indexed.source.mime_type,
                "chunk_index": indexed.chunk.chunk_index,
            },
        )


def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9_]+", text.lower())


def bm25_score(
    query_terms: list[str],
    doc_terms: list[str],
    doc_freq: dict[str, int],
    total_docs: int,
    avg_len: float,
    k1: float = 1.5,
    b: float = 0.75,
) -> float:
    if not doc_terms:
        return 0.0
    score = 0.0
    doc_len = len(doc_terms)
    for term in query_terms:
        freq = doc_terms.count(term)
        if freq == 0:
            continue
        idf = math.log(1 + (total_docs - doc_freq.get(term, 0) + 0.5) / (doc_freq.get(term, 0) + 0.5))
        denom = freq + k1 * (1 - b + b * doc_len / max(avg_len, 1))
        score += idf * (freq * (k1 + 1)) / denom
    return round(score, 6)
