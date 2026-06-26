from __future__ import annotations

from typing import Any

from pydantic_ai import Agent

from nexus_ai.capabilities.code_mode import create_code_mode_capability
from nexus_ai.capabilities.context import current_time_instruction, memory_instruction
from nexus_ai.capabilities.ecosystem import create_ecosystem_capabilities
from nexus_ai.capabilities.mcp import create_nexus_mcp_capability
from nexus_ai.capabilities.reasoning import create_thinking_capability
from nexus_ai.capabilities.tool_preparation import create_mcp_tool_preparation_capability
from nexus_ai.capabilities.tool_search import create_tool_search_capability
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, Plan, RetrievalBundle
from nexus_ai.orchestration.tools import rag_search
from nexus_ai.settings import Settings


PLANNER_INSTRUCTIONS = """\
You are the Planner in Nexus AI's fixed orchestration flow.
Create a concise structured plan for answering the user's request.
Use Plan.needs as the list of evidence or reasoning needs. Use stable ids like need_1.
Lower priority numbers are more important. Sort needs by priority.
Do not use tools.
"""

RETRIEVER_INSTRUCTIONS = """\
You are the Retriever in Nexus AI's fixed orchestration flow.
Gather evidence for each PlanStep using Nexus RAG and Nexus MCP tools.
Map every evidence item to plan_step_id. Report gaps instead of inventing facts.
"""

SYNTHESIZER_INSTRUCTIONS = """\
You are the Synthesizer in Nexus AI's fixed orchestration flow.
Write the final draft using only the provided plan, evidence, and revision feedback.
Do not claim workspace changes happened unless evidence confirms it.
"""

CRITIC_INSTRUCTIONS = """\
You are the Critic in Nexus AI's fixed orchestration flow.
Review the draft for grounding, completeness, safety, and instruction compliance.
Approve only if the answer is supported by evidence or explicitly states limitations.
Return revise when missing evidence or unsupported claims should be fixed.
"""


class StageAgents:
    def __init__(
        self,
        *,
        planner: Any,
        retriever: Any,
        synthesizer: Any,
        critic: Any,
        warnings: list[str],
    ) -> None:
        self.planner = planner
        self.retriever = retriever
        self.synthesizer = synthesizer
        self.critic = critic
        self.warnings = warnings


def build_stage_agents(settings: Settings, deps_type: type[Any]) -> StageAgents:
    warnings: list[str] = []
    shared_capabilities = _shared_capabilities(settings, warnings)
    retriever_capabilities = _retriever_capabilities(settings, warnings)

    planner = _agent(
        settings.planner_model or settings.model,
        deps_type,
        PLANNER_INSTRUCTIONS,
        Plan,
        shared_capabilities,
        settings,
    )
    retriever = _agent(
        settings.retriever_model or settings.model,
        deps_type,
        RETRIEVER_INSTRUCTIONS,
        RetrievalBundle,
        [*retriever_capabilities, *shared_capabilities],
        settings,
    )
    retriever.tool(rag_search)
    synthesizer = _agent(
        settings.synthesizer_model or settings.model,
        deps_type,
        SYNTHESIZER_INSTRUCTIONS,
        DraftAnswer,
        shared_capabilities,
        settings,
    )
    critic = _agent(
        settings.critic_model or settings.model,
        deps_type,
        CRITIC_INSTRUCTIONS,
        Critique,
        shared_capabilities,
        settings,
    )
    return StageAgents(planner=planner, retriever=retriever, synthesizer=synthesizer, critic=critic, warnings=warnings)


def runtime_context(deps: Any) -> str:
    settings = deps.settings
    return "\n".join(
        [
            current_time_instruction(),
            f"Workspace id: {settings.workspace_id}. Session id: {settings.session_id}.",
            memory_instruction(deps.memory, settings.workspace_id, settings.session_id),
        ]
    )


def _agent(
    model: Any,
    deps_type: type[Any],
    instructions: str,
    output_type: type[Any],
    capabilities: list[Any],
    settings: Settings,
) -> Any:
    kwargs: dict[str, Any] = {
        "deps_type": deps_type,
        "instructions": instructions,
        "output_type": output_type,
        "capabilities": capabilities,
    }
    if settings.enable_langfuse:
        kwargs["instrument"] = True
    model = _resolve_model(model)
    try:
        agent = Agent(model, **kwargs)
    except TypeError:
        kwargs.pop("instrument", None)
        agent = Agent(model, **kwargs)
    return agent


def _shared_capabilities(settings: Settings, warnings: list[str]) -> list[Any]:
    capabilities, ecosystem_warnings = create_ecosystem_capabilities(settings)
    warnings.extend(ecosystem_warnings)
    thinking = create_thinking_capability("medium")
    if thinking is not None:
        capabilities.append(thinking)
    return capabilities


def _retriever_capabilities(settings: Settings, warnings: list[str]) -> list[Any]:
    capabilities: list[Any] = []
    for name, factory in [
        ("nexus-mcp", lambda: create_nexus_mcp_capability(settings)),
        ("tool-search", create_tool_search_capability),
        ("mcp-tool-preparation", create_mcp_tool_preparation_capability),
        ("code-mode", create_code_mode_capability),
    ]:
        try:
            capability = factory()
        except Exception as exc:
            warnings.append(f"{name}: {exc}")
            continue
        if capability is not None:
            capabilities.append(capability)
    return capabilities


def _resolve_model(model_name: str) -> Any:
    if model_name != "test":
        return model_name
    from pydantic_ai.models.test import TestModel

    return TestModel()
