from typing import Any


class Mem0Adapter:
    def __init__(
        self,
        enabled: bool = False,
        qdrant_url: str | None = None,
        qdrant_api_key: str | None = None,
        user_collection: str = "nexus_mem0_user_memories",
        workspace_collection: str = "nexus_mem0_workspace_memories",
    ) -> None:
        self.enabled = enabled
        self.qdrant_url = qdrant_url
        self.qdrant_api_key = qdrant_api_key
        self.user_collection = user_collection
        self.workspace_collection = workspace_collection
        self._memory: Any | None = None

    def client(self):
        if not self.enabled:
            return None
        if self._memory is not None:
            return self._memory
        try:
            from mem0 import Memory
        except Exception:
            return None
        config = {
            "vector_store": {
                "provider": "qdrant",
                "config": {
                    "url": self.qdrant_url,
                    "api_key": self.qdrant_api_key,
                    "collection_name": self.user_collection,
                },
            }
        }
        factory = getattr(Memory, "from_config", None)
        self._memory = factory(config) if callable(factory) else Memory(config=config)
        return self._memory

    async def add(self, text: str, user_id: str, metadata: dict[str, Any] | None = None) -> Any:
        memory = self.client()
        if memory is None:
            return None
        result = memory.add(text, user_id=user_id, metadata=metadata or {})
        if hasattr(result, "__await__"):
            return await result
        return result

    async def search(self, query: str, user_id: str, limit: int = 5) -> list[dict[str, Any]]:
        memory = self.client()
        if memory is None:
            return []
        result = memory.search(query=query, user_id=user_id, limit=limit)
        if hasattr(result, "__await__"):
            result = await result
        return result if isinstance(result, list) else []
