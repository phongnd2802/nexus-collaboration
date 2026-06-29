from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from pydantic_ai import Agent

from nexus_ai.capabilities.code_mode import create_code_mode_capability
from nexus_ai.capabilities.ecosystem import create_ecosystem_capabilities
from nexus_ai.capabilities.mcp import create_nexus_mcp_capability
from nexus_ai.capabilities.reasoning import create_thinking_capability
from nexus_ai.capabilities.tool_preparation import create_mcp_tool_preparation_capability
from nexus_ai.capabilities.tool_search import create_tool_search_capability
from nexus_ai.orchestration.domain_skills import available_domain_skill_ids_by_role, build_domain_skill_capabilities
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, Plan, RetrievalBundle
from nexus_ai.orchestration.tools import rag_search
from nexus_ai.runtime_tools import attach_runtime_tools, runtime_context_text
from nexus_ai.settings import Settings


PLANNER_INSTRUCTIONS = """\
You are the Planner in Nexus AI's fixed orchestration flow.
Create a concise structured plan for answering the user's request.
Use Plan.needs as the list of evidence or reasoning needs. Use stable ids like need_1.
Lower priority numbers are more important. Sort needs by priority.
Set domain, executor, budget, fallback_mode, and required_capability_ids for each plan step.
Available planner/routing skill ids: {planner_capability_ids}.
Do not use tools.
"""

RETRIEVER_INSTRUCTIONS = """\
You are the Retriever in Nexus AI's fixed orchestration flow.
Gather evidence for each PlanStep using Nexus RAG and Nexus MCP tools.
Map every evidence item to plan_step_id. Report gaps instead of inventing facts.
Prefer rag_search for PlanStep(kind="rag"). Do not synthesize the final answer.
Use no more than the configured maximum number of RAG searches; combine related needs when possible.
Load any required capability ids listed on plan steps before answering if they match retriever skills.
"""

SYNTHESIZER_INSTRUCTIONS = """\
You are the Synthesizer in Nexus AI's fixed orchestration flow.
Write the final draft using only the provided plan, evidence, and revision feedback.
Do not claim workspace changes happened unless evidence confirms it.
Load presentation-oriented skills only when the requested output format clearly benefits from them.
"""

CRITIC_INSTRUCTIONS = """\
You are the Critic in Nexus AI's fixed orchestration flow.
Review the draft for grounding, completeness, safety, and instruction compliance.
Approve only if the answer is supported by evidence or explicitly states limitations.
Return retrieve_more when targeted retrieval is needed. Return revise_minor when the draft can be fixed from current evidence.
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
        retriever_builder: Any | None = None,
    ) -> None:
        self.planner = planner
        self.retriever = retriever
        self.synthesizer = synthesizer
        self.critic = critic
        self.warnings = warnings
        self.retriever_builder = retriever_builder


def build_stage_agents(settings: Settings, deps_type: type[Any]) -> StageAgents:
    warnings: list[str] = []
    shared_capabilities = _shared_capabilities(settings, warnings)
    planner_domain_capabilities = build_domain_skill_capabilities("planner")
    retriever_domain_capabilities = build_domain_skill_capabilities("retriever")
    critic_domain_capabilities = build_domain_skill_capabilities("critic")
    synthesizer_domain_capabilities = build_domain_skill_capabilities("synthesizer")
    skill_catalog = available_domain_skill_ids_by_role()

    planner = _agent(
        settings.planner_model or settings.model,
        deps_type,
        PLANNER_INSTRUCTIONS.format(planner_capability_ids=", ".join(skill_catalog.get("planner", [])) or "none"),
        Plan,
        [*planner_domain_capabilities, *shared_capabilities],
        settings,
    )
    retriever = _agent(
        settings.retriever_model or settings.model,
        deps_type,
        RETRIEVER_INSTRUCTIONS,
        RetrievalBundle,
        [*retriever_domain_capabilities, *shared_capabilities],
        settings,
    )
    retriever.tool(rag_search)
    synthesizer = _agent(
        settings.synthesizer_model or settings.model,
        deps_type,
        SYNTHESIZER_INSTRUCTIONS,
        DraftAnswer,
        [*synthesizer_domain_capabilities, *shared_capabilities],
        settings,
    )
    critic = _agent(
        settings.critic_model or settings.model,
        deps_type,
        CRITIC_INSTRUCTIONS,
        Critique,
        [*critic_domain_capabilities, *shared_capabilities],
        settings,
    )
    return StageAgents(
        planner=planner,
        retriever=retriever,
        synthesizer=synthesizer,
        critic=critic,
        warnings=warnings,
        retriever_builder=lambda required_capability_ids: _build_retriever_for_plan(
            settings,
            deps_type,
            warnings,
            required_capability_ids,
        ),
    )


def runtime_context(deps: Any) -> str:
    return runtime_context_text(deps)


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
    attach_runtime_tools(agent)
    return agent


def _shared_capabilities(settings: Settings, warnings: list[str]) -> list[Any]:
    capabilities, ecosystem_warnings = create_ecosystem_capabilities(settings)
    warnings.extend(ecosystem_warnings)
    thinking = create_thinking_capability("medium")
    if thinking is not None:
        capabilities.append(thinking)
    return capabilities


def retriever_capabilities_for_plan(
    settings: Settings,
    warnings: list[str],
    required_capability_ids: Sequence[str],
) -> tuple[list[Any], list[str]]:
    bundles: list[str] = ["rag_read_bundle"]
    capabilities: list[Any] = []
    retriever_domain_capabilities = build_domain_skill_capabilities("retriever")
    requested = set(required_capability_ids)

    if requested:
        capabilities.extend(
            capability for capability in retriever_domain_capabilities if getattr(capability, "id", None) in requested
        )
    else:
        capabilities.extend(retriever_domain_capabilities)

    if _needs_workspace_bundle(requested):
        bundles.append("workspace_read_bundle")
        for name, factory in [
            ("nexus-mcp", lambda: create_nexus_mcp_capability(settings)),
            ("tool-search", create_tool_search_capability),
            ("mcp-tool-preparation", create_mcp_tool_preparation_capability),
        ]:
            try:
                capability = factory()
            except Exception as exc:
                warnings.append(f"{name}: {exc}")
                continue
            if capability is not None:
                capabilities.append(capability)

    if _needs_code_bundle(requested):
        bundles.append("code_analysis_bundle")
        try:
            capability = create_code_mode_capability()
        except Exception as exc:
            warnings.append(f"code-mode: {exc}")
        else:
            if capability is not None:
                capabilities.append(capability)

    capabilities.extend(_shared_capabilities(settings, warnings))
    return capabilities, bundles


def _needs_workspace_bundle(required_capability_ids: set[str]) -> bool:
    workspace_ids = {
        "workspace-doc-rag",
        "project-risk-analysis",
        "task-overdue-investigation",
        "resource-allocation-analysis",
        "marketing-campaign-analysis",
    }
    return not required_capability_ids or bool(required_capability_ids & workspace_ids)


def _needs_code_bundle(required_capability_ids: set[str]) -> bool:
    return "code-analysis" in required_capability_ids


def _build_retriever_for_plan(
    settings: Settings,
    deps_type: type[Any],
    warnings: list[str],
    required_capability_ids: Sequence[str],
) -> tuple[Any, list[str]]:
    retriever_warnings: list[str] = []
    capabilities, bundles = retriever_capabilities_for_plan(settings, retriever_warnings, required_capability_ids)
    warnings.extend(retriever_warnings)
    retriever = _agent(
        settings.retriever_model or settings.model,
        deps_type,
        RETRIEVER_INSTRUCTIONS,
        RetrievalBundle,
        capabilities,
        settings,
    )
    retriever.tool(rag_search)
    return retriever, bundles


def _resolve_model(model_name: str) -> Any:
    if model_name != "test":
        return model_name
    from pydantic_ai.models.test import TestModel

    return TestModel()
