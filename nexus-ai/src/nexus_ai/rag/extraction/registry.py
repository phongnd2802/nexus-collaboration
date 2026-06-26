from __future__ import annotations

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.extraction.opendataloader_pdf import OpenDataLoaderPdfExtractor
from nexus_ai.rag.extraction.unsupported import UnsupportedExtractor
from nexus_ai.settings import Settings


def resolve_extractor(mime_type: str | None, filename: str, settings: Settings | None = None) -> DocumentExtractor:
    if mime_type in {"application/pdf", "application/x-pdf"} or filename.lower().endswith(".pdf"):
        return OpenDataLoaderPdfExtractor(settings)
    return UnsupportedExtractor()
