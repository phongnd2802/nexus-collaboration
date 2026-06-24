from __future__ import annotations

from nexus_ai.storage import MemoryRepository, SQLiteStore


def create_memory_repository(store: SQLiteStore) -> MemoryRepository:
    return MemoryRepository(store)

