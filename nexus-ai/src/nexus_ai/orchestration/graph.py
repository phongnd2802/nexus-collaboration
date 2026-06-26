from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pydantic_graph import GraphBuilder, StepContext

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
class OrchestratorDeps:
    runtime_deps: Any
    stage_agents: StageAgents


async def planner_step(ctx: StepContext[OrchestratorState, OrchestratorDeps, str]) -> OrchestratorState:
    ctx.state.user_prompt = ctx.inputs
    prompt = "\n\n".join(
        [
            runtime_context(ctx.deps.runtime_deps),
            "User request:",
            ctx.inputs,
        ]
    )
    result = await ctx.deps.stage_agents.planner.run(prompt, deps=ctx.deps.runtime_deps)
    plan = _normalize_plan(result.output)
    ctx.state.plan = plan
    ctx.state.trace.append({"stage": "planner", "needs": len(plan.needs)})
    return ctx.state


async def retriever_step(
    ctx: StepContext[OrchestratorState, OrchestratorDeps, OrchestratorState],
) -> OrchestratorState:
    state = ctx.inputs
    assert state.plan is not None
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
        return state

    prompt = "\n\n".join(
        [
            runtime_context(ctx.deps.runtime_deps),
            "User request:",
            state.user_prompt,
            "Plan:",
            state.plan.model_dump_json(),
        ]
    )
    result = await ctx.deps.stage_agents.retriever.run(prompt, deps=ctx.deps.runtime_deps)
    state.retrieval = result.output
    state.trace.append({"stage": "retriever", "evidence": len(state.retrieval.evidence), "gaps": len(state.retrieval.gaps)})
    return state


async def synthesizer_step(
    ctx: StepContext[OrchestratorState, OrchestratorDeps, OrchestratorState],
) -> OrchestratorState:
    state = ctx.inputs
    state.draft = await _run_synthesizer(ctx, state, revision_feedback=None)
    state.trace.append({"stage": "synthesizer", "revision": False})
    return state


async def critic_step(
    ctx: StepContext[OrchestratorState, OrchestratorDeps, OrchestratorState],
) -> OrchestratorState:
    state = ctx.inputs
    state.critique = await _run_critic(ctx, state)
    state.trace.append({"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count})
    return state


async def finalize_step(
    ctx: StepContext[OrchestratorState, OrchestratorDeps, OrchestratorState],
) -> OrchestratorResult:
    state = ctx.inputs
    assert state.plan is not None
    assert state.retrieval is not None
    assert state.draft is not None
    assert state.critique is not None

    if state.critique.decision == "revise" and state.revision_count < ctx.deps.runtime_deps.settings.orchestrator_max_revisions:
        state.revision_count += 1
        state.draft = await _run_synthesizer(ctx, state, revision_feedback=state.critique.feedback)
        state.trace.append({"stage": "synthesizer", "revision": True})
        state.critique = await _run_critic(ctx, state)
        state.trace.append({"stage": "critic", "decision": state.critique.decision, "revision_count": state.revision_count})

    limitations = list(state.draft.limitations)
    if state.critique.decision != "approve":
        limitations.append(state.critique.feedback)
        limitations.extend(state.critique.missing_evidence)
    return OrchestratorResult(
        content=state.draft.content,
        approved=state.critique.decision == "approve",
        plan=state.plan,
        retrieval=state.retrieval,
        critique=state.critique,
        revision_count=state.revision_count,
        limitations=limitations,
        trace=state.trace,
    )


def build_orchestrator_graph():
    builder = GraphBuilder[
        OrchestratorState,
        OrchestratorDeps,
        str,
        OrchestratorResult,
    ](
        name="nexus_multi_agent_orchestrator",
        state_type=OrchestratorState,
        deps_type=OrchestratorDeps,
        input_type=str,
        output_type=OrchestratorResult,
    )
    planner = builder.step(planner_step, node_id="planner")
    retriever = builder.step(retriever_step, node_id="retriever")
    synthesizer = builder.step(synthesizer_step, node_id="synthesizer")
    critic = builder.step(critic_step, node_id="critic")
    finalize = builder.step(finalize_step, node_id="finalize")

    builder.add_edge(builder.start_node, planner)
    builder.add_edge(planner, retriever)
    builder.add_edge(retriever, synthesizer)
    builder.add_edge(synthesizer, critic)
    builder.add_edge(critic, finalize)
    builder.add_edge(finalize, builder.end_node)
    return builder.build()


async def _run_synthesizer(
    ctx: StepContext[OrchestratorState, OrchestratorDeps, Any],
    state: OrchestratorState,
    *,
    revision_feedback: str | None,
) -> DraftAnswer:
    assert state.plan is not None
    assert state.retrieval is not None
    parts = [
        runtime_context(ctx.deps.runtime_deps),
        "User request:",
        state.user_prompt,
        "Plan:",
        state.plan.model_dump_json(),
        "Evidence bundle:",
        state.retrieval.model_dump_json(),
    ]
    if revision_feedback is not None and state.draft is not None:
        parts.extend(["Previous draft:", state.draft.model_dump_json(), "Critic feedback:", revision_feedback])
    result = await ctx.deps.stage_agents.synthesizer.run("\n\n".join(parts), deps=ctx.deps.runtime_deps)
    return result.output


async def _run_critic(ctx: StepContext[OrchestratorState, OrchestratorDeps, Any], state: OrchestratorState) -> Critique:
    assert state.plan is not None
    assert state.retrieval is not None
    assert state.draft is not None
    prompt = "\n\n".join(
        [
            runtime_context(ctx.deps.runtime_deps),
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
    result = await ctx.deps.stage_agents.critic.run(prompt, deps=ctx.deps.runtime_deps)
    return result.output


def _normalize_plan(plan: Plan) -> Plan:
    return plan.model_copy(update={"needs": plan.sorted_needs()})
