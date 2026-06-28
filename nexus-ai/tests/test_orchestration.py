import asyncio
from dataclasses import dataclass

from nexus_ai.orchestration.agents import StageAgents
from nexus_ai.orchestration.graph import OrchestratorDeps, OrchestratorState, build_orchestrator_graph
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, EvidenceItem, Plan, PlanStep, RetrievalBundle
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


def test_orchestrator_graph_approves_first_draft(tmp_path):
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


def test_orchestrator_graph_revises_once_then_returns(tmp_path):
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
    assert settings.orchestrator_max_revisions == 1


async def _run(settings, planner, retriever, synthesizer, critic):
    graph = build_orchestrator_graph()
    deps = OrchestratorDeps(
        runtime_deps=FakeDeps(settings=settings, memory=FakeMemory()),
        stage_agents=StageAgents(
            planner=planner,
            retriever=retriever,
            synthesizer=synthesizer,
            critic=critic,
            warnings=[],
        ),
    )
    return await graph.run(state=OrchestratorState(), deps=deps, inputs="What changed?")


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
