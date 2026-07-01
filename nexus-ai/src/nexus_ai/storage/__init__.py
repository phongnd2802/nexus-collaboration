from .memory import MemoryRecord, MemoryRepository
from .postgres import PostgresStore
from .sessions import SessionRecord, SessionRepository
from .sqlite import SQLiteStore


def create_store(settings):
    if settings.database_url:
        return PostgresStore(settings.database_url)
    store = SQLiteStore(settings.sqlite_path)
    store.initialize()
    return store

__all__ = [
    "create_store",
    "MemoryRecord",
    "MemoryRepository",
    "PostgresStore",
    "SQLiteStore",
    "SessionRecord",
    "SessionRepository",
]
