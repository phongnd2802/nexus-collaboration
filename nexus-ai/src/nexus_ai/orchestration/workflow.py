from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable

from nexus_ai.orchestration.agents import StageAgents, runtime_context
from nexus_ai.orchestration.domain_skills import capability_ids_for_role, default_capability_ids_for_step
from nexus_ai.orchestration.schemas import Critique, DraftAnswer, EvidenceItem, OrchestratorResult, Plan, RetrievalBundle


@dataclass
class OrchestratorState:
    user_prompt: str = ""
    plan: Plan | None = None
    retrieval: RetrievalBundle | None = None
    draft: DraftAnswer | None = None
    critique: Critique | None = None
    revision_count: int = 0
    retrieval_retry_count: int = 0
    trace: list[dict[str, object]] = field(default_factory=list)
    retriever_bundles_loaded: list[str] = field(default_factory=lambda: ["rag_read_bundle"])


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
        selected_capability_ids = sorted({capability_id for step in plan.needs for capability_id in step.required_capability_ids})
        state.trace.append({"stage": "planner", "needs": len(plan.needs), "capability_ids": selected_capability_ids})
        await _emit_artifact(deps, "data-plan", _plan_payload(plan))
        await _emit_stage(
            deps,
            "planner",
            "completed",
            "Plan created",
            {
                "agentRole": "planner",
                "needs": len(plan.needs),
                "requiresWorkspaceData": plan.requires_workspace_data,
                "capabilityIdsLoaded": selected_capability_ids,
            },
        )

    async def _run_retriever(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        assert state.plan is not None
        retriever_capability_ids = _plan_capability_ids(state.plan, "retriever")
        retriever = deps.stage_agents.retriever
        if deps.stage_agents.retriever_builder is not None:
            retriever, bundles = deps.stage_agents.retriever_builder(retriever_capability_ids)
            state.retriever_bundles_loaded = bundles
        else:
            state.retriever_bundles_loaded = ["rag_read_bundle"]
        _execution_state(deps.runtime_deps).retriever_bundles_loaded = list(state.retriever_bundles_loaded)
        await _emit_stage(
            deps,
            "retriever",
            "running",
            "Retrieving workspace evidence",
            {
                "agentRole": "retriever",
                "capabilityIdsLoaded": retriever_capability_ids,
                "retryCount": state.retrieval_retry_count,
                "capabilityBundles": state.retriever_bundles_loaded,
                "retrievalCount": _execution_state(deps.runtime_deps).rag_search_count,
            },
        )
        if not state.plan.requires_workspace_data:
            state.retrieval = RetrievalBundle(
                evidence=[
                    EvidenceItem(
                        plan_step_id=step.id,
                        source_type="reasoning",
                        evidence_id=f"{step.id}:reasoning",
                        title="No workspace retrieval required",
                        content=step.description,
                        confidence=0.7,
                        source_ref=step.id,
                        scope="request",
                        coverage="partial",
                        metadata={"domain": step.domain, "executor": step.executor},
                    )
                    for step in state.plan.sorted_needs()
                    if step.kind == "reasoning"
                ],
                notes="Planner indicated workspace retrieval is not required.",
            )
            state.trace.append({"stage": "retriever", "evidence": len(state.retrieval.evidence), "skipped": True})
            await _emit_artifact(deps, "data-retrieval_bundle", _retrieval_payload(state.retrieval))
            await _emit_stage(
                deps,
                "retriever",
                "skipped",
                "Workspace retrieval skipped",
                {
                    "agentRole": "retriever",
                    "capabilityIdsLoaded": retriever_capability_ids,
                    "capabilityBundles": state.retriever_bundles_loaded,
                    "evidence": len(state.retrieval.evidence),
                    "gaps": 0,
                    "retrievalCount": _execution_state(deps.runtime_deps).rag_search_count,
                },
            )
            return

        prompt = "\n\n".join(
            [
                runtime_context(deps.runtime_deps),
                "User request:",
                state.user_prompt,
                "Plan:",
                state.plan.model_dump_json(),
                f"Retriever capability ids to load if needed: {retriever_capability_ids}",
                f"Maximum RAG searches: {deps.runtime_deps.settings.rag_max_plan_searches}",
            ]
        )
        result = await retriever.run(prompt, deps=deps.runtime_deps)
        state.retrieval = result.output
        state.trace.append(
            {"stage": "retriever", "evidence": len(state.retrieval.evidence), "gaps": len(state.retrieval.gaps)}
        )
        await _emit_artifact(deps, "data-retrieval_bundle", _retrieval_payload(state.retrieval))
        await _emit_stage(
            deps,
            "retriever",
            "completed",
            "Evidence retrieved",
            {
                "agentRole": "retriever",
                "capabilityIdsLoaded": retriever_capability_ids,
                "capabilityBundles": state.retriever_bundles_loaded,
                "evidence": len(state.retrieval.evidence),
                "gaps": len(state.retrieval.gaps),
                "retryCount": state.retrieval_retry_count,
                "retrievalCount": _execution_state(deps.runtime_deps).rag_search_count,
            },
        )

    async def _run_synthesizer(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        await _emit_stage(
            deps,
            "synthesizer",
            "running",
            "Drafting the answer",
            {"agentRole": "synthesizer", "capabilityIdsLoaded": _plan_capability_ids(state.plan, "synthesizer")},
        )
        state.draft = await _run_synthesizer(deps, state, revision_feedback=None)
        state.trace.append({"stage": "synthesizer", "revision": False})
        await _emit_artifact(deps, "data-draft_answer", _draft_payload(state.draft))
        await _emit_stage(
            deps,
            "synthesizer",
            "completed",
            "Draft completed",
            {
                "agentRole": "synthesizer",
                "capabilityIdsLoaded": _plan_capability_ids(state.plan, "synthesizer"),
                "citations": len(state.draft.citations),
                "limitations": len(state.draft.limitations),
            },
        )

    async def _run_critic(self, state: OrchestratorState, deps: WorkflowDeps) -> None:
        await _emit_stage(
            deps,
            "critic",
            "running",
            "Checking answer quality",
            {"agentRole": "critic", "capabilityIdsLoaded": _plan_capability_ids(state.plan, "critic")},
        )
        state.critique = await _run_critic(deps, state)
        state.trace.append({"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count})
        await _emit_artifact(deps, "data-critique", _critique_payload(state.critique))
        await _emit_stage(
            deps,
            "critic",
            "completed",
            "Quality check completed",
            {
                "decision": state.critique.decision,
                "missingEvidence": len(state.critique.missing_evidence),
                "unsafeClaims": len(state.critique.unsafe_claims),
                "retryTargets": state.critique.retry_targets,
                "agentRole": "critic",
                "capabilityIdsLoaded": _plan_capability_ids(state.plan, "critic"),
            },
        )

    async def _finalize(self, state: OrchestratorState, deps: WorkflowDeps) -> OrchestratorResult:
        assert state.plan is not None
        assert state.retrieval is not None
        assert state.draft is not None
        assert state.critique is not None

        while True:
            normalized_decision = _normalize_decision(state.critique.decision)
            if normalized_decision == "retrieve_more":
                if state.retrieval_retry_count >= deps.runtime_deps.settings.orchestrator_max_retrieval_retries:
                    break
                state.retrieval_retry_count += 1
                await _emit_stage(
                    deps,
                    "retriever",
                    "running",
                    "Retrying evidence retrieval",
                    {
                        "agentRole": "retriever",
                        "capabilityIdsLoaded": _plan_capability_ids(state.plan, "retriever"),
                        "retryCount": state.retrieval_retry_count,
                        "retryTargets": state.critique.retry_targets or state.critique.missing_evidence,
                    },
                )
                state.retrieval = await _rerun_retriever(deps, state)
                state.trace.append(
                    {
                        "stage": "retriever",
                        "retry": True,
                        "retry_count": state.retrieval_retry_count,
                        "evidence": len(state.retrieval.evidence),
                        "gaps": len(state.retrieval.gaps),
                    }
                )
                await _emit_artifact(deps, "data-retrieval_bundle", _retrieval_payload(state.retrieval))
                state.draft = await _run_synthesizer(deps, state, revision_feedback=state.critique.feedback)
                state.trace.append({"stage": "synthesizer", "revision": True, "source": "retrieve_more"})
                await _emit_artifact(deps, "data-draft_answer", _draft_payload(state.draft))
                state.critique = await _run_critic(deps, state)
                state.trace.append(
                    {
                        "stage": "critic",
                        "decision": state.critique.decision,
                        "revision_count": state.revision_count,
                        "retrieval_retry_count": state.retrieval_retry_count,
                    }
                )
                await _emit_artifact(deps, "data-critique", _critique_payload(state.critique))
                await _emit_stage(
                    deps,
                    "retriever",
                    "completed",
                    "Retrieval retry completed",
                    {
                        "agentRole": "retriever",
                        "capabilityIdsLoaded": _plan_capability_ids(state.plan, "retriever"),
                        "capabilityBundles": state.retriever_bundles_loaded,
                        "retryCount": state.retrieval_retry_count,
                        "decision": state.critique.decision,
                        "retrievalCount": _execution_state(deps.runtime_deps).rag_search_count,
                    },
                )
                continue

            if normalized_decision == "revise_minor":
                if state.revision_count >= deps.runtime_deps.settings.orchestrator_max_revisions:
                    break
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
                await _emit_artifact(deps, "data-draft_answer", _draft_payload(state.draft))
                state.critique = await _run_critic(deps, state)
                state.trace.append(
                    {"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count}
                )
                await _emit_artifact(deps, "data-critique", _critique_payload(state.critique))
                await _emit_stage(
                    deps,
                    "revision",
                    "completed",
                    "Revision completed",
                    {"revisionCount": state.revision_count, "decision": state.critique.decision},
                )
                continue

            break

        limitations = list(state.draft.limitations)
        if _normalize_decision(state.critique.decision) != "approve":
            limitations.append(state.critique.feedback)
            limitations.extend(state.critique.missing_evidence)
        result = OrchestratorResult(
            content=state.draft.content,
            approved=_normalize_decision(state.critique.decision) == "approve",
            plan=state.plan,
            retrieval=state.retrieval,
            draft=state.draft,
            critique=state.critique,
            revision_count=state.revision_count,
            retrieval_retry_count=state.retrieval_retry_count,
            limitations=limitations,
            trace=state.trace,
        )
        await _emit_artifact(deps, "data-final_answer", _final_answer_payload(result))
        await _emit_stage(
            deps,
            "answer",
            "completed",
            "Answer ready",
            {
                "approved": result.approved,
                "revisionCount": result.revision_count,
                "retrievalRetryCount": result.retrieval_retry_count,
                "limitations": len(result.limitations),
                "retrievalCount": _execution_state(deps.runtime_deps).rag_search_count,
            },
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


async def _emit_artifact(deps: WorkflowDeps, event_type: str, data: dict[str, Any]) -> None:
    if deps.event_sink is None:
        return
    await deps.event_sink({"type": event_type, "data": data})


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
        f"Synthesizer capability ids to load if needed: {_plan_capability_ids(state.plan, 'synthesizer')}",
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
            f"Critic capability ids to load if needed: {_plan_capability_ids(state.plan, 'critic')}",
        ]
    )
    result = await deps.stage_agents.critic.run(prompt, deps=deps.runtime_deps)
    return result.output


def _normalize_plan(plan: Plan) -> Plan:
    normalized_needs = []
    for step in plan.sorted_needs():
        executor = step.executor
        if step.kind == "reasoning" and executor == "rag_lookup":
            executor = "reasoning_only"
        required_capability_ids = step.required_capability_ids or default_capability_ids_for_step(step.domain, step.kind, executor)
        normalized_needs.append(
            step.model_copy(
                update={
                    "executor": executor,
                    "required_capability_ids": required_capability_ids,
                }
            )
        )
    return plan.model_copy(update={"needs": normalized_needs})


async def _rerun_retriever(deps: WorkflowDeps, state: OrchestratorState) -> RetrievalBundle:
    assert state.plan is not None
    assert state.retrieval is not None
    assert state.critique is not None
    retry_targets = state.critique.retry_targets or state.critique.missing_evidence
    prompt = "\n\n".join(
        [
            runtime_context(deps.runtime_deps),
            "User request:",
            state.user_prompt,
            "Plan:",
            state.plan.model_dump_json(),
            "Existing evidence bundle:",
            state.retrieval.model_dump_json(),
            f"Retry targets: {retry_targets}",
            f"Retriever capability ids to load if needed: {_plan_capability_ids(state.plan, 'retriever')}",
            f"Maximum RAG searches: {deps.runtime_deps.settings.rag_max_plan_searches}",
        ]
    )
    retriever = deps.stage_agents.retriever
    if deps.stage_agents.retriever_builder is not None:
        retriever, bundles = deps.stage_agents.retriever_builder(_plan_capability_ids(state.plan, "retriever"))
        state.retriever_bundles_loaded = bundles
        _execution_state(deps.runtime_deps).retriever_bundles_loaded = list(bundles)
    result = await retriever.run(prompt, deps=deps.runtime_deps)
    return result.output


def _plan_capability_ids(plan: Plan | None, role: str) -> list[str]:
    if plan is None:
        return []
    requested_ids = [capability_id for step in plan.needs for capability_id in step.required_capability_ids]
    return capability_ids_for_role(role, sorted(set(requested_ids)))


def _normalize_decision(decision: str) -> str:
    if decision == "revise":
        return "revise_minor"
    return decision


def _execution_state(runtime_deps: Any) -> Any:
    state = getattr(runtime_deps, "execution_state", None)
    if state is None:
        state = type("ExecutionState", (), {"rag_search_count": 0, "retriever_bundles_loaded": []})()
        setattr(runtime_deps, "execution_state", state)
    return state


def _plan_payload(plan: Plan) -> dict[str, Any]:
    return plan.model_dump(mode="json")


def _retrieval_payload(retrieval: RetrievalBundle) -> dict[str, Any]:
    return retrieval.model_dump(mode="json")


def _draft_payload(draft: DraftAnswer) -> dict[str, Any]:
    return draft.model_dump(mode="json")


def _critique_payload(critique: Critique) -> dict[str, Any]:
    return critique.model_dump(mode="json")


def _final_answer_payload(result: OrchestratorResult) -> dict[str, Any]:
    return {
        "content": result.content,
        "approved": result.approved,
        "revisionCount": result.revision_count,
        "retrievalRetryCount": result.retrieval_retry_count,
        "limitations": result.limitations,
        "citations": result.draft.citations,
        "assumptions": result.draft.assumptions,
    }
