from nexus_ai_service.core.ids import new_id
from nexus_ai_service.integrations.mem0 import Mem0Adapter
from nexus_ai_service.memory.policy import MemoryPolicy
from nexus_ai_service.memory.schemas import MemoryRecord, MemoryWriteRequest


class NexusMemoryService:
    def __init__(self, policy: MemoryPolicy | None = None, mem0: Mem0Adapter | None = None) -> None:
        self.policy = policy or MemoryPolicy()
        self.mem0 = mem0
        self._records: dict[str, MemoryRecord] = {}

    async def add(self, request: MemoryWriteRequest) -> MemoryRecord | None:
        if not self.policy.should_store(request):
            return None
        if self.mem0 is not None and request.user_id:
            await self.mem0.add(
                request.text,
                user_id=self._mem0_user_id(request.workspace_id, request.user_id, request.scope),
                metadata={"workspace_id": request.workspace_id, "scope": request.scope, **request.metadata},
            )
        record = MemoryRecord(
            id=new_id(),
            workspace_id=request.workspace_id,
            user_id=request.user_id,
            scope=request.scope,
            text=request.text,
            metadata=request.metadata,
        )
        self._records[record.id] = record
        return record

    async def search(self, workspace_id: str, query: str, user_id: str | None = None, limit: int = 5) -> list[MemoryRecord]:
        if self.mem0 is not None and user_id:
            mem0_results = await self.mem0.search(query, user_id=self._mem0_user_id(workspace_id, user_id, "user"), limit=limit)
            if mem0_results:
                return [
                    MemoryRecord(
                        id=str(item.get("id") or item.get("memory_id") or index),
                        workspace_id=workspace_id,
                        user_id=user_id,
                        scope="user",
                        text=str(item.get("memory") or item.get("text") or item),
                        metadata=item if isinstance(item, dict) else {},
                    )
                    for index, item in enumerate(mem0_results)
                    if isinstance(item, dict)
                ]
        terms = set(query.lower().split())
        records = [
            record
            for record in self._records.values()
            if record.workspace_id == workspace_id and (record.scope == "workspace" or record.user_id == user_id)
        ]
        scored = [
            (len(terms.intersection(record.text.lower().split())), record)
            for record in records
        ]
        return [record for score, record in sorted(scored, key=lambda item: item[0], reverse=True) if score > 0][:limit]

    def _mem0_user_id(self, workspace_id: str, user_id: str, scope: str) -> str:
        return f"{workspace_id}:{scope}:{user_id}"
