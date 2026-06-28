from __future__ import annotations

import os
from dataclasses import dataclass
from dataclasses import replace
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # Load .env file if present


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
class Settings:
    model: str
    environment: str
    mcp_url: str
    api_token: str
    workspace_id: str
    request_id: str | None
    runtime_dir: Path
    sqlite_path: Path
    enable_langfuse: bool
    max_tool_calls: int
    max_run_seconds: int
    max_cost_usd: float
    enable_ecosystem_capabilities: bool
    context_max_tokens: int
    orchestration_mode: str
    planner_model: str | None
    retriever_model: str | None
    synthesizer_model: str | None
    critic_model: str | None
    orchestrator_max_revisions: int
    retrieval_top_k: int
    rag_min_score: float
    rag_enabled: bool
    backend_url: str
    internal_api_key: str
    rag_extraction_provider: str
    rag_opendataloader_use_struct_tree: bool
    rag_opendataloader_table_method: str
    rag_opendataloader_reading_order: str
    rag_opendataloader_markdown_with_html: bool
    rag_opendataloader_include_header_footer: bool
    rag_opendataloader_detect_strikethrough: bool
    rag_opendataloader_hybrid: str
    rag_opendataloader_hybrid_mode: str
    rag_opendataloader_hybrid_url: str | None
    rag_opendataloader_hybrid_timeout: str
    rag_opendataloader_hybrid_fallback: bool
    rag_opendataloader_hybrid_hancom_ai_regionlist_strategy: str
    rag_opendataloader_hybrid_hancom_ai_ocr_strategy: str
    rag_opendataloader_hybrid_hancom_ai_image_cache: str
    rag_opendataloader_threads: str
    rag_chunking_strategy: str
    rag_embedding_provider: str
    rag_embedding_model: str
    rag_llm_model: str
    rag_summary_max_tokens: int
    rag_context_max_tokens: int
    rag_llm_timeout_seconds: int
    rag_llm_concurrency: int
    rag_enable_contextual_retrieval: bool
    rag_query_transform: str
    rag_multi_query_count: int
    rag_enable_step_back: bool
    rag_enable_hyde: bool
    rag_document_route_top_k: int
    rag_dense_candidates: int
    rag_lexical_candidates: int
    rag_mmr_lambda: float
    rag_rrf_k: int
    rag_max_plan_searches: int
    openrouter_api_key: str
    qdrant_url: str
    qdrant_api_key: str
    qdrant_document_collection: str
    qdrant_chunk_collection: str
    rag_parent_chunk_tokens: int
    rag_child_chunk_tokens: int
    rag_child_overlap_tokens: int

    @property
    def session_id(self) -> str:
        return self.request_id or "local"

    @property
    def workspace_runtime_dir(self) -> Path:
        return self.runtime_dir / "workspaces" / self.workspace_id / "sessions" / self.session_id

    @property
    def mcp_headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "X-Nexus-Workspace-ID": self.workspace_id,
        }
        if self.request_id:
            headers["X-Nexus-Request-ID"] = self.request_id
        return headers

    def validate_for_runtime(self) -> None:
        missing: list[str] = []
        if not self.api_token:
            missing.append("NEXUS_API_TOKEN")
        if not self.workspace_id:
            missing.append("NEXUS_WORKSPACE_ID")
        if missing:
            raise RuntimeError(f"Missing required Nexus AI env vars: {', '.join(missing)}")

    def for_request(
        self,
        *,
        api_token: str,
        workspace_id: str,
        request_id: str | None = None,
    ) -> "Settings":
        return replace(
            self,
            api_token=api_token,
            workspace_id=workspace_id,
            request_id=request_id,
        )


def load_settings(env: dict[str, str] | None = None) -> Settings:
    source = env if env is not None else os.environ
    runtime_dir = Path(source.get("NEXUS_AI_RUNTIME_DIR", ".runtime"))
    sqlite_path = Path(source.get("NEXUS_AI_SQLITE_PATH", str(runtime_dir / "nexus_ai.sqlite3")))

    return Settings(
        model=source.get("NEXUS_AI_MODEL", "openrouter:openai/gpt-4o-mini"),
        environment=source.get("NEXUS_AI_ENV", "development"),
        mcp_url=source.get("NEXUS_MCP_URL", "http://127.0.0.1:3333/mcp"),
        api_token=source.get("NEXUS_API_TOKEN", ""),
        workspace_id=source.get("NEXUS_WORKSPACE_ID", ""),
        request_id=source.get("NEXUS_REQUEST_ID") or None,
        runtime_dir=runtime_dir,
        sqlite_path=sqlite_path,
        enable_langfuse=_bool(source.get("NEXUS_AI_ENABLE_LANGFUSE"), True),
        max_tool_calls=_int(source.get("NEXUS_AI_MAX_TOOL_CALLS"), 40),
        max_run_seconds=_int(source.get("NEXUS_AI_MAX_RUN_SECONDS"), 180),
        max_cost_usd=_float(source.get("NEXUS_AI_MAX_COST_USD"), 2.0),
        enable_ecosystem_capabilities=_bool(source.get("NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES"), True),
        context_max_tokens=_int(source.get("NEXUS_AI_CONTEXT_MAX_TOKENS"), 180000),
        orchestration_mode=source.get("NEXUS_AI_ORCHESTRATION_MODE", "single"),
        planner_model=source.get("NEXUS_AI_PLANNER_MODEL") or None,
        retriever_model=source.get("NEXUS_AI_RETRIEVER_MODEL") or None,
        synthesizer_model=source.get("NEXUS_AI_SYNTHESIZER_MODEL") or None,
        critic_model=source.get("NEXUS_AI_CRITIC_MODEL") or None,
        orchestrator_max_revisions=min(_int(source.get("NEXUS_AI_ORCHESTRATOR_MAX_REVISIONS"), 1), 1),
        retrieval_top_k=_int(source.get("NEXUS_AI_RETRIEVAL_TOP_K"), 8),
        rag_min_score=_float(source.get("NEXUS_AI_RAG_MIN_SCORE"), 0.5),
        rag_enabled=_bool(source.get("NEXUS_RAG_ENABLED"), True),
        backend_url=source.get("NEXUS_BACKEND_URL", source.get("NEXUS_API_BASE_URL", "http://127.0.0.1:3000/api/v1")),
        internal_api_key=source.get("NEXUS_INTERNAL_API_KEY", source.get("NEXUS_API_KEY", "")),
        rag_extraction_provider=source.get("NEXUS_RAG_EXTRACTION_PROVIDER", "opendataloader_pdf"),
        rag_opendataloader_use_struct_tree=_bool(source.get("NEXUS_RAG_OPENDATALOADER_USE_STRUCT_TREE"), False),
        rag_opendataloader_table_method=source.get("NEXUS_RAG_OPENDATALOADER_TABLE_METHOD", "default"),
        rag_opendataloader_reading_order=source.get("NEXUS_RAG_OPENDATALOADER_READING_ORDER", "xycut"),
        rag_opendataloader_markdown_with_html=_bool(source.get("NEXUS_RAG_OPENDATALOADER_MARKDOWN_WITH_HTML"), False),
        rag_opendataloader_include_header_footer=_bool(source.get("NEXUS_RAG_OPENDATALOADER_INCLUDE_HEADER_FOOTER"), False),
        rag_opendataloader_detect_strikethrough=_bool(source.get("NEXUS_RAG_OPENDATALOADER_DETECT_STRIKETHROUGH"), False),
        rag_opendataloader_hybrid=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID", "off"),
        rag_opendataloader_hybrid_mode=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_MODE", "auto"),
        rag_opendataloader_hybrid_url=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_URL") or None,
        rag_opendataloader_hybrid_timeout=source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_TIMEOUT", "0"),
        rag_opendataloader_hybrid_fallback=_bool(source.get("NEXUS_RAG_OPENDATALOADER_HYBRID_FALLBACK"), False),
        rag_opendataloader_hybrid_hancom_ai_regionlist_strategy=source.get(
            "NEXUS_RAG_OPENDATALOADER_HANCOM_REGIONLIST_STRATEGY", "table-first"
        ),
        rag_opendataloader_hybrid_hancom_ai_ocr_strategy=source.get(
            "NEXUS_RAG_OPENDATALOADER_HANCOM_OCR_STRATEGY", "auto"
        ),
        rag_opendataloader_hybrid_hancom_ai_image_cache=source.get(
            "NEXUS_RAG_OPENDATALOADER_HANCOM_IMAGE_CACHE", "memory"
        ),
        rag_opendataloader_threads=source.get("NEXUS_RAG_OPENDATALOADER_THREADS", "1"),
        rag_chunking_strategy=source.get("NEXUS_RAG_CHUNKING_STRATEGY", "document_routed_parent_child_v1"),
        rag_embedding_provider=source.get("NEXUS_RAG_EMBEDDING_PROVIDER", "openrouter"),
        rag_embedding_model=source.get("NEXUS_RAG_EMBEDDING_MODEL", "qwen/qwen3-embedding-8b"),
        rag_llm_model=source.get("NEXUS_RAG_LLM_MODEL", "openrouter:openai/gpt-4o-mini"),
        rag_summary_max_tokens=_int(source.get("NEXUS_RAG_SUMMARY_MAX_TOKENS"), 220),
        rag_context_max_tokens=_int(source.get("NEXUS_RAG_CONTEXT_MAX_TOKENS"), 140),
        rag_llm_timeout_seconds=_int(source.get("NEXUS_RAG_LLM_TIMEOUT_SECONDS"), 60),
        rag_llm_concurrency=_int(source.get("NEXUS_RAG_LLM_CONCURRENCY"), 4),
        rag_enable_contextual_retrieval=_bool(source.get("NEXUS_RAG_ENABLE_CONTEXTUAL_RETRIEVAL"), True),
        rag_query_transform=source.get("NEXUS_RAG_QUERY_TRANSFORM", "multi_query_step_back"),
        rag_multi_query_count=max(0, min(_int(source.get("NEXUS_RAG_MULTI_QUERY_COUNT"), 3), 5)),
        rag_enable_step_back=_bool(source.get("NEXUS_RAG_ENABLE_STEP_BACK"), True),
        rag_enable_hyde=_bool(source.get("NEXUS_RAG_ENABLE_HYDE"), False),
        rag_document_route_top_k=_int(source.get("NEXUS_RAG_DOCUMENT_ROUTE_TOP_K"), 3),
        rag_dense_candidates=_int(source.get("NEXUS_RAG_DENSE_CANDIDATES"), 40),
        rag_lexical_candidates=_int(source.get("NEXUS_RAG_LEXICAL_CANDIDATES"), 40),
        rag_mmr_lambda=_float(source.get("NEXUS_RAG_MMR_LAMBDA"), 0.65),
        rag_rrf_k=_int(source.get("NEXUS_RAG_RRF_K"), 60),
        rag_max_plan_searches=_int(source.get("NEXUS_RAG_MAX_PLAN_SEARCHES"), 4),
        openrouter_api_key=source.get("OPENROUTER_API_KEY", ""),
        qdrant_url=source.get("QDRANT_URL", "http://127.0.0.1:6333"),
        qdrant_api_key=source.get("QDRANT_API_KEY", ""),
        qdrant_document_collection=source.get("QDRANT_DOCUMENT_COLLECTION", "nexus_rag_documents"),
        qdrant_chunk_collection=source.get("QDRANT_CHUNK_COLLECTION", "nexus_rag_chunks"),
        rag_parent_chunk_tokens=_int(source.get("NEXUS_RAG_PARENT_CHUNK_TOKENS"), 1200),
        rag_child_chunk_tokens=_int(source.get("NEXUS_RAG_CHILD_CHUNK_TOKENS"), 280),
        rag_child_overlap_tokens=_int(source.get("NEXUS_RAG_CHILD_OVERLAP_TOKENS"), 60),
    )
