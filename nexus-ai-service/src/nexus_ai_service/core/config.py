from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    nexus_ai_port: int = Field(default=8000, alias="NEXUS_AI_PORT")
    nexus_backend_base_url: str = Field(default="http://backend:3002/api/v1", alias="NEXUS_BACKEND_BASE_URL")
    nexus_internal_api_key: str | None = Field(default=None, alias="NEXUS_INTERNAL_API_KEY")
    nexus_mcp_url: str = Field(default="http://nexus-mcp:3333/mcp", alias="NEXUS_MCP_URL")
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    nexus_ai_model: str = Field(default="openai/gpt-4o-mini", alias="NEXUS_AI_MODEL")
    nexus_ai_embedding_model: str = Field(default="Qwen/Qwen3-VL-Embedding-8B", alias="NEXUS_AI_EMBEDDING_MODEL")
    qdrant_url: str = Field(default="http://qdrant:6333", alias="QDRANT_URL")
    qdrant_api_key: str | None = Field(default=None, alias="QDRANT_API_KEY")
    qdrant_document_collection: str = Field(default="nexus_rag_documents", alias="QDRANT_DOCUMENT_COLLECTION")
    qdrant_chunk_collection: str = Field(default="nexus_rag_chunks", alias="QDRANT_CHUNK_COLLECTION")
    qdrant_mem0_user_collection: str = Field(default="nexus_mem0_user_memories", alias="QDRANT_MEM0_USER_COLLECTION")
    qdrant_mem0_workspace_collection: str = Field(
        default="nexus_mem0_workspace_memories", alias="QDRANT_MEM0_WORKSPACE_COLLECTION"
    )
    elasticsearch_url: str | None = Field(default="http://elasticsearch:9200", alias="ELASTICSEARCH_URL")
    elasticsearch_rag_index: str = Field(default="nexus-rag-chunks-v1", alias="ELASTICSEARCH_RAG_INDEX")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    langfuse_public_key: str | None = Field(default=None, alias="LANGFUSE_PUBLIC_KEY")
    langfuse_secret_key: str | None = Field(default=None, alias="LANGFUSE_SECRET_KEY")
    langfuse_host: str | None = Field(default=None, alias="LANGFUSE_BASE_URL")
    mem0_enabled: bool = Field(default=False, alias="MEM0_ENABLED")
    rag_opendataloader_hybrid: str = Field(default="off", alias="NEXUS_RAG_OPENDATALOADER_HYBRID")
    rag_opendataloader_hybrid_url: str | None = Field(default=None, alias="NEXUS_RAG_OPENDATALOADER_HYBRID_URL")
    rag_opendataloader_threads: str = Field(default="1", alias="NEXUS_RAG_OPENDATALOADER_THREADS")


@lru_cache
def get_settings() -> Settings:
    return Settings()
