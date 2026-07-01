from .mem0 import Mem0MemoryRepository
from .memory import MemoryRecord, MemoryRepository, MemoryStore
from .postgres import PostgresStore
from .sessions import SessionRecord, SessionRepository
from .sqlite import SQLiteStore


def create_store(settings):
    if settings.database_url:
        return PostgresStore(settings.database_url)
    store = SQLiteStore(settings.sqlite_path)
    store.initialize()
    return store


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
    "SQLiteStore",
    "SessionRecord",
    "SessionRepository",
]
