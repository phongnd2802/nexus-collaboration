import asyncio

from qdrant_client.http import models

from nexus_ai.rag.embeddings.openrouter import OpenRouterEmbeddingClient
from nexus_ai.rag.vector_store.qdrant import QdrantVectorStore
from nexus_ai.settings import load_settings


def test_openrouter_embeddings_request_uses_float_encoding(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "OPENROUTER_API_KEY": "key",
        }
    )
    captured: dict[str, object] = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [{"embedding": [0.1, 0.2]}]}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            captured["url"] = url
            captured["headers"] = headers
            captured["json"] = json
            return FakeResponse()

    monkeypatch.setattr("nexus_ai.rag.embeddings.openrouter.httpx.AsyncClient", lambda timeout: FakeClient())

    vectors = asyncio.run(OpenRouterEmbeddingClient(settings).embed(["hello"]))

    assert vectors == [[0.1, 0.2]]
    assert captured["json"] == {
        "model": settings.rag_embedding_model,
        "input": ["hello"],
        "encoding_format": "float",
    }


def test_openrouter_embeddings_reject_invalid_vectors(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "OPENROUTER_API_KEY": "key",
        }
    )

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": [{"embedding": []}]}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def post(self, url, headers, json):
            return FakeResponse()

    monkeypatch.setattr("nexus_ai.rag.embeddings.openrouter.httpx.AsyncClient", lambda timeout: FakeClient())

    try:
        asyncio.run(OpenRouterEmbeddingClient(settings).embed(["hello"]))
    except RuntimeError as exc:
        assert "missing float vector" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError for invalid embedding response")


def test_qdrant_vector_store_rejects_collection_size_mismatch():
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "OPENROUTER_API_KEY": "key",
        }
    )
    store = QdrantVectorStore(settings)

    class FakeCollections:
        collections = [type("Collection", (), {"name": settings.qdrant_chunk_collection})()]

    class FakeCollectionInfo:
        config = type(
            "Config",
            (),
            {
                "params": type(
                    "Params",
                    (),
                    {"vectors": models.VectorParams(size=1024, distance=models.Distance.COSINE)},
                )()
            },
        )()

    class FakeClient:
        async def get_collections(self):
            return FakeCollections()

        async def get_collection(self, name):
            return FakeCollectionInfo()

    store.client = FakeClient()

    try:
        asyncio.run(store._ensure_collection(settings.qdrant_chunk_collection, 4096))
    except RuntimeError as exc:
        assert "vector size 1024, expected 4096" in str(exc)
    else:
        raise AssertionError("Expected RuntimeError for vector size mismatch")
