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
    rag_enabled: bool
    backend_url: str
    internal_api_key: str
    rag_extraction_provider: str
    rag_chunking_strategy: str
    rag_embedding_provider: str
    rag_embedding_model: str
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
        rag_enabled=_bool(source.get("NEXUS_RAG_ENABLED"), True),
        backend_url=source.get("NEXUS_BACKEND_URL", source.get("NEXUS_API_BASE_URL", "http://127.0.0.1:3000/api/v1")),
        internal_api_key=source.get("NEXUS_INTERNAL_API_KEY", source.get("NEXUS_API_KEY", "")),
        rag_extraction_provider=source.get("NEXUS_RAG_EXTRACTION_PROVIDER", "opendataloader_pdf"),
        rag_chunking_strategy=source.get("NEXUS_RAG_CHUNKING_STRATEGY", "document_routed_parent_child_v1"),
        rag_embedding_provider=source.get("NEXUS_RAG_EMBEDDING_PROVIDER", "openrouter"),
        rag_embedding_model=source.get("NEXUS_RAG_EMBEDDING_MODEL", "qwen/qwen3-embedding-8b"),
        openrouter_api_key=source.get("OPENROUTER_API_KEY", ""),
        qdrant_url=source.get("QDRANT_URL", "http://127.0.0.1:6333"),
        qdrant_api_key=source.get("QDRANT_API_KEY", ""),
        qdrant_document_collection=source.get("QDRANT_DOCUMENT_COLLECTION", "nexus_rag_documents"),
        qdrant_chunk_collection=source.get("QDRANT_CHUNK_COLLECTION", "nexus_rag_chunks"),
        rag_parent_chunk_tokens=_int(source.get("NEXUS_RAG_PARENT_CHUNK_TOKENS"), 1200),
        rag_child_chunk_tokens=_int(source.get("NEXUS_RAG_CHILD_CHUNK_TOKENS"), 280),
        rag_child_overlap_tokens=_int(source.get("NEXUS_RAG_CHILD_OVERLAP_TOKENS"), 60),
    )
