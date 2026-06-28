import asyncio
from dataclasses import dataclass
from types import SimpleNamespace

from nexus_ai.orchestration.agents import StageAgents
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, EvidenceItem, Plan, PlanStep, RetrievalBundle
from nexus_ai.orchestration.tools import rag_search
from nexus_ai.orchestration.workflow import WorkflowOrchestrator
from nexus_ai.settings import load_settings


@dataclass
class Result:
    output: object


class FakeAgent:
    def __init__(self, outputs):
        self.outputs = list(outputs)
        self.calls = 0

    async def run(self, _prompt, deps):
        self.calls += 1
        return Result(self.outputs.pop(0))


class FakeMemory:
    def recent(self, workspace_id, session_id=None, limit=8):
        return []


@dataclass
class FakeDeps:
    settings: object
    memory: FakeMemory


def test_orchestrator_workflow_approves_first_draft(tmp_path):
    settings = _settings(tmp_path)
    planner = FakeAgent([_plan()])
    retriever = FakeAgent([_retrieval()])
    synthesizer = FakeAgent([DraftAnswer(content="Final answer", citations=["source"])])
    critic = FakeAgent([Critique(decision="approve", feedback="Grounded")])

    result = asyncio.run(_run(settings, planner, retriever, synthesizer, critic))

    assert result.approved is True
    assert result.content == "Final answer"
    assert result.revision_count == 0
    assert synthesizer.calls == 1
    assert critic.calls == 1


def test_orchestrator_workflow_revises_once_then_returns(tmp_path):
    settings = _settings(tmp_path)
    planner = FakeAgent([_plan()])
    retriever = FakeAgent([_retrieval()])
    synthesizer = FakeAgent(
        [
            DraftAnswer(content="Unsupported answer"),
            DraftAnswer(content="Revised answer", limitations=["Some evidence is limited"]),
        ]
    )
    critic = FakeAgent(
        [
            Critique(decision="revise", feedback="Add limitations", missing_evidence=["metric"]),
            Critique(decision="revise", feedback="Still missing one metric", missing_evidence=["metric"]),
        ]
    )

    result = asyncio.run(_run(settings, planner, retriever, synthesizer, critic))

    assert result.approved is False
    assert result.content == "Revised answer"
    assert result.revision_count == 1
    assert synthesizer.calls == 2
    assert critic.calls == 2
    assert "Still missing one metric" in result.limitations


def test_orchestrator_workflow_skips_retrieval_when_plan_does_not_need_workspace_data(tmp_path):
    settings = _settings(tmp_path)
    planner = FakeAgent(
        [
            Plan(
                needs=[
                    PlanStep(
                        id="need_1",
                        description="Explain the general concept",
                        priority=1,
                        kind="reasoning",
                    )
                ],
                notes="No workspace data needed.",
                requires_workspace_data=False,
            )
        ]
    )
    retriever = FakeAgent([_retrieval()])
    synthesizer = FakeAgent([DraftAnswer(content="General answer")])
    critic = FakeAgent([Critique(decision="approve", feedback="Grounded")])

    result = asyncio.run(_run(settings, planner, retriever, synthesizer, critic))

    assert result.approved is True
    assert retriever.calls == 0
    assert result.retrieval.evidence[0].source_type == "reasoning"
    assert {"stage": "retriever", "evidence": 1, "skipped": True} in result.trace


def test_orchestrator_workflow_emits_stage_events_in_order(tmp_path):
    settings = _settings(tmp_path)
    planner = FakeAgent([_plan()])
    retriever = FakeAgent([_retrieval()])
    synthesizer = FakeAgent([DraftAnswer(content="Final answer", citations=["source"])])
    critic = FakeAgent([Critique(decision="approve", feedback="Grounded")])
    events = []

    async def event_sink(event):
        events.append(event)

    asyncio.run(_run(settings, planner, retriever, synthesizer, critic, event_sink=event_sink))

    assert [(event["data"]["stage"], event["data"]["status"]) for event in events] == [
        ("planner", "running"),
        ("planner", "completed"),
        ("retriever", "running"),
        ("retriever", "completed"),
        ("synthesizer", "running"),
        ("synthesizer", "completed"),
        ("critic", "running"),
        ("critic", "completed"),
        ("answer", "completed"),
    ]


def test_settings_load_orchestration_env(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ORCHESTRATION_MODE": "multi",
            "NEXUS_AI_PLANNER_MODEL": "openrouter:planner",
            "NEXUS_AI_ORCHESTRATOR_MAX_REVISIONS": "5",
        }
    )

    assert settings.orchestration_mode == "multi"
    assert settings.planner_model == "openrouter:planner"
    assert settings.orchestrator_max_revisions == 5


def test_rag_search_requires_user_id(tmp_path, monkeypatch):
    settings = _settings(tmp_path)

    def fail_indexer(_settings):
        raise AssertionError("RagIndexer should not be created without a user id")

    monkeypatch.setattr("nexus_ai.orchestration.tools.RagIndexer", fail_indexer)

    result = asyncio.run(rag_search(SimpleNamespace(deps=FakeDeps(settings=settings, memory=FakeMemory())), "policy"))

    assert result == []


def test_rag_search_uses_authorized_file_ids(tmp_path, monkeypatch):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_USER_ID": "user-1",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ORCHESTRATION_MODE": "multi",
        }
    )
    calls = {}

    class FakeBackend:
        async def get_authorized_file_ids(self, workspace_id, user_id):
            calls["authorized"] = (workspace_id, user_id)
            return ["file-1"]

    class FakeIndexer:
        def __init__(self, settings):
            self.settings = settings
            self.backend = FakeBackend()

        async def search(self, workspace_id, query, limit, min_score, file_ids=None):
            calls["search"] = {
                "workspace_id": workspace_id,
                "query": query,
                "limit": limit,
                "min_score": min_score,
                "file_ids": file_ids,
            }
            return [{"file_id": "file-1"}]

    monkeypatch.setattr("nexus_ai.orchestration.tools.RagIndexer", FakeIndexer)

    result = asyncio.run(rag_search(SimpleNamespace(deps=FakeDeps(settings=settings, memory=FakeMemory())), "policy"))

    assert calls["authorized"] == ("workspace", "user-1")
    assert calls["search"]["file_ids"] == ["file-1"]
    assert result == [{"file_id": "file-1"}]


async def _run(settings, planner, retriever, synthesizer, critic, event_sink=None):
    workflow = WorkflowOrchestrator(
        StageAgents(
            planner=planner,
            retriever=retriever,
            synthesizer=synthesizer,
            critic=critic,
            warnings=[],
        )
    )
    return await workflow.run("What changed?", FakeDeps(settings=settings, memory=FakeMemory()), event_sink=event_sink)


def _settings(tmp_path):
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ORCHESTRATION_MODE": "multi",
        }
    )


def _plan():
    return Plan(
        needs=[
            PlanStep(
                id="need_1",
                description="Find workspace evidence",
                priority=1,
                kind="rag",
                query="workspace evidence",
                expected_evidence="A source snippet",
            )
        ],
        notes="Use the evidence.",
    )


def _retrieval():
    return RetrievalBundle(
        evidence=[
            EvidenceItem(
                plan_step_id="need_1",
                source_type="rag",
                title="Source",
                content="Source snippet",
                confidence=0.9,
                citation="file-1",
            )
        ]
    )
