from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun


class ObservabilityCapability(NoopAfterRun):
    name = "observability"

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        return CapabilityContribution(
            instructions=[
                "Keep responses concise and cite workspace context when using retrieved or tool-provided information."
            ]
        )

    @asynccontextmanager
    async def span(self, context: CapabilityContext) -> AsyncIterator[None]:
        tracer = context.services.get("tracer")
        if tracer is None:
            yield
            return
        async with tracer.span(
            "single_agent_run",
            workspace_id=context.deps.workspace_id,
            user_id=context.deps.user_id,
            session_id=context.deps.session_id,
            request_id=context.deps.request_id,
        ):
            yield
