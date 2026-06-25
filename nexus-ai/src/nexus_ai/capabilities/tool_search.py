from __future__ import annotations

from typing import Any


def create_tool_search_capability() -> Any | None:
    try:
        from pydantic_ai.capabilities import ToolSearch
    except ImportError:
        return None
    return ToolSearch()
