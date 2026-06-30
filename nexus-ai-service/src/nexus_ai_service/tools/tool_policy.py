from dataclasses import dataclass
from typing import Literal


ToolRisk = Literal["read", "write", "destructive"]


@dataclass(frozen=True)
class ToolPolicyDecision:
    allowed: bool
    requires_approval: bool
    reason: str


def decide_tool_policy(risk: ToolRisk) -> ToolPolicyDecision:
    if risk == "read":
        return ToolPolicyDecision(allowed=True, requires_approval=False, reason="read-only tool")
    return ToolPolicyDecision(allowed=False, requires_approval=True, reason="write/destructive tools require approval")

