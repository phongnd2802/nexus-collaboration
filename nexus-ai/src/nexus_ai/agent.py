from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from nexus_ai.capabilities import build_capabilities
from nexus_ai.capabilities.observability import instrument_pydantic_ai
from nexus_ai.orchestration.runtime import build_orchestrator_shell_agent
from nexus_ai.orchestration.tools import search_rag
from nexus_ai.routing import ComplexityRouter
from nexus_ai.runtime_tools import attach_runtime_tools
from nexus_ai.settings import Settings, load_settings
from nexus_ai.storage import MemoryRepository, SQLiteStore


WORKSPACE_INSTRUCTIONS = """\
You are Nexus AI, an agent for a Nexus Collaboration workspace.

Use Nexus MCP tools for workspace data and actions. Use search_rag when the
answer may depend on indexed workspace files. Cite MCP and RAG sources with
clear titles and links when available. When an action succeeds, include the
returned or derived workspace link so the user can open the changed item. Do not
claim that a workspace change happened unless a tool result confirms it. Prefer
read-only exploration before taking action. Never expose secrets.
"""

SINGLE_AGENT_DEPRECATION_WARNING = (
    "NEXUS_AI_ORCHESTRATION_MODE=single is deprecated and will be removed. Use multi."
)


@dataclass
class AgentDeps:
    settings: Settings
    memory: MemoryRepository
    execution_state: "ExecutionState"


@dataclass
class ExecutionState:
    rag_search_count: int = 0
    retriever_bundles_loaded: list[str] = field(default_factory=list)


@dataclass
class NexusAgentRuntime:
    agent: Any
    deps: AgentDeps
    capability_warnings: list[str]
    orchestrator: Any | None = None
    router: ComplexityRouter | None = None
    routing_mode: str = "single"
    direct_workspace_agent: Any | None = None


def build_runtime(settings: Settings | None = None) -> NexusAgentRuntime:
    settings = settings or load_settings()
    settings.validate_for_runtime()

    store = SQLiteStore(settings.sqlite_path)
    store.initialize()

    memory = MemoryRepository(store)
    deps = AgentDeps(settings=settings, memory=memory, execution_state=ExecutionState())

    instrument_pydantic_ai(settings)

    if settings.orchestration_mode == "multi":
        agent, orchestrator, warnings = build_orchestrator_shell_agent(settings, AgentDeps)
        return NexusAgentRuntime(
            agent=agent,
            deps=deps,
            capability_warnings=warnings,
            orchestrator=orchestrator,
            routing_mode="multi",
        )

    direct_workspace_agent, direct_workspace_warnings = _build_direct_workspace_agent(settings)

    if settings.orchestration_mode == "hybrid":
        _, orchestrator, orchestrator_warnings = build_orchestrator_shell_agent(settings, AgentDeps)
        return NexusAgentRuntime(
            agent=direct_workspace_agent,
            deps=deps,
            capability_warnings=[
                *direct_workspace_warnings,
                *orchestrator_warnings,
            ],
            orchestrator=orchestrator,
            router=ComplexityRouter(settings),
            routing_mode="hybrid",
            direct_workspace_agent=direct_workspace_agent,
        )

    return NexusAgentRuntime(
        agent=direct_workspace_agent,
        deps=deps,
        capability_warnings=[SINGLE_AGENT_DEPRECATION_WARNING, *direct_workspace_warnings],
        routing_mode="single",
        direct_workspace_agent=direct_workspace_agent,
    )


def _build_direct_workspace_agent(settings: Settings) -> tuple[Any, list[str]]:
    capability_registry = build_capabilities(settings)
    agent = _build_direct_agent(settings, capability_registry.capabilities, WORKSPACE_INSTRUCTIONS)
    agent.tool(search_rag)
    attach_runtime_tools(agent)
    return agent, capability_registry.warnings


def _build_direct_agent(settings: Settings, capabilities: list[Any], instructions: str) -> Any:
    try:
        from pydantic_ai import Agent
    except ImportError as exc:
        raise RuntimeError("Pydantic AI is required. Install this package with uv sync.") from exc

    agent_kwargs: dict[str, Any] = {
        "deps_type": AgentDeps,
        "instructions": instructions,
        "capabilities": capabilities,
    }
    if settings.enable_langfuse:
        agent_kwargs["instrument"] = True

    model = _resolve_model(settings.model)

    try:
        agent = Agent(model, **agent_kwargs)
    except TypeError:
        agent_kwargs.pop("instrument", None)
        agent = Agent(model, **agent_kwargs)
    return agent


def _resolve_model(model_name: str) -> Any:
    if model_name != "test":
        return model_name
    try:
        from pydantic_ai.models.test import TestModel
    except ImportError as exc:
        raise RuntimeError("Pydantic AI TestModel is unavailable.") from exc
    return TestModel()
