from __future__ import annotations

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.extraction.office_pdf import OfficeToPdfExtractor
from nexus_ai.rag.extraction.opendataloader_pdf import OpenDataLoaderPdfExtractor
from nexus_ai.rag.extraction.unsupported import UnsupportedExtractor
from nexus_ai.settings import Settings


def resolve_extractor(mime_type: str | None, filename: str, settings: Settings | None = None) -> DocumentExtractor:
    normalized_mime = (mime_type or "").lower()
    normalized_name = filename.lower()
    if mime_type in {"application/pdf", "application/x-pdf"} or filename.lower().endswith(".pdf"):
        return OpenDataLoaderPdfExtractor(settings)
    if normalized_mime in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    } or normalized_name.endswith((".docx", ".pptx", ".xlsx")):
        if settings is None:
            raise ValueError("Office-to-PDF extraction requires Settings")
        return OfficeToPdfExtractor(settings)
    return UnsupportedExtractor()
