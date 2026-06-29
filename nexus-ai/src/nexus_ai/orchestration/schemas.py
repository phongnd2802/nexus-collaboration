from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PlanStep(BaseModel):
    id: str
    description: str
    priority: int
    kind: Literal["rag", "mcp", "reasoning", "clarification"] = "rag"
    domain: str = "general"
    executor: Literal["rag_lookup", "workspace_action_check", "reasoning_only", "cross_check", "synthesis_only"] = (
        "rag_lookup"
    )
    required_capability_ids: list[str] = Field(default_factory=list)
    must_have_evidence: bool = True
    budget: int = Field(default=1, ge=0)
    fallback_mode: Literal["report_gap", "reasoning_only", "skip"] = "report_gap"
    query: str | None = None
    expected_evidence: str | None = None
    success_criteria: str | None = None


class Plan(BaseModel):
    needs: list[PlanStep]
    notes: str
    answer_style: Literal["concise", "detailed", "actionable"] = "actionable"
    requires_workspace_data: bool = True
    risk_flags: list[str] = Field(default_factory=list)

    def sorted_needs(self) -> list[PlanStep]:
        return sorted(self.needs, key=lambda step: (step.priority, step.id))


class EvidenceItem(BaseModel):
    plan_step_id: str
    source_type: Literal["rag", "mcp", "reasoning", "clarification"]
    evidence_id: str | None = None
    title: str
    content: str
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    citation: str | None = None
    source_ref: str | None = None
    freshness: str | None = None
    scope: str | None = None
    coverage: Literal["full", "partial", "weak"] | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class RetrievalBundle(BaseModel):
    evidence: list[EvidenceItem] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    notes: str = ""


class DraftAnswer(BaseModel):
    content: str
    citations: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class Critique(BaseModel):
    decision: Literal["approve", "revise", "revise_minor", "retrieve_more", "fail_closed"]
    feedback: str
    missing_evidence: list[str] = Field(default_factory=list)
    unsafe_claims: list[str] = Field(default_factory=list)
    retry_targets: list[str] = Field(default_factory=list)


class OrchestratorResult(BaseModel):
    content: str
    approved: bool
    plan: Plan
    retrieval: RetrievalBundle
    draft: DraftAnswer
    critique: Critique
    revision_count: int
    retrieval_retry_count: int = 0
    limitations: list[str] = Field(default_factory=list)
    trace: list[dict[str, object]] = Field(default_factory=list)
