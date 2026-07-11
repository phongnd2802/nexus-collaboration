from __future__ import annotations

import os
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from nexus_ai.request_context import extract_bearer_token, get_request_context
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class StaticSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    model: str = Field(default="openrouter:google/gemini-3.1-flash-lite", alias="NEXUS_AI_MODEL")
    environment: str = Field(default="development", alias="NEXUS_AI_ENV")
    mcp_url: str = Field(default="http://127.0.0.1:3333/mcp", alias="NEXUS_MCP_URL")
    api_token: str = Field(default="", alias="NEXUS_API_TOKEN")
    workspace_id: str = Field(default="", alias="NEXUS_WORKSPACE_ID")
    request_id: str | None = Field(default=None, alias="NEXUS_REQUEST_ID")
    runtime_dir: Path = Field(default=Path(".runtime"), alias="NEXUS_AI_RUNTIME_DIR")
    database_url: str | None = Field(default=None, alias="NEXUS_AI_DATABASE_URL")
    enable_langfuse: bool = Field(default=True, alias="NEXUS_AI_ENABLE_LANGFUSE")
    enable_code_mode: bool = Field(default=True, alias="NEXUS_AI_ENABLE_CODE_MODE")
    audit_tool_calls: bool = Field(default=True, alias="NEXUS_AI_AUDIT_TOOL_CALLS")
    max_tool_calls: int = Field(default=40, alias="NEXUS_AI_MAX_TOOL_CALLS")
    max_run_seconds: int = Field(default=180, alias="NEXUS_AI_MAX_RUN_SECONDS")
    max_cost_usd: float = Field(default=2.0, alias="NEXUS_AI_MAX_COST_USD")
    enable_ecosystem_capabilities: bool = Field(default=True, alias="NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES")
    context_max_tokens: int = Field(default=180000, alias="NEXUS_AI_CONTEXT_MAX_TOKENS")
    backend_url: str = Field(default="http://127.0.0.1:3002/api/v1", alias="NEXUS_BACKEND_BASE_URL")
    internal_api_key: str = Field(
        default="", validation_alias=AliasChoices("NEXUS_INTERNAL_API_KEY", "NEXUS_API_KEY")
    )
    openrouter_api_key: str = Field(default="", alias="OPENROUTER_API_KEY")
    rag_enabled: bool = Field(default=True, alias="NEXUS_RAG_ENABLED")
    rag_extraction_provider: str = Field(default="opendataloader_pdf", alias="NEXUS_RAG_EXTRACTION_PROVIDER")
    rag_chunking_strategy: str = Field(
        default="document_routed_parent_child_v1", alias="NEXUS_RAG_CHUNKING_STRATEGY"
    )
    rag_embedding_model: str = Field(default="qwen/qwen3-embedding-8b", alias="NEXUS_AI_EMBEDDING_MODEL")
    rag_embedding_dimensions: int | None = Field(default=None, alias="NEXUS_AI_EMBEDDING_DIMENSIONS")
    rag_llm_model: str | None = Field(default=None, alias="NEXUS_AI_RAG_LLM_MODEL")
    rag_enable_contextual_retrieval: bool = Field(default=True, alias="NEXUS_RAG_ENABLE_CONTEXTUAL_RETRIEVAL")
    rag_query_transform: str = Field(default="multi_query_step_back", alias="NEXUS_RAG_QUERY_TRANSFORM")
    rag_multi_query_count: int = Field(default=2, alias="NEXUS_RAG_MULTI_QUERY_COUNT")
    rag_enable_step_back: bool = Field(default=True, alias="NEXUS_RAG_ENABLE_STEP_BACK")
    rag_document_route_top_k: int = Field(default=5, alias="NEXUS_RAG_DOCUMENT_ROUTE_TOP_K")
    rag_dense_candidates: int = Field(default=40, alias="NEXUS_RAG_DENSE_CANDIDATES")
    rag_lexical_candidates: int = Field(default=40, alias="NEXUS_RAG_LEXICAL_CANDIDATES")
    rag_lexical_provider: str = Field(default="elasticsearch", alias="NEXUS_RAG_LEXICAL_PROVIDER")
    rag_rrf_k: int = Field(default=60, alias="NEXUS_RAG_RRF_K")
    rag_mmr_lambda: float = Field(default=0.7, alias="NEXUS_RAG_MMR_LAMBDA")
    rag_summary_max_tokens: int = Field(default=300, alias="NEXUS_RAG_SUMMARY_MAX_TOKENS")
    rag_context_max_tokens: int = Field(default=160, alias="NEXUS_RAG_CONTEXT_MAX_TOKENS")
    rag_llm_concurrency: int = Field(default=4, alias="NEXUS_RAG_LLM_CONCURRENCY")
    rag_llm_timeout_seconds: int = Field(default=60, alias="NEXUS_RAG_LLM_TIMEOUT_SECONDS")
    rag_parent_chunk_tokens: int = Field(default=1200, alias="NEXUS_RAG_PARENT_CHUNK_TOKENS")
    rag_child_chunk_tokens: int = Field(default=350, alias="NEXUS_RAG_CHILD_CHUNK_TOKENS")
    rag_child_overlap_tokens: int = Field(default=60, alias="NEXUS_RAG_CHILD_OVERLAP_TOKENS")
    history_recent_turns: int = Field(default=12, alias="NEXUS_AI_HISTORY_RECENT_TURNS")
    session_summary_model: str | None = Field(default=None, alias="NEXUS_AI_SESSION_SUMMARY_MODEL")
    summary_trigger_turns: int = Field(default=10, alias="NEXUS_AI_SUMMARY_TRIGGER_TURNS")
    summary_max_chars: int = Field(default=4000, alias="NEXUS_AI_SUMMARY_MAX_CHARS")
    memory_max_items_per_turn: int = Field(default=3, alias="NEXUS_AI_MEMORY_MAX_ITEMS_PER_TURN")
    mem0_enabled: bool = Field(default=False, alias="NEXUS_AI_MEM0_ENABLED")
    qdrant_url: str = Field(default="http://127.0.0.1:6333", alias="QDRANT_URL")
    qdrant_api_key: str = Field(default="", alias="QDRANT_API_KEY")
    qdrant_document_collection: str = Field(default="nexus_rag_documents", alias="QDRANT_DOCUMENT_COLLECTION")
    qdrant_chunk_collection: str = Field(default="nexus_rag_chunks", alias="QDRANT_CHUNK_COLLECTION")
    qdrant_mem0_user_collection: str = Field(default="nexus_mem0_user_memories", alias="QDRANT_MEM0_USER_COLLECTION")
    elasticsearch_url: str = Field(default="http://127.0.0.1:9200", alias="ELASTICSEARCH_URL")
    elasticsearch_api_key: str = Field(default="", alias="ELASTICSEARCH_API_KEY")
    elasticsearch_username: str = Field(default="", alias="ELASTICSEARCH_USERNAME")
    elasticsearch_password: str = Field(default="", alias="ELASTICSEARCH_PASSWORD")
    elasticsearch_verify_certs: bool = Field(default=False, alias="ELASTICSEARCH_VERIFY_CERTS")
    elasticsearch_rag_chunk_index: str = Field(default="nexus_rag_chunks_v1", alias="ELASTICSEARCH_RAG_CHUNK_INDEX")
    rag_opendataloader_hybrid: str = Field(default="off", alias="NEXUS_RAG_OPENDATALOADER_HYBRID")
    rag_opendataloader_use_struct_tree: bool = Field(default=True, alias="NEXUS_RAG_OPENDATALOADER_USE_STRUCT_TREE")
    rag_opendataloader_table_method: str = Field(default="pdfplumber", alias="NEXUS_RAG_OPENDATALOADER_TABLE_METHOD")
    rag_opendataloader_reading_order: str = Field(default="basic", alias="NEXUS_RAG_OPENDATALOADER_READING_ORDER")
    rag_opendataloader_markdown_with_html: bool = Field(
        default=False, alias="NEXUS_RAG_OPENDATALOADER_MARKDOWN_WITH_HTML"
    )
    rag_opendataloader_include_header_footer: bool = Field(
        default=False, alias="NEXUS_RAG_OPENDATALOADER_INCLUDE_HEADER_FOOTER"
    )
    rag_opendataloader_detect_strikethrough: bool = Field(
        default=False, alias="NEXUS_RAG_OPENDATALOADER_DETECT_STRIKETHROUGH"
    )
    rag_opendataloader_hybrid_mode: str = Field(default="auto", alias="NEXUS_RAG_OPENDATALOADER_HYBRID_MODE")
    rag_opendataloader_hybrid_timeout: int = Field(default=120, alias="NEXUS_RAG_OPENDATALOADER_HYBRID_TIMEOUT")
    rag_opendataloader_hybrid_fallback: bool = Field(
        default=True, alias="NEXUS_RAG_OPENDATALOADER_HYBRID_FALLBACK"
    )
    rag_opendataloader_threads: int = Field(default=1, alias="NEXUS_RAG_OPENDATALOADER_THREADS")
    rag_opendataloader_hybrid_hancom_ai_regionlist_strategy: str = Field(
        default="", alias="NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_REGIONLIST_STRATEGY"
    )
    rag_opendataloader_hybrid_hancom_ai_ocr_strategy: str = Field(
        default="", alias="NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_OCR_STRATEGY"
    )
    rag_opendataloader_hybrid_hancom_ai_image_cache: str = Field(
        default="", alias="NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_IMAGE_CACHE"
    )
    rag_opendataloader_hybrid_url: str = Field(default="", alias="NEXUS_RAG_OPENDATALOADER_HYBRID_URL")
    rag_libreoffice_path: str = Field(default="", alias="NEXUS_RAG_LIBREOFFICE_PATH")
    rag_office_conversion_timeout_seconds: int = Field(
        default=180,
        alias="NEXUS_RAG_OFFICE_CONVERSION_TIMEOUT_SECONDS",
    )
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")

    @model_validator(mode="after")
    def normalize(self) -> StaticSettings:
        if self.request_id == "":
            self.request_id = None
        if self.database_url == "":
            self.database_url = None
        if not self.rag_llm_model:
            self.rag_llm_model = self.model
        if not self.session_summary_model:
            self.session_summary_model = self.model
        if self.rag_embedding_dimensions is None:
            self.rag_embedding_dimensions = _default_embedding_dimensions(self.rag_embedding_model)
        lexical_provider = self.rag_lexical_provider.strip().lower()
        self.rag_lexical_provider = lexical_provider or "elasticsearch"
        return self


class Settings:
    def __init__(self, base: StaticSettings) -> None:
        self._base = base

    @property
    def model(self) -> str:
        return self._base.model

    @property
    def environment(self) -> str:
        return self._base.environment

    @property
    def mcp_url(self) -> str:
        return self._base.mcp_url

    @property
    def api_token(self) -> str:
        context = get_request_context()
        if context and context.api_token:
            return context.api_token
        if context and context.authorization:
            token = extract_bearer_token(context.authorization)
            if token:
                return token
        return self._base.api_token

    @property
    def has_api_token(self) -> bool:
        return bool(self.api_token)

    @property
    def workspace_id(self) -> str:
        context = get_request_context()
        if context and context.workspace_id:
            return context.workspace_id
        return self._base.workspace_id

    @property
    def request_id(self) -> str | None:
        context = get_request_context()
        if context and context.request_id:
            return context.request_id
        return self._base.request_id

    @property
    def user_id(self) -> str | None:
        context = get_request_context()
        return context.user_id if context else None

    def __getattr__(self, name: str):
        if hasattr(self._base, name):
            return getattr(self._base, name)
        raise AttributeError(name)

    @property
    def timezone(self) -> str:
        context = get_request_context()
        if context and context.timezone:
            normalized = _normalize_timezone(context.timezone)
            if normalized:
                return normalized
        return "UTC"

    def timezone_info(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def current_datetime(self):
        from datetime import datetime

        return datetime.now(self.timezone_info())

    @property
    def session_id(self) -> str:
        context = get_request_context()
        if context and context.session_id:
            return context.session_id
        return self.request_id or "local"

    @property
    def workspace_runtime_dir(self) -> Path:
        return self.runtime_dir / "workspaces" / self.workspace_id / "sessions" / self.session_id

    def validate_for_runtime(self) -> None:
        if not self.mcp_url:
            raise RuntimeError("Missing required Nexus AI env var: NEXUS_MCP_URL")
        if not self.database_url:
            raise RuntimeError("Missing required Nexus AI env var: NEXUS_AI_DATABASE_URL")


def load_settings(env: dict[str, str] | None = None) -> Settings:
    if env is None:
        return Settings(StaticSettings())
    previous_env = os.environ.copy()
    try:
        os.environ.clear()
        os.environ.update(env)
        return Settings(StaticSettings(_env_file=None))
    finally:
        os.environ.clear()
        os.environ.update(previous_env)


def _default_embedding_dimensions(model_name: str) -> int:
    normalized = model_name.split(":", 1)[-1].strip().lower()
    known_dimensions = {
        "openai/text-embedding-3-small": 1536,
        "openai/text-embedding-3-large": 3072,
        "qwen/qwen3-embedding-8b": 4096,
    }
    return known_dimensions.get(normalized, 1536)


def _normalize_timezone(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    try:
        ZoneInfo(candidate)
    except ZoneInfoNotFoundError:
        return None
    return candidate
