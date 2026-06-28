from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from nexus_ai.orchestration.agents import StageAgents, runtime_context
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, EvidenceItem, OrchestratorResult, Plan, RetrievalBundle


@dataclass
class OrchestratorState:
    user_prompt: str = ""
    plan: Plan | None = None
    retrieval: RetrievalBundle | None = None
    draft: DraftAnswer | None = None
    critique: Critique | None = None
    revision_count: int = 0
    trace: list[dict[str, object]] = field(default_factory=list)


@dataclass
class WorkflowDeps:
    runtime_deps: Any
    stage_agents: StageAgents
    event_sink: Callable[[dict[str, Any]], Awaitable[None]] | None = None


class WorkflowOrchestrator:
    def __init__(self, stage_agents: StageAgents) -> None:
        self.stage_agents = stage_agents

    async def run(
        self,
        user_prompt: str,
        runtime_deps: Any,
        event_sink: Callable[[dict[str, Any]], Awaitable[None]] | None = None,
    ) -> OrchestratorResult:
        deps = WorkflowDeps(runtime_deps=runtime_deps, stage_agents=self.stage_agents, event_sink=event_sink)
        state = OrchestratorState(user_prompt=user_prompt)
        await self._run_planner(state, deps)
        await self._run_retriever(state, deps)
        await self._run_synthesizer(state, deps)
        await self._run_critic(state, deps)
        return await self._finalize(state, deps)

    async def _run_planner(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        await _emit_stage(deps, "planner", "running", "Planning the request")
        prompt = "\n\n".join(
            [
                runtime_context(deps.runtime_deps),
                "User request:",
                state.user_prompt,
            ]
        )
        result = await deps.stage_agents.planner.run(prompt, deps=deps.runtime_deps)
        plan = _normalize_plan(result.output)
        state.plan = plan
        state.trace.append({"stage": "planner", "needs": len(plan.needs)})
        await _emit_stage(
            deps,
            "planner",
            "completed",
            "Plan created",
            {"needs": len(plan.needs), "requiresWorkspaceData": plan.requires_workspace_data},
        )

    async def _run_retriever(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        assert state.plan is not None
        await _emit_stage(deps, "retriever", "running", "Retrieving workspace evidence")
        if not state.plan.requires_workspace_data:
            state.retrieval = RetrievalBundle(
                evidence=[
                    EvidenceItem(
                        plan_step_id=step.id,
                        source_type="reasoning",
                        title="No workspace retrieval required",
                        content=step.description,
                        confidence=0.7,
                    )
                    for step in state.plan.sorted_needs()
                    if step.kind == "reasoning"
                ],
                notes="Planner indicated workspace retrieval is not required.",
            )
            state.trace.append({"stage": "retriever", "evidence": len(state.retrieval.evidence), "skipped": True})
            await _emit_stage(
                deps,
                "retriever",
                "skipped",
                "Workspace retrieval skipped",
                {"evidence": len(state.retrieval.evidence), "gaps": 0},
            )
            return

        prompt = "\n\n".join(
            [
                runtime_context(deps.runtime_deps),
                "User request:",
                state.user_prompt,
                "Plan:",
                state.plan.model_dump_json(),
                f"Maximum RAG searches: {deps.runtime_deps.settings.rag_max_plan_searches}",
            ]
        )
        result = await deps.stage_agents.retriever.run(prompt, deps=deps.runtime_deps)
        state.retrieval = result.output
        state.trace.append(
            {"stage": "retriever", "evidence": len(state.retrieval.evidence), "gaps": len(state.retrieval.gaps)}
        )
        await _emit_stage(
            deps,
            "retriever",
            "completed",
            "Evidence retrieved",
            {"evidence": len(state.retrieval.evidence), "gaps": len(state.retrieval.gaps)},
        )

    async def _run_synthesizer(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        await _emit_stage(deps, "synthesizer", "running", "Drafting the answer")
        state.draft = await _run_synthesizer(deps, state, revision_feedback=None)
        state.trace.append({"stage": "synthesizer", "revision": False})
        await _emit_stage(
            deps,
            "synthesizer",
            "completed",
            "Draft completed",
            {"citations": len(state.draft.citations), "limitations": len(state.draft.limitations)},
        )

    async def _run_critic(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        await _emit_stage(deps, "critic", "running", "Checking answer quality")
        state.critique = await _run_critic(deps, state)
        state.trace.append({"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count})
        await _emit_stage(
            deps,
            "critic",
            "completed",
            "Quality check completed",
            {
                "decision": state.critique.decision,
                "missingEvidence": len(state.critique.missing_evidence),
                "unsafeClaims": len(state.critique.unsafe_claims),
            },
        )

    async def _finalize(self, state: OrchestratorState, deps: WorkflowDeps) -> OrchestratorResult:
        assert state.plan is not None
        assert state.retrieval is not None
        assert state.draft is not None
        assert state.critique is not None

        if state.critique.decision == "revise" and state.revision_count < deps.runtime_deps.settings.orchestrator_max_revisions:
            state.revision_count += 1
            await _emit_stage(
                deps,
                "revision",
                "running",
                "Revising the draft",
                {"revisionCount": state.revision_count, "feedback": state.critique.feedback},
            )
            state.draft = await _run_synthesizer(deps, state, revision_feedback=state.critique.feedback)
            state.trace.append({"stage": "synthesizer", "revision": True})
            state.critique = await _run_critic(deps, state)
            state.trace.append({"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count})
            await _emit_stage(
                deps,
                "revision",
                "completed",
                "Revision completed",
                {"revisionCount": state.revision_count, "decision": state.critique.decision},
            )

        limitations = list(state.draft.limitations)
        if state.critique.decision != "approve":
            limitations.append(state.critique.feedback)
            limitations.extend(state.critique.missing_evidence)
        result = OrchestratorResult(
            content=state.draft.content,
            approved=state.critique.decision == "approve",
            plan=state.plan,
            retrieval=state.retrieval,
            critique=state.critique,
            revision_count=state.revision_count,
            limitations=limitations,
            trace=state.trace,
        )
        await _emit_stage(
            deps,
            "answer",
            "completed",
            "Answer ready",
            {"approved": result.approved, "revisionCount": result.revision_count, "limitations": len(result.limitations)},
        )
        return result


async def _emit_stage(
    deps: WorkflowDeps,
    stage: str,
    status: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    if deps.event_sink is None:
        return
    await deps.event_sink(
        {
            "type": "data-orchestration_stage",
            "data": {
                "stage": stage,
                "status": status,
                "summary": summary,
                "metadata": metadata or {},
            },
        }
    )


async def _run_synthesizer(
    deps: WorkflowDeps,
    state: OrchestratorState,
    *,
    revision_feedback: str | None,
) -> DraftAnswer:
    assert state.plan is not None
    assert state.retrieval is not None
    parts = [
        runtime_context(deps.runtime_deps),
        "User request:",
        state.user_prompt,
        "Plan:",
        state.plan.model_dump_json(),
        "Evidence bundle:",
        state.retrieval.model_dump_json(),
    ]
    if revision_feedback is not None and state.draft is not None:
        parts.extend(["Previous draft:", state.draft.model_dump_json(), "Critic feedback:", revision_feedback])
    result = await deps.stage_agents.synthesizer.run("\n\n".join(parts), deps=deps.runtime_deps)
    return result.output


async def _run_critic(deps: WorkflowDeps, state: OrchestratorState) -> Critique:
    assert state.plan is not None
    assert state.retrieval is not None
    assert state.draft is not None
    prompt = "\n\n".join(
        [
            runtime_context(deps.runtime_deps),
            "User request:",
            state.user_prompt,
            "Plan:",
            state.plan.model_dump_json(),
            "Evidence bundle:",
            state.retrieval.model_dump_json(),
            "Draft:",
            state.draft.model_dump_json(),
        ]
    )
    result = await deps.stage_agents.critic.run(prompt, deps=deps.runtime_deps)
    return result.output


def _normalize_plan(plan: Plan) -> Plan:
    return plan.model_copy(update={"needs": plan.sorted_needs()})
