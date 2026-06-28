import asyncio
import base64

from nexus_ai.rag.indexer import RagIndexer
from nexus_ai.rag.schemas import ChildChunk, ExtractedDocument, FileSource
from nexus_ai.settings import load_settings


def test_rag_indexer_uses_llm_summary_and_context(monkeypatch, tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "OPENROUTER_API_KEY": "test-key",
        }
    )
    indexer = RagIndexer(settings)
    updates: list[tuple[str, str | None, dict | None]] = []
    captured: dict[str, object] = {}

    source = FileSource(
        id="file-1",
        workspace_id="workspace",
        name="Architecture Notes.pdf",
        mime_type="application/pdf",
        file_hash="hash-1",
        content_base64=base64.b64encode(b"fake-pdf").decode("utf-8"),
    )
    document = ExtractedDocument(text="Parent text with project architecture and deployment details.")
    chunk = ChildChunk(
        child_id="child-1",
        parent_id="parent-1",
        text="project architecture and deployment details",
        parent_text=document.text,
        chunk_index=0,
        metadata={"parent_index": 0},
    )

    class FakeBackend:
        async def claim_job(self, workspace_id, job_id):
            captured["claimed"] = (workspace_id, job_id)

        async def get_file_source(self, workspace_id, file_id):
            return source

        async def update_job(self, workspace_id, job_id, status, error_message=None, metadata=None):
            updates.append((status, error_message, metadata))

    class FakeExtractor:
        async def extract(self, source, content):
            return document

    class FakeStrategy:
        def split(self, source, document):
            return [chunk.model_copy(deep=True)]

    class FakeLlmClient:
        def __init__(self, settings):
            self.settings = settings

        async def generate_document_summary(self, source, document):
            return "LLM summary of the architecture notes"

        async def generate_child_context(self, source, parent, child):
            return "This chunk describes the deployment architecture section."

    class FakeEmbedder:
        def __init__(self, settings):
            self.settings = settings

        async def embed(self, texts):
            captured["embed_texts"] = texts
            return [[0.1, 0.2] for _ in texts]

    class FakeVectorStore:
        def __init__(self, settings):
            self.settings = settings

        async def ensure_collections(self, vector_size):
            captured["vector_size"] = vector_size

        async def upsert_document(self, source, summary, embedding, **kwargs):
            captured["document_upsert"] = {"summary": summary, "embedding": embedding, **kwargs}

        async def upsert_chunks(self, source, chunks, embeddings, job_id):
            captured["chunk_upsert"] = {
                "contextual_header": chunks[0].contextual_header,
                "contextual_text": chunks[0].contextual_text,
                "context_source": chunks[0].context_source,
                "prompt_version": chunks[0].context_prompt_version,
                "embeddings": embeddings,
                "job_id": job_id,
            }

    monkeypatch.setattr(indexer, "backend", FakeBackend())
    monkeypatch.setattr("nexus_ai.rag.indexer.resolve_extractor", lambda *_args: FakeExtractor())
    monkeypatch.setattr("nexus_ai.rag.indexer.resolve_chunking_strategy", lambda _settings: FakeStrategy())
    monkeypatch.setattr("nexus_ai.rag.indexer.RagLlmClient", FakeLlmClient)
    monkeypatch.setattr("nexus_ai.rag.indexer.OpenRouterEmbeddingClient", FakeEmbedder)
    monkeypatch.setattr("nexus_ai.rag.indexer.QdrantVectorStore", FakeVectorStore)

    asyncio.run(indexer.index_file("workspace", "file-1", "job-1"))

    assert captured["embed_texts"] == [
        "LLM summary of the architecture notes",
        "This chunk describes the deployment architecture section.\n\nproject architecture and deployment details",
    ]
    assert captured["document_upsert"]["summary_model"] == settings.rag_llm_model
    assert captured["chunk_upsert"]["context_source"] == "llm"
    assert captured["chunk_upsert"]["prompt_version"] == "rag_context_v1"
    assert updates[-1][0] == "indexed"


def test_rag_indexer_search_uses_retrieval_service(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "OPENROUTER_API_KEY": "test-key",
        }
    )
    captured: dict[str, object] = {}

    class FakeRetrievalService:
        def __init__(self, settings):
            self.settings = settings

        async def search(self, **kwargs):
            captured.update(kwargs)
            return [{"id": "child-1"}]

    monkeypatch.setattr("nexus_ai.rag.indexer.RagRetrievalService", FakeRetrievalService)

    results = asyncio.run(
        RagIndexer(settings).search(
            "workspace",
            "query",
            5,
            0.4,
            ["file-1"],
            strategy="raw",
            include_debug=True,
        )
    )

    assert results == [{"id": "child-1"}]
    assert captured == {
        "workspace_id": "workspace",
        "query": "query",
        "limit": 5,
        "min_score": 0.4,
        "file_ids": ["file-1"],
        "strategy": "raw",
        "include_debug": True,
    }
