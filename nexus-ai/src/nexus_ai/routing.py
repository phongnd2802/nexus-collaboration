from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field

from nexus_ai.settings import Settings


ExecutionPath = Literal["direct_workspace", "multi"]
IntentClass = Literal[
    "general_simple",
    "workspace_read",
    "workspace_action",
    "complex_workflow",
    "complex_analysis",
    "ambiguous",
]


class RouteDecision(BaseModel):
    route: ExecutionPath
    execution_path: ExecutionPath
    intent_class: IntentClass
    reason_codes: list[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    needs_workspace_data: bool = False
    needs_tools: bool = False
    needs_multi_step_reasoning: bool = False
    used_model_fallback: bool = False


class ModelRouteDecision(BaseModel):
    executionPath: ExecutionPath
    intentClass: IntentClass
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    reasonCodes: list[str] = Field(default_factory=list)


class ComplexityRouter:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model_router = _build_model_router(settings)

    async def decide(self, user_prompt: str, request_payload: dict[str, Any]) -> RouteDecision:
        heuristic = self._heuristic_decision(user_prompt, request_payload)
        if not self._should_use_model_fallback(heuristic):
            return heuristic
        if self._model_router is None:
            heuristic.reason_codes.append("model_router_unavailable")
            return heuristic

        prompt = _model_router_prompt(user_prompt, request_payload, heuristic)
        try:
            result = await self._model_router.run(prompt)
            model_decision = result.output
        except Exception:
            heuristic.reason_codes.append("model_router_unavailable")
            return heuristic
        return RouteDecision(
            route=model_decision.executionPath,
            execution_path=model_decision.executionPath,
            intent_class=model_decision.intentClass,
            confidence=model_decision.confidence,
            reason_codes=[*heuristic.reason_codes, *model_decision.reasonCodes],
            needs_workspace_data=model_decision.executionPath == "direct_workspace",
            needs_tools=model_decision.executionPath == "direct_workspace",
            needs_multi_step_reasoning=model_decision.executionPath == "multi",
            used_model_fallback=True,
        )

    def _should_use_model_fallback(self, decision: RouteDecision) -> bool:
        return (
            self.settings.router_enable_model_fallback
            and bool(self.settings.router_model)
            and decision.confidence < self.settings.router_confidence_threshold
        )

    def _heuristic_decision(self, user_prompt: str, request_payload: dict[str, Any]) -> RouteDecision:
        prompt = user_prompt.strip()
        normalized = prompt.lower()
        reasons: list[str] = []

        general_simple_markers = [
            "what is",
            "who is",
            "define",
            "explain",
            "translate",
            "rewrite",
            "summarize this",
            "là gì",
            "giải thích",
            "dịch",
            "viết lại",
        ]
        workspace_markers = [
            "workspace",
            "project",
            "task",
            "channel",
            "file",
            "document",
            "meeting",
            "campaign",
            "marketing",
            "note",
            "notes",
            "owner",
            "deadline",
            "overdue",
            "dự án",
            "công việc",
            "kênh",
            "tài liệu",
            "tiến độ",
        ]
        action_markers = [
            "create",
            "update",
            "delete",
            "send",
            "assign",
            "schedule",
            "move",
            "change",
            "share",
            "upload",
            "tạo",
            "cập nhật",
            "xóa",
            "gửi",
            "gán",
            "lên lịch",
            "đổi",
            "chia sẻ",
            "tải lên",
        ]
        complex_analysis_markers = [
            "analyze",
            "analysis",
            "compare",
            "identify",
            "risk",
            "reallocate",
            "draft report",
            "report",
            "phân tích",
            "so sánh",
            "xác định",
            "rủi ro",
            "đề xuất",
            "báo cáo",
        ]
        workflow_markers = [
            "workflow",
            "coordinate",
            "plan",
            "follow up",
            "send to",
            "then",
            "sau đó",
            "rồi",
        ]

        is_general_simple = any(marker in normalized for marker in general_simple_markers)
        needs_workspace_data = any(marker in normalized for marker in workspace_markers)
        needs_tools = any(marker in normalized for marker in action_markers)
        needs_multi_step_reasoning = any(marker in normalized for marker in complex_analysis_markers)
        complex_workflow = any(marker in normalized for marker in workflow_markers)
        clause_count = sum(prompt.count(sep) for sep in [",", ";", " and ", " rồi ", " và "])

        if not prompt:
            return RouteDecision(
                route="direct_workspace",
                execution_path="direct_workspace",
                intent_class="general_simple",
                reason_codes=["empty_prompt"],
                confidence=1.0,
            )

        if len(prompt) > 220:
            reasons.append("long_prompt")
            needs_multi_step_reasoning = True
        if clause_count >= 2:
            reasons.append("multi_clause")
            complex_workflow = True
        if is_general_simple:
            reasons.append("simple_general_question")
        if needs_workspace_data:
            reasons.append("workspace_context")
        if needs_tools:
            reasons.append("tool_or_action")
        if needs_multi_step_reasoning:
            reasons.append("complex_analysis")
        if complex_workflow:
            reasons.append("complex_workflow")

        if is_general_simple and not needs_tools and not needs_multi_step_reasoning and not complex_workflow and len(prompt) <= 120:
            return RouteDecision(
                route="direct_workspace",
                execution_path="direct_workspace",
                intent_class="general_simple",
                reason_codes=reasons,
                confidence=0.92,
            )

        if needs_workspace_data and not needs_multi_step_reasoning and not complex_workflow:
            intent_class: IntentClass = "workspace_action" if any(
                marker in normalized for marker in action_markers
            ) else "workspace_read"
            return RouteDecision(
                route="direct_workspace",
                execution_path="direct_workspace",
                intent_class=intent_class,
                reason_codes=reasons,
                confidence=0.82 if intent_class == "workspace_action" else 0.87,
                needs_workspace_data=True,
                needs_tools=intent_class == "workspace_action",
                needs_multi_step_reasoning=False,
            )

        if needs_multi_step_reasoning or complex_workflow:
            intent_class = "complex_analysis" if needs_multi_step_reasoning else "complex_workflow"
            return RouteDecision(
                route="multi",
                execution_path="multi",
                intent_class=intent_class,
                reason_codes=reasons or ["default_multi"],
                confidence=0.96,
                needs_workspace_data=needs_workspace_data,
                needs_tools=needs_tools or needs_workspace_data,
                needs_multi_step_reasoning=True,
            )

        return RouteDecision(
            route="direct_workspace",
            execution_path="direct_workspace",
            intent_class="ambiguous",
            reason_codes=reasons or ["ambiguous_request"],
            confidence=0.55,
            needs_workspace_data=needs_workspace_data,
            needs_tools=needs_tools,
            needs_multi_step_reasoning=False,
        )


def routing_event_payload(decision: RouteDecision) -> dict[str, Any]:
    return {
        "type": "data-routing_decision",
        "data": {
            "route": decision.route,
            "executionPath": decision.execution_path,
            "intentClass": decision.intent_class,
            "reasonCodes": decision.reason_codes,
            "confidence": decision.confidence,
            "needsWorkspaceData": decision.needs_workspace_data,
            "needsTools": decision.needs_tools,
            "needsMultiStepReasoning": decision.needs_multi_step_reasoning,
            "usedModelFallback": decision.used_model_fallback,
        },
    }


def _build_model_router(settings: Settings) -> Any | None:
    if not settings.router_enable_model_fallback or not settings.router_model:
        return None
    try:
        from pydantic_ai import Agent
    except ImportError:
        return None
    kwargs: dict[str, Any] = {
        "instructions": (
            "You are a lightweight routing classifier. "
            "Choose exactly one executionPath from direct_workspace, multi. "
            "Use direct_workspace for general simple requests and workspace read/action tasks, "
            "and multi for complex workflows or multi-step analyses."
        ),
        "output_type": ModelRouteDecision,
    }
    return Agent(settings.router_model, **kwargs)


def _model_router_prompt(user_prompt: str, request_payload: dict[str, Any], heuristic: RouteDecision) -> str:
    return "\n".join(
        [
            "User prompt:",
            user_prompt,
            "Heuristic decision:",
            json.dumps(routing_event_payload(heuristic)["data"], ensure_ascii=False),
            "Messages:",
            json.dumps(request_payload.get("messages", []), ensure_ascii=False),
        ]
    )
