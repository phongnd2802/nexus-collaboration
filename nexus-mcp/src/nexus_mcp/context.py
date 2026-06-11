from typing import Any

from pydantic import BaseModel, Field


class NexusContext(BaseModel):
    user_id: str = Field(alias="userId")
    workspace_id: str = Field(alias="workspaceId")
    execute_actions: bool = Field(default=False, alias="executeActions")
    session_id: str | None = Field(default=None, alias="sessionId")
    current_view: str | None = Field(default=None, alias="currentView")
    referenced_items: list[dict[str, Any]] = Field(default_factory=list, alias="referencedItems")

