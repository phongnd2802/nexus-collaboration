from __future__ import annotations

import asyncio
from textwrap import dedent

from pydantic_ai import ModelRequest
from pydantic_ai.direct import model_request

from nexus_ai.rag.schemas import ChildChunk, ExtractedDocument, FileSource, ParentChunk
from nexus_ai.settings import Settings

SUMMARY_PROMPT_VERSION = "rag_summary_v1"
CONTEXT_PROMPT_VERSION = "rag_context_v1"


class RagLlmClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is required for RAG LLM requests")
        self.settings = settings
        self._semaphore = asyncio.Semaphore(max(1, settings.rag_llm_concurrency))

    async def generate_document_summary(self, source: FileSource, document: ExtractedDocument) -> str:
        prompt = dedent(
            f"""
            Write a retrieval-oriented summary for this workspace file.
            Focus on the file's main subject, document type, and the most important subtopics.
            Keep it as one short paragraph with no bullets or markdown.
            Do not mention that you are summarizing a document.

            File name: {source.name}
            MIME type: {source.mime_type or "unknown"}
            Pages: {self._page_count(document)}

            Document excerpt:
            {self._excerpt(document.text, 12_000)}
            """
        ).strip()
        return await self._complete(prompt, max_tokens=self.settings.rag_summary_max_tokens)

    async def generate_child_context(self, source: FileSource, parent: ParentChunk, child: ChildChunk) -> str:
        heading_path = " > ".join(parent.heading_path) if parent.heading_path else "unknown"
        page_numbers = ", ".join(str(page) for page in parent.page_numbers[:10]) if parent.page_numbers else "unknown"
        prompt = dedent(
            f"""
            Write 1 to 3 short sentences that add retrieval context for a chunk from a workspace file.
            Explain what this chunk is about, where it sits in the file, and resolve vague references if needed.
            Be concrete and concise. Do not repeat the chunk verbatim. Do not use bullets or markdown.

            File name: {source.name}
            Parent section index: {parent.parent_index}
            Heading path: {heading_path}
            Pages: {page_numbers}

            Parent excerpt:
            {self._excerpt(parent.text, 4_000)}

            Child chunk:
            {child.text}
            """
        ).strip()
        return await self._complete(prompt, max_tokens=self.settings.rag_context_max_tokens)

    async def _complete(self, prompt: str, *, max_tokens: int) -> str:
        async with self._semaphore:
            response = await model_request(
                self.settings.rag_llm_model,
                [ModelRequest.user_text_prompt(prompt)],
                model_settings={
                    "max_tokens": max_tokens,
                    "temperature": 0.1,
                    "timeout": self.settings.rag_llm_timeout_seconds,
                },
            )
        text = (response.text or "").strip()
        if not text:
            raise RuntimeError("RAG LLM request returned empty text")
        return " ".join(text.split())

    def _excerpt(self, text: str, limit: int) -> str:
        normalized = " ".join(text.split())
        return normalized[:limit]

    def _page_count(self, document: ExtractedDocument) -> int:
        pages = {element.page_number for element in document.elements if element.page_number is not None}
        return len(pages)
