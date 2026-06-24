from __future__ import annotations

from typing import Any


def create_thinking_capability(effort: str = "high") -> Any | None:
    try:
        from pydantic_ai.capabilities import Thinking
    except ImportError:
        return None
    return Thinking(effort=effort)

