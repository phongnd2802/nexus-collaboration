from __future__ import annotations

from typing import Any

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun
from nexus_ai_service.rag.schemas import RagSearchRequest
from nexus_ai_service.streaming.events import StreamEvent


class RagCapability(NoopAfterRun):
    name = "rag"

    def __init__(self, limit: int = 6) -> None:
        self.limit = limit

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        retrieval_service = context.services.get("retrieval_service")
        if retrieval_service is None:
            return CapabilityContribution()

        results = await retrieval_service.search(
            RagSearchRequest(workspace_id=context.deps.workspace_id, query=context.user_text, limit=self.limit)
        )
        context.rag_sources = [self._result_payload(result) for result in results]
        instructions = []
        if context.rag_sources:
            joined_sources = "\n\n".join(
                f"[{index + 1}] {source.get('citation')}: {source.get('content')}"
                for index, source in enumerate(context.rag_sources[:8])
            )
            instructions.append(f"Workspace RAG context:\n{joined_sources}")
        return CapabilityContribution(
            instructions=instructions,
            events=[
                StreamEvent(
                    run_id=context.metadata["run_id"],
                    session_id=context.deps.session_id,
                    workspace_id=context.deps.workspace_id,
                    event_type="retrieval.completed",
                    payload={"sources": context.rag_sources},
                )
            ],
        )

    def _result_payload(self, result: Any) -> dict[str, Any]:
        if hasattr(result, "model_dump"):
            return result.model_dump()
        return dict(result)
