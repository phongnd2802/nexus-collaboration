from __future__ import annotations

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution
from nexus_ai_service.memory.schemas import MemoryWriteRequest


class MemoryCapability:
    name = "memory"

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        memory_service = context.services.get("memory_service")
        if memory_service is None:
            return CapabilityContribution()

        records = await memory_service.search(
            context.deps.workspace_id,
            context.user_text,
            user_id=context.deps.user_id,
            limit=5,
        )
        context.memory_records = records
        if not records:
            return CapabilityContribution()

        joined = "\n".join(f"- {record.text}" for record in records[:5])
        return CapabilityContribution(instructions=[f"Relevant user/workspace memory:\n{joined}"])

    async def after_run(self, context: CapabilityContext, assistant_text: str) -> None:
        memory_service = context.services.get("memory_service")
        if memory_service is None:
            return
        await memory_service.add(
            MemoryWriteRequest(
                workspace_id=context.deps.workspace_id,
                user_id=context.deps.user_id,
                scope="user",
                text=context.user_text,
                metadata={"session_id": context.deps.session_id, "source": "single_agent_runtime"},
            )
        )
