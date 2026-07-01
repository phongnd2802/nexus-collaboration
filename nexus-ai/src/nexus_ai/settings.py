from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from nexus_ai.request_context import extract_bearer_token, get_request_context

load_dotenv()


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _int(value: str | None, default: int) -> int:
    if not value:
        return default
    return int(value)


def _float(value: str | None, default: float) -> float:
    if not value:
        return default
    return float(value)


@dataclass(frozen=True)
class StaticSettings:
    model: str
    environment: str
    mcp_url: str
    api_token: str
    workspace_id: str
    request_id: str | None
    runtime_dir: Path
    sqlite_path: Path
    database_url: str | None
    enable_langfuse: bool
    enable_code_mode: bool
    audit_tool_calls: bool
    max_tool_calls: int
    max_run_seconds: int
    max_cost_usd: float
    enable_ecosystem_capabilities: bool
    context_max_tokens: int
    backend_url: str
    internal_api_key: str
    openrouter_api_key: str
    rag_enabled: bool
    rag_extraction_provider: str
    rag_chunking_strategy: str
    rag_embedding_model: str
    rag_llm_model: str
    rag_enable_contextual_retrieval: bool
    rag_query_transform: str
    rag_multi_query_count: int
    rag_enable_step_back: bool
    rag_document_route_top_k: int
    rag_dense_candidates: int
    rag_lexical_candidates: int
    rag_rrf_k: int
    rag_mmr_lambda: float
    rag_summary_max_tokens: int
    rag_context_max_tokens: int
    rag_llm_concurrency: int
    rag_llm_timeout_seconds: int
    rag_parent_chunk_tokens: int
    rag_child_chunk_tokens: int
    rag_child_overlap_tokens: int
    qdrant_url: str
    qdrant_api_key: str
    qdrant_document_collection: str
    qdrant_chunk_collection: str
    rag_opendataloader_hybrid: str
    rag_opendataloader_use_struct_tree: bool
    rag_opendataloader_table_method: str
    rag_opendataloader_reading_order: str
    rag_opendataloader_markdown_with_html: bool
    rag_opendataloader_include_header_footer: bool
    rag_opendataloader_detect_strikethrough: bool
    rag_opendataloader_hybrid_mode: str
    rag_opendataloader_hybrid_timeout: int
    rag_opendataloader_hybrid_fallback: bool
    rag_opendataloader_threads: int
    rag_opendataloader_hybrid_hancom_ai_regionlist_strategy: str
    rag_opendataloader_hybrid_hancom_ai_ocr_strategy: str
    rag_opendataloader_hybrid_hancom_ai_image_cache: str
    rag_opendataloader_hybrid_url: str


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

    @property
    def runtime_dir(self) -> Path:
        return self._base.runtime_dir

    @property
    def sqlite_path(self) -> Path:
        return self._base.sqlite_path

    @property
    def database_url(self) -> str | None:
        return self._base.database_url

    @property
    def enable_langfuse(self) -> bool:
        return self._base.enable_langfuse

    @property
    def enable_code_mode(self) -> bool:
        return self._base.enable_code_mode

    @property
    def audit_tool_calls(self) -> bool:
        return self._base.audit_tool_calls

    @property
    def max_tool_calls(self) -> int:
        return self._base.max_tool_calls

    @property
    def max_run_seconds(self) -> int:
        return self._base.max_run_seconds

    @property
    def max_cost_usd(self) -> float:
        return self._base.max_cost_usd

    @property
    def enable_ecosystem_capabilities(self) -> bool:
        return self._base.enable_ecosystem_capabilities

    @property
    def context_max_tokens(self) -> int:
        return self._base.context_max_tokens

    def __getattr__(self, name: str):
        if hasattr(self._base, name):
            return getattr(self._base, name)
        raise AttributeError(name)

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


def load_settings(env: dict[str, str] | None = None) -> Settings:
    source = env if env is not None else os.environ
    runtime_dir = Path(source.get("NEXUS_AI_RUNTIME_DIR", ".runtime"))
    sqlite_path = Path(source.get("NEXUS_AI_SQLITE_PATH", str(runtime_dir / "nexus_ai.sqlite3")))

    return Settings(
        StaticSettings(
            model=source.get("NEXUS_AI_MODEL", "openrouter:openai/gpt-4o-mini"),
            environment=source.get("NEXUS_AI_ENV", "development"),
            mcp_url=source.get("NEXUS_MCP_URL", "http://127.0.0.1:3333/mcp"),
            api_token=source.get("NEXUS_API_TOKEN", ""),
            workspace_id=source.get("NEXUS_WORKSPACE_ID", ""),
            request_id=source.get("NEXUS_REQUEST_ID") or None,
            runtime_dir=runtime_dir,
            sqlite_path=sqlite_path,
            database_url=source.get("NEXUS_AI_DATABASE_URL") or None,
            enable_langfuse=_bool(source.get("NEXUS_AI_ENABLE_LANGFUSE"), True),
            enable_code_mode=_bool(source.get("NEXUS_AI_ENABLE_CODE_MODE"), True),
            audit_tool_calls=_bool(source.get("NEXUS_AI_AUDIT_TOOL_CALLS"), True),
            max_tool_calls=_int(source.get("NEXUS_AI_MAX_TOOL_CALLS"), 40),
            max_run_seconds=_int(source.get("NEXUS_AI_MAX_RUN_SECONDS"), 180),
            max_cost_usd=_float(source.get("NEXUS_AI_MAX_COST_USD"), 2.0),
            enable_ecosystem_capabilities=_bool(source.get("NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES"), True),
            context_max_tokens=_int(source.get("NEXUS_AI_CONTEXT_MAX_TOKENS"), 180000),
            backend_url=source.get("NEXUS_BACKEND_BASE_URL", "http://127.0.0.1:3002/api/v1"),
            internal_api_key=source.get("NEXUS_INTERNAL_API_KEY") or source.get("NEXUS_API_KEY", ""),
            openrouter_api_key=source.get("OPENROUTER_API_KEY", ""),
            rag_enabled=_bool(source.get("NEXUS_RAG_ENABLED"), True),
            rag_extraction_provider=source.get("NEXUS_RAG_EXTRACTION_PROVIDER", "opendataloader_pdf"),
            rag_chunking_strategy=source.get("NEXUS_RAG_CHUNKING_STRATEGY", "document_routed_parent_child_v1"),
            rag_embedding_model=source.get("NEXUS_AI_EMBEDDING_MODEL", "qwen/qwen3-embedding-8b"),
            rag_llm_model=source.get("NEXUS_AI_RAG_LLM_MODEL", source.get("NEXUS_AI_MODEL", "openrouter:openai/gpt-4o-mini")),
            rag_enable_contextual_retrieval=_bool(source.get("NEXUS_RAG_ENABLE_CONTEXTUAL_RETRIEVAL"), True),
            rag_query_transform=source.get("NEXUS_RAG_QUERY_TRANSFORM", "multi_query_step_back"),
            rag_multi_query_count=_int(source.get("NEXUS_RAG_MULTI_QUERY_COUNT"), 2),
            rag_enable_step_back=_bool(source.get("NEXUS_RAG_ENABLE_STEP_BACK"), True),
            rag_document_route_top_k=_int(source.get("NEXUS_RAG_DOCUMENT_ROUTE_TOP_K"), 5),
            rag_dense_candidates=_int(source.get("NEXUS_RAG_DENSE_CANDIDATES"), 40),
            rag_lexical_candidates=_int(source.get("NEXUS_RAG_LEXICAL_CANDIDATES"), 40),
            rag_rrf_k=_int(source.get("NEXUS_RAG_RRF_K"), 60),
            rag_mmr_lambda=_float(source.get("NEXUS_RAG_MMR_LAMBDA"), 0.7),
            rag_summary_max_tokens=_int(source.get("NEXUS_RAG_SUMMARY_MAX_TOKENS"), 300),
            rag_context_max_tokens=_int(source.get("NEXUS_RAG_CONTEXT_MAX_TOKENS"), 160),
            rag_llm_concurrency=_int(source.get("NEXUS_RAG_LLM_CONCURRENCY"), 4),
            rag_llm_timeout_seconds=_int(source.get("NEXUS_RAG_LLM_TIMEOUT_SECONDS"), 60),
            rag_parent_chunk_tokens=_int(source.get("NEXUS_RAG_PARENT_CHUNK_TOKENS"), 1200),
            rag_child_chunk_tokens=_int(source.get("NEXUS_RAG_CHILD_CHUNK_TOKENS"), 350),
            rag_child_overlap_tokens=_int(source.get("NEXUS_RAG_CHILD_OVERLAP_TOKENS"), 60),
            qdrant_url=source.get("QDRANT_URL", "http://127.0.0.1:6333"),
            qdrant_api_key=source.get("QDRANT_API_KEY", ""),
            qdrant_document_collection=source.get("QDRANT_DOCUMENT_COLLECTION", "nexus_rag_documents"),
            qdrant_chunk_collection=source.get("QDRANT_CHUNK_COLLECTION", "nexus_rag_chunks"),
            rag_opendataloader_hybrid=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID", "off"),
            rag_opendataloader_use_struct_tree=_bool(source.get("NEXUS_RAG_OPENDATALOADER_USE_STRUCT_TREE"), True),
            rag_opendataloader_table_method=source.get("NEXUS_RAG_OPENDATALOADER_TABLE_METHOD", "pdfplumber"),
            rag_opendataloader_reading_order=source.get("NEXUS_RAG_OPENDATALOADER_READING_ORDER", "basic"),
            rag_opendataloader_markdown_with_html=_bool(source.get("NEXUS_RAG_OPENDATALOADER_MARKDOWN_WITH_HTML"), False),
            rag_opendataloader_include_header_footer=_bool(source.get("NEXUS_RAG_OPENDATALOADER_INCLUDE_HEADER_FOOTER"), False),
            rag_opendataloader_detect_strikethrough=_bool(source.get("NEXUS_RAG_OPENDATALOADER_DETECT_STRIKETHROUGH"), False),
            rag_opendataloader_hybrid_mode=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_MODE", "auto"),
            rag_opendataloader_hybrid_timeout=_int(source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_TIMEOUT"), 120),
            rag_opendataloader_hybrid_fallback=_bool(source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_FALLBACK"), True),
            rag_opendataloader_threads=_int(source.get("NEXUS_RAG_OPENDATALOADER_THREADS"), 1),
            rag_opendataloader_hybrid_hancom_ai_regionlist_strategy=source.get(
                "NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_REGIONLIST_STRATEGY", ""
            ),
            rag_opendataloader_hybrid_hancom_ai_ocr_strategy=source.get(
                "NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_OCR_STRATEGY", ""
            ),
            rag_opendataloader_hybrid_hancom_ai_image_cache=source.get(
                "NEXUS_RAG_OPENDATALOADER_HYBRID_HANCOM_AI_IMAGE_CACHE", ""
            ),
            rag_opendataloader_hybrid_url=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_URL", ""),
        )
    )
