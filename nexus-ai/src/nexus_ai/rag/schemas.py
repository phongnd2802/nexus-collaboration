from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


RagJobStatus = Literal["queued", "processing", "indexed", "failed", "skipped", "cancelled"]


class RagIndexRequest(BaseModel):
    job_id: str
    reason: str = "file_uploaded"
    file_hash: str | None = None
    mime_type: str | None = None
    filename: str | None = None


class FileSource(BaseModel):
    id: str
    workspace_id: str
    name: str
    mime_type: str | None = None
    size: str | int | None = None
    file_hash: str | None = None
    storage_path: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    content_base64: str


class ExtractedElement(BaseModel):
    type: str = "text"
    content: str
    page_number: int | None = None
    bbox: list[float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExtractedDocument(BaseModel):
    text: str
    markdown: str | None = None
    elements: list[ExtractedElement] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ParentChunk(BaseModel):
    parent_id: str
    text: str
    parent_index: int = 0
    heading_path: list[str] = Field(default_factory=list)
    page_numbers: list[int] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChildChunk(BaseModel):
    child_id: str
    parent_id: str
    text: str
    contextual_text: str = ""
    contextual_header: str = ""
    parent_text: str
    chunk_index: int
    context_source: str = "none"
    context_prompt_version: str | None = None
    heading_path: list[str] = Field(default_factory=list)
    page_numbers: list[int] = Field(default_factory=list)
    bbox_refs: list[Any] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagSearchRequest(BaseModel):
    workspace_id: str
    query: str
    limit: int = 10
    min_score: float = 0.5
    file_ids: list[str] | None = None


class RagDirectIndexRequest(BaseModel):
    workspace_id: str
    file_id: str
    job_id: str | None = None
    async_mode: bool = False


class RagDirectIndexResponse(BaseModel):
    accepted: bool
    status: str
    workspace_id: str
    file_id: str
    job_id: str
    metadata: dict[str, Any] = Field(default_factory=dict)
