from nexus_ai_service.core.time import utc_now_iso
from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun


class CurrentTimeCapability(NoopAfterRun):
    name = "current_time"

    def context(self) -> dict[str, str]:
        return {"current_time": utc_now_iso()}

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        return CapabilityContribution(instructions=[f"Current time: {utc_now_iso()}"])
