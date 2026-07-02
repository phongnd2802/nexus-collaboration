from __future__ import annotations

from pathlib import Path

from nexus_ai.rag.extraction.base import DocumentExtractor
from nexus_ai.rag.extraction.office_pdf_converter import LibreOfficePdfConverter
from nexus_ai.rag.extraction.opendataloader_pdf import OpenDataLoaderPdfExtractor
from nexus_ai.rag.schemas import ExtractedDocument, FileSource
from nexus_ai.settings import Settings


class OfficeToPdfExtractor(DocumentExtractor):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.converter = LibreOfficePdfConverter(settings)
        self.pdf_extractor = OpenDataLoaderPdfExtractor(settings)

    async def extract(self, source: FileSource, content: bytes) -> ExtractedDocument:
        conversion = await self.converter.convert(source, content)
        normalized_source = FileSource(
            id=source.id,
            workspace_id=source.workspace_id,
            name=f"{Path(source.name).stem}.pdf",
            mime_type="application/pdf",
            size=len(conversion.pdf_bytes),
            file_hash=source.file_hash,
            storage_path=source.storage_path,
            metadata={
                **source.metadata,
                **conversion.metadata,
            },
            content_base64="",
        )
        document = await self.pdf_extractor.extract(normalized_source, conversion.pdf_bytes)
        return ExtractedDocument(
            text=document.text,
            markdown=document.markdown,
            elements=document.elements,
            metadata={
                **source.metadata,
                **document.metadata,
                **conversion.metadata,
                "file_name": source.name,
                "mime_type": source.mime_type,
            },
        )
