import asyncio
from pathlib import Path

from nexus_ai.rag.extraction.opendataloader_pdf import OpenDataLoaderPdfExtractor
from nexus_ai.rag.schemas import FileSource
from nexus_ai.settings import load_settings


def test_opendataloader_normalizes_kids_schema():
    extractor = OpenDataLoaderPdfExtractor()
    source = FileSource(
        id="file-1",
        workspace_id="workspace",
        name="sample.pdf",
        mime_type="application/pdf",
        content_base64="",
    )

    result = {
        "markdown": "# Title\n\nParagraph text",
        "json": {
            "file name": "sample.pdf",
            "number of pages": 2,
            "title": "Sample",
            "kids": [
                {
                    "type": "heading",
                    "content": "Title",
                    "page number": 1,
                    "bounding box": [1, 2, 3, 4],
                    "heading level": 1,
                },
                {
                    "type": "paragraph",
                    "content": "Paragraph text",
                    "page number": 1,
                    "bounding box": [5, 6, 7, 8],
                },
                {
                    "type": "list",
                    "page number": 2,
                    "list items": [
                        {
                            "type": "list item",
                            "content": "First bullet",
                            "page number": 2,
                            "bounding box": [9, 10, 11, 12],
                        }
                    ],
                },
                {
                    "type": "table",
                    "page number": 2,
                    "rows": [
                        {
                            "type": "table row",
                            "row number": 1,
                            "cells": [
                                {
                                    "content": "Cell value",
                                    "page number": 2,
                                    "bounding box": [13, 14, 15, 16],
                                }
                            ],
                        }
                    ],
                },
            ],
        },
    }

    document = extractor._normalize_result(result, source)

    assert document.metadata["number_of_pages"] == 2
    assert document.metadata["title"] == "Sample"
    assert document.markdown == "# Title\n\nParagraph text"
    assert [element.content for element in document.elements] == [
        "Title",
        "Paragraph text",
        "First bullet",
        "Cell value",
    ]
    assert [element.page_number for element in document.elements] == [1, 1, 2, 2]
    assert document.elements[0].bbox == [1.0, 2.0, 3.0, 4.0]


def test_opendataloader_convert_passes_hybrid_settings(monkeypatch, tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_RAG_OPENDATALOADER_HYBRID": "docling-fast",
            "NEXUS_RAG_OPENDATALOADER_HYBRID_MODE": "full",
            "NEXUS_RAG_OPENDATALOADER_HYBRID_URL": "http://127.0.0.1:5002",
            "NEXUS_RAG_OPENDATALOADER_HYBRID_TIMEOUT": "5000",
            "NEXUS_RAG_OPENDATALOADER_HYBRID_FALLBACK": "true",
            "NEXUS_RAG_OPENDATALOADER_THREADS": "4",
        }
    )
    extractor = OpenDataLoaderPdfExtractor(settings)
    captured: dict[str, object] = {}

    def fake_convert(**kwargs):
        captured.update(kwargs)
        return {"markdown": "ok", "json": {"kids": []}}

    monkeypatch.setattr("importlib.import_module", lambda _name: object())
    monkeypatch.setattr(extractor, "_resolve_converter", lambda _module: fake_convert)
    monkeypatch.setattr(extractor, "_read_outputs", lambda _output_dir: {"markdown": "ok", "json": {"kids": []}})

    result = asyncio.run(extractor._convert(Path(tmp_path / "sample.pdf"), Path(tmp_path)))

    assert result["markdown"] == "ok"
    assert captured["input_path"] == str(tmp_path / "sample.pdf")
    assert captured["hybrid"] == "docling-fast"
    assert captured["hybrid_mode"] == "full"
    assert captured["hybrid_url"] == "http://127.0.0.1:5002"
    assert captured["hybrid_timeout"] == "5000"
    assert captured["hybrid_fallback"] is True
    assert "threads" not in captured
    assert "hybrid_hancom_ai_regionlist_strategy" not in captured
    assert "hybrid_hancom_ai_ocr_strategy" not in captured
    assert "hybrid_hancom_ai_image_cache" not in captured


def test_opendataloader_convert_passes_hancom_only_flags(monkeypatch, tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_RAG_OPENDATALOADER_HYBRID": "hancom-ai",
            "NEXUS_RAG_OPENDATALOADER_HANCOM_REGIONLIST_STRATEGY": "list-only",
            "NEXUS_RAG_OPENDATALOADER_HANCOM_OCR_STRATEGY": "force",
            "NEXUS_RAG_OPENDATALOADER_HANCOM_IMAGE_CACHE": "disk",
        }
    )
    extractor = OpenDataLoaderPdfExtractor(settings)
    captured: dict[str, object] = {}

    def fake_convert(**kwargs):
        captured.update(kwargs)
        return {"markdown": "ok", "json": {"kids": []}}

    monkeypatch.setattr("importlib.import_module", lambda _name: object())
    monkeypatch.setattr(extractor, "_resolve_converter", lambda _module: fake_convert)
    monkeypatch.setattr(extractor, "_read_outputs", lambda _output_dir: {"markdown": "ok", "json": {"kids": []}})

    result = asyncio.run(extractor._convert(Path(tmp_path / "sample.pdf"), Path(tmp_path)))

    assert result["markdown"] == "ok"
    assert captured["hybrid"] == "hancom-ai"
    assert captured["hybrid_hancom_ai_regionlist_strategy"] == "list-only"
    assert captured["hybrid_hancom_ai_ocr_strategy"] == "force"
    assert captured["hybrid_hancom_ai_image_cache"] == "disk"
