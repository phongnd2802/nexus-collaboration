from __future__ import annotations

from typing import Any

from pydantic_ai import Agent, RunContext

from nexus_ai.orchestration.agents import build_stage_agents
from nexus_ai.orchestration.graph import OrchestratorDeps, OrchestratorState, build_orchestrator_graph
from nexus_ai.orchestration.schemas import OrchestratorResult
from nexus_ai.settings import Settings


SHELL_INSTRUCTIONS = """\
You are Nexus AI's orchestration shell.
For every user-facing request, call run_nexus_orchestrator exactly once and return its content.
Do not answer from your own knowledge unless the tool fails.
"""


class NexusOrchestrator:
    def __init__(self, settings: Settings, deps_type: type[Any]) -> None:
        self.settings = settings
        self.stage_agents = build_stage_agents(settings, deps_type)
        self.graph = build_orchestrator_graph()

    async def run(self, user_prompt: str, runtime_deps: Any) -> OrchestratorResult:
        return await self.graph.run(
            state=OrchestratorState(user_prompt=user_prompt),
            deps=OrchestratorDeps(runtime_deps=runtime_deps, stage_agents=self.stage_agents),
            inputs=user_prompt,
        )


def build_orchestrator_shell_agent(settings: Settings, deps_type: type[Any]) -> tuple[Any, NexusOrchestrator, list[str]]:
    orchestrator = NexusOrchestrator(settings, deps_type)
    kwargs: dict[str, Any] = {
        "deps_type": deps_type,
        "instructions": SHELL_INSTRUCTIONS,
    }
    if settings.enable_langfuse:
        kwargs["instrument"] = True
    model = _resolve_model(settings.model)
    try:
        agent = Agent(model, **kwargs)
    except TypeError:
        kwargs.pop("instrument", None)
        agent = Agent(model, **kwargs)

    @agent.tool
    async def run_nexus_orchestrator(ctx: RunContext[Any], user_prompt: str) -> dict[str, Any]:
        """Run the Nexus Planner -> Retriever -> Synthesizer -> Critic orchestration flow."""
        result = await orchestrator.run(user_prompt, ctx.deps)
        return {
            "content": result.content,
            "approved": result.approved,
            "revision_count": result.revision_count,
            "limitations": result.limitations,
            "trace": result.trace,
        }

    return agent, orchestrator, orchestrator.stage_agents.warnings


def _resolve_model(model_name: str) -> Any:
    if model_name != "test":
        return model_name
    from pydantic_ai.models.test import TestModel

    return TestModel()
