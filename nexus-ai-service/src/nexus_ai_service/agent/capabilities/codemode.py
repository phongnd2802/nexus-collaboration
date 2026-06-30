from dataclasses import dataclass

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun


@dataclass(frozen=True)
class NexusCodeModeCapability(NoopAfterRun):
    name = "codemode"
    enabled: bool = True
    selector: dict[str, bool] | None = None
    max_retries: int = 3

    def tool_selector(self) -> dict[str, bool]:
        return self.selector or {"code_mode": True}

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        if not self.enabled:
            return CapabilityContribution()
        try:
            from pydantic_ai_harness import CodeMode
        except Exception:
            return CapabilityContribution(
                instructions=["CodeMode is unavailable in this runtime; use normal read-only tools for analysis."]
            )
        return CapabilityContribution(
            pydantic_capabilities=[CodeMode(tools=self.tool_selector(), max_retries=self.max_retries)],
            instructions=[
                "Use CodeMode only for read-only aggregation, filtering, and summarization across approved tool results."
            ],
        )
