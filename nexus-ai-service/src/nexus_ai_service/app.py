from contextlib import asynccontextmanager

from fastapi import FastAPI

from nexus_ai_service.api.routes.agent_chat import router as agent_chat_router
from nexus_ai_service.api.routes.health import router as health_router
from nexus_ai_service.api.routes.rag_internal import router as rag_internal_router
from nexus_ai_service.core.config import get_settings
from nexus_ai_service.integrations.langfuse import LangfuseTracer
from nexus_ai_service.integrations.mem0 import Mem0Adapter
from nexus_ai_service.memory.service import NexusMemoryService
from nexus_ai_service.persistence.sessions import InMemorySessionStore
from nexus_ai_service.persistence.sqlalchemy_store import SqlAlchemySessionStore
from nexus_ai_service.rag.retrieval import LocalHybridRetrievalService


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = app.state.session_store
    if hasattr(store, "init"):
        await store.init()
    yield
    if hasattr(store, "close"):
        await store.close()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Nexus AI Service", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.session_store = (
        SqlAlchemySessionStore(settings.database_url) if settings.database_url else InMemorySessionStore()
    )
    app.state.retrieval_service = LocalHybridRetrievalService()
    app.state.memory_service = NexusMemoryService(
        mem0=Mem0Adapter(
            enabled=settings.mem0_enabled,
            qdrant_url=settings.qdrant_url,
            qdrant_api_key=settings.qdrant_api_key,
            user_collection=settings.qdrant_mem0_user_collection,
            workspace_collection=settings.qdrant_mem0_workspace_collection,
        )
    )
    app.state.tracer = LangfuseTracer(
        public_key=settings.langfuse_public_key,
        secret_key=settings.langfuse_secret_key,
        host=settings.langfuse_host,
    )
    app.include_router(health_router)
    app.include_router(agent_chat_router)
    app.include_router(rag_internal_router)
    return app
