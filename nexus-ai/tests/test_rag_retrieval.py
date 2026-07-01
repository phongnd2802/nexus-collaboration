import asyncio

from nexus_ai.rag import retrieval as retrieval_module
from nexus_ai.settings import load_settings


class FakeEmbedder:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [[1.0, 0.0] for _ in texts]


class FakeVectorStore:
    async def search_documents(self, *args, **kwargs):
        return []

    async def search_chunks_dense(self, *args, **kwargs):
        return [
            {
                "id": "chunk-1",
                "parent_id": "parent-1",
                "file_id": "file-1",
                "file_name": "Plan.pdf",
                "page_numbers": [2],
                "chunk_text": "dense hit",
                "_vector": [1.0, 0.0],
                "retrieval_source": "dense",
                "score": 0.8,
            }
        ]


class FakeLexicalStore:
    async def search_chunks(self, *args, **kwargs):
        return [
            {
                "id": "chunk-1",
                "parent_id": "parent-1",
                "file_id": "file-1",
                "file_name": "Plan.pdf",
                "page_numbers": [2],
                "chunk_text": "lexical hit",
                "retrieval_source": "lexical",
                "score": 1.0,
            }
        ]


class RaisingLexicalStore:
    async def search_chunks(self, *args, **kwargs):
        raise RuntimeError("elasticsearch unavailable")


def _settings():
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_RAG_LEXICAL_PROVIDER": "elasticsearch",
            "NEXUS_RAG_QUERY_TRANSFORM": "raw",
        }
    )


def test_rag_retrieval_marks_hybrid_results(monkeypatch):
    monkeypatch.setattr(retrieval_module, "OpenRouterEmbeddingClient", lambda settings: FakeEmbedder())
    monkeypatch.setattr(retrieval_module, "QdrantVectorStore", lambda settings: FakeVectorStore())
    monkeypatch.setattr(retrieval_module, "ElasticsearchLexicalStore", lambda settings: FakeLexicalStore())

    service = retrieval_module.RagRetrievalService(_settings())
    results = asyncio.run(service.search(workspace_id="ws-1", query="project plan", limit=5, min_score=0.1))

    assert len(results) == 1
    assert results[0]["retrieval_mode"] == "hybrid"
    assert results[0]["citation"] == "Plan.pdf, page 2"


def test_rag_retrieval_falls_back_to_dense_only(monkeypatch):
    monkeypatch.setattr(retrieval_module, "OpenRouterEmbeddingClient", lambda settings: FakeEmbedder())
    monkeypatch.setattr(retrieval_module, "QdrantVectorStore", lambda settings: FakeVectorStore())
    monkeypatch.setattr(retrieval_module, "ElasticsearchLexicalStore", lambda settings: RaisingLexicalStore())

    service = retrieval_module.RagRetrievalService(_settings())
    results = asyncio.run(service.search(workspace_id="ws-1", query="project plan", limit=5, min_score=0.1))

    assert len(results) == 1
    assert results[0]["retrieval_mode"] == "dense"
