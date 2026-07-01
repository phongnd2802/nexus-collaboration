from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic_ai import RunContext

from nexus_ai.capabilities import build_capabilities
from nexus_ai.capabilities.context import current_time_instruction, memory_instruction
from nexus_ai.capabilities.observability import instrument_pydantic_ai
from nexus_ai.capabilities.shields import validate_user_input
from nexus_ai.settings import Settings, load_settings
from nexus_ai.storage import MemoryRepository, SQLiteStore


BASE_INSTRUCTIONS = """\
You are Nexus AI, an agent for a Nexus Collaboration workspace.

Use Nexus MCP tools for workspace data and actions. Do not claim that a workspace
change happened unless a tool result confirms it. Prefer read-only exploration
before taking action. Never expose secrets.
"""


@dataclass
class AgentDeps:
    settings: Settings
    memory: MemoryRepository


@dataclass
class NexusAgentRuntime:
    agent: Any
    deps: AgentDeps
    capability_warnings: list[str]


def build_runtime(settings: Settings | None = None) -> NexusAgentRuntime:
    settings = settings or load_settings()
    settings.validate_for_runtime()

    store = SQLiteStore(settings.sqlite_path)
    store.initialize()

    memory = MemoryRepository(store)
    deps = AgentDeps(settings=settings, memory=memory)

    instrument_pydantic_ai(settings)

    try:
        from pydantic_ai import Agent
    except ImportError as exc:
        raise RuntimeError("Pydantic AI is required. Install this package with uv sync.") from exc

    capability_registry = build_capabilities(settings)
    agent_kwargs: dict[str, Any] = {
        "deps_type": AgentDeps,
        "instructions": BASE_INSTRUCTIONS,
        "capabilities": capability_registry.capabilities,
    }
    if settings.enable_langfuse:
        agent_kwargs["instrument"] = True

    model = _resolve_model(settings.model)

    try:
        agent = Agent(model, **agent_kwargs)
    except TypeError:
        agent_kwargs.pop("instrument", None)
        agent = Agent(model, **agent_kwargs)

    @agent.instructions
    def add_runtime_context(ctx: RunContext[AgentDeps]) -> str:
        settings = ctx.deps.settings
        return "\n".join(
            [
                current_time_instruction(),
                f"Workspace id: {settings.workspace_id}. Session id: {settings.session_id}.",
                memory_instruction(ctx.deps.memory, settings.workspace_id, settings.session_id),
            ]
        )

    @agent.tool
    def remember(
        ctx: RunContext[AgentDeps],
        content: str,
        memory_type: str = "episodic",
        importance: int = 5,
    ) -> dict[str, int]:
        """Store a workspace/session scoped memory for future agent runs."""
        memory_id = ctx.deps.memory.add(
            workspace_id=ctx.deps.settings.workspace_id,
            session_id=ctx.deps.settings.session_id,
            user_id=None,
            memory_type=memory_type,
            content=content,
            importance=importance,
        )
        return {"memory_id": memory_id}

    @agent.tool
    def list_memories(ctx: RunContext[AgentDeps], limit: int = 10) -> list[dict[str, object]]:
        """List recent workspace/session memories."""
        return [
            {
                "id": item.id,
                "type": item.memory_type,
                "content": item.content,
                "importance": item.importance,
                "tags": item.tags,
            }
            for item in ctx.deps.memory.recent(ctx.deps.settings.workspace_id, ctx.deps.settings.session_id, limit)
        ]

    @agent.tool
    def validate_prompt(_ctx: RunContext[AgentDeps], prompt: str) -> dict[str, str]:
        """Validate user input against local Nexus AI shield rules."""
        validate_user_input(prompt)
        return {"status": "accepted"}

    return NexusAgentRuntime(agent=agent, deps=deps, capability_warnings=capability_registry.warnings)


def _resolve_model(model_name: str) -> Any:
    if model_name != "test":
        return model_name
    try:
        from pydantic_ai.models.test import TestModel
    except ImportError as exc:
        raise RuntimeError("Pydantic AI TestModel is unavailable.") from exc
    return TestModel()
