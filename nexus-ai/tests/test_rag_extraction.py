from __future__ import annotations

import asyncio
from types import SimpleNamespace

from nexus_ai.rag.extraction.office_pdf import OfficeToPdfExtractor
from nexus_ai.rag.extraction.office_pdf_converter import LibreOfficePdfConverter, OfficePdfConversionResult
from nexus_ai.rag.extraction.registry import resolve_extractor
from nexus_ai.rag.schemas import ExtractedDocument, ExtractedElement, FileSource
from nexus_ai.rag.vector_store.qdrant import ensure_qdrant_collections_for_runtime
from nexus_ai.settings import load_settings


def _settings():
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )


def test_resolve_extractor_routes_docx_to_office_pdf():
    extractor = resolve_extractor(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "requirements.docx",
        _settings(),
    )

    assert isinstance(extractor, OfficeToPdfExtractor)


def test_office_to_pdf_extractor_merges_source_and_conversion_metadata(monkeypatch):
    settings = _settings()
    extractor = OfficeToPdfExtractor(settings)
    source = FileSource(
        id="file-1",
        workspace_id="ws-1",
        name="requirements.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size=128,
        file_hash="hash-1",
        storage_path="workspaces/ws-1/files/requirements.docx",
        metadata={"original_name": "requirements.docx", "tags": ["spec"]},
        content_base64="",
    )

    async def fake_convert(_source, _content):
        return OfficePdfConversionResult(
            pdf_bytes=b"%PDF-1.7",
            metadata={
                "source_format": "docx",
                "original_mime_type": source.mime_type,
                "normalized_mime_type": "application/pdf",
                "normalization_strategy": "office_to_pdf",
                "conversion_engine": "libreoffice",
                "page_equivalence_mode": "canonical_pdf",
            },
        )

    async def fake_pdf_extract(_source, _content):
        return ExtractedDocument(
            text="Hello world",
            markdown="Hello world",
            elements=[ExtractedElement(type="text", content="Hello world", page_number=1, bbox=[0.0, 0.0, 1.0, 1.0])],
            metadata={"number_of_pages": 1, "title": "Requirements"},
        )

    monkeypatch.setattr(extractor.converter, "convert", fake_convert)
    monkeypatch.setattr(extractor.pdf_extractor, "extract", fake_pdf_extract)

    document = asyncio.run(extractor.extract(source, b"docx-bytes"))

    assert document.text == "Hello world"
    assert document.metadata["original_name"] == "requirements.docx"
    assert document.metadata["source_format"] == "docx"
    assert document.metadata["conversion_engine"] == "libreoffice"
    assert document.metadata["page_equivalence_mode"] == "canonical_pdf"
    assert document.metadata["file_name"] == "requirements.docx"
    assert document.metadata["mime_type"] == source.mime_type
    assert document.metadata["number_of_pages"] == 1


def test_office_pdf_converter_requires_libreoffice(monkeypatch):
    converter = LibreOfficePdfConverter(_settings())
    source = FileSource(
        id="file-1",
        workspace_id="ws-1",
        name="slides.pptx",
        mime_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        size=64,
        file_hash="hash-1",
        metadata={},
        content_base64="",
    )
    monkeypatch.setattr(converter, "_resolve_soffice_path", lambda: None)

    try:
        asyncio.run(converter.convert(source, b"pptx-bytes"))
        assert False, "Expected converter to fail when LibreOffice is unavailable"
    except RuntimeError as exc:
        assert "LibreOffice headless is not available" in str(exc)


def test_rag_indexer_reports_conversion_metadata(monkeypatch):
    from nexus_ai.rag import indexer as indexer_module

    settings = _settings()
    indexer = indexer_module.RagIndexer(settings)
    source = FileSource(
        id="file-1",
        workspace_id="ws-1",
        name="requirements.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size=128,
        file_hash="hash-1",
        metadata={"original_name": "requirements.docx"},
        content_base64="ZmlsZS1ieXRlcw==",
    )

    class FakeExtractor:
        async def extract(self, _source, _content):
            return ExtractedDocument(
                text="Hello world",
                markdown="Hello world",
                elements=[ExtractedElement(type="text", content="Hello world", page_number=1, bbox=[0.0, 0.0, 1.0, 1.0])],
                metadata={
                    "source_format": "docx",
                    "original_mime_type": source.mime_type,
                    "normalized_mime_type": "application/pdf",
                    "normalization_strategy": "office_to_pdf",
                    "conversion_engine": "libreoffice",
                    "page_equivalence_mode": "canonical_pdf",
                },
            )

    class FakeChunkingStrategy:
        def split(self, _source, _document):
            return [
                SimpleNamespace(
                    child_id="child-1",
                    parent_id="parent-1",
                    text="Hello world",
                    contextual_text="Hello world",
                    contextual_header="",
                    parent_text="Hello world",
                    chunk_index=0,
                    context_source="none",
                    context_prompt_version=None,
                    page_numbers=[1],
                    bbox_refs=[{"page_number": 1, "bbox": [0.0, 0.0, 1.0, 1.0]}],
                    heading_path=[],
                    metadata={"source_format": "docx", "conversion_engine": "libreoffice"},
                )
            ]

    class FakeLlmClient:
        async def generate_document_summary(self, _source, _document):
            return "summary"

    class FakeEmbedder:
        async def embed(self, texts):
            return [[1.0, 0.0] for _ in texts]

    class FakeVectorStore:
        async def ensure_collections(self, _size):
            return None

        async def upsert_document(self, *args, **kwargs):
            return None

        async def upsert_chunks(self, *args, **kwargs):
            return None

    class FakeLexicalStore:
        async def upsert_chunks(self, *args, **kwargs):
            return None

    monkeypatch.setattr(indexer_module, "resolve_extractor", lambda *_args, **_kwargs: FakeExtractor())
    monkeypatch.setattr(indexer_module, "resolve_chunking_strategy", lambda _settings: FakeChunkingStrategy())
    monkeypatch.setattr(indexer_module, "RagLlmClient", lambda _settings: FakeLlmClient())
    monkeypatch.setattr(indexer_module, "OpenRouterEmbeddingClient", lambda _settings: FakeEmbedder())
    monkeypatch.setattr(indexer_module, "QdrantVectorStore", lambda _settings: FakeVectorStore())
    monkeypatch.setattr(indexer_module, "ElasticsearchLexicalStore", lambda _settings: FakeLexicalStore())
    async def fake_apply_contextual_retrieval(self, source, chunks, llm_client):
        return chunks

    monkeypatch.setattr(indexer_module.RagIndexer, "_apply_contextual_retrieval", fake_apply_contextual_retrieval)

    metadata = asyncio.run(indexer.index_source(source, job_id="job-1"))

    assert metadata["extractor_name"] == "FakeExtractor"
    assert metadata["source_format"] == "docx"
    assert metadata["original_mime_type"] == source.mime_type
    assert metadata["normalized_mime_type"] == "application/pdf"
    assert metadata["conversion_engine"] == "libreoffice"
    assert metadata["normalization_strategy"] == "office_to_pdf"
    assert metadata["page_equivalence_mode"] == "canonical_pdf"
    assert metadata["structured_elements"] is True
    assert metadata["element_count"] == 1


def test_runtime_qdrant_initialization_ensures_rag_and_mem0_collections(monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_MEM0_ENABLED": "true",
            "QDRANT_MEM0_USER_COLLECTION": "mem0_user",
        }
    )
    ensured: list[tuple[str, int]] = []
    text_indexes = {"count": 0}

    class FakeClient:
        pass

    async def fake_ensure_collection(self, name, vector_size):
        ensured.append((name, vector_size))

    async def fake_ensure_text_indexes(self):
        text_indexes["count"] += 1

    monkeypatch.setattr("nexus_ai.rag.vector_store.qdrant.AsyncQdrantClient", lambda *args, **kwargs: FakeClient())
    monkeypatch.setattr("nexus_ai.rag.vector_store.qdrant.QdrantVectorStore._ensure_collection", fake_ensure_collection)
    monkeypatch.setattr("nexus_ai.rag.vector_store.qdrant.QdrantVectorStore._ensure_text_indexes", fake_ensure_text_indexes)

    asyncio.run(ensure_qdrant_collections_for_runtime(settings))

    assert ensured == [
        ("nexus_rag_documents", 4096),
        ("nexus_rag_chunks", 4096),
        ("mem0_user__qwen_qwen3_embedding_8b_4096", 4096),
    ]
    assert text_indexes["count"] == 1
