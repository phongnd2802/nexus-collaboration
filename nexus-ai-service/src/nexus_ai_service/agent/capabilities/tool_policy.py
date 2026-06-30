from __future__ import annotations

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun


class ToolPolicyCapability(NoopAfterRun):
    name = "tool_policy"

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        return CapabilityContribution(
            instructions=[
                (
                    "Tool policy: read-only tools may run directly. Write, update, delete, invite, send, "
                    "or otherwise destructive actions require human approval before execution."
                )
            ]
        )
