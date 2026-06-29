from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from pydantic_ai.capabilities import Capability


AgentRole = str


@dataclass(frozen=True)
class DomainSkillSpec:
    id: str
    role: AgentRole
    description: str
    instructions: str
    defer_loading: bool = True


DOMAIN_SKILL_SPECS: tuple[DomainSkillSpec, ...] = (
    DomainSkillSpec(
        id="domain-router",
        role="planner",
        description="Route requests into project, marketing, task, resource, or document-analysis workflows.",
        instructions=(
            "Choose the domain and required capability ids for each plan step. "
            "Prefer project-risk-analysis for schedule/risk analysis, task-overdue-investigation for late work, "
            "resource-allocation-analysis for staffing changes, marketing-campaign-analysis for campaign requests, "
            "and workspace-doc-rag for document-heavy questions."
        ),
        defer_loading=False,
    ),
    DomainSkillSpec(
        id="workspace-doc-rag",
        role="retriever",
        description="Retrieve and normalize evidence from indexed workspace files and notes.",
        instructions=(
            "Prefer document-grounded evidence. Consolidate related retrieval needs, keep citations precise, "
            "and explicitly report missing document coverage."
        ),
    ),
    DomainSkillSpec(
        id="project-risk-analysis",
        role="retriever",
        description="Analyze project progress, blocked work, milestone slippage, and risk signals.",
        instructions=(
            "Focus on overdue tasks, blocked dependencies, milestone drift, and risk concentration. "
            "Extract evidence that supports risk statements and mitigation options."
        ),
    ),
    DomainSkillSpec(
        id="task-overdue-investigation",
        role="retriever",
        description="Inspect overdue tasks, owners, due dates, and follow-on impacts.",
        instructions=(
            "Prioritize overdue work, identify responsible owners, and note downstream impact on related work."
        ),
    ),
    DomainSkillSpec(
        id="resource-allocation-analysis",
        role="retriever",
        description="Assess workload distribution and potential resource reallocation options.",
        instructions=(
            "Highlight overloaded owners, underused capacity, competing priorities, and evidence-backed reallocation ideas."
        ),
    ),
    DomainSkillSpec(
        id="marketing-campaign-analysis",
        role="retriever",
        description="Analyze campaign progress, risks, and reporting signals for marketing work.",
        instructions=(
            "Focus on deliverables, campaign milestones, overdue marketing tasks, and gaps that affect stakeholder reporting."
        ),
    ),
    DomainSkillSpec(
        id="grounding-review",
        role="critic",
        description="Review answers for evidence grounding and unsupported claims.",
        instructions=(
            "Require explicit support for every operational claim. Request more retrieval when evidence is weak or missing."
        ),
    ),
    DomainSkillSpec(
        id="project-governance-review",
        role="critic",
        description="Review project analyses for governance, risk, and mitigation quality.",
        instructions=(
            "Check that project risks map to actual evidence, mitigations are actionable, and uncertainty is explicit."
        ),
    ),
    DomainSkillSpec(
        id="management-report-review",
        role="critic",
        description="Review management-facing summaries for completeness and decision usefulness.",
        instructions=(
            "Ensure the answer communicates status, risks, evidence gaps, and next actions without overclaiming."
        ),
    ),
    DomainSkillSpec(
        id="executive-summary-writer",
        role="synthesizer",
        description="Write concise executive summaries for leadership consumption.",
        instructions=(
            "Lead with status, material risks, and recommended actions. Keep the tone concise and decision-oriented."
        ),
    ),
    DomainSkillSpec(
        id="team-channel-report-writer",
        role="synthesizer",
        description="Write channel-ready updates for team communication.",
        instructions=(
            "Write a clear team update with status, risks, asks, and next steps. Avoid adding unsupported detail."
        ),
    ),
)


def build_domain_skill_capabilities(role: AgentRole) -> list[Capability[Any]]:
    return [
        Capability(
            id=spec.id,
            description=spec.description,
            instructions=spec.instructions,
            defer_loading=spec.defer_loading,
        )
        for spec in DOMAIN_SKILL_SPECS
        if spec.role == role
    ]


def available_domain_skill_ids_by_role() -> dict[str, list[str]]:
    roles: dict[str, list[str]] = {}
    for spec in DOMAIN_SKILL_SPECS:
        roles.setdefault(spec.role, []).append(spec.id)
    return roles


def default_capability_ids_for_step(domain: str | None, kind: str, executor: str) -> list[str]:
    normalized_domain = (domain or "general").strip().lower()
    if normalized_domain == "marketing":
        return ["marketing-campaign-analysis"]
    if normalized_domain == "project":
        ids = ["project-risk-analysis"]
        if kind == "rag" or executor == "rag_lookup":
            ids.append("workspace-doc-rag")
        return ids
    if normalized_domain == "task":
        return ["task-overdue-investigation", "workspace-doc-rag"]
    if normalized_domain == "resource":
        return ["resource-allocation-analysis", "workspace-doc-rag"]
    if kind == "rag" or executor == "rag_lookup":
        return ["workspace-doc-rag"]
    return []


def capability_ids_for_role(role: AgentRole, requested_ids: Sequence[str]) -> list[str]:
    available = set(available_domain_skill_ids_by_role().get(role, []))
    return [capability_id for capability_id in requested_ids if capability_id in available]
