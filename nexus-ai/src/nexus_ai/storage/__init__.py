from .mem0 import Mem0MemoryRepository
from .memory import MemoryRecord, MemoryRepository, MemoryStore
from .postgres import PostgresStore
from .sessions import SessionRecord, SessionRepository


def create_store(settings):
    if not settings.database_url:
        raise RuntimeError("NEXUS_AI_DATABASE_URL is required; SQLite storage is no longer supported.")
    return PostgresStore(settings.database_url)


def create_memory_repository(settings, store) -> MemoryStore:
    if settings.mem0_enabled:
        return Mem0MemoryRepository(settings)
    return MemoryRepository(store)

__all__ = [
    "create_store",
    "create_memory_repository",
    "Mem0MemoryRepository",
    "MemoryRecord",
    "MemoryRepository",
    "MemoryStore",
    "PostgresStore",
    "SessionRecord",
    "SessionRepository",
]
