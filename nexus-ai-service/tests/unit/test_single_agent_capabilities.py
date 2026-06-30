import pytest

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution
from nexus_ai_service.agent.capabilities.memory import MemoryCapability
from nexus_ai_service.agent.deps import WorkspaceAgentDeps
from nexus_ai_service.agent.workspace_agent import WorkspaceAgent
from nexus_ai_service.memory.schemas import MemoryRecord
from nexus_ai_service.rag.schemas import RagSearchResult


class FakeRetrievalService:
    async def search(self, request):
        return [
            RagSearchResult(
                id="chunk-1",
                source_id="file-1",
                source_type="file",
                workspace_id=request.workspace_id,
                title="Plan",
                snippet="Launch plan",
                content="Launch plan details",
                citation="Plan p.1",
                score=1.0,
                retrieval_mode="hybrid",
            )
        ]


class FakeMemoryService:
    def __init__(self) -> None:
        self.added = []

    async def search(self, workspace_id: str, query: str, user_id: str | None = None, limit: int = 5):
        return [
            MemoryRecord(
                id="mem-1",
                workspace_id=workspace_id,
                user_id=user_id,
                scope="user",
                text="User prefers concise answers",
            )
        ]

    async def add(self, request):
        self.added.append(request)
        return None


class RecordingCapability:
    name = "recording"

    def __init__(self) -> None:
        self.after_run_text = None

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        return CapabilityContribution(instructions=["recording capability loaded"])

    async def after_run(self, context: CapabilityContext, assistant_text: str) -> None:
        self.after_run_text = assistant_text


@pytest.mark.anyio
async def test_workspace_agent_uses_single_capability_pipeline() -> None:
    recording = RecordingCapability()
    memory = FakeMemoryService()
    agent = WorkspaceAgent(
        model="openai/gpt-4o-mini",
        settings=object(),
        services={"retrieval_service": FakeRetrievalService(), "memory_service": memory},
        capabilities=[MemoryCapability(), recording],
    )
    deps = WorkspaceAgentDeps(
        workspace_id="ws-1",
        user_id="user-1",
        request_id="req-1",
        authorization=None,
        session_id="session-1",
    )

    events = [event async for event in agent.stream(deps, "remember I prefer concise answers", [])]

    assert events[0].event_type == "session.created"
    assert any(event.event_type == "message.delta" for event in events)
    assert events[-1].event_type == "message.completed"
    assert recording.after_run_text is not None
    assert len(memory.added) == 1
    assert memory.added[0].metadata["source"] == "single_agent_runtime"


@pytest.mark.anyio
async def test_workspace_agent_rag_capability_emits_retrieval_event() -> None:
    agent = WorkspaceAgent(
        model="openai/gpt-4o-mini",
        settings=object(),
        services={"retrieval_service": FakeRetrievalService()},
    )
    deps = WorkspaceAgentDeps(
        workspace_id="ws-1",
        user_id="user-1",
        request_id="req-1",
        authorization=None,
        session_id="session-1",
    )

    events = [event async for event in agent.stream(deps, "what is in the launch plan?", [])]

    retrieval = next(event for event in events if event.event_type == "retrieval.completed")
    assert retrieval.payload["sources"][0]["citation"] == "Plan p.1"
    completed = next(event for event in events if event.event_type == "message.completed")
    assert "Plan p.1" in completed.payload["content"]
