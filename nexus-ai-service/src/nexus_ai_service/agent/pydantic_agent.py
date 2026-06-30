from dataclasses import dataclass
from typing import Any

from nexus_ai_service.agent.deps import WorkspaceAgentDeps


@dataclass(frozen=True)
class PydanticAgentBuildResult:
    agent: Any | None
    enabled: bool
    reason: str | None = None


def normalize_pydantic_model(model: str) -> str:
    if ":" in model:
        return model
    if "/" in model:
        provider, name = model.split("/", 1)
        return f"{provider}:{name}"
    return model


def build_pydantic_workspace_agent(
    model: str,
    instructions: list[str],
    capabilities: list[Any] | None = None,
    tools: list[Any] | None = None,
    toolsets: list[Any] | None = None,
) -> PydanticAgentBuildResult:
    try:
        from pydantic_ai import Agent
    except Exception as exc:
        return PydanticAgentBuildResult(agent=None, enabled=False, reason=str(exc))

    pydantic_capabilities = list(capabilities or [])
    try:
        from pydantic_ai.capabilities import Thinking, ToolSearch

        pydantic_capabilities.insert(0, ToolSearch(strategy="bm25"))
        pydantic_capabilities.insert(1, Thinking())
    except Exception:
        pass

    try:
        try:
            agent = Agent(
                normalize_pydantic_model(model),
                deps_type=WorkspaceAgentDeps,
                instructions="\n\n".join(instructions),
                capabilities=pydantic_capabilities,
                tools=list(tools or []),
                toolsets=list(toolsets or []),
            )
        except TypeError:
            agent = Agent(
                normalize_pydantic_model(model),
                deps_type=WorkspaceAgentDeps,
                instructions="\n\n".join(instructions),
                capabilities=pydantic_capabilities,
                tools=list(tools or []),
            )
    except Exception as exc:
        return PydanticAgentBuildResult(agent=None, enabled=False, reason=str(exc))

    return PydanticAgentBuildResult(agent=agent, enabled=True)
