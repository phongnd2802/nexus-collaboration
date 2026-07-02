from __future__ import annotations

from typing import Any


def create_tool_search_capability() -> Any | None:
    try:
        from pydantic_ai.capabilities import ToolSearch
    except ImportError:
        return None
    return ToolSearch(
        tool_description="Search deferred Nexus tools by task, workspace entity, action, or data source.",
        parameter_description="Search phrases such as workspace documents, project tasks, calendar events, or chat messages.",
    )
