from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from nexus_ai_service.agent.deps import WorkspaceAgentDeps
from nexus_ai_service.streaming.events import StreamEvent


@dataclass
class CapabilityContext:
    deps: WorkspaceAgentDeps
    settings: Any
    user_text: str
    history: list[dict[str, str]]
    services: dict[str, Any]
    rag_sources: list[dict[str, Any]] = field(default_factory=list)
    memory_records: list[Any] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CapabilityContribution:
    instructions: list[str] = field(default_factory=list)
    tools: list[Any] = field(default_factory=list)
    toolsets: list[Any] = field(default_factory=list)
    pydantic_capabilities: list[Any] = field(default_factory=list)
    events: list[StreamEvent] = field(default_factory=list)

    def extend(self, other: "CapabilityContribution") -> None:
        self.instructions.extend(other.instructions)
        self.tools.extend(other.tools)
        self.toolsets.extend(other.toolsets)
        self.pydantic_capabilities.extend(other.pydantic_capabilities)
        self.events.extend(other.events)


class AgentCapability(Protocol):
    name: str

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution: ...

    async def after_run(self, context: CapabilityContext, assistant_text: str) -> None: ...


class NoopAfterRun:
    async def after_run(self, context: CapabilityContext, assistant_text: str) -> None:
        return None
