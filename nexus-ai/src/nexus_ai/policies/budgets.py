from __future__ import annotations

from dataclasses import dataclass
from time import monotonic


@dataclass
class RunBudget:
    max_tool_calls: int
    max_run_seconds: int
    max_cost_usd: float
    tool_calls: int = 0
    cost_usd: float = 0.0
    started_at: float = 0.0

    def __post_init__(self) -> None:
        if self.started_at == 0.0:
            self.started_at = monotonic()

    def record_tool_call(self) -> None:
        self.tool_calls += 1
        if self.tool_calls > self.max_tool_calls:
            raise RuntimeError(f"Tool budget exceeded: {self.tool_calls}/{self.max_tool_calls}")

    def record_cost(self, amount_usd: float) -> None:
        self.cost_usd += amount_usd
        if self.cost_usd > self.max_cost_usd:
            raise RuntimeError(f"Cost budget exceeded: ${self.cost_usd:.4f}/${self.max_cost_usd:.4f}")

    def check_time(self) -> None:
        elapsed = monotonic() - self.started_at
        if elapsed > self.max_run_seconds:
            raise RuntimeError(f"Run time budget exceeded: {elapsed:.1f}s/{self.max_run_seconds}s")

