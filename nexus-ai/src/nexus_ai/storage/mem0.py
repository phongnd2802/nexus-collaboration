from __future__ import annotations

from datetime import UTC, datetime
import re
from typing import Any

from nexus_ai.storage.memory import MemoryRecord


class Mem0MemoryRepository:
    def __init__(self, settings) -> None:
        try:
            from mem0 import AsyncMemory
        except ImportError as exc:
            raise RuntimeError("mem0ai is required when NEXUS_AI_MEM0_ENABLED=true.") from exc

        self.settings = settings
        self._memory = AsyncMemory.from_config(self._build_config())

    async def add(
        self,
        workspace_id: str,
        session_id: str | None,
        user_id: str | None,
        memory_type: str,
        content: str,
        importance: int = 5,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        scoped_user_id = self._scoped_user_id(workspace_id, user_id)
        if scoped_user_id is None:
            raise ValueError("Mem0 user memory requires a user_id.")

        payload = self._metadata(
            workspace_id=workspace_id,
            session_id=session_id,
            user_id=user_id,
            memory_type=memory_type,
            importance=importance,
            tags=tags or [],
            extra=metadata or {},
        )
        result = await self._memory.add(
            content,
            user_id=scoped_user_id,
            metadata=payload,
            infer=False,
        )
        return self._first_memory_id(result)

    async def recent(
        self,
        workspace_id: str,
        session_id: str | None = None,
        user_id: str | None = None,
        limit: int = 10,
    ) -> list[MemoryRecord]:
        scoped_user_id = self._scoped_user_id(workspace_id, user_id)
        if scoped_user_id is None:
            return []

        result = await self._memory.get_all(filters={"user_id": scoped_user_id}, top_k=limit)
        items = result.get("results", []) if isinstance(result, dict) else []
        records: list[MemoryRecord] = []
        for item in items:
            metadata = dict(item.get("metadata") or {})
            tags = list(metadata.get("tags") or [])
            records.append(
                MemoryRecord(
                    id=str(item.get("id") or item.get("memory_id") or ""),
                    memory_type=str(metadata.get("memory_type") or item.get("memory_type") or "episodic"),
                    content=str(item.get("memory") or item.get("text") or ""),
                    importance=int(metadata.get("importance") or 5),
                    tags=[str(tag) for tag in tags],
                    metadata=metadata,
                )
            )
        return records

    async def ingest_turn(
        self,
        *,
        workspace_id: str,
        session_id: str,
        user_id: str | None,
        user_text: str,
        assistant_text: str,
    ) -> None:
        scoped_user_id = self._scoped_user_id(workspace_id, user_id)
        if scoped_user_id is None:
            return

        metadata = self._metadata(
            workspace_id=workspace_id,
            session_id=session_id,
            user_id=user_id,
            memory_type="conversation_turn",
            importance=5,
            tags=["conversation", "auto"],
            extra={},
        )
        await self._memory.add(
            [
                {"role": "user", "content": user_text},
                {"role": "assistant", "content": assistant_text},
            ],
            user_id=scoped_user_id,
            metadata=metadata,
            infer=True,
        )

    def _build_config(self) -> dict[str, Any]:
        llm_model = self._strip_provider_prefix(self.settings.model)
        return {
            "vector_store": {
                "provider": "qdrant",
                "config": {
                    "collection_name": self._collection_name(),
                    "embedding_model_dims": self.settings.rag_embedding_dimensions,
                    "url": self.settings.qdrant_url,
                    "api_key": self.settings.qdrant_api_key or None,
                    "on_disk": False,
                },
            },
            "llm": {
                "provider": "openai",
                "config": {
                    "model": llm_model,
                    "api_key": self.settings.openrouter_api_key,
                    "openrouter_base_url": self.settings.openrouter_base_url,
                },
            },
            "embedder": {
                "provider": "openai",
                "config": {
                    "model": self.settings.rag_embedding_model,
                    "api_key": self.settings.openrouter_api_key,
                    "openai_base_url": self.settings.openrouter_base_url,
                },
            },
            "history_db_path": str(self.settings.runtime_dir / "mem0_history.db"),
            "version": "v1.1",
        }

    def _metadata(
        self,
        *,
        workspace_id: str,
        session_id: str | None,
        user_id: str | None,
        memory_type: str,
        importance: int,
        tags: list[str],
        extra: dict[str, Any],
    ) -> dict[str, Any]:
        payload = dict(extra)
        payload.update(
            {
                "workspace_id": workspace_id,
                "session_id": session_id,
                "user_id": user_id,
                "memory_type": memory_type,
                "importance": importance,
                "tags": tags,
                "source": "nexus-ai",
                "captured_at": datetime.now(UTC).isoformat(),
            }
        )
        return payload

    @staticmethod
    def _first_memory_id(result: Any) -> str:
        if not isinstance(result, dict):
            return ""
        items = result.get("results") or []
        if not items:
            return ""
        first = items[0]
        return str(first.get("id") or first.get("memory_id") or "")

    @staticmethod
    def _strip_provider_prefix(model_name: str) -> str:
        if ":" not in model_name:
            return model_name
        return model_name.split(":", 1)[1]

    def _collection_name(self) -> str:
        base_name = self.settings.qdrant_mem0_user_collection
        model_slug = re.sub(r"[^a-z0-9]+", "_", self.settings.rag_embedding_model.lower()).strip("_")
        return f"{base_name}__{model_slug}_{self.settings.rag_embedding_dimensions}"

    @staticmethod
    def _scoped_user_id(workspace_id: str, user_id: str | None) -> str | None:
        if not user_id:
            return None
        return f"{workspace_id}:{user_id}"
