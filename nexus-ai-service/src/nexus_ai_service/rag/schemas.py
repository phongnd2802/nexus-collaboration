from typing import Any, Literal

from pydantic import BaseModel, Field


class FileSource(BaseModel):
    id: str
    workspace_id: str
    name: str
    mime_type: str | None = None
    file_hash: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    content_base64: str | None = None


class ExtractedElement(BaseModel):
    type: Literal["paragraph", "heading", "table", "list", "code", "note_block", "text"]
    content: str
    page_number: int | None = None
    heading_path: list[str] = Field(default_factory=list)
    bbox: list[float] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ExtractedDocument(BaseModel):
    text: str
    markdown: str | None = None
    elements: list[ExtractedElement] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ParentChunk(BaseModel):
    id: str
    text: str
    heading_path: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChildChunk(BaseModel):
    id: str
    parent_id: str
    text: str
    chunk_index: int
    heading_path: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class RagSearchRequest(BaseModel):
    workspace_id: str
    query: str
    limit: int = Field(default=8, ge=1, le=50)
    min_score: float = Field(default=0.0, ge=0.0)
    file_ids: list[str] | None = None
    strategy: Literal["dense", "bm25", "hybrid"] = "hybrid"
    include_debug: bool = False


class RagSearchResult(BaseModel):
    id: str
    source_id: str
    source_type: Literal["file", "note", "message", "task", "calendar_event"]
    workspace_id: str
    title: str
    snippet: str
    content: str
    citation: str
    page: int | None = None
    score: float
    dense_score: float | None = None
    lexical_score: float | None = None
    retrieval_mode: Literal["dense", "bm25", "hybrid"]
    metadata: dict[str, Any] = Field(default_factory=dict)

