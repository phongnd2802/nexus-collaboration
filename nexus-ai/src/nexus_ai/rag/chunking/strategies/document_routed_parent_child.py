from __future__ import annotations

import re
import uuid

from nexus_ai.rag.chunking.base import ChunkingStrategy
from nexus_ai.rag.schemas import ChildChunk, ExtractedDocument, FileSource, ParentChunk
from nexus_ai.settings import Settings


class DocumentRoutedParentChildStrategy(ChunkingStrategy):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def split(self, source: FileSource, document: ExtractedDocument) -> list[ChildChunk]:
        parents = self._parents(source, document)
        children: list[ChildChunk] = []
        for parent in parents:
            child_texts = self._window(parent.text, self.settings.rag_child_chunk_tokens, self.settings.rag_child_overlap_tokens)
            for child_offset, child_text in enumerate(child_texts):
                child_index = len(children)
                children.append(
                    ChildChunk(
                        child_id=self._id(source.id, parent.parent_id, child_index),
                        parent_id=parent.parent_id,
                        text=child_text,
                        parent_text=parent.text,
                        chunk_index=child_index,
                        contextual_text=child_text,
                        heading_path=parent.heading_path,
                        page_numbers=parent.page_numbers,
                        bbox_refs=self._bbox_refs(document, child_text),
                        metadata={**parent.metadata, "parent_index": parent.parent_index, "child_offset": child_offset},
                    )
                )
        return children

    def _parents(self, source: FileSource, document: ExtractedDocument) -> list[ParentChunk]:
        blocks = self._blocks(document)
        document_metadata = self._document_metadata(document)
        parent_texts: list[str] = []
        current: list[str] = []
        current_tokens = 0
        for block in blocks:
            tokens = self._token_count(block)
            if current and current_tokens + tokens > self.settings.rag_parent_chunk_tokens:
                parent_texts.append("\n\n".join(current))
                current = []
                current_tokens = 0
            current.append(block)
            current_tokens += tokens
        if current:
            parent_texts.append("\n\n".join(current))

        return [
            ParentChunk(
                parent_id=self._id(source.id, "parent", index),
                text=text,
                parent_index=index,
                page_numbers=self._page_numbers(document),
                metadata={"strategy": self.settings.rag_chunking_strategy, **document_metadata},
            )
            for index, text in enumerate(parent_texts)
            if text.strip()
        ]

    def _blocks(self, document: ExtractedDocument) -> list[str]:
        if document.elements:
            return [element.content.strip() for element in document.elements if element.content.strip()]
        return [block.strip() for block in re.split(r"\n{2,}", document.markdown or document.text) if block.strip()]

    def _window(self, text: str, size: int, overlap: int) -> list[str]:
        words = text.split()
        if len(words) <= size:
            return [text]
        chunks: list[str] = []
        step = max(1, size - overlap)
        for start in range(0, len(words), step):
            chunk = " ".join(words[start : start + size]).strip()
            if chunk:
                chunks.append(chunk)
            if start + size >= len(words):
                break
        return chunks

    def _page_numbers(self, document: ExtractedDocument) -> list[int]:
        pages = sorted({element.page_number for element in document.elements if element.page_number is not None})
        return pages

    def _bbox_refs(self, document: ExtractedDocument, child_text: str) -> list[dict[str, object]]:
        refs: list[dict[str, object]] = []
        child_lower = child_text.lower()
        for element in document.elements:
            if not element.bbox or not element.content:
                continue
            snippet = element.content.strip().lower()
            if snippet and (snippet in child_lower or child_lower[:120] in snippet):
                refs.append({"page_number": element.page_number, "bbox": element.bbox})
        return refs[:20]

    def _token_count(self, text: str) -> int:
        return max(1, len(text.split()))

    def _document_metadata(self, document: ExtractedDocument) -> dict[str, object]:
        allowed = {
            "source_format",
            "original_mime_type",
            "normalized_mime_type",
            "normalization_strategy",
            "conversion_engine",
            "page_equivalence_mode",
            "title",
            "author",
            "mime_type",
        }
        return {
            key: value
            for key, value in document.metadata.items()
            if key in allowed and value not in (None, "", [], {})
        }

    def _id(self, *parts: object) -> str:
        return str(uuid.uuid5(uuid.NAMESPACE_URL, ":".join(str(part) for part in parts)))
