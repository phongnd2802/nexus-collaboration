import asyncio

from nexus_ai.rag.retrieval import RagRetrievalService
from nexus_ai.settings import load_settings


def _settings():
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "OPENROUTER_API_KEY": "test-key",
        }
    )


def test_rag_retrieval_rrf_and_parent_dedupe():
    service = RagRetrievalService.__new__(RagRetrievalService)
    service.settings = _settings()

    fused = service._rrf(
        [
            [
                {"id": "child-1", "parent_id": "parent-1", "retrieval_source": "dense", "score": 0.9},
                {"id": "child-2", "parent_id": "parent-2", "retrieval_source": "dense", "score": 0.8},
            ],
            [
                {"id": "child-3", "parent_id": "parent-1", "retrieval_source": "lexical", "score": 1.0},
                {"id": "child-2", "parent_id": "parent-2", "retrieval_source": "lexical", "score": 0.9},
            ],
        ]
    )

    assert [item["parent_id"] for item in fused] == ["parent-2", "parent-1"]
    assert fused[0]["source_scores"] == {"dense": 1 / 62, "lexical": 1 / 62}


def test_rag_retrieval_step_back_trigger():
    service = RagRetrievalService.__new__(RagRetrievalService)
    service.settings = _settings()

    assert service._should_step_back("Tại sao hệ thống cần document routing?")
    assert service._should_step_back("How does indexing improve retrieval?")
    assert not service._should_step_back("project charter")


def test_rag_retrieval_search_falls_back_when_document_route_empty(monkeypatch):
    settings = _settings()
    service = RagRetrievalService(settings)
    captured: dict[str, object] = {"dense_document_ids": []}

    class FakeEmbedder:
        async def embed(self, texts):
            return [[1.0, 0.0] for _ in texts]

    class FakeVectorStore:
        async def search_documents(self, *args, **kwargs):
            return [{"id": "file-1", "file_id": "file-1", "score": 0.9}]

        async def search_chunks_dense(self, *args, **kwargs):
            captured["dense_document_ids"].append(kwargs.get("document_ids"))
            if kwargs.get("document_ids"):
                return []
            return [
                {
                    "id": "child-1",
                    "parent_id": "parent-1",
                    "retrieval_source": "dense",
                    "score": 0.9,
                    "_vector": [1.0, 0.0],
                    "file_name": "notes.pdf",
                    "content": "answer",
                }
            ]

        async def search_chunks_lexical(self, *args, **kwargs):
            return []

    async def fake_variants(query, *, strategy):
        return [type("Variant", (), {"text": query, "kind": "raw"})()]

    service.embedder = FakeEmbedder()
    service.vector_store = FakeVectorStore()
    monkeypatch.setattr(service, "_query_variants", fake_variants)

    results = asyncio.run(
        service.search(
            workspace_id="workspace",
            query="question",
            limit=3,
            min_score=0.5,
            file_ids=["file-1"],
        )
    )

    assert captured["dense_document_ids"] == [["file-1"], None]
    assert results[0]["id"] == "child-1"
    assert results[0]["retrieval_mode"] == "dense"
    assert results[0]["citation"] == "notes.pdf"


def test_rag_retrieval_empty_authorized_file_ids_returns_empty():
    service = RagRetrievalService(_settings())

    results = asyncio.run(
        service.search(
            workspace_id="workspace",
            query="question",
            limit=3,
            min_score=0.5,
            file_ids=[],
        )
    )

    assert results == []
