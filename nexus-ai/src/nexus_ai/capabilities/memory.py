from __future__ import annotations

from nexus_ai.storage import MemoryStore, create_memory_repository


def create_memory_repository_for_runtime(settings, store) -> MemoryStore:
    return create_memory_repository(settings, store)
